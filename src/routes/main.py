"""
Main application routes.
"""

from flask import Blueprint, render_template, jsonify

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    """Serve the main HTML file."""
    return render_template("index.html")


@main_bp.route("/api/database/config")
def get_database_config():
    """Get database configuration."""
    try:
        return jsonify(
            {"type": "sqlite", "available": ["sqlite", "postgresql", "mysql"]}
        )
    except Exception as e:
        print(f"Error getting database config: {e}")
        return jsonify({"error": "Failed to get database config"}), 500
