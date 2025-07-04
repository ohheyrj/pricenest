"""
UI Navigation Tests using Selenium WebDriver
Tests for URL routing, view persistence, and navigation functionality
"""

import pytest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import time
import os


@pytest.fixture(scope="module")
def driver():
    """Create a Chrome WebDriver instance for testing."""
    # Setup Chrome options
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')  # Run in headless mode for CI
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(1280, 720)
    
    yield driver
    
    driver.quit()


@pytest.fixture(scope="module")
def base_url():
    """Get the base URL for testing."""
    # Use environment variable or default to localhost
    return os.getenv('TEST_BASE_URL', 'http://localhost:8000')


@pytest.fixture
def wait(driver):
    """Create a WebDriverWait instance."""
    return WebDriverWait(driver, 10)


class TestUINavigation:
    """Test suite for UI navigation functionality."""
    
    def test_homepage_loads(self, driver, base_url, wait):
        """Test that the homepage loads successfully."""
        driver.get(base_url)
        
        # Wait for categories container to be present
        categories_container = wait.until(
            EC.presence_of_element_located((By.ID, "categories-container"))
        )
        
        assert categories_container is not None
        assert driver.title == "PriceNest - Track Your Prices"
    
    def test_url_changes_when_navigating_to_category(self, driver, base_url, wait):
        """Test that URL updates when navigating to a category."""
        driver.get(base_url)
        
        # Wait for and click on first category block
        category_block = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".category-block"))
        )
        
        # Get category name before clicking
        category_name = category_block.find_element(By.CSS_SELECTOR, ".category-name").text
        
        category_block.click()
        
        # Wait for URL to change
        wait.until(lambda d: "#/category/" in d.current_url)
        
        # Verify URL contains category name
        assert f"#/category/{category_name}" in driver.current_url
        
        # Verify we're in category view
        back_button = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".back-btn"))
        )
        assert back_button is not None
    
    def test_refresh_maintains_category_view(self, driver, base_url, wait):
        """Test that refreshing the page maintains the current category view."""
        driver.get(base_url)
        
        # Navigate to a category
        category_block = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".category-block"))
        )
        category_name = category_block.find_element(By.CSS_SELECTOR, ".category-name").text
        category_block.click()
        
        # Wait for category view to load
        wait.until(lambda d: "#/category/" in d.current_url)
        
        # Refresh the page
        driver.refresh()
        
        # Verify we're still in the same category view
        wait.until(lambda d: f"#/category/{category_name}" in d.current_url)
        
        # Verify category view elements are present
        back_button = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".back-btn"))
        )
        assert back_button is not None
    
    def test_back_button_returns_to_main_view(self, driver, base_url, wait):
        """Test that the back button returns to main categories view."""
        driver.get(base_url)
        
        # Navigate to a category
        category_block = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".category-block"))
        )
        category_block.click()
        
        # Wait for category view
        back_button = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".back-btn"))
        )
        
        # Click back button
        back_button.click()
        
        # Verify URL has no hash
        wait.until(lambda d: "#" not in d.current_url or d.current_url.endswith("#"))
        
        # Verify we see categories grid
        categories_grid = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".categories-grid"))
        )
        assert categories_grid is not None
    
    def test_browser_back_forward_navigation(self, driver, base_url, wait):
        """Test browser back/forward buttons work correctly."""
        driver.get(base_url)
        initial_url = driver.current_url
        
        # Navigate to a category
        category_block = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".category-block"))
        )
        category_name = category_block.find_element(By.CSS_SELECTOR, ".category-name").text
        category_block.click()
        
        # Wait for URL change
        wait.until(lambda d: "#/category/" in d.current_url)
        category_url = driver.current_url
        
        # Use browser back button
        driver.back()
        wait.until(lambda d: d.current_url == initial_url)
        
        # Verify we're back at main view
        categories_grid = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".categories-grid"))
        )
        assert categories_grid is not None
        
        # Use browser forward button
        driver.forward()
        wait.until(lambda d: d.current_url == category_url)
        
        # Verify we're back in category view
        back_button = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".back-btn"))
        )
        assert back_button is not None
    
    def test_view_mode_persistence(self, driver, base_url, wait):
        """Test that view mode (grid/list) persists when sorting."""
        driver.get(base_url)
        
        # Navigate to a category with items
        category_block = wait.until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".category-block"))
        )
        category_block.click()
        
        # Wait for category view
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, ".view-toggle")))
        
        # Switch to list view
        list_view_btn = driver.find_element(By.CSS_SELECTOR, "[data-view='list']")
        list_view_btn.click()
        
        # Verify list view is active
        time.sleep(0.5)  # Wait for animation
        items_container = driver.find_element(By.ID, "category-items-container")
        assert "list-view" in items_container.get_attribute("class")
        
        # Change sort order
        sort_select = driver.find_element(By.CSS_SELECTOR, ".sort-controls select")
        sort_select.send_keys("price-low")
        
        # Verify still in list view after sorting
        time.sleep(0.5)  # Wait for re-render
        items_container = driver.find_element(By.ID, "category-items-container")
        assert "list-view" in items_container.get_attribute("class")
    
    def test_direct_url_navigation(self, driver, base_url, wait):
        """Test navigating directly to a category URL."""
        # First get a valid category name
        driver.get(base_url)
        category_block = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".category-block"))
        )
        category_name = category_block.find_element(By.CSS_SELECTOR, ".category-name").text
        
        # Navigate directly to category URL
        driver.get(f"{base_url}#/category/{category_name}")
        
        # Verify we're in category view
        back_button = wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, ".back-btn"))
        )
        assert back_button is not None
        
        # Verify correct category is shown
        category_title = driver.find_element(By.CSS_SELECTOR, ".category-detail-info h1")
        assert category_name in category_title.text


@pytest.mark.skip(reason="Requires app to be running")
class TestUINavigationLive:
    """
    Live tests that require the app to be running.
    Run with: pytest tests/test_ui_navigation.py::TestUINavigationLive -m "not skip"
    """
    pass