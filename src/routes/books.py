"""
Book search routes.
"""

from flask import Blueprint, request, jsonify
from src.services.book_search import search_google_books

books_bp = Blueprint('books', __name__)


@books_bp.route('/api/books/search')
def search_books():
    """Search for books."""
    try:
        query = request.args.get('query')
        source = request.args.get('source', 'auto')
        
        if not query:
            return jsonify({'error': 'Search query is required'}), 400
        
        results = search_google_books(query)
        return jsonify(results)
        
    except Exception as e:
        print(f"Book search error: {e}")
        return jsonify({'error': 'Failed to search books'}), 500