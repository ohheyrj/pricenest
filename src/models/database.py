"""
SQLAlchemy database setup and models.
"""

from datetime import datetime

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

# Initialize SQLAlchemy
db = SQLAlchemy()


class Category(db.Model):
    """Category model for organizing items."""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), default="general")
    book_lookup_enabled = Column(Boolean, default=False)
    book_lookup_source = Column(String(20), default="auto")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    items = relationship("Item", back_populates="category", cascade="all, delete-orphan")

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "bookLookupEnabled": self.book_lookup_enabled,
            "bookLookupSource": self.book_lookup_source,
            "items": [item.to_dict() for item in self.items],
        }


class Item(db.Model):
    """Item model for tracking prices of individual items."""

    __tablename__ = "items"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    name = Column(String(200), nullable=False)
    title = Column(String(200))
    author = Column(String(200))
    director = Column(String(200))
    year = Column(Integer)
    url = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    bought = Column(Boolean, default=False)
    external_id = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime)

    # Relationships
    category = relationship("Category", back_populates="items")
    price_history = relationship("PriceHistory", back_populates="item", cascade="all, delete-orphan")

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "categoryId": self.category_id,
            "name": self.name,
            "title": self.title,
            "author": self.author,
            "director": self.director,
            "year": self.year,
            "url": self.url,
            "price": self.price,
            "bought": self.bought,
            "externalId": self.external_id,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "lastUpdated": self.last_updated.isoformat() if self.last_updated else None,
        }


class PriceHistory(db.Model):
    """Price history model for tracking price changes over time."""

    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)
    price_source = Column(String(50))
    search_query = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    item = relationship("Item", back_populates="price_history")

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "oldPrice": self.old_price,
            "newPrice": self.new_price,
            "priceSource": self.price_source,
            "searchQuery": self.search_query,
            "date": self.created_at.isoformat() if self.created_at else None,
        }


class PendingMovieSearch(db.Model):
    """Model for tracking pending movie searches."""

    __tablename__ = "pending_movie_searches"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    title = Column(String(200), nullable=False)
    director = Column(String(200))
    year = Column(Integer)
    csv_row_data = Column(Text)
    status = Column(String(20), default="pending")
    retry_count = Column(Integer, default=0)
    last_attempted = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "categoryId": self.category_id,
            "title": self.title,
            "director": self.director,
            "year": self.year,
            "status": self.status,
            "retryCount": self.retry_count,
            "lastAttempted": (self.last_attempted.isoformat() if self.last_attempted else None),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
