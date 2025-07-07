"""
Tests for CSS custom properties foundation.
Validates that CSS custom properties are properly defined and accessible.
"""

import re
import pytest
from pathlib import Path


class TestCSSCustomProperties:
    """Test suite for CSS custom properties implementation."""

    @pytest.fixture
    def css_content(self):
        """Load CSS file content for testing."""
        css_path = Path(__file__).parent.parent / "src" / "static" / "css" / "styles.css"
        with open(css_path, "r", encoding="utf-8") as f:
            return f.read()

    def test_root_selector_exists(self, css_content):
        """Test that :root selector exists."""
        assert ":root {" in css_content

    def test_color_palette_variables(self, css_content):
        """Test that color palette variables are defined."""
        required_colors = [
            "--color-primary",
            "--color-primary-dark",
            "--color-secondary",
            "--color-secondary-dark",
            "--color-success",
            "--color-success-dark",
            "--color-danger",
            "--color-danger-dark",
            "--color-warning",
            "--color-warning-dark",
            "--color-info",
            "--color-info-dark",
        ]

        for color_var in required_colors:
            assert color_var in css_content, f"Missing color variable: {color_var}"

    def test_background_color_variables(self, css_content):
        """Test that background color variables are defined."""
        required_bg_colors = ["--bg-body", "--bg-surface", "--bg-surface-dark", "--bg-surface-darker"]

        for bg_var in required_bg_colors:
            assert bg_var in css_content, f"Missing background variable: {bg_var}"

    def test_text_color_variables(self, css_content):
        """Test that text color variables are defined."""
        required_text_colors = [
            "--text-primary",
            "--text-secondary",
            "--text-muted",
            "--text-light",
            "--text-lighter",
            "--text-white",
        ]

        for text_var in required_text_colors:
            assert text_var in css_content, f"Missing text color variable: {text_var}"

    def test_spacing_variables(self, css_content):
        """Test that spacing variables are defined."""
        required_spacing = [
            "--space-xs",
            "--space-sm",
            "--space-md",
            "--space-lg",
            "--space-xl",
            "--space-2xl",
            "--space-3xl",
            "--space-4xl",
        ]

        for space_var in required_spacing:
            assert space_var in css_content, f"Missing spacing variable: {space_var}"

    def test_font_size_variables(self, css_content):
        """Test that font size variables are defined."""
        required_font_sizes = [
            "--font-xs",
            "--font-sm",
            "--font-base",
            "--font-md",
            "--font-lg",
            "--font-xl",
            "--font-2xl",
            "--font-3xl",
            "--font-4xl",
            "--font-5xl",
        ]

        for font_var in required_font_sizes:
            assert font_var in css_content, f"Missing font size variable: {font_var}"

    def test_font_weight_variables(self, css_content):
        """Test that font weight variables are defined."""
        required_font_weights = ["--font-normal", "--font-medium", "--font-semibold", "--font-bold"]

        for weight_var in required_font_weights:
            assert weight_var in css_content, f"Missing font weight variable: {weight_var}"

    def test_border_radius_variables(self, css_content):
        """Test that border radius variables are defined."""
        required_radius = ["--radius-sm", "--radius-md", "--radius-lg", "--radius-xl", "--radius-2xl", "--radius-full"]

        for radius_var in required_radius:
            assert radius_var in css_content, f"Missing border radius variable: {radius_var}"

    def test_shadow_variables(self, css_content):
        """Test that shadow variables are defined."""
        required_shadows = ["--shadow-sm", "--shadow-md", "--shadow-lg", "--shadow-xl", "--shadow-2xl"]

        for shadow_var in required_shadows:
            assert shadow_var in css_content, f"Missing shadow variable: {shadow_var}"

    def test_transition_variables(self, css_content):
        """Test that transition variables are defined."""
        required_transitions = ["--transition-fast", "--transition-base", "--transition-slow"]

        for transition_var in required_transitions:
            assert transition_var in css_content, f"Missing transition variable: {transition_var}"

    def test_z_index_variables(self, css_content):
        """Test that z-index variables are defined."""
        required_z_indexes = ["--z-dropdown", "--z-sticky", "--z-fixed", "--z-modal", "--z-tooltip"]

        for z_var in required_z_indexes:
            assert z_var in css_content, f"Missing z-index variable: {z_var}"

    def test_gradient_variables(self, css_content):
        """Test that gradient variables are defined."""
        required_gradients = ["--gradient-primary", "--gradient-primary-hover", "--gradient-success"]

        for gradient_var in required_gradients:
            assert gradient_var in css_content, f"Missing gradient variable: {gradient_var}"

    def test_breakpoint_variables(self, css_content):
        """Test that breakpoint variables are defined."""
        required_breakpoints = ["--breakpoint-sm", "--breakpoint-md", "--breakpoint-lg", "--breakpoint-xl"]

        for bp_var in required_breakpoints:
            assert bp_var in css_content, f"Missing breakpoint variable: {bp_var}"

    def test_variables_have_values(self, css_content):
        """Test that variables have actual values, not just empty definitions."""
        # Find all CSS variable definitions
        variable_pattern = r"--[\w-]+:\s*([^;]+);"
        matches = re.findall(variable_pattern, css_content)

        # Should have found many variable values
        assert len(matches) > 50, "Expected to find many CSS variable definitions"

        # Check that values are not empty or just whitespace
        for value in matches[:10]:  # Check first 10 as sample
            assert value.strip(), f"CSS variable has empty value: {value}"

    def test_variable_usage_in_css(self, css_content):
        """Test that var() functions are used to reference custom properties."""
        # Look for var() usage
        var_usage_pattern = r"var\(--[\w-]+\)"
        var_usages = re.findall(var_usage_pattern, css_content)

        # Should find many var() usages
        assert len(var_usages) > 20, "Expected to find many var() usages in CSS"

    def test_common_components_use_variables(self, css_content):
        """Test that common components use CSS variables."""
        # Check that key components use variables
        test_cases = [
            ("body", "--bg-body"),
            ("h1", "--text-primary"),
            (".btn-primary", "--color-primary"),
            (".modal", "--z-modal"),
        ]

        for selector, expected_var in test_cases:
            # Find the CSS rule for this selector
            pattern = rf"{re.escape(selector)}\s*\{{[^}}]*{re.escape(expected_var)}[^}}]*\}}"
            assert re.search(pattern, css_content, re.DOTALL), f"Expected {selector} to use {expected_var}"

    def test_key_components_use_variables(self, css_content):
        """Test that key components use CSS variables instead of hard-coded values."""
        # Check that specific key selectors use variables
        test_cases = [
            ("body", "--bg-body"),
            ("h1", "--text-primary"),
            (".btn-primary", "--color-primary"),
            (".btn-secondary", "--color-secondary"),
            (".btn-danger", "--color-danger"),
            (".btn-success", "--color-success"),
            (".modal", "--z-modal"),
            (".category", "--bg-surface"),
            (".category-header", "--gradient-primary"),
        ]

        for selector, expected_var in test_cases:
            # Find CSS rules containing this selector and check for variable usage
            pattern = rf"{re.escape(selector)}[^{{]*\{{[^}}]*{re.escape(expected_var)}[^}}]*\}}"
            assert re.search(
                pattern, css_content, re.DOTALL
            ), f"Expected {selector} to use {expected_var} somewhere in its styles"

    def test_variable_naming_consistency(self, css_content):
        """Test that variable names follow consistent naming patterns."""
        # Extract all variable names
        variable_pattern = r"--([\w-]+):"
        variable_names = re.findall(variable_pattern, css_content)

        # Check naming patterns
        color_vars = [v for v in variable_names if v.startswith("color-")]
        bg_vars = [v for v in variable_names if v.startswith("bg-")]
        text_vars = [v for v in variable_names if v.startswith("text-")]
        space_vars = [v for v in variable_names if v.startswith("space-")]

        # Should have reasonable numbers of each category
        assert len(color_vars) >= 12, "Expected at least 12 color variables"
        assert len(bg_vars) >= 4, "Expected at least 4 background variables"
        assert len(text_vars) >= 6, "Expected at least 6 text variables"
        assert len(space_vars) >= 8, "Expected at least 8 spacing variables"
