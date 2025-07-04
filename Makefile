.PHONY: test test-sqlalchemy test-all test-coverage test-core test-ui test-js help run

help:
	@echo "Available commands:"
	@echo ""
	@echo "Running the app:"
	@echo "  make run            - Start the development server"
	@echo ""
	@echo "Testing commands:"
	@echo "  make test           - Run core SQLAlchemy tests (stable)"
	@echo "  make test-core      - Run core SQLAlchemy tests with coverage"
	@echo "  make test-sqlalchemy - Run all SQLAlchemy tests (may have failures)"
	@echo "  make test-all       - Run all tests (including legacy)"
	@echo "  make test-coverage  - Run tests with coverage report"
	@echo "  make test-models    - Run only model tests"
	@echo "  make test-ui        - Run UI browser automation tests"
	@echo "  make test-js        - Run JavaScript unit tests"

test:
	devenv shell python run_core_tests.py

test-core:
	devenv shell python run_core_tests.py

test-sqlalchemy:
	devenv shell python run_sqlalchemy_tests.py

test-all:
	devenv shell pytest

test-coverage:
	devenv shell python run_core_tests.py

test-models:
	devenv shell python test_models_only.py

test-ui:
	devenv shell python run_ui_tests.py

test-js:
	devenv shell pytest tests/test_javascript_unit.py -v

run:
	devenv shell python -m src.app