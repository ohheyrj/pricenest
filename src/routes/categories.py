"""
Category management routes using SQLAlchemy.
"""

from flask import Blueprint, jsonify, request

from src.models.database import Category, db

categories_bp = Blueprint("categories", __name__)


@categories_bp.route("/api/categories", methods=["GET"])
def get_categories():
    """Get all categories with their items."""
    try:
        categories = Category.query.order_by(Category.name).all()
        return jsonify([category.to_dict() for category in categories])

    except Exception as e:
        print(f"Error fetching categories: {e}")
        return jsonify({"error": "Failed to fetch categories"}), 500


@categories_bp.route("/api/categories", methods=["POST"])
def create_category():
    """Create a new category."""
    try:
        data = request.get_json()
        if not data or not data.get("name"):
            return jsonify({"error": "Category name is required"}), 400

        name = data["name"]
        category_type = data.get("type", "general")
        book_lookup_enabled = data.get("bookLookupEnabled", False)
        book_lookup_source = data.get("bookLookupSource", "auto")

        # Auto-enable book lookup for book categories
        if category_type == "books" and not book_lookup_enabled:
            book_lookup_enabled = True

        category = Category(
            name=name,
            type=category_type,
            book_lookup_enabled=book_lookup_enabled,
            book_lookup_source=book_lookup_source,
        )

        db.session.add(category)
        db.session.commit()

        return jsonify(category.to_dict()), 201

    except Exception as e:
        print(f"Error creating category: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to create category"}), 500


@categories_bp.route("/api/categories/<int:category_id>", methods=["PUT"])
def update_category(category_id):
    """Update an existing category."""
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Category name is required"}), 400

    category = Category.query.get(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
    
    try:
        category.name = data["name"]
        category.type = data.get("type", "general")
        category.book_lookup_enabled = data.get("bookLookupEnabled", False)
        category.book_lookup_source = data.get("bookLookupSource", "auto")

        db.session.commit()

        return jsonify(category.to_dict())

    except Exception as e:
        print(f"Error updating category: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to update category"}), 500


@categories_bp.route("/api/categories/<int:category_id>", methods=["DELETE"])
def delete_category(category_id):
    """Delete a category."""
    category = Category.query.get(category_id)
    if not category:
        return jsonify({"error": "Category not found"}), 404
    
    try:
        db.session.delete(category)
        db.session.commit()

        return jsonify({"success": True})

    except Exception as e:
        print(f"Error deleting category: {e}")
        db.session.rollback()
        return jsonify({"error": "Failed to delete category"}), 500
