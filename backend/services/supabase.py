from supabase import create_client, ClientOptions
import os
from pathlib import Path
from dotenv import load_dotenv

# Load from the .env file at the project root
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Initialize Supabase client
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

def get_client(token: str = None):
    """Returns a client scoped to the user's JWT so RLS policies pass."""
    if token:
        opts = ClientOptions(headers={"Authorization": f"Bearer {token}"})
        return create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"), options=opts)
    return supabase

def save_message(user_id: str, role: str, content: str, token: str = None):
    get_client(token).table("messages").insert({
        "user_id": user_id,
        "role": role,
        "content": content
    }).execute()

def get_history(user_id: str, token: str = None):
    res = get_client(token).table("messages") \
        .select("role, content, created_at") \
        .eq("user_id", user_id) \
        .order("created_at") \
        .execute()
    return res.data

def delete_history(user_id: str, token: str = None):
    get_client(token).table("messages") \
        .delete() \
        .eq("user_id", user_id) \
        .execute()

def get_service_client():
    """Returns a client using the service role key, bypassing RLS.
    Use only for server-side operations like webhook handlers."""
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not service_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY is not configured")
    return create_client(os.getenv("SUPABASE_URL"), service_key)
