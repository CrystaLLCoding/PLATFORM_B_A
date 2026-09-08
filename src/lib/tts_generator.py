import asyncio
import sys
import json
import edge_tts
import os

async def generate_speech():
    try:
        # Read JSON payload from stdin
        raw_input = sys.stdin.buffer.read().decode('utf-8')
        if not raw_input:
            sys.stdout.buffer.write(json.dumps({"success": False, "error": "No input received"}).encode('utf-8'))
            return

        payload = json.loads(raw_input)
        text = payload.get("text", "")
        voice = payload.get("voice", "ru-RU-DmitryNeural")
        rate = payload.get("rate", "+0%")
        volume = payload.get("volume", "+0%")

        if not text:
            sys.stdout.buffer.write(json.dumps({"success": False, "error": "Empty text"}).encode('utf-8'))
            return

        communicate = edge_tts.Communicate(text, voice, rate=rate, volume=volume)
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])

        audio_bytes = b"".join(audio_chunks)
        import base64
        b64_audio = base64.b64encode(audio_bytes).decode('utf-8')
        data_uri = f"data:audio/mp3;base64,{b64_audio}"

        res = {
            "success": True,
            "dataUri": data_uri,
            "sizeBytes": len(audio_bytes),
            "voice": voice
        }
        sys.stdout.buffer.write(json.dumps(res).encode('utf-8'))
    except Exception as e:
        sys.stdout.buffer.write(json.dumps({"success": False, "error": str(e)}).encode('utf-8'))

if __name__ == "__main__":
    asyncio.run(generate_speech())
