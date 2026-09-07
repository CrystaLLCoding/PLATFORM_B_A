import sys
import json
import io
from pypdf import PdfReader

def extract_pdf():
    try:
        pdf_bytes = sys.stdin.buffer.read()
        if not pdf_bytes:
            sys.stdout.buffer.write(json.dumps({"success": False, "error": "No bytes received"}, ensure_ascii=False).encode('utf-8'))
            return
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []
        for p in reader.pages:
            t = p.extract_text() or ""
            pages_text.append(t)
        full_text = "\n".join(pages_text)
        res = {
            "success": True,
            "numPages": len(reader.pages),
            "text": full_text
        }
        sys.stdout.buffer.write(json.dumps(res, ensure_ascii=False).encode('utf-8'))
    except Exception as e:
        sys.stdout.buffer.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))

if __name__ == "__main__":
    extract_pdf()
