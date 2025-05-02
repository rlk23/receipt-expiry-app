# backend/app/services/parser.py
from datetime import datetime, timedelta
from app.services.open_food_facts import get_shelf_life

def extract_items(text: str):
    found_items = []
    lines = text.lower().splitlines()
    today = datetime.today()

    for line in lines:
        item_name = line.strip()
        if not item_name:
            continue

        shelf_life_days = get_shelf_life(item_name)

        if item_name not in [item["name"] for item in found_items]:
            found_items.append({
                "name": item_name,
                "expiry_date": today + timedelta(days=shelf_life_days)
            })

    return found_items