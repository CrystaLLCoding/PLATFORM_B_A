import sys
import os
import json
import io
import shutil
import tempfile
import zipfile
import csv
import base64
import subprocess

def detect_csv_encoding_and_delimiter(raw_bytes):
    # Try encodings commonly found in business files
    encodings = ['utf-8-sig', 'utf-8', 'cp1251', 'windows-1251', 'latin1']
    decoded_text = None
    chosen_encoding = 'utf-8'

    for enc in encodings:
        try:
            decoded_text = raw_bytes.decode(enc)
            chosen_encoding = enc
            break
        except UnicodeDecodeError:
            continue

    if decoded_text is None:
        decoded_text = raw_bytes.decode('utf-8', errors='replace')
        chosen_encoding = 'utf-8-replace'

    # Detect delimiter
    first_lines = decoded_text.split('\n')[:5]
    sample = '\n'.join(first_lines)
    delimiter = ','
    if sample.count(';') > sample.count(','):
        delimiter = ';'
    elif sample.count('\t') > sample.count(','):
        delimiter = '\t'

    return decoded_text, delimiter, chosen_encoding

def recover_filename(name_str):
    for enc in ['cp866', 'cp1251']:
        try:
            fixed = name_str.encode('cp437').decode(enc)
            # If it has cyrillic letters, it was definitely cp866 or cp1251
            if any('\u0400' <= char <= '\u04FF' for char in fixed):
                return fixed
        except Exception:
            pass
    return name_str

def parse_csv_content(text, delimiter):
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        return [], [], 0

    reader = csv.reader(lines, delimiter=delimiter)
    try:
        headers = next(reader)
    except StopIteration:
        return [], [], 0

    headers = [str(h).strip().strip('"').strip("'") or f"Колонка_{i+1}" for i, h in enumerate(headers)]
    
    sample_rows = []
    total_rows = 0
    for row in reader:
        total_rows += 1
        if len(sample_rows) < 60:
            row_dict = {}
            for i, h in enumerate(headers):
                val = row[i].strip() if i < len(row) else ""
                row_dict[h] = val
            sample_rows.append(row_dict)

    return headers, sample_rows, total_rows

def extract_archive():
    temp_dir = tempfile.mkdtemp(prefix="platform_arc_")
    archive_path = os.path.join(temp_dir, "incoming_archive.bin")
    extracted_dir = os.path.join(temp_dir, "extracted")
    os.makedirs(extracted_dir, exist_ok=True)

    try:
        archive_bytes = sys.stdin.buffer.read()
        if not archive_bytes:
            sys.stdout.buffer.write(json.dumps({"success": False, "error": "Пустой архив: 0 байт"}, ensure_ascii=False).encode('utf-8'))
            return

        with open(archive_path, "wb") as f:
            f.write(archive_bytes)

        # Detect archive format from magic bytes
        is_zip = archive_bytes.startswith(b'PK\x03\x04') or archive_bytes.startswith(b'PK\x05\x06')
        is_rar = archive_bytes.startswith(b'Rar!\x1a\x07')
        is_tar = archive_bytes[257:262] == b'ustar' if len(archive_bytes) > 265 else False

        archive_type = "zip" if is_zip else ("rar" if is_rar else "archive")
        unpacked_successfully = False
        error_details = ""

        # 1. Try python zipfile if it is zip
        if is_zip:
            try:
                with zipfile.ZipFile(archive_path, 'r') as zf:
                    zf.extractall(extracted_dir)
                    unpacked_successfully = True
            except Exception as e:
                error_details += f"zipfile error: {e}; "

        # 2. Try tar.exe (bsdtar) which handles ZIP, RAR, TAR, GZ natively on Windows
        if not unpacked_successfully:
            try:
                # tar -xf archive_path -C extracted_dir
                tar_cmd = ["tar.exe", "-xf", archive_path, "-C", extracted_dir]
                proc = subprocess.run(tar_cmd, capture_output=True, text=True, timeout=30)
                if proc.returncode == 0:
                    unpacked_successfully = True
                else:
                    error_details += f"tar.exe exit {proc.returncode}: {proc.stderr}; "
            except Exception as e:
                error_details += f"tar.exe error: {e}; "

        # 3. If still not unpacked and is rar, try rarfile if available
        if not unpacked_successfully and is_rar:
            try:
                import rarfile
                rarfile.BSDTAR_TOOL = "tar.exe"
                try:
                    rarfile.tool_setup(unrar=False, bsdtar=True)
                except Exception:
                    pass
                with rarfile.RarFile(archive_path, 'r') as rf:
                    rf.extractall(extracted_dir)
                    unpacked_successfully = True
            except Exception as e:
                error_details += f"rarfile error: {e}; "

        if not unpacked_successfully:
            # Fallback: check if tar.exe extracted any files anyway despite warnings
            extracted_files = [os.path.join(dp, f) for dp, dn, filenames in os.walk(extracted_dir) for f in filenames]
            if len(extracted_files) > 0:
                unpacked_successfully = True

        if not unpacked_successfully:
            sys.stdout.buffer.write(json.dumps({
                "success": False,
                "error": f"Не удалось распаковать архив ({archive_type}). {error_details}"
            }, ensure_ascii=False).encode('utf-8'))
            return

        # Traverse extracted directory
        result_files = []
        for root, dirs, files in os.walk(extracted_dir):
            for raw_file_name in files:
                # Skip hidden/system files
                if raw_file_name.startswith('.') or raw_file_name.startswith('~') or raw_file_name in ['Thumbs.db', 'desktop.ini']:
                    continue
                if '__MACOSX' in root:
                    continue

                full_path = os.path.join(root, raw_file_name)
                file_name = recover_filename(raw_file_name)
                rel_path = recover_filename(os.path.relpath(full_path, extracted_dir).replace('\\', '/'))
                ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
                file_size = os.path.getsize(full_path)

                file_info = {
                    "name": rel_path if '/' in rel_path else file_name,
                    "basename": file_name,
                    "extension": ext,
                    "sizeBytes": file_size,
                    "type": "other"
                }

                if ext == 'csv':
                    file_info["type"] = "csv"
                    try:
                        with open(full_path, "rb") as cf:
                            raw = cf.read()
                        text, delim, enc = detect_csv_encoding_and_delimiter(raw)
                        headers, sample_rows, total_rows = parse_csv_content(text, delim)
                        file_info["columns"] = headers
                        file_info["sampleRows"] = sample_rows
                        file_info["totalRows"] = total_rows
                        file_info["delimiter"] = delim
                        file_info["encoding"] = enc
                        file_info["summary"] = f"CSV из архива ({enc}, разделитель «{delim}»): {total_rows} строк, {len(headers)} колонок ({', '.join(headers[:4])})."
                    except Exception as err:
                        file_info["summary"] = f"CSV файл из архива (ошибка чтения: {err})"

                elif ext in ['xlsx', 'xls']:
                    file_info["type"] = "excel"
                    # Pass base64 to node for complete sheetjs parsing
                    try:
                        with open(full_path, "rb") as ef:
                            b64 = base64.b64encode(ef.read()).decode('ascii')
                        file_info["base64"] = b64
                        file_info["summary"] = f"Excel таблица ({file_name}, {round(file_size/1024)} КБ) извлечена из архива."
                    except Exception as err:
                        file_info["summary"] = f"Excel файл из архива (ошибка: {err})"

                elif ext == 'pdf':
                    file_info["type"] = "pdf"
                    try:
                        from pypdf import PdfReader
                        reader = PdfReader(full_path)
                        pages_text = []
                        for p in reader.pages[:10]:
                            t = p.extract_text() or ""
                            pages_text.append(t)
                        full_text = "\n".join(pages_text)
                        file_info["numPages"] = len(reader.pages)
                        file_info["textSnippet"] = full_text
                        file_info["summary"] = f"PDF документ ({len(reader.pages)} стр., {round(file_size/1024)} КБ) извлечен из архива."
                    except Exception as err:
                        file_info["summary"] = f"PDF файл из архива ({round(file_size/1024)} КБ)"

                elif ext in ['html', 'htm']:
                    file_info["type"] = "html"
                    try:
                        import re
                        with open(full_path, "rb") as hf:
                            raw = hf.read(250000)
                        text, _, enc = detect_csv_encoding_and_delimiter(raw)
                        clean = re.sub(r'<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>', ' ', text, flags=re.I)
                        clean = re.sub(r'<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>', ' ', clean, flags=re.I)
                        clean = re.sub(r'<[^>]+>', ' ', clean)
                        clean = ' '.join(clean.split())
                        file_info["textSnippet"] = clean[:4500]
                        file_info["summary"] = f"HTML отчет {file_name} ({round(file_size/1024)} КБ)"
                    except Exception as err:
                        file_info["summary"] = f"HTML файл {file_name} ({err})"

                elif ext in ['txt', 'log', 'json']:
                    file_info["type"] = "text"
                    try:
                        with open(full_path, "rb") as tf:
                            raw = tf.read(100000)
                        text, _, enc = detect_csv_encoding_and_delimiter(raw)
                        file_info["textSnippet"] = text[:5000]
                        file_info["summary"] = f"Текстовый файл {file_name} ({round(file_size/1024)} КБ)"
                    except Exception:
                        pass

                elif ext in ['jpg', 'jpeg', 'png', 'webp']:
                    file_info["type"] = "image"
                    file_info["summary"] = f"Изображение {file_name} ({round(file_size/1024)} КБ)"

                result_files.append(file_info)

        sys.stdout.buffer.write(json.dumps({
            "success": True,
            "archiveType": archive_type,
            "totalFiles": len(result_files),
            "files": result_files
        }, ensure_ascii=False).encode('utf-8'))

    except Exception as exc:
        sys.stdout.buffer.write(json.dumps({
            "success": False,
            "error": f"Ошибка обработки архива: {str(exc)}"
        }, ensure_ascii=False).encode('utf-8'))
    finally:
        # Always clean up temporary directory
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

if __name__ == "__main__":
    extract_archive()
