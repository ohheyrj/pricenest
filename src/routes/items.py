"""
Item management routes.
"""

from flask import Blueprint, request, jsonify
from src.database.connection import get_db_connection

items_bp = Blueprint('items', __name__)


@items_bp.route('/api/categories/<int:category_id>/items', methods=['POST'])
def create_item(category_id):
    """Create a new item in a category."""
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
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if category exists
        cursor.execute('SELECT id, type FROM categories WHERE id = ?', (category_id,))
        category_row = cursor.fetchone()
        if not category_row:
            conn.close()
            return jsonify({'error': 'Category not found'}), 404
        
        category_type = category_row[1]
        
        # For book categories, try to parse title/author if not provided
        if category_type == 'books' and not title and not author:
            by_index = name.rfind(' by ')
            if by_index > 0:
                title = name[:by_index]
                author = name[by_index + 4:]
        
        cursor.execute('''
            INSERT INTO items (category_id, name, title, author, director, year, url, price, bought)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        ''', (category_id, name, title, author, director, year, url, price))
        
        item_id = cursor.lastrowid
        cursor.execute('''
            SELECT id, category_id, name, title, author, director, year, url, price, bought, created_at 
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
                'createdAt': row[10] if len(row) > 10 else None
            }
            return jsonify(item), 201
        else:
            return jsonify({'error': 'Failed to create item'}), 500
            
    except ValueError as e:
        return jsonify({'error': 'Invalid price format'}), 400
    except Exception as e:
        print(f"Error creating item: {e}")
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
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE items 
            SET name = ?, title = ?, author = ?, director = ?, year = ?, url = ?, price = ?
            WHERE id = ?
        ''', (name, title, author, director, year, url, price, item_id))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Item not found'}), 404
        
        cursor.execute('''
            SELECT id, category_id, name, title, author, director, year, url, price, bought, created_at 
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
                'createdAt': row[10] if len(row) > 10 else None
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
            SELECT id, category_id, name, title, author, director, year, url, price, bought, created_at 
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
                'createdAt': row[10] if len(row) > 10 else None
            }
            return jsonify(item)
        else:
            return jsonify({'error': 'Failed to update item'}), 500
        
    except Exception as e:
        print(f"Error toggling item bought status: {e}")
        return jsonify({'error': 'Failed to update item status'}), 500