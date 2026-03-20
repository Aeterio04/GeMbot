from fastapi import APIRouter, HTTPException, Header, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from services.supabase import supabase
import os
import dotenv
dotenv.load_dotenv()

router = APIRouter(prefix="/auth")

class AuthRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
async def signup(req: AuthRequest):
    try:
        res = supabase.auth.sign_up({
            "email": req.email,
            "password": req.password
        })
        return {"message": "Signup successful", "user_id": res.user.id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))



@router.post("/login")
async def login(req: AuthRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        return {
            "access_token": res.session.access_token,
            "user_id": res.user.id
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

def get_token(authorization: str = Header(...)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid token format")
    return authorization.split(" ")[1]

def get_current_user(token: str = Depends(get_token)):
    """Extract and verify the JWT."""
    try:
        # Supabase verifies the JWT and returns the user
        user = supabase.auth.get_user(token)
        return user.user
    except Exception as e:
        print(f"Supabase get_user error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# routes/auth.py  — add this to your existing file

from fastapi.responses import RedirectResponse

@router.get("/oauth/{provider}")
async def oauth_login(provider: str):
    """
    Returns the Supabase OAuth URL for the given provider.
    Client opens this URL in a browser.
    """
    allowed_providers = {"google", "github"}
    if provider not in allowed_providers:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    oauth_url = (
        f"{os.getenv('SUPABASE_URL')}/auth/v1/authorize"
        f"?provider={provider}"
        f"&redirect_to={os.getenv('OAUTH_REDIRECT_URL')}"
    )
    return {"url": oauth_url}


@router.post("/oauth/callback")
async def oauth_callback(payload: dict):
    """
    Called by the client after Supabase redirects back with a session.
    Validates the session and returns user info.
    """
    try:
        access_token = payload.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Missing access token")

        # Verify the token via Supabase
        user = supabase.auth.get_user(access_token)
        return {
            "user_id": user.user.id,
            "email": user.user.email,
            "access_token": access_token
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))