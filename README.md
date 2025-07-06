# Price Tracker

A modern web application for tracking item prices with integrated book search functionality.

## Features

- **Category Management**: Organize items into categories (General items, Books, or Movies)
- **Smart Search**: Integrated search using Google Books API and Apple Store APIs
- **Price Tracking**: Track current prices and mark items as purchased
- **CSV Import**: Bulk import movies from CSV files
- **Modular Architecture**: Clean, maintainable codebase with separated concerns
- **Build System**: Webpack-based build system with development and production modes
- **Responsive Design**: Clean, modern interface that works on all devices
- **Docker Support**: Easy deployment with Docker and Docker Compose

## Quick Start

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd price-tracker
```

2. Run with Docker Compose:
```bash
docker-compose up --build
```

3. Open your browser to [http://localhost:8000](http://localhost:8000)

### Local Development

1. Install dependencies (using devenv recommended):
```bash
# Using devenv (includes Node.js and Python)
devenv shell

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies for build system
npm install
```

2. Build frontend assets (optional - for optimized builds):
```bash
# Development build (fast, with source maps)
npm run build:dev

# Production build (optimized, minified)
npm run build

# Watch mode (rebuilds on changes)
npm run watch
```

3. Run the application:
```bash
python run_app.py
```

4. Open your browser to [http://localhost:8000](http://localhost:8000)

## Project Structure

```
price-tracker/
├── src/
│   ├── app.py              # Main Flask application
│   ├── config.py           # Application configuration
│   ├── wsgi.py             # WSGI entry point
│   ├── database/
│   │   └── connection.py   # Database operations
│   ├── routes/
│   │   ├── main.py         # Main routes
│   │   ├── categories.py   # Category API routes
│   │   ├── items.py        # Item API routes
│   │   └── books.py        # Book search routes
│   ├── services/
│   │   └── book_search.py  # Book search service
│   ├── templates/
│   │   ├── index.html      # Main HTML template (Flask)
│   │   └── index-webpack.html # Webpack build template
│   └── static/
│       ├── css/
│       │   └── styles.css  # Application styles
│       └── js/
│           ├── script.js   # Main application logic
│           ├── app.js      # Webpack entry point
│           ├── api-client.js # API communication
│           ├── csv-importer.js # CSV import functionality
│           ├── components/ # UI components
│           │   ├── Modal.js        # Modal management
│           │   ├── UIComponents.js # UI component library
│           │   ├── FilterControls.js # Filtering system
│           │   └── FormHandler.js  # Form validation
│           └── services/   # Business logic services
│               ├── BookSearch.js   # Book search integration
│               ├── MovieSearch.js  # Movie search integration
│               └── SearchManager.js # Search orchestration
├── tests/
│   ├── conftest.py         # Test configuration
│   ├── test_api.py         # API endpoint tests
│   ├── test_book_search.py # Book search tests
│   ├── test_database.py    # Database tests
│   ├── test_search_modules.py # Frontend search module tests
│   └── test_ui_components.py  # UI component tests
├── data/
│   └── price_tracker.db    # SQLite database
├── dist/                   # Webpack build output
│   ├── js/                 # Bundled JavaScript files
│   ├── css/                # Processed stylesheets
│   └── index.html          # Generated HTML
├── package.json            # Node.js dependencies
├── webpack.config.js       # Webpack configuration
├── devenv.nix             # Development environment
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile             # Docker build configuration
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

## Usage

### Categories

1. **Create Categories**: Click "Add Category" to create new categories
2. **Category Types**: Choose between "General Items", "Books", or "Movies"
3. **Smart Search**: Categories automatically enable appropriate search functionality

### Items

1. **Add Items**: Click "Add Item" in any category
2. **Smart Search**: Use integrated search for books (Google Books/Kobo) or movies (Apple Store)
3. **CSV Import**: Bulk import movies from CSV files with title, director, and year
4. **Edit Items**: Click the edit button on any item to modify details
5. **Mark Purchased**: Track what you've bought with the purchase toggle

### Search Features

- **Book Search**: Search by title, author, or keywords using Google Books API or Kobo
- **Movie Search**: Search Apple Store for movies with title, director, and year
- **Auto-Population**: Automatically populated with metadata and pricing information
- **Real Pricing**: Real prices from APIs when available, estimated prices otherwise

## Configuration

The application uses SQLite by default and requires no additional configuration. All data is stored in the `data/` directory.

## Development

### Architecture

The project features a modular architecture with:

- **Backend**: Flask with modular blueprints and services
- **Frontend**: Modular JavaScript with webpack build system
- **Universal Modules**: JavaScript modules work in CommonJS, ES6, and browser environments
- **Build System**: Webpack with development and production configurations

### Development Workflow

1. Make changes to files in the `src/` directory
2. For frontend changes, use webpack build system:
   ```bash
   # Development build (fast rebuilds)
   npm run build:dev
   
   # Watch mode (auto-rebuild on changes)
   npm run watch
   ```
3. Run tests to ensure your changes work correctly
4. Test your changes locally before submitting

### Frontend Development

The frontend uses a modular architecture:

- **Components**: Reusable UI components (`src/static/js/components/`)
- **Services**: Business logic modules (`src/static/js/services/`)
- **Universal Exports**: Modules work in all JavaScript environments
- **Build System**: Webpack bundling with code splitting

### Running Tests

The application includes a comprehensive test suite:

```bash
# Using devenv (recommended)
devenv shell
python run_tests.py

# Or using pip with manual setup
pip install -r requirements.txt
python run_tests.py

# Run specific test types
python run_tests.py --type api      # API endpoint tests
python run_tests.py --type book     # Book search tests
python run_tests.py --type database # Database tests

# Run without coverage (faster)
python run_tests.py --no-coverage
```

Or using pytest directly:
```bash
# Install in development mode first
pip install -e .
pytest tests/ --cov=src --cov-report=term-missing
```

### Test Coverage

The test suite covers:
- ✅ All API endpoints (categories, items, book search)
- ✅ Database operations and schema
- ✅ Book search integration with Google Books API
- ✅ Error handling and edge cases
- ✅ Data validation and constraints

See `tests/README.md` for detailed testing documentation.

## License

This project is open source and available under the MIT License.