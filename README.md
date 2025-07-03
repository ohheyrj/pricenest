# Price Tracker

A modern web application for tracking item prices with integrated book search functionality.

## Features

- **Category Management**: Organize items into categories (General items or Books)
- **Book Search**: Integrated search using Google Books API with realistic pricing
- **Price Tracking**: Track current prices and mark items as purchased
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

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python run_app.py
```

3. Open your browser to [http://localhost:8000](http://localhost:8000)

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
│   │   └── index.html      # Main HTML template
│   └── static/
│       ├── css/
│       │   └── styles.css  # Application styles
│       └── js/
│           └── script.js   # Frontend JavaScript
├── tests/
│   ├── conftest.py         # Test configuration
│   ├── test_api.py         # API endpoint tests
│   ├── test_book_search.py # Book search tests
│   └── test_database.py    # Database tests
├── data/
│   └── price_tracker.db    # SQLite database
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile             # Docker build configuration
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

## Usage

### Categories

1. **Create Categories**: Click "Add Category" to create new categories
2. **Category Types**: Choose between "General Items" and "Books"
3. **Book Categories**: Automatically enable book search functionality

### Items

1. **Add Items**: Click "Add Item" in any category
2. **Book Search**: For book categories, use "Add from Books" to search and add books automatically
3. **Edit Items**: Click the edit button on any item to modify details
4. **Mark Purchased**: Track what you've bought with the purchase toggle

### Book Search

- Search by title, author, or keywords
- Automatically populated with title, author, and pricing information
- Real prices from Google Books API when available
- Estimated prices for books without pricing data

## Configuration

The application uses SQLite by default and requires no additional configuration. All data is stored in the `data/` directory.

## Development

To contribute to the project:

1. Make changes to files in the `src/` directory
2. The Docker setup includes live reload for development
3. Run tests to ensure your changes work correctly
4. Test your changes locally before submitting

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