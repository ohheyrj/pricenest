# UI Testing Guide

This guide explains how to run and write UI tests for PriceNest.

## Overview

PriceNest uses two types of UI testing:

1. **Selenium WebDriver Tests** - Full browser automation tests
2. **JavaScript Unit Tests** - Pure function tests using Node.js

## Prerequisites

### For Selenium Tests

1. **Chrome Browser** - Tests use Chrome by default
2. **ChromeDriver** - WebDriver for Chrome automation
   
   On macOS:
   ```bash
   brew install chromedriver
   ```
   
   On Linux:
   ```bash
   sudo apt-get install chromium-chromedriver
   ```

3. **Python Dependencies** - Already included in `requirements.txt`:
   ```bash
   pip install selenium
   ```

### For JavaScript Unit Tests

1. **Node.js** - Required for running JS tests
   ```bash
   brew install node  # macOS
   # or
   sudo apt-get install nodejs  # Linux
   ```

## Running UI Tests

### Quick Start

The easiest way to run UI tests:

```bash
python run_ui_tests.py
```

This script will:
1. Start the Flask server (if not already running)
2. Run all UI tests
3. Stop the server when done

### Running Specific Tests

To run a specific test:

```bash
python run_ui_tests.py test_url_changes_when_navigating
```

### Manual Test Running

If you want more control:

1. Start the server in one terminal:
   ```bash
   python -m src.app
   ```

2. Run tests in another terminal:
   ```bash
   pytest tests/test_ui_navigation.py -v
   ```

### Running JavaScript Unit Tests

```bash
pytest tests/test_javascript_unit.py -v
```

## Writing UI Tests

### Selenium Test Example

```python
def test_navigation_example(self, driver, base_url, wait):
    """Test example navigation flow."""
    # Load the page
    driver.get(base_url)
    
    # Find and click an element
    button = wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, ".my-button"))
    )
    button.click()
    
    # Verify the result
    assert "expected-url" in driver.current_url
```

### JavaScript Unit Test Example

```python
def test_js_function(self, js_test_runner):
    """Test a JavaScript function."""
    js_code = """
    function add(a, b) {
        return a + b;
    }
    
    console.log(add(2, 3));
    """
    
    output = js_test_runner(js_code)
    assert "5" in output
```

## Test Organization

- `tests/test_ui_navigation.py` - Navigation and routing tests
- `tests/test_javascript_unit.py` - Pure JS function tests
- `run_ui_tests.py` - Automated test runner

## CI/CD Integration

Tests run in headless mode by default, making them suitable for CI pipelines:

```yaml
# Example GitHub Actions config
- name: Run UI Tests
  run: |
    python run_ui_tests.py
```

## Troubleshooting

### ChromeDriver Issues

If you get "chromedriver not found":
1. Ensure ChromeDriver is installed
2. Check it's in your PATH: `which chromedriver`
3. Update ChromeDriver to match Chrome version

### Timeout Issues

Increase wait times in tests:
```python
wait = WebDriverWait(driver, 20)  # 20 second timeout
```

### Server Not Starting

Check if port 8000 is already in use:
```bash
lsof -i :8000
```

## Best Practices

1. **Use explicit waits** instead of `time.sleep()`
2. **Test one thing per test** - keep tests focused
3. **Use descriptive test names** that explain what's being tested
4. **Clean up test data** after tests run
5. **Run tests in isolation** - each test should work independently