"""
Book search service for integrating with external APIs.
"""

import requests
from typing import Dict, Any


def search_google_books(query: str) -> Dict[str, Any]:
    """Search Google Books API."""
    try:
        url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=10&printType=books&country=GB"
        response = requests.get(url, timeout=10)

        if not response.ok:
            return get_mock_results(query)

        data = response.json()
        if not data.get("items"):
            return get_mock_results(query)

        books = []
        for item in data["items"][:10]:
            volume_info = item.get("volumeInfo", {})
            sale_info = item.get("saleInfo", {})

            title = volume_info.get("title")
            if not title:
                continue

            price = generate_realistic_price(volume_info, sale_info)
            kobo_url = f"https://www.kobo.com/gb/en/search?query={requests.utils.quote(title)}"

            author = ", ".join(volume_info.get("authors", [])) or "Unknown Author"
            display_name = f"{title} by {author}"

            has_real_price = sale_info.get("listPrice", {}).get("amount")
            price_source = "google_books" if has_real_price else "estimated"

            book = {
                "title": title,
                "author": author,
                "name": display_name,
                "price": price,
                "url": kobo_url,
                "priceSource": price_source,
            }
            books.append(book)

        # Sort books: real prices first, then estimated prices
        books.sort(
            key=lambda book: (
                0 if book["priceSource"] == "google_books" else 1,
                book["price"],
            )
        )

        return {"books": books}

    except Exception as e:
        print(f"Book search error: {e}")
        return get_mock_results(query)


def generate_realistic_price(volume_info: Dict, sale_info: Dict) -> float:
    """Generate realistic book prices."""
    list_price = sale_info.get("listPrice")
    if list_price and list_price.get("amount"):
        price = float(list_price["amount"])
        currency = list_price.get("currencyCode", "GBP")

        if currency == "USD":
            price *= 0.79

        return round(price, 2)

    # Generate based on book characteristics
    page_count = volume_info.get("pageCount", 250)
    base_price = 8.99

    if page_count > 400:
        base_price = 12.99
    elif page_count > 300:
        base_price = 10.99
    elif page_count < 150:
        base_price = 6.99

    import random

    variation = (random.random() - 0.5) * 2
    base_price += variation

    return round(max(2.99, min(19.99, base_price)), 2)


def get_mock_results(query: str) -> Dict[str, Any]:
    """Generate mock search results."""
    mock_data = [
        {
            "title": f"{query} - Sample Book 1",
            "author": "Sample Author",
            "price": 9.99,
            "priceSource": "sample",
        },
        {
            "title": f"{query} - Sample Book 2",
            "author": "Another Author",
            "price": 12.99,
            "priceSource": "sample",
        },
    ]

    mock_books = []
    for data in mock_data:
        display_name = f"{data['title']} by {data['author']}"
        book = {
            "title": data["title"],
            "author": data["author"],
            "name": display_name,
            "price": data["price"],
            "url": f"https://www.kobo.com/gb/en/search?query={requests.utils.quote(query)}",
            "priceSource": data["priceSource"],
        }
        mock_books.append(book)

    return {"books": mock_books}
