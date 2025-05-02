from fastapi import APIRouter, File, UploadFile, Depends, Header, HTTPException
from firebase_admin import auth as firebase_auth
from PIL import Image
import pytesseract
import tempfile
import shutil
import os

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
):
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        image = Image.open(tmp_path)
        text = pytesseract.image_to_string(image)

        print(f"User {user_id} uploaded a receipt.")
        print("Extracted text:\n", text)

        return {
            "message": "OCR completed successfully",
            "text": text,
            "user_id": user_id,
        }
    finally:
        os.remove(tmp_path)
