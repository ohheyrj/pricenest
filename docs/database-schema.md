# Database Schema - Price Tracker

## Entity Relationship Diagram

```mermaid
erDiagram
    categories ||--o{ items : "has many"
    categories ||--o{ pending_movie_searches : "has many"
    items ||--o{ price_history : "has many"

    categories {
        int id PK "Primary Key"
        string name "Category name"
        string type "general|books|movies"
        boolean book_lookup_enabled "Enable book API lookup"
        string book_lookup_source "auto|google_books|kobo"
        datetime created_at "Creation timestamp"
    }

    items {
        int id PK "Primary Key"
        int category_id FK "Foreign Key → categories.id"
        string name "Item display name"
        string title "Book/Movie title"
        string author "Book author"
        string director "Movie director"
        int year "Publication/Release year"
        string url "Store URL"
        float price "Current price"
        boolean bought "Purchase status"
        string external_id "API tracking ID (iTunes trackId, etc.)"
        datetime created_at "Creation timestamp"
        datetime last_updated "Last price update"
    }

    price_history {
        int id PK "Primary Key"
        int item_id FK "Foreign Key → items.id"
        float old_price "Previous price"
        float new_price "Updated price"
        string price_source "google_books|apple|kobo|manual"
        string search_query "API search query used"
        datetime created_at "Price change timestamp"
    }

    pending_movie_searches {
        int id PK "Primary Key"
        int category_id FK "Foreign Key → categories.id"
        string title "Movie title to search"
        string director "Movie director"
        int year "Release year"
        string csv_row_data "Original CSV data"
        string status "pending|completed|failed"
        int retry_count "Number of retry attempts"
        datetime last_attempted "Last search attempt"
        datetime created_at "Creation timestamp"
    }
```

## Table Relationships

### 1. **categories → items** (One-to-Many)
- Each category can contain multiple items
- Items belong to exactly one category
- **Cascade**: Deleting a category deletes all its items

### 2. **items → price_history** (One-to-Many)
- Each item can have multiple price history entries
- Each price history entry belongs to one item
- **Cascade**: Deleting an item deletes all its price history

### 3. **categories → pending_movie_searches** (One-to-Many)
- Each category can have pending movie searches
- Used for batch CSV imports
- **Cascade**: Deleting a category deletes pending searches

## Key Design Decisions

### **External ID Tracking**
- `items.external_id` stores API-specific identifiers (iTunes trackId, Google Books ID)
- Enables accurate price refresh by exact lookup instead of search
- Prevents price drift from similar items

### **Price History Tracking**
- Every price change is recorded in `price_history`
- Tracks both old and new prices for complete audit trail
- Includes source (API) and search query for debugging

### **Category Types**
- `general`: Basic items with manual price tracking
- `books`: Auto-parsing of "Title by Author" format
- `movies`: iTunes API integration with trackId storage

### **Flexible Item Structure**
- Optional fields (`title`, `author`, `director`, `year`) support different item types
- `name` is always required as display name
- Type-specific fields are used based on category type

## SQLAlchemy Relationships

```python
# Category Model
class Category(db.Model):
    items = relationship('Item', back_populates='category', cascade='all, delete-orphan')

# Item Model  
class Item(db.Model):
    category = relationship('Category', back_populates='items')
    price_history = relationship('PriceHistory', back_populates='item', cascade='all, delete-orphan')

# PriceHistory Model
class PriceHistory(db.Model):
    item = relationship('Item', back_populates='price_history')
```

## Indexes (Recommended)

```sql
-- Performance indexes for common queries
CREATE INDEX idx_items_category_created ON items(category_id, created_at DESC);
CREATE INDEX idx_price_history_item_created ON price_history(item_id, created_at ASC);
CREATE INDEX idx_items_external_id ON items(external_id);
CREATE INDEX idx_categories_type ON categories(type);
```

## Migration Notes

- **Backwards Compatible**: New SQLAlchemy schema preserves all existing data
- **Automatic Migration**: `migrate_existing_data()` handles conversion from raw SQLite
- **Data Integrity**: Foreign key constraints ensure referential integrity
- **Timestamps**: All models include creation and update timestamps