import os
from flask import Flask, request, jsonify, render_template

from dotenv import load_dotenv
load_dotenv()

# Optional: you can swap to the official Python client if installed
try:
    import google.generativeai as genai
    USE_CLIENT = True
except Exception:
    USE_CLIENT = False

app = Flask(__name__, template_folder="templates", static_folder="static")

API_KEY = os.getenv("GOOGLE_API_KEY")  # Set this in your environment
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

if USE_CLIENT and API_KEY:
    genai.configure(api_key=API_KEY)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    payload = request.get_json(silent=True) or {}
    user_message = (payload.get("message") or "").strip()
    if not user_message:
        return jsonify({"reply": "Please type a message."}), 400

    # Option A: use official client if available
    if USE_CLIENT and API_KEY:
        try:
            model = genai.GenerativeModel(MODEL_NAME)
            resp = model.generate_content(user_message)
            reply_text = getattr(resp, "text", None)
            if not reply_text and getattr(resp, "candidates", None):
                # Fallback extraction
                first = resp.candidates[0]
                parts = getattr(first, "content", {}).parts if hasattr(first, "content") else []
                reply_text = getattr(parts[0], "text", "") if parts else ""
            return jsonify({"reply": reply_text or "(empty response)"})
        except Exception as e:
            return jsonify({"reply": f"Error from Gemini: {e}"}), 500

    # Option B: no client library installed or API key missing -> echo bot fallback
    return jsonify({"reply": f"(demo mode) You said: {user_message}"}), 200

if __name__ == "__main__":
    # You can set host="0.0.0.0" for LAN/mobile testing
    app.run(debug=True)
