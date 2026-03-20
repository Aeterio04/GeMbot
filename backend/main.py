from fastapi import FastAPI
from routes.chat import router as chat_router
from routes.history import router as history_router
from middleware.auth import router as auth_router
from routes.payment import router as payments_router
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
import os
from dotenv import load_dotenv

load_dotenv()

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=os.getenv("APP_ENV", "development"),  # development / production
    traces_sample_rate=0.2,   # captures 20% of requests for performance tracing
    integrations=[
        StarletteIntegration(),
        FastApiIntegration(),
    ]
)


app = FastAPI(title="GemBot API")

app.include_router(auth_router)                # add
app.include_router(chat_router)
app.include_router(history_router)
app.include_router(payments_router)
@app.get("/sentry-debug")
async def trigger_error():
    division_by_zero = 1 / 0

@app.get("/health")
def health():
    return {"status": "ok"}