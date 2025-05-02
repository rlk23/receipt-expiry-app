from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import receipt
import firebase_admin
from firebase_admin import credentials

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Use specific origins in production!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Firebase Admin init
cred = credentials.Certificate("backend/receipt-expiry-app-firebase-adminsdk-fbsvc-0c6eddfe16.json")
firebase_admin.initialize_app(cred)

# Routes
app.include_router(receipt.router)
