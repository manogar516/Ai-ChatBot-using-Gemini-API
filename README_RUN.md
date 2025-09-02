# Gemini AI Chatbot (Flask)

A minimal Flask web app that chats with Google Gemini (Generative AI).

## 1) Prereqs
- Python 3.9+
- A Google AI Studio API key (set `GOOGLE_API_KEY`)

## 2) Setup (Windows PowerShell)
```powershell
cd gemini_chatbot_fixed
python -m venv venv
venv\Scripts\Activate
pip install -r requirements.txt
$env:GOOGLE_API_KEY="YOUR_KEY_HERE"
# optional, defaults to gemini-1.5-flash
$env:GEMINI_MODEL="gemini-1.5-flash"

python app.py
# open http://127.0.0.1:5000
```

## 3) Setup (macOS/Linux)
```bash
cd gemini_chatbot_fixed
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export GOOGLE_API_KEY="YOUR_KEY_HERE"
# optional
export GEMINI_MODEL="gemini-1.5-flash"

python app.py
# open http://127.0.0.1:5000
```

If you run without setting `GOOGLE_API_KEY` or the `google-generativeai` package fails to import,
the app falls back to a *demo echo mode* so you can test the UI.

## Notes
- Do **not** expose your API key in client-side JavaScript. Keep it on the server.
- If you deploy behind a reverse proxy, set `host="0.0.0.0"` in `app.py`.
