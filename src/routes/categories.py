"""
Category management routes.
"""

from flask import Blueprint, request, jsonify
from src.database.connection import get_db_connection, format_category

categories_bp = Blueprint('categories', __name__)


@categories_bp.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all categories with their items."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM categories ORDER BY name')
        categories = []
        
        for category_row in cursor.fetchall():
            category = format_category(category_row)
            category_id = category['id']
            
            cursor.execute('''
                SELECT id, category_id, name, title, author, director, year, url, price, bought, created_at, external_id, last_updated
                FROM items 
                WHERE category_id = ? 
                ORDER BY created_at DESC
            ''', (category_id,))
            
            items = []
            for item_row in cursor.fetchall():
                item = {
                    'id': item_row[0],
                    'categoryId': item_row[1],
                    'name': item_row[2],
                    'title': item_row[3],
                    'author': item_row[4],
                    'director': item_row[5],
                    'year': item_row[6],
                    'url': item_row[7],
                    'price': item_row[8],
                    'bought': bool(item_row[9]),
                    'createdAt': item_row[10] if len(item_row) > 10 else None,
                    'externalId': item_row[11] if len(item_row) > 11 else None,
                    'lastUpdated': item_row[12] if len(item_row) > 12 else None
                }
                items.append(item)
            
            category['items'] = items
            categories.append(category)
        
        conn.close()
        return jsonify(categories)
        
    except Exception as e:
        print(f"Error fetching categories: {e}")
        return jsonify({'error': 'Failed to fetch categories'}), 500


@categories_bp.route('/api/categories', methods=['POST'])
def create_category():
    """Create a new category."""
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'error': 'Category name is required'}), 400
        
        name = data['name']
        category_type = data.get('type', 'general')
        book_lookup_enabled = data.get('bookLookupEnabled', False)
        book_lookup_source = data.get('bookLookupSource', 'auto')
        
        # Auto-enable book lookup for book categories
        if category_type == 'books' and not book_lookup_enabled:
            book_lookup_enabled = True
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO categories (name, type, book_lookup_enabled, book_lookup_source)
            VALUES (?, ?, ?, ?)
        ''', (name, category_type, int(book_lookup_enabled), book_lookup_source))
        
        category_id = cursor.lastrowid
        cursor.execute('SELECT * FROM categories WHERE id = ?', (category_id,))
        row = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        if row:
            category = format_category(row)
            return jsonify(category), 201
        else:
            return jsonify({'error': 'Failed to create category'}), 500
            
    except Exception as e:
        print(f"Error creating category: {e}")
        return jsonify({'error': 'Failed to create category'}), 500


@categories_bp.route('/api/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    """Update an existing category."""
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'error': 'Category name is required'}), 400
        
        name = data['name']
        category_type = data.get('type', 'general')
        book_lookup_enabled = data.get('bookLookupEnabled', False)
        book_lookup_source = data.get('bookLookupSource', 'auto')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE categories 
            SET name = ?, type = ?, book_lookup_enabled = ?, book_lookup_source = ?
            WHERE id = ?
        ''', (name, category_type, int(book_lookup_enabled), book_lookup_source, category_id))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Category not found'}), 404
        
        cursor.execute('SELECT * FROM categories WHERE id = ?', (category_id,))
        row = cursor.fetchone()
        
        conn.commit()
        conn.close()
        
        if row:
            category = format_category(row)
            return jsonify(category)
        else:
            return jsonify({'error': 'Failed to update category'}), 500
            
    except Exception as e:
        print(f"Error updating category: {e}")
        return jsonify({'error': 'Failed to update category'}), 500


@categories_bp.route('/api/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    """Delete a category."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM categories WHERE id = ?', (category_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'Category not found'}), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Error deleting category: {e}")
        return jsonify({'error': 'Failed to delete category'}), 500