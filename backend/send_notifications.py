import requests
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models.models import Item, Receipt, User

def send_expiry_notifications():
    db = SessionLocal()
    tomorrow = datetime.today().date() + timedelta(days=1)

    items = db.query(Item).join(Receipt).filter(
        Item.expiry_date == tomorrow,
        Item.notified == False
    ).all()

    for item in items:
        receipt = db.query(Receipt).filter(Receipt.id == item.receipt_id).first()
        user = db.query(User).filter(User.id == receipt.user_id).first()

        if user and user.push_token:
            message = {
                "to": user.push_token,
                "title": "🛒 Expiry Reminder",
                "body": f"{item.name} expires tomorrow!"
            }

            res = requests.post("https://exp.host/--/api/v2/push/send", json=message)

            if res.status_code == 200:
                item.notified = True
                db.commit()

    db.close()

if __name__ == "__main__":
    send_expiry_notifications()
