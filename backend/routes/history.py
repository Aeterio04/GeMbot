from fastapi import APIRouter, Depends, HTTPException
from middleware.auth import get_current_user, get_token
from services.supabase import get_history, delete_history

router = APIRouter()

@router.get("/history/{user_id}")
async def fetch_history(user_id: str, user=Depends(get_current_user), token: str = Depends(get_token)):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return get_history(user_id, token)

@router.delete("/history/{user_id}")
async def clear_history(user_id: str, user=Depends(get_current_user), token: str = Depends(get_token)):
    if user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    delete_history(user_id, token)
    return {"message": "History cleared"}