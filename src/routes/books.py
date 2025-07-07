"""
Book search routes.
"""

from flask import Blueprint, jsonify, request

from src.services.book_search import search_google_books, search_kobo_books

books_bp = Blueprint("books", __name__)


@books_bp.route("/api/books/search")
def search_books():
    """Search for books."""
    try:
        query = request.args.get("query") or request.args.get("q")
        source = request.args.get("source", "google_books")

        if not query:
            return jsonify({"error": "Search query is required"}), 400

        if source == "kobo":
            results = search_kobo_books(query)
        else:
            results = search_google_books(query)
        
        return jsonify(results)

    except Exception as e:
        print(f"Book search error: {e}")
        return jsonify({"error": "Failed to search books"}), 500
