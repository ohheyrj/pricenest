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
    # Check if category exists first (outside try block to allow 404 to bubble up)
    category = Category.query.get_or_404(category_id)
    
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
        
        # Find the item
        item = Item.query.get(item_id)
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Update item fields
        item.name = data['name']
        item.url = data['url']
        item.price = float(data['price'])
        item.title = data.get('title')
        item.author = data.get('author')
        item.director = data.get('director')
        item.year = data.get('year')
        item.external_id = data.get('trackId') or data.get('external_id')  # Support both trackId and external_id
        item.last_updated = datetime.utcnow()
        
        # Save changes
        db.session.commit()
        
        # Return updated item
        return jsonify(item.to_dict())
            
    except ValueError as e:
        return jsonify({'error': 'Invalid price format'}), 400
    except Exception as e:
        print(f"Error updating item: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update item'}), 500


@items_bp.route('/api/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    """Delete an item."""
    try:
        # Find the item
        item = Item.query.get(item_id)
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Delete the item (cascade delete will handle price history)
        db.session.delete(item)
        db.session.commit()
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Error deleting item: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to delete item'}), 500


@items_bp.route('/api/items/<int:item_id>/bought', methods=['PATCH'])
def toggle_item_bought(item_id):
    """Toggle the bought status of an item."""
    try:
        # Find the item
        item = Item.query.get(item_id)
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Toggle bought status
        item.bought = not item.bought
        
        # Save changes
        db.session.commit()
        
        # Return updated item
        return jsonify(item.to_dict())
        
    except Exception as e:
        print(f"Error toggling item bought status: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to update item status'}), 500


@items_bp.route('/api/items/<int:item_id>/refresh-price', methods=['PATCH'])
def refresh_item_price(item_id):
    """Refresh the price of an item by re-searching the relevant API."""
    try:
        # Get the item and its category information using SQLAlchemy
        item = Item.query.join(Category).filter(Item.id == item_id).first()
        
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        item_data = {
            'id': item.id,
            'categoryId': item.category_id,
            'name': item.name,
            'title': item.title,
            'author': item.author,
            'director': item.director,
            'year': item.year,
            'url': item.url,
            'price': item.price,
            'bought': item.bought,
            'createdAt': item.created_at.isoformat() if item.created_at else None,
            'externalId': item.external_id,
            'categoryType': item.category.type
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
            price_history = PriceHistory(
                item_id=item_id,
                old_price=item_data['price'],
                new_price=new_price,
                price_source=price_source,
                search_query=search_query
            )
            db.session.add(price_history)
        
        # Update the item with the new price and timestamp
        item.price = new_price
        item.last_updated = datetime.utcnow()
        
        # Commit changes
        db.session.commit()
        
        # Return updated item with refresh information
        updated_item = item.to_dict()
        updated_item['priceRefresh'] = {
            'oldPrice': item_data['price'],
            'newPrice': item.price,
            'source': price_source,
            'searchQuery': search_query,
            'updated': new_price != item_data['price']
        }
        return jsonify(updated_item)
        
    except Exception as e:
        print(f"Error refreshing item price: {e}")
        db.session.rollback()
        return jsonify({'error': 'Failed to refresh item price'}), 500


@items_bp.route('/api/items/<int:item_id>/price-history', methods=['GET'])
def get_item_price_history(item_id):
    """Get price history for an item."""
    try:
        # Verify item exists
        item = Item.query.get(item_id)
        if not item:
            return jsonify({'error': 'Item not found'}), 404
        
        # Get price history using SQLAlchemy relationship
        history = []
        for price_history in item.price_history:
            history.append({
                'oldPrice': price_history.old_price,
                'newPrice': price_history.new_price,
                'priceSource': price_history.price_source,
                'searchQuery': price_history.search_query,
                'date': price_history.created_at.isoformat() if price_history.created_at else None
            })
        
        return jsonify({
            'itemId': item_id,
            'itemName': item.name,
            'priceHistory': history
        })
        
    except Exception as e:
        print(f"Error fetching price history: {e}")
        return jsonify({'error': 'Failed to fetch price history'}), 500