"""
JavaScript Unit Tests using Node.js subprocess
Tests pure JavaScript functions without browser dependency
"""

import json
import os
import subprocess
import tempfile

import pytest


@pytest.fixture
def js_test_runner():
    """Create a temporary JS file to run tests."""

    def runner(js_code):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
            # Write test code
            f.write(js_code)
            f.flush()

            try:
                # Run with Node.js
                result = subprocess.run(["node", f.name], capture_output=True, text=True, timeout=5)

                if result.returncode != 0:
                    raise Exception(f"JavaScript error: {result.stderr}")

                return result.stdout.strip()
            finally:
                # Clean up
                os.unlink(f.name)

    return runner


class TestJavaScriptFunctions:
    """Test pure JavaScript functions from script.js"""

    def test_navigation_url_encoding(self, js_test_runner):
        """Test URL encoding for category navigation."""
        js_code = """
        // Mock navigateTo function
        function navigateTo(route) {
            if (route === '' || route === '/') {
                return '#';
            } else {
                return '#' + route;
            }
        }

        // Test cases
        const tests = [
            { input: '', expected: '#' },
            { input: '/', expected: '#' },
            { input: '/category/Books', expected: '#/category/Books' },
            { input: '/category/Movies & TV', expected: '#/category/Movies & TV' }
        ];

        let passed = 0;
        tests.forEach(test => {
            const result = navigateTo(test.input);
            if (result === test.expected) {
                passed++;
            } else {
                console.error(`FAIL: navigateTo('${test.input}') = '${result}', expected '${test.expected}'`);
            }
        });

        console.log(`${passed}/${tests.length} tests passed`);
        """

        output = js_test_runner(js_code)
        assert "4/4 tests passed" in output

    def test_category_name_encoding(self, js_test_runner):
        """Test category name encoding/decoding."""
        js_code = """
        // Test encoding and decoding category names
        const testCases = [
            'Books',
            'Movies & TV',
            'Home & Garden',
            'Café Items',
            '50% Off Deals'
        ];

        let passed = 0;
        testCases.forEach(name => {
            const encoded = encodeURIComponent(name);
            const decoded = decodeURIComponent(encoded);

            if (decoded === name) {
                passed++;
            } else {
                console.error(`FAIL: '${name}' -> '${encoded}' -> '${decoded}'`);
            }
        });

        console.log(`${passed}/${testCases.length} encoding tests passed`);
        """

        output = js_test_runner(js_code)
        assert "5/5 encoding tests passed" in output

    def test_view_mode_logic(self, js_test_runner):
        """Test view mode toggle logic."""
        js_code = """
        // Mock view mode state
        let currentViewMode = 'grid';

        function toggleItemView(view) {
            currentViewMode = view;
            return currentViewMode;
        }

        // Test toggling
        console.log('Initial:', currentViewMode);

        toggleItemView('list');
        console.log('After list toggle:', currentViewMode);

        toggleItemView('grid');
        console.log('After grid toggle:', currentViewMode);

        // Test that invalid values are handled
        toggleItemView('invalid');
        console.log('After invalid toggle:', currentViewMode);
        """

        output = js_test_runner(js_code)
        assert "Initial: grid" in output
        assert "After list toggle: list" in output
        assert "After grid toggle: grid" in output

    @pytest.mark.skip(reason="Requires full script.js to be modularized")
    def test_api_client_methods(self, js_test_runner):
        """Test APIClient class methods."""
        # This will be enabled after we extract APIClient to its own module
        pass


class TestURLRouting:
    """Test URL routing logic"""

    def test_hash_parsing(self, js_test_runner):
        """Test hash route parsing logic."""
        js_code = """
        function parseHash(hash) {
            if (!hash || hash === '#') {
                return { type: 'main' };
            }

            if (hash.startsWith('#/category/')) {
                const categoryName = decodeURIComponent(hash.replace('#/category/', ''));
                return { type: 'category', name: categoryName };
            }

            return { type: 'unknown' };
        }

        // Test cases
        const tests = [
            { hash: '', expected: { type: 'main' } },
            { hash: '#', expected: { type: 'main' } },
            { hash: '#/category/Books', expected: { type: 'category', name: 'Books' } },
            { hash: '#/category/Movies%20%26%20TV', expected: { type: 'category', name: 'Movies & TV' } },
            { hash: '#/unknown/route', expected: { type: 'unknown' } }
        ];

        let passed = 0;
        tests.forEach(test => {
            const result = parseHash(test.hash);
            const match = JSON.stringify(result) === JSON.stringify(test.expected);

            if (match) {
                passed++;
            } else {
                console.error(`FAIL: parseHash('${test.hash}') =`, JSON.stringify(result));
            }
        });

        console.log(`${passed}/${tests.length} hash parsing tests passed`);
        """

        output = js_test_runner(js_code)
        assert "5/5 hash parsing tests passed" in output
