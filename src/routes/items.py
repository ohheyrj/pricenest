"""
Item management routes using SQLAlchemy.
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
from src.models.database import db, Category, Item, PriceHistory

items_bp = Blueprint('items', __name__)


@items_bp.route('/api/categories/<int:category_id>/items', methods=['POST'])
def create_item(category_id):
    """Create a new item in a category."""
    try:
        data = request.get_json()
        required_fields = ['name', 'url', 'price']
        if not data or not all(field in data for field in required_fields):
            return jsonify({'error': 'Name, URL, and price are required'}), 400
        
        # Check if category exists
        category = Category.query.get_or_404(category_id)
        
        name = data['name']
        url = data['url']
        price = float(data['price'])
        title = data.get('title')
        author = data.get('author')
        director = data.get('director')
        year = data.get('year')
        external_id = data.get('trackId') or data.get('external_id')  # Support both trackId and external_id
        
        # For book categories, try to parse title/author if not provided
        if category.type == 'books' and not title and not author:
            by_index = name.rfind(' by ')
            if by_index > 0:
                title = name[:by_index]
                author = name[by_index + 4:]
        
        item = Item(
            category_id=category_id,
            name=name,
            title=title,
            author=author,
            director=director,
            year=year,
            url=url,
            price=price,
            bought=False,
            external_id=external_id
        )
        
        db.session.add(item)
        db.session.commit()
        
        return jsonify(item.to_dict()), 201
            
    except ValueError as e:
        return jsonify({'error': 'Invalid price format'}), 400
    except Exception as e:
        print(f"Error creating item: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to create item'}), 500


@items_bp.route('/api/items/<int:item_id>', methods=['PUT'])
def update_item(item_id):
    """Update an existing item."""
    try:
        data = request.get_json()
        required_fields = ['name', 'url', 'price']
        if not data or not all(field in data for field in required_fields):
            return jsonify({'error': 'Name, URL, and price are required'}), 400
        
        name = data['name']
        url = data['url']
        price = float(data['price'])
        title = data.get('title')
        author = data.get('author')
        director = data.get('director')
        year = data.get('year')
        external_id = data.get('trackId') or data.get('external_id')  # Support both trackId and external_id
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE items 
            SET name = ?, title = ?, author = ?, director = ?, year = ?, url = ?, price = ?, external_id = ?
            WHERE id = ?
        ''', (name, title, author, director, year, url, price, external_id, item_id))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Item not found'}), 404
        
        cursor.execute('''
            SELECT id, category_id, name, title, author, director, year, url, price, bought, created_at, external_id, last_updated
            FROM items WHERE id = ?
        ''', (item_id,))
        row = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        if row:
            item = {
                'id': row[0],
                'categoryId': row[1],
                'name': row[2],
                'title': row[3],
                'author': row[4],
                'director': row[5],
                'year': row[6],
                'url': row[7],
                'price': row[8],
                'bought': bool(row[9]),
                'createdAt': row[10] if len(row) > 10 else None,
                'externalId': row[11] if len(row) > 11 else None,
                'lastUpdated': row[12] if len(row) > 12 else None
            }
            return jsonify(item)
        else:
            return jsonify({'error': 'Failed to update item'}), 500
            
    except ValueError as e:
        return jsonify({'error': 'Invalid price format'}), 400
    except Exception as e:
        print(f"Error updating item: {e}")
        return jsonify({'error': 'Failed to update item'}), 500


@items_bp.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete an item."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM items WHERE id = ?', (item_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Item not found'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Error deleting item: {e}")
        return jsonify({'error': 'Failed to delete item'}), 500


@items_bp.route('/api/items/<int:item_id>/bought', methods=['PATCH'])
def toggle_item_bought(item_id):
    """Toggle the bought status of an item."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT bought FROM items WHERE id = ?', (item_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Item not found'}), 404
        
        current_bought = bool(row[0])
        new_bought = not current_bought
        
        cursor.execute('UPDATE items SET bought = ? WHERE id = ?', (int(new_bought), item_id))
        
        cursor.execute('''
            SELECT id, category_id, name, title, author, director, year, url, price, bought, created_at, external_id, last_updated
            FROM items WHERE id = ?
        ''', (item_id,))
        row = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        if row:
            item = {
                'id': row[0],
                'categoryId': row[1],
                'name': row[2],
                'title': row[3],
                'author': row[4],
                'director': row[5],
                'year': row[6],
                'url': row[7],
                'price': row[8],
                'bought': bool(row[9]),
                'createdAt': row[10] if len(row) > 10 else None,
                'externalId': row[11] if len(row) > 11 else None,
                'lastUpdated': row[12] if len(row) > 12 else None
            }
            return jsonify(item)
        else:
            return jsonify({'error': 'Failed to update item'}), 500
        
    except Exception as e:
        print(f"Error toggling item bought status: {e}")
        return jsonify({'error': 'Failed to update item status'}), 500


@items_bp.route('/api/items/<int:item_id>/refresh-price', methods=['PATCH'])
def refresh_item_price(item_id):
    """Refresh the price of an item by re-searching the relevant API."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get the item and its category information
        cursor.execute('''
            SELECT i.id, i.category_id, i.name, i.title, i.author, i.director, i.year, i.url, i.price, i.bought, i.created_at, i.external_id,
                   c.type as category_type
            FROM items i
            JOIN categories c ON i.category_id = c.id
            WHERE i.id = ?
        ''', (item_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Item not found'}), 404
        
        item_data = {
            'id': row[0],
            'categoryId': row[1],
            'name': row[2],
            'title': row[3],
            'author': row[4],
            'director': row[5],
            'year': row[6],
            'url': row[7],
            'price': row[8],
            'bought': bool(row[9]),
            'createdAt': row[10],
            'externalId': row[11],
            'categoryType': row[12]
        }
        
        # Determine what to search for based on the item's data and category type
        search_query = None
        new_price = None
        price_source = 'unknown'
        
        if item_data['categoryType'] == 'movies':
            # Import the movie search service
            from src.services.movie_search import search_apple_movies, get_movie_by_track_id
            
            # If we have a stored track ID, use it for exact lookup
            if item_data['externalId']:
                print(f"🎬 Using stored track ID: {item_data['externalId']}")
                lookup_result = get_movie_by_track_id(item_data['externalId'])
                if lookup_result.get('movie'):
                    best_match = lookup_result['movie']
                    new_price = best_match.get('price', item_data['price'])
                    price_source = best_match.get('priceSource', 'apple')
                    search_query = f"Track ID: {item_data['externalId']}"
                else:
                    print(f"⚠️ Track ID lookup failed: {lookup_result.get('error')}")
                    # Fallback to search by title
                    search_query = item_data['title'] or item_data['name']
                    if search_query:
                        search_results = search_apple_movies(search_query)
                        if search_results.get('movies') and len(search_results['movies']) > 0:
                            best_match = search_results['movies'][0]
                            new_price = best_match.get('price', item_data['price'])
                            price_source = best_match.get('priceSource', 'apple')
            else:
                # No track ID stored, search by title
                search_query = item_data['title'] or item_data['name']
                if search_query:
                    search_results = search_apple_movies(search_query)
                    if search_results.get('movies') and len(search_results['movies']) > 0:
                        best_match = search_results['movies'][0]
                        new_price = best_match.get('price', item_data['price'])
                        price_source = best_match.get('priceSource', 'apple')
        
        elif item_data['categoryType'] == 'books':
            # Import the book search service
            from src.services.book_search import search_google_books
            
            # Use title and author if available
            if item_data['title'] and item_data['author']:
                search_query = f"{item_data['title']} {item_data['author']}"
            else:
                search_query = item_data['name']
            
            if search_query:
                # Search using Google Books API
                google_results = search_google_books(search_query)
                if google_results.get('books') and len(google_results['books']) > 0:
                    best_match = google_results['books'][0]
                    new_price = best_match.get('price', item_data['price'])
                    price_source = best_match.get('priceSource', 'google_books')
        
        # If no new price was found, keep the original price
        if new_price is None:
            new_price = item_data['price']
            price_source = 'no_update'
        
        # Save price change to history if price actually changed
        if new_price != item_data['price']:
            cursor.execute('''
                INSERT INTO price_history (item_id, old_price, new_price, price_source, search_query)
                VALUES (?, ?, ?, ?, ?)
            ''', (item_id, item_data['price'], new_price, price_source, search_query))
        
        # Update the item with the new price and timestamp
        cursor.execute('''
            UPDATE items SET price = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?
        ''', (new_price, item_id))
        
        # Get the updated item
        cursor.execute('''
            SELECT id, category_id, name, title, author, director, year, url, price, bought, created_at, external_id, last_updated
            FROM items WHERE id = ?
        ''', (item_id,))
        updated_row = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        if updated_row:
            updated_item = {
                'id': updated_row[0],
                'categoryId': updated_row[1],
                'name': updated_row[2],
                'title': updated_row[3],
                'author': updated_row[4],
                'director': updated_row[5],
                'year': updated_row[6],
                'url': updated_row[7],
                'price': updated_row[8],
                'bought': bool(updated_row[9]),
                'createdAt': updated_row[10],
                'externalId': updated_row[11],
                'lastUpdated': updated_row[12],
                'priceRefresh': {
                    'oldPrice': item_data['price'],
                    'newPrice': updated_row[8],
                    'source': price_source,
                    'searchQuery': search_query,
                    'updated': new_price != item_data['price']
                }
            }
            return jsonify(updated_item)
        else:
            return jsonify({'error': 'Failed to refresh item price'}), 500
        
    except Exception as e:
        print(f"Error refreshing item price: {e}")
        return jsonify({'error': 'Failed to refresh item price'}), 500


@items_bp.route('/api/items/<int:item_id>/price-history', methods=['GET'])
def get_item_price_history(item_id):
    """Get price history for an item."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Verify item exists
        cursor.execute('SELECT id, name FROM items WHERE id = ?', (item_id,))
        item = cursor.fetchone()
        
        if not item:
            conn.close()
            return jsonify({'error': 'Item not found'}), 404
        
        # Get price history
        cursor.execute('''
            SELECT old_price, new_price, price_source, search_query, created_at
            FROM price_history 
            WHERE item_id = ?
            ORDER BY created_at ASC
        ''', (item_id,))
        
        history_rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in history_rows:
            history.append({
                'oldPrice': row[0],
                'newPrice': row[1],
                'priceSource': row[2],
                'searchQuery': row[3],
                'date': row[4]
            })
        
        return jsonify({
            'itemId': item_id,
            'itemName': item[1],
            'priceHistory': history
        })
        
    except Exception as e:
        print(f"Error fetching price history: {e}")
        return jsonify({'error': 'Failed to fetch price history'}), 500