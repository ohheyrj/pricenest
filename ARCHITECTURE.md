# Price Tracker Architecture

This document describes the modular architecture of the Price Tracker application.

## Overview

The application follows a clean, modular full-stack architecture with clear separation of concerns:

### Backend (Flask)
- **Presentation Layer**: Templates and static files
- **API Layer**: Flask blueprints for different domains
- **Business Logic**: Services for complex operations
- **Data Layer**: Database operations and models
- **Configuration**: Centralized settings management

### Frontend (JavaScript)
- **Component Layer**: Reusable UI components and widgets
- **Service Layer**: Business logic and API integration
- **Build Layer**: Webpack bundling and optimization
- **Universal Exports**: Cross-environment module compatibility

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

### Frontend JavaScript Modules (`src/static/js/`)

#### Core Application (`app.js`)
- **Purpose**: Webpack entry point and application coordinator
- **Responsibilities**:
  - Module loading in dependency order
  - Application initialization
  - Global error handling
  - Environment detection

#### API Layer (`api-client.js`)
- **Purpose**: Centralized API communication
- **Features**:
  - RESTful endpoint abstraction
  - Error handling and response formatting
  - Request/response logging
  - Universal export compatibility

#### Components (`components/`)

##### `Modal.js`
- **Purpose**: Modal dialog management system
- **Features**:
  - Focus trapping and accessibility
  - Keyboard navigation (ESC, Tab)
  - Lifecycle callbacks (onOpen, onClose)
  - Backdrop click handling

##### `UIComponents.js`
- **Purpose**: Reusable UI component library
- **Components**:
  - Notification system (success/error/info messages)
  - Loading states and spinners
  - Card components
  - Button components with various styles
  - Form validation helpers

##### `FilterControls.js`
- **Purpose**: Advanced filtering and search system
- **Features**:
  - Real-time search across items
  - Status filtering (all/pending/purchased)
  - Sorting options (name, price, date)
  - View mode toggles (grid/list)
  - State persistence via localStorage

##### `FormHandler.js`
- **Purpose**: Form validation and submission handling
- **Features**:
  - Client-side validation
  - Error message display
  - Success feedback
  - Form state management

#### Services (`services/`)

##### `BookSearch.js`
- **Purpose**: Book search integration
- **APIs**: Google Books, Kobo UK
- **Features**:
  - Multi-source search with fallbacks
  - Price estimation for books without pricing
  - Category validation
  - Result formatting and sorting

##### `MovieSearch.js`
- **Purpose**: Movie search integration
- **API**: Apple Store
- **Features**:
  - Movie metadata retrieval
  - Director and year information
  - Category-specific availability
  - Result formatting

##### `SearchManager.js`
- **Purpose**: Search UI orchestration
- **Responsibilities**:
  - Coordinating between search services
  - Managing search modals and forms
  - Handling search result display
  - Item addition workflows

#### Utilities (`csv-importer.js`)
- **Purpose**: CSV file processing and import
- **Features**:
  - File validation and parsing
  - Progress tracking with visual feedback
  - Error handling and reporting
  - Batch processing with configurable delays

#### Templates (`src/templates/`)
- **`index.html`**: Main Flask template with individual script tags
- **`index-webpack.html`**: Webpack build template with bundled scripts
- **Template Selection**: Automatic based on build mode

### WSGI Entry Point (`src/wsgi.py`)
- **Purpose**: Production deployment entry point
- **Features**:
  - Database initialization on startup
  - WSGI application creation
  - Production-ready configuration

### Build System (`webpack.config.js`)

#### Development Mode
- **Fast builds**: Optimized for development speed
- **Source maps**: Full debugging information 
- **Hot reload**: Live updates during development
- **No minification**: Readable output for debugging

#### Production Mode
- **Code splitting**: Separates components, services, and main code
- **Minification**: Terser plugin for optimized JavaScript
- **Content hashing**: Cache-busting filenames
- **Bundle analysis**: Size optimization and analysis

#### Universal Module Exports
- **CommonJS**: Current Node.js compatibility (`module.exports`)
- **ES Modules**: Webpack and modern bundler support (`export default`)
- **AMD**: RequireJS compatibility (`define()`)
- **Browser Globals**: Direct script tag support (`window.ModuleName`)

#### Package Management
- **package.json**: Node.js dependencies and build scripts
- **devenv.nix**: Reproducible development environment
- **Dependency isolation**: Clear separation of dev/runtime dependencies

## Design Principles

### 1. Single Responsibility Principle
Each module has a single, well-defined purpose:
- **Backend**: Routes handle HTTP requests/responses
- **Backend**: Services handle business logic
- **Backend**: Database layer handles data operations
- **Backend**: Configuration handles settings
- **Frontend**: Components handle UI interactions
- **Frontend**: Services handle API communication and business logic
- **Frontend**: Utilities handle specific tasks (CSV import, etc.)

### 2. Dependency Injection
- **Backend**: Database connections are injected where needed
- **Backend**: Configuration is centralized and imported
- **Backend**: Services are stateless and easily testable
- **Frontend**: API client is injected into services
- **Frontend**: Components receive dependencies via constructor parameters

### 3. Flask Blueprints
- Logical grouping of related routes
- Namespace isolation
- Easy to register/unregister features
- Clear API organization

### 4. Separation of Concerns

#### Backend Flow
```
HTTP Request → Flask Route → Service → Database → HTTP Response
```

#### Frontend Flow
```
User Interaction → Component → Service → API Client → Backend API
```

#### End-to-End Flow
```
UI Event → Frontend Service → API Client → Flask Route → Backend Service → Database → Response → Frontend Update
```

### 5. Testability
- **Backend**: Each module can be tested independently
- **Backend**: Clear interfaces between components
- **Backend**: Easy mocking and dependency injection
- **Frontend**: JavaScript modules have comprehensive test coverage
- **Frontend**: Universal exports enable testing in Node.js environment
- **Both**: Modular test structure mirrors code structure

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

### Backend Modules
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

### Frontend Modules
| Module | Lines | Purpose |
|--------|-------|---------|
| Original script.js | ~2000+ | Everything |
| New script.js | ~800 | Main application logic |
| app.js | ~85 | Webpack entry point |
| api-client.js | ~350 | API communication |
| csv-importer.js | ~300 | CSV import functionality |
| components/Modal.js | ~450 | Modal management |
| components/UIComponents.js | ~800 | UI component library |
| components/FilterControls.js | ~400 | Filtering system |
| components/FormHandler.js | ~200 | Form handling |
| services/BookSearch.js | ~225 | Book search logic |
| services/MovieSearch.js | ~195 | Movie search logic |
| services/SearchManager.js | ~445 | Search orchestration |

## Testing Structure

The test structure mirrors the code structure:

```
tests/
├── test_api.py              # Backend API endpoint tests
├── test_book_search.py      # Backend book search service tests  
├── test_database.py         # Backend database operation tests
├── test_search_modules.py   # Frontend search module tests
├── test_ui_components.py    # Frontend UI component tests
└── conftest.py             # Shared test configuration
```

### Frontend Testing
- **Node.js Environment**: Tests run in Node.js using the universal exports
- **Module Isolation**: Each frontend module can be tested independently
- **Mock Dependencies**: API client and DOM elements are easily mocked
- **Comprehensive Coverage**: Tests cover both component and service layers

## Future Extensibility

The modular structure makes it easy to add:

### Backend Extensions
1. **New API Endpoints**: Create new blueprint in `routes/`, register in `app.py`
2. **New Services**: Create service module in `services/`, import in relevant routes
3. **New Database Support**: Create adapter in `database/`, maintain same interface

### Frontend Extensions
1. **New Components**: Add to `components/`, export with universal pattern
2. **New Services**: Add to `services/`, integrate with existing SearchManager
3. **New Features**: Create focused modules with clear responsibilities

### Build System Extensions
1. **New Build Targets**: Add configurations to `webpack.config.js`
2. **New Environments**: Extend `package.json` scripts
3. **New Bundling Strategies**: Modify webpack settings for specific needs

### Potential New Features
- **Authentication**: Add `auth.py` backend blueprint + `auth.js` frontend service
- **Caching**: Add `cache.py` backend service + browser caching in frontend
- **Background Tasks**: Add `tasks.py` backend service + progress tracking components
- **Admin Interface**: Add `admin.py` blueprint + admin UI components
- **Mobile App**: Reuse frontend services with React Native or similar
- **Browser Extension**: Package components for browser extension environment

### Benefits of Universal Architecture
- **Code Reuse**: Frontend modules work in any JavaScript environment
- **Testing**: Comprehensive testing across all environments
- **Deployment**: Flexible deployment options (bundled, individual scripts, etc.)
- **Development**: Smooth transition between development modes

This architecture provides a solid foundation for growth while maintaining code quality and developer productivity across both backend and frontend systems.