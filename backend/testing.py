"""
GemBot Backend CLI Tester
--------------------------
Tests all API endpoints from the terminal.
Usage: python test_backend.py
"""

import requests
import json

# ─── CONFIG ───────────────────────────────────────────────────────────────────
BASE_URL = "http://localhost:8000"   # change to your ngrok URL if testing remotely

# Test user credentials (must already exist in Supabase, or use signup first)
TEST_EMAIL    = "ojsangwai17@gmail.com"
TEST_PASSWORD = "OjasSangwai@17"

# ─── HELPERS ──────────────────────────────────────────────────────────────────
def print_result(label, response):
    status = response.status_code
    symbol = "✅" if status < 400 else "❌"
    print(f"\n{symbol} [{status}] {label}")
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(response.text)
    print("─" * 50)

def test_signup():
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  TEST: Sign Up")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    res = requests.post(
        f"{BASE_URL}/auth/signup",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    print_result("POST /auth/signup", res)
    return res.status_code == 200 or res.status_code == 201

def get_token():
    """Sign in and return the JWT token."""
    print("\n🔐 Signing in to get JWT token...")
    res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if res.status_code == 200:
        token = res.json().get("access_token")
        print(f"✅ Token received: {token[:40]}...")
        return token
    else:
        print(f"❌ Login failed: {res.status_code} — {res.text}")
        return None

# ─── TESTS ────────────────────────────────────────────────────────────────────

def test_health():
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  TEST: Health Check")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    res = requests.get(f"{BASE_URL}/health")
    print_result("GET /health", res)


def test_chat(token, user_id):
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  TEST: Interactive Chat")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    print("\n[Type 'exit' or 'quit' to stop chatting]")
    headers = {"Authorization": f"Bearer {token}"}

    while True:
        msg = input("\n🗣  You: ")
        if msg.strip().lower() in ["exit", "quit"]:
            break

        res = requests.post(
            f"{BASE_URL}/chat",
            json={"message": msg},
            headers=headers
        )

        if res.status_code == 200:
            print(f"🤖 Bot: {res.json().get('reply')}")
        else:
            print_result(f"POST /chat", res)


def test_get_history(token, user_id):
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  TEST: Fetch Chat History")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/history/{user_id}", headers=headers)
    print_result(f"GET /history/{user_id}", res)


def test_delete_history(token, user_id):
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  TEST: Delete Chat History")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.delete(f"{BASE_URL}/history/{user_id}", headers=headers)
    print_result(f"DELETE /history/{user_id}", res)


def test_unauthorized_chat():
    """Should return 401 with no token."""
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  TEST: Unauthorized Request (expect 401)")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    res = requests.post(f"{BASE_URL}/chat", json={"message": "sneaky message"})
    print_result("POST /chat (no token)", res)


# ─── PAYMENT TESTS ────────────────────────────────────────────────────────────

def test_subscription_status(token):
    """Checks whether the user has an active subscription via RevenueCat."""
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  TEST: Subscription Status")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/payments/status", headers=headers)
    print_result("GET /payments/status", res)


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    print("\n╔══════════════════════════════════════════╗")
    print("║        GemBot Backend CLI Tester         ║")
    print("╚══════════════════════════════════════════╝")
    print(f"  Base URL : {BASE_URL}")
    print(f"  User     : {TEST_EMAIL}")

    # 1. Health check (no auth needed)
    test_health()

    # 2. Unauthorized request check
    test_unauthorized_chat()

    # 3. Sign up the test user (commented out — user already exists)
    # test_signup()

    # 4. Sign in and get token
    token = get_token()
    if not token:
        print("\n⛔ Cannot proceed without a valid token. Check your credentials.")
        return

    # 5. Decode user_id from token payload
    import base64, json as _json
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (4 - len(payload_b64) % 4)
        payload = _json.loads(base64.b64decode(payload_b64))
        user_id = payload.get("sub")
        print(f"\n🪪  User ID from token: {user_id}")
    except Exception as e:
        print(f"⚠️  Could not decode user_id from token: {e}")
        user_id = "unknown"

    # 6. Fetch history
    test_get_history(token, user_id)

    # 7. Delete history
    test_delete_history(token, user_id)

    # 8. Verify history is empty after delete
    print("\n  ↩  Verifying history is empty after delete...")
    test_get_history(token, user_id)

    # 9. Payment tests
    print("\n\n╔══════════════════════════════════════════╗")
    print("║           Payment Flow Tests 💳           ║")
    print("╚══════════════════════════════════════════╝")

    # Check subscription status via RevenueCat
    test_subscription_status(token)

    # 10. Interactive Chat (runs until user types exit/quit)
    test_chat(token, user_id)

    print("\n╔══════════════════════════════════════════╗")
    print("║           All Tests Completed ✅          ║")
    print("╚══════════════════════════════════════════╝\n")


if __name__ == "__main__":
    main()