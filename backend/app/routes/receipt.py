# backend/app/routes/receipt.py (relevant portion)
from fastapi import APIRouter, File, UploadFile, Depends, Header, HTTPException
from firebase_admin import auth as firebase_auth
from PIL import Image
import pytesseract
import tempfile
import shutil
import os
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Receipt, Item
from app.services.parser import extract_items

router = APIRouter()

def verify_token(authorization: str = Header(...)):
    try:
        token = authorization.split("Bearer ")[1]
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/upload-receipt")
async def upload_receipt(
    file: UploadFile = File(...),
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        image = Image.open(tmp_path)
        text = pytesseract.image_to_string(image)

        receipt = Receipt(user_id=user_id, text=text)
        db.add(receipt)
        db.commit()
        db.refresh(receipt)

        parsed_items = extract_items(text)
        for item in parsed_items:
            db_item = Item(
                receipt_id=receipt.id,
                name=item["name"],
                expiry_date=item["expiry_date"]
            )
            db.add(db_item)

        db.commit()

        return {"message": "Receipt and items saved.", "items": parsed_items}

    finally:
        os.remove(tmp_path)
