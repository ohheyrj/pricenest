.PHONY: test test-sqlalchemy test-all test-coverage test-core help

help:
	@echo "Available test commands:"
	@echo "  make test           - Run core SQLAlchemy tests (stable)"
	@echo "  make test-core      - Run core SQLAlchemy tests with coverage"
	@echo "  make test-sqlalchemy - Run all SQLAlchemy tests (may have failures)"
	@echo "  make test-all       - Run all tests (including legacy)"
	@echo "  make test-coverage  - Run tests with coverage report"
	@echo "  make test-models    - Run only model tests"

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