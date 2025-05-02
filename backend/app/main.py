# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import receipt
import firebase_admin
from firebase_admin import credentials
from app.database.session import engine
from app.models.models import Base
from dotenv import load_dotenv
import os

load_dotenv()

service_account_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
cred = credentials.Certificate(service_account_path)
firebase_admin.initialize_app(cred)

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(receipt.router)
