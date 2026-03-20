from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime
from middleware.auth import get_current_user, get_token
from services.revenuecat import verify_webhook_signature, get_customer_info
from services.supabase import get_client

router = APIRouter(prefix="/payments")

# Entitlement identifier configured in the RevenueCat dashboard
ENTITLEMENT_ID = "pro"


# ── RevenueCat Webhook ────────────────────────────────────────────────────────
@router.post("/webhook")
async def revenuecat_webhook(request: Request):
    """
    Receives purchase/renewal/cancellation events from RevenueCat.
    Configure this URL in the RevenueCat dashboard under Integrations > Webhooks.
    """
    payload = await request.body()
    signature = request.headers.get("X-RevenueCat-Signature", "")

    if not verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = await request.json()
    event_type = event.get("event", {}).get("type")
    app_user_id = event.get("event", {}).get("app_user_id")
    product_id = event.get("event", {}).get("product_id", "")
    expiration_at_ms = event.get("event", {}).get("expiration_at_ms")

    if not app_user_id:
        return {"status": "ignored", "reason": "no app_user_id"}

    # Determine plan from product identifier
    plan = "yearly" if "yearly" in product_id.lower() else "weekly"

    expires_at = (
        datetime.utcfromtimestamp(expiration_at_ms / 1000).isoformat()
        if expiration_at_ms else None
    )

    # Use service-role client (no user token in webhooks)
    from services.supabase import get_service_client
    db = get_service_client()

    if event_type in ("INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE"):
        db.table("subscriptions").upsert({
            "user_id":    app_user_id,
            "plan":       plan,
            "status":     "active",
            "order_id":   event.get("event", {}).get("transaction_id", ""),
            "expires_at": expires_at,
        }, on_conflict="user_id").execute()

    elif event_type in ("CANCELLATION", "EXPIRATION", "BILLING_ISSUE"):
        db.table("subscriptions").update({
            "status": "inactive"
        }).eq("user_id", app_user_id).execute()

    return {"status": "ok"}


# ── Check Subscription Status ─────────────────────────────────────────────────
@router.get("/status")
async def subscription_status(user=Depends(get_current_user), token: str = Depends(get_token)):
    """
    Checks subscription status by querying RevenueCat directly,
    then syncs the result to the local subscriptions table.
    """
    try:
        customer = await get_customer_info(user.id)
        entitlements = customer.get("subscriber", {}).get("entitlements", {})
        pro = entitlements.get(ENTITLEMENT_ID)

        if not pro or not pro.get("expires_date"):
            return {"subscribed": False}

        expires_at = datetime.fromisoformat(pro["expires_date"].replace("Z", "+00:00"))
        if expires_at < datetime.now(expires_at.tzinfo):
            return {"subscribed": False, "reason": "expired"}

        # Determine plan from product identifier
        product_id = pro.get("product_identifier", "")
        plan = "yearly" if "yearly" in product_id.lower() else "weekly"

        # Keep local DB in sync
        get_client(token).table("subscriptions").upsert({
            "user_id":    user.id,
            "plan":       plan,
            "status":     "active",
            "expires_at": expires_at.isoformat(),
        }, on_conflict="user_id").execute()

        return {
            "subscribed": True,
            "plan":       plan,
            "expires_at": expires_at.isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
