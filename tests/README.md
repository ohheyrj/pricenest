# Test Suite Documentation

This directory contains a comprehensive test suite for the Price Tracker application.

## Test Structure

```
tests/
├── __init__.py              # Test package marker
├── conftest.py              # Test configuration and fixtures
├── test_api.py              # API endpoint tests
├── test_book_search.py      # Book search integration tests
├── test_database.py         # Database operation tests
└── README.md               # This file
```

## Test Categories

### 1. API Tests (`test_api.py`)
Tests all REST API endpoints:

- **Category Management**:
  - `TestCategoriesAPI`: CRUD operations for categories
  - Creating, reading, updating, deleting categories
  - Category type validation (books vs general)
  - Book lookup settings

- **Item Management**:
  - `TestItemsAPI`: CRUD operations for items
  - Creating items with title/author for books
  - Updating item details
  - Toggling purchase status
  - Price tracking

- **Book Search**:
  - `TestBookSearchAPI`: Book search functionality
  - Query validation
  - Source selection (Google Books, etc.)
  - Result formatting

- **System**:
  - `TestDatabaseConfigAPI`: Database configuration
  - `TestMainRoutes`: Frontend route serving

### 2. Book Search Tests (`test_book_search.py`)
Integration tests for book search functionality:

- **Google Books API Integration**:
  - Successful API responses
  - API failure handling
  - Fallback to mock results
  - Price source prioritization

- **Price Generation**:
  - Real price extraction from API
  - Currency conversion (USD to GBP)
  - Estimated pricing based on book characteristics
  - Mock result generation

- **Data Processing**:
  - Book result sorting (real prices first)
  - Author and title extraction
  - URL generation for book stores

### 3. Database Tests (`test_database.py`)
Tests for database operations and data integrity:

- **Schema Management**:
  - Database initialization
  - Table creation and schema validation
  - Column existence and types

- **Data Operations**:
  - Foreign key constraint enforcement
  - Data type validation
  - Required field constraints
  - CASCADE delete operations

- **Book-Specific Data**:
  - Title and author field handling
  - Category type support
  - Backward compatibility with old schema

## Test Fixtures

Located in `conftest.py`:

- **`test_app`**: Flask application configured for testing
- **`client`**: Test client for making HTTP requests
- **`runner`**: CLI test runner
- **`sample_book_data`**: Mock book data for testing
- **`sample_category_data`**: Mock category data
- **`sample_item_data`**: Mock item data

## Running Tests

### Quick Start
```bash
# Run all tests
python run_tests.py

# Run specific test types
python run_tests.py --type api
python run_tests.py --type book
python run_tests.py --type database

# Run without coverage
python run_tests.py --no-coverage

# Run quietly
python run_tests.py --quiet
```

### Using pytest directly
```bash
# All tests with coverage
pytest tests/ --cov=src --cov-report=term-missing

# Specific test file
pytest tests/test_api.py -v

# Specific test class
pytest tests/test_api.py::TestCategoriesAPI -v

# Specific test method
pytest tests/test_api.py::TestCategoriesAPI::test_create_category -v

# Tests with markers
pytest -m "not slow"  # Skip slow tests
pytest -m "integration"  # Only integration tests
```

### Development Environment
```bash
# Using devenv (recommended)
devenv shell
python run_tests.py

# Or install dependencies manually
pip install -r requirements.txt
python run_tests.py
```

## Test Coverage

The test suite aims for high coverage across:

- ✅ **API Endpoints**: All REST endpoints tested
- ✅ **Database Operations**: Schema, CRUD, constraints
- ✅ **Book Search**: API integration, fallbacks, sorting
- ✅ **Error Handling**: Invalid input, missing data, API failures
- ✅ **Data Validation**: Type checking, required fields
- ✅ **Business Logic**: Category types, book-specific features

### Coverage Report
After running tests with coverage:
```bash
# View coverage in terminal
python run_tests.py

# View detailed HTML report
open htmlcov/index.html
```

## Test Data

### Database
Tests use a temporary SQLite database that is:
- Created fresh for each test session
- Pre-populated with sample data
- Automatically cleaned up after tests

### Sample Data
- **Categories**: "Test Books" (books type), "Electronics" (general type)
- **Items**: Book with title/author, general electronics item
- **Mock API Responses**: Realistic Google Books API responses

## Mocking Strategy

Tests use Python's `unittest.mock` for:
- **External API calls**: Google Books API responses
- **Network requests**: Controlled responses for different scenarios
- **Random elements**: Consistent price generation
- **System dependencies**: Database paths, file operations

## Continuous Integration

The test suite is designed to work in CI environments:
- No external dependencies required
- Fast execution (< 30 seconds)
- Clear pass/fail reporting
- Coverage metrics
- Detailed error reporting

## Adding New Tests

### For New API Endpoints
1. Add test class to `test_api.py`
2. Follow existing naming conventions
3. Test success and error cases
4. Include edge cases and validation

### For New Features
1. Create new test file if needed
2. Add fixtures to `conftest.py` if reusable
3. Include integration tests
4. Update this documentation

### Test Naming Convention
- Test files: `test_*.py`
- Test classes: `Test*` (e.g., `TestCategoriesAPI`)
- Test methods: `test_*` (e.g., `test_create_category`)
- Use descriptive names that explain what is being tested

## Debugging Tests

### Common Issues
1. **Database path conflicts**: Tests use temporary databases
2. **Import errors**: Check PYTHONPATH includes project root
3. **Mock failures**: Verify mock setup and patch targets
4. **Fixture issues**: Check fixture scope and dependencies

### Debug Commands
```bash
# Run single test with detailed output
pytest tests/test_api.py::TestCategoriesAPI::test_create_category -v -s

# Run with debugger
pytest tests/test_api.py --pdb

# Show local variables on failure
pytest tests/test_api.py --tb=long -l
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Fast**: Tests should execute quickly (< 1s each)
3. **Reliable**: Tests should not be flaky
4. **Clear**: Test names should be descriptive
5. **Complete**: Test both success and failure cases
6. **Maintainable**: Keep tests simple and focused