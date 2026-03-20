import os
from dotenv import load_dotenv
from typing import TypedDict

load_dotenv()
USE_GROQ = True  # Toggle this to switch providers

# --- Groq ---
from groq import Groq
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# --- Gemini ---
import google.generativeai as genai
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
gemini_model = genai.GenerativeModel("gemini-1.5-flash")

# --- Prompting ---
class Message(TypedDict):
    role: str
    content: str

SYSTEM_PROMPT = os.getenv("SYSTEM_PROMPT", "You are GemBot, a helpful assistant.")
MAX_HISTORY_MESSAGES = 10

def build_payload(history: list[Message], new_message: str) -> list[Message]:
    trimmed = history[-MAX_HISTORY_MESSAGES:]
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": m["role"], "content": m["content"]} for m in trimmed],
        {"role": "user", "content": new_message},
    ]


def get_llm_response(messages: list[dict]) -> str:
    """
    messages format: [{"role": "user", "content": "hello"}, ...]
    """
    if USE_GROQ:
        # Inject system prompt at the front if not already present
        if not messages or messages[0].get("role") != "system":
            messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": m["role"], "content": m["content"]}
                for m in messages
            ]
        )
        return response.choices[0].message.content

    else:
        # Gemini handles system prompt separately
        system_instruction = SYSTEM_PROMPT
        model = genai.GenerativeModel(
            "gemini-1.5-flash",
            system_instruction=system_instruction
        )

        history = []
        for m in messages[:-1]:  # all but last
            history.append({
                "role": "user" if m["role"] == "user" else "model",
                "parts": [m["content"]]
            })

        chat = model.start_chat(history=history)
        response = chat.send_message(messages[-1]["content"])
        return response.text