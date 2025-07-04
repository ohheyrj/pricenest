# SQLAlchemy Testing Guide

## Overview

This guide covers the comprehensive test suite for the SQLAlchemy database layer implementation in the Price Tracker application.

## Test Structure

### 📁 Test Files

```
tests/
├── conftest_sqlalchemy.py          # SQLAlchemy test fixtures and configuration
├── test_sqlalchemy_models.py       # Model tests (Category, Item, PriceHistory)
├── test_sqlalchemy_api.py          # API endpoint tests with SQLAlchemy
├── test_migration.py               # Migration from SQLite to SQLAlchemy tests
└── run_sqlalchemy_tests.py         # Test runner script
```

### 🧪 Test Categories

#### **1. Model Tests (`test_sqlalchemy_models.py`)**
- **Category Model**: Creation, relationships, cascade deletes
- **Item Model**: All item types (books, movies, general), external ID tracking
- **PriceHistory Model**: Price change tracking, timestamps
- **PendingMovieSearch Model**: Batch import functionality
- **Complex Queries**: Joins, filtering, ordering

#### **2. API Tests (`test_sqlalchemy_api.py`)**
- **Categories API**: CRUD operations with SQLAlchemy
- **Items API**: Creation with auto-parsing, validation, external IDs
- **Price History API**: Historical data retrieval
- **Error Handling**: Rollbacks, validation, 404 responses
- **Relationship Integrity**: Foreign key constraints

#### **3. Migration Tests (`test_migration.py`)**
- **Data Migration**: SQLite → SQLAlchemy conversion
- **Relationship Preservation**: Foreign keys maintained
- **Duplicate Prevention**: No duplicate entries on re-migration
- **Edge Cases**: Missing databases, incomplete data

## Running Tests

### 🚀 **Quick Start**

```bash
# Run all SQLAlchemy tests
python run_sqlalchemy_tests.py

# Run with coverage report
python run_sqlalchemy_tests.py --coverage

# Run specific test class
python run_sqlalchemy_tests.py --class TestCategoryModel
```

### 🐍 **Using pytest directly**

```bash
# Run all SQLAlchemy tests
pytest tests/test_sqlalchemy_models.py tests/test_sqlalchemy_api.py tests/test_migration.py -v

# Run specific test file
pytest tests/test_sqlalchemy_models.py -v

# Run specific test
pytest tests/test_sqlalchemy_models.py::TestCategoryModel::test_create_category -v

# Run with coverage
pytest --cov=src/models --cov=src/database/sqlalchemy_connection tests/test_sqlalchemy_*.py
```

## Test Data & Fixtures

### 🔧 **Fixtures Available**

```python
@pytest.fixture
def sqlalchemy_app():
    """Test Flask app with SQLAlchemy"""

@pytest.fixture  
def sqlalchemy_client(sqlalchemy_app):
    """Test client for API calls"""

@pytest.fixture
def db_session(sqlalchemy_app):
    """Database session for direct model manipulation"""

@pytest.fixture
def sample_category():
    """Sample category data"""

@pytest.fixture
def sample_item():
    """Sample item data"""

@pytest.fixture
def sample_movie_item():
    """Sample movie with trackId"""
```

### 📊 **Test Data Structure**

Each test uses isolated temporary databases with:
- **3 Categories**: Books, Movies, Electronics
- **3 Items**: Book, Movie, Electronics item
- **1 Price History**: Example price change
- **Clean State**: Fresh database per test

## Test Examples

### ✅ **Model Creation Test**

```python
def test_create_category(self, sqlalchemy_app, db_session):
    """Test creating a new category."""
    with sqlalchemy_app.app_context():
        category = Category(
            name='Test Category',
            type='books',
            book_lookup_enabled=True
        )
        
        db_session.add(category)
        db_session.commit()
        
        assert category.id is not None
        assert category.name == 'Test Category'
```

### 🔗 **Relationship Test**

```python
def test_category_relationships(self, sqlalchemy_app, db_session):
    """Test category-item relationships."""
    with sqlalchemy_app.app_context():
        category = Category(name='Test', type='books')
        item = Item(category_id=category.id, name='Test Item', ...)
        
        # Test bidirectional relationship
        assert category.items[0] == item
        assert item.category == category
```

### 🌐 **API Integration Test**

```python
def test_create_item_api(self, sqlalchemy_app, sqlalchemy_client):
    """Test item creation via API."""
    item_data = {
        'name': 'Test Book',
        'url': 'https://example.com/book',
        'price': 19.99
    }
    
    response = sqlalchemy_client.post(
        '/api/categories/1/items',
        data=json.dumps(item_data),
        content_type='application/json'
    )
    
    assert response.status_code == 201
    assert json.loads(response.data)['name'] == 'Test Book'
```

## Coverage Goals

### 🎯 **Target Coverage**

- **Models**: 95%+ coverage of all model methods
- **Database Layer**: 90%+ coverage of migration and initialization
- **API Endpoints**: 90%+ coverage of SQLAlchemy routes
- **Error Handling**: 85%+ coverage of exception paths

### 📈 **Coverage Report**

```bash
# Generate HTML coverage report
python run_sqlalchemy_tests.py --coverage

# View report
open htmlcov/index.html
```

## Best Practices

### ✨ **Writing SQLAlchemy Tests**

1. **Use App Context**: Always wrap SQLAlchemy operations in `app_context()`
2. **Fresh Database**: Each test gets a clean temporary database
3. **Test Relationships**: Verify bidirectional relationships work
4. **Test Cascades**: Ensure cascade deletes function properly
5. **Test Constraints**: Verify foreign key constraints are enforced
6. **Test Rollbacks**: Ensure database rollbacks on errors

### 🔍 **Debugging Tests**

```python
# Add debug output in tests
def test_debug_example(self, sqlalchemy_app, db_session):
    with sqlalchemy_app.app_context():
        category = Category(name='Debug Test')
        db_session.add(category)
        db_session.commit()
        
        # Debug: Print all categories
        print(f"Categories: {[c.name for c in Category.query.all()]}")
        
        assert category.id is not None
```

### 🚨 **Common Issues**

1. **App Context**: Forgetting `with sqlalchemy_app.app_context():`
2. **Session Management**: Not committing changes in tests
3. **Foreign Keys**: Creating items without valid category_id
4. **Timezone Issues**: Date comparison problems in migration tests

## Continuous Integration

### 🔄 **CI Configuration**

```yaml
# .github/workflows/test-sqlalchemy.yml
name: SQLAlchemy Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run SQLAlchemy tests
        run: python run_sqlalchemy_tests.py --coverage
```

## Performance Testing

### ⚡ **Benchmark Tests**

```python
def test_bulk_insert_performance(self, sqlalchemy_app, db_session):
    """Test performance of bulk operations."""
    import time
    
    with sqlalchemy_app.app_context():
        start_time = time.time()
        
        # Create 1000 items
        category = Category(name='Bulk Test')
        db_session.add(category)
        db_session.commit()
        
        items = [
            Item(category_id=category.id, name=f'Item {i}', 
                 url=f'https://example.com/{i}', price=i)
            for i in range(1000)
        ]
        
        db_session.add_all(items)
        db_session.commit()
        
        elapsed = time.time() - start_time
        assert elapsed < 5.0  # Should complete in under 5 seconds
```

This comprehensive test suite ensures the SQLAlchemy implementation is robust, performant, and maintains data integrity throughout all operations.