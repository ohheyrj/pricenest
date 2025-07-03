# Price Tracker Architecture

This document describes the modular architecture of the Price Tracker application.

## Overview

The application follows a clean, modular Flask architecture with clear separation of concerns:

- **Presentation Layer**: Templates and static files
- **API Layer**: Flask blueprints for different domains
- **Business Logic**: Services for complex operations
- **Data Layer**: Database operations and models
- **Configuration**: Centralized settings management

## Module Structure

### Core Application (`src/app.py`)
- **Purpose**: Main Flask application factory
- **Responsibilities**: 
  - App creation and configuration
  - Blueprint registration
  - Entry point for development server
- **Size**: ~50 lines (down from 500+)

```python
def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)
    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(categories_bp)
    app.register_blueprint(items_bp)
    app.register_blueprint(books_bp)
    return app
```

### Configuration (`src/config.py`)
- **Purpose**: Centralized configuration management
- **Features**:
  - Environment-based configuration
  - Development/Production/Testing configs
  - Environment variable handling
  - Type conversion and validation

### Database Layer (`src/database/`)

#### `connection.py`
- **Purpose**: Database connection and schema management
- **Responsibilities**:
  - SQLite connection handling
  - Database initialization
  - Schema creation and migration
  - Data formatting utilities

### API Routes (`src/routes/`)

#### `main.py`
- **Purpose**: Main application routes
- **Routes**: 
  - `/ ` - Serve main HTML page
  - `/api/database/config` - Database configuration

#### `categories.py`
- **Purpose**: Category management API
- **Routes**:
  - `GET /api/categories` - List all categories with items
  - `POST /api/categories` - Create new category
  - `PUT /api/categories/<id>` - Update category
  - `DELETE /api/categories/<id>` - Delete category

#### `items.py`
- **Purpose**: Item management API
- **Routes**:
  - `POST /api/categories/<id>/items` - Create item
  - `PUT /api/items/<id>` - Update item
  - `DELETE /api/items/<id>` - Delete item
  - `PATCH /api/items/<id>/bought` - Toggle purchase status

#### `books.py`
- **Purpose**: Book search API
- **Routes**:
  - `GET /api/books/search` - Search for books

### Services (`src/services/`)

#### `book_search.py`
- **Purpose**: External API integration for book search
- **Responsibilities**:
  - Google Books API integration
  - Price generation and estimation
  - Currency conversion
  - Fallback mock results
  - Result sorting and formatting

### Frontend (`src/static/` and `src/templates/`)
- **Templates**: Jinja2 HTML templates
- **Static Files**: CSS, JavaScript, images
- **Structure**: Standard Flask static file organization

### WSGI Entry Point (`src/wsgi.py`)
- **Purpose**: Production deployment entry point
- **Features**:
  - Database initialization on startup
  - WSGI application creation
  - Production-ready configuration

## Design Principles

### 1. Single Responsibility Principle
Each module has a single, well-defined purpose:
- Routes handle HTTP requests/responses
- Services handle business logic
- Database layer handles data operations
- Configuration handles settings

### 2. Dependency Injection
- Database connections are injected where needed
- Configuration is centralized and imported
- Services are stateless and easily testable

### 3. Flask Blueprints
- Logical grouping of related routes
- Namespace isolation
- Easy to register/unregister features
- Clear API organization

### 4. Separation of Concerns
```
Request → Route → Service → Database → Response
```

### 5. Testability
- Each module can be tested independently
- Clear interfaces between components
- Easy mocking and dependency injection
- Modular test structure mirrors code structure

## Benefits of Modular Structure

### Maintainability
- **Smaller Files**: Each file is focused and manageable
- **Clear Organization**: Easy to find relevant code
- **Isolated Changes**: Changes in one module don't affect others

### Scalability
- **Easy to Add Features**: New routes/services can be added independently
- **Team Development**: Multiple developers can work on different modules
- **Feature Toggles**: Blueprints can be conditionally registered

### Testing
- **Unit Testing**: Each module can be tested in isolation
- **Integration Testing**: Clear interfaces make integration tests easier
- **Mocking**: External dependencies are clearly separated

### Deployment
- **WSGI Ready**: Clean entry point for production servers
- **Configuration Management**: Environment-based configuration
- **Docker Friendly**: Clear separation makes containerization easier

## File Size Comparison

| Module | Lines | Purpose |
|--------|-------|---------|
| Original app.py | ~500 | Everything |
| New app.py | ~50 | App factory only |
| database/connection.py | ~80 | Database operations |
| routes/categories.py | ~120 | Category API |
| routes/items.py | ~150 | Items API |
| routes/books.py | ~20 | Book search API |
| routes/main.py | ~25 | Main routes |
| services/book_search.py | ~130 | Book search logic |
| config.py | ~50 | Configuration |

## Testing Structure

The test structure mirrors the code structure:

```
tests/
├── test_api.py              # All API endpoint tests
├── test_book_search.py      # Book search service tests
├── test_database.py         # Database operation tests
└── conftest.py             # Shared test configuration
```

## Future Extensibility

The modular structure makes it easy to add:

### New API Endpoints
1. Create new blueprint in `routes/`
2. Register blueprint in `app.py`
3. Add corresponding tests

### New Services
1. Create service module in `services/`
2. Import and use in relevant routes
3. Add service-specific tests

### New Database Support
1. Create new database adapter in `database/`
2. Update configuration options
3. Maintain same interface

### New Features
- Authentication: Add `auth.py` blueprint
- Caching: Add `cache.py` service
- Background Tasks: Add `tasks.py` service
- Admin Interface: Add `admin.py` blueprint

This architecture provides a solid foundation for growth while maintaining code quality and developer productivity.