# backend/app/services/open_food_facts.py
import requests

def get_shelf_life(item_name: str) -> int:
    """
    Search Open Food Facts for a given item name and return an estimated shelf life in days.
    """
    url = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={item_name}&search_simple=1&json=1"
    try:
        response = requests.get(url)
        data = response.json()

        if "products" in data and len(data["products"]) > 0:
            product = data["products"][0]
            name = product.get("product_name", "").lower()

            # Hardcoded fallbacks based on product_name
            if "milk" in name:
                return 7
            if "egg" in name:
                return 21
            if "bread" in name:
                return 4
            if "chicken" in name:
                return 2
            if "lettuce" in name:
                return 5

        return 5  # General fallback if no match

    except Exception:
        return 5  # Fail-safe fallback