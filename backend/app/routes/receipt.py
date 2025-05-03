from fastapi import APIRouter, File, UploadFile, Depends, Header, HTTPException, Path, Body
from firebase_admin import auth as firebase_auth
from PIL import Image
import pytesseract
import tempfile
import shutil
import os
from sqlalchemy.orm import Session
from datetime import datetime
from uuid import UUID

from app.database import get_db
from app.models.models import Receipt, Item, User
from app.services.parser import extract_items

router = APIRouter()

# Token verification
def verify_token(authorization: str = Header(...)):
    try:
        token = authorization.split("Bearer ")[1]
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# Upload receipt + extract/store items
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
        return { "message": "Receipt and items saved.", "items": parsed_items }

    finally:
        os.remove(tmp_path)

# 📦 Fetch items for current user
@router.get("/items")
def get_user_items(user_id: str = Depends(verify_token), db: Session = Depends(get_db)):
    items = db.query(Item).join(Receipt).filter(Receipt.user_id == user_id).all()
    today = datetime.today()

    results = []
    for item in items:
        days_left = (item.expiry_date - today).days
        results.append({
            "id": str(item.id),
            "name": item.name,
            "expiry_date": item.expiry_date.strftime("%Y-%m-%d"),
            "days_left": days_left
        })

    return { "items": results }

# 🗑️ Delete an item
@router.delete("/items/{item_id}")
def delete_item(
    item_id: UUID,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    item = db.query(Item).join(Receipt).filter(
        Item.id == item_id,
        Receipt.user_id == user_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}

# ✏️ Update an item
@router.put("/items/{item_id}")
def update_item(
    item_id: UUID,
    payload: dict,
    user_id: str = Depends(verify_token),
    db: Session = Depends(get_db)
):
    item = db.query(Item).join(Receipt).filter(
        Item.id == item_id,
        Receipt.user_id == user_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if "name" in payload:
        item.name = payload["name"]
    if "expiry_date" in payload:
        item.expiry_date = datetime.strptime(payload["expiry_date"], "%Y-%m-%d")

    db.commit()
    return {"message": "Item updated"}

# 🔔 Register Push Notification Token
@router.post("/register-push-token")
def register_push_token(
    user_id: str = Depends(verify_token),
    token: str = Body(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.push_token = token
        db.commit()
        return {"message": "Push token saved"}
    raise HTTPException(status_code=404, detail="User not found")
