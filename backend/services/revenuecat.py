import os
import hmac
import hashlib
import httpx
from dotenv import load_dotenv

load_dotenv()

REVENUECAT_API_KEY = os.getenv("REVENUECAT_API_KEY")
REVENUECAT_WEBHOOK_SECRET = os.getenv("REVENUECAT_WEBHOOK_SECRET")
REVENUECAT_API_URL = "https://api.revenuecat.com/v1"


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify the RevenueCat webhook signature using HMAC-SHA256."""
    if not REVENUECAT_WEBHOOK_SECRET:
        raise ValueError("REVENUECAT_WEBHOOK_SECRET is not configured")
    expected = hmac.new(
        REVENUECAT_WEBHOOK_SECRET.encode("utf-8"),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def get_customer_info(app_user_id: str) -> dict:
    """Fetch subscriber info from RevenueCat REST API."""
    if not REVENUECAT_API_KEY:
        raise ValueError("REVENUECAT_API_KEY is not configured")
    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{REVENUECAT_API_URL}/subscribers/{app_user_id}",
            headers={"Authorization": f"Bearer {REVENUECAT_API_KEY}"}
        )
        res.raise_for_status()
        return res.json()
