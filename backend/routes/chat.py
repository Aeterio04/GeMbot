from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from middleware.auth import get_current_user, get_token
from services.llm import get_llm_response, build_payload
from services.supabase import save_message, get_history

router = APIRouter()

class ChatRequest(BaseModel):
    message: str  # just the latest user message

@router.post("/chat")
async def chat(req: ChatRequest, user=Depends(get_current_user), token: str = Depends(get_token)):
    user_id = user.id

    try:
        # 1. Fetch history BEFORE saving (clean context, no dangling msgs)
        history = get_history(user_id, token)

        # 2. Build payload with system prompt + history + new message
        messages = build_payload(history, req.message)

        # 3. Get LLM response
        reply = get_llm_response(messages)

        # 4. Save both turns only after successful LLM response
        save_message(user_id, "user", req.message, token)
        save_message(user_id, "assistant", reply, token)

        return {"reply": reply}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))