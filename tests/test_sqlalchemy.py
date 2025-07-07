"""
Main test file for SQLAlchemy implementation.
This imports and runs all SQLAlchemy tests from their respective modules.
"""

import pytest

# Import fixtures
from tests.conftest_sqlalchemy import (
    create_test_data,
    db_session,
    sample_category,
    sample_item,
    sample_movie_item,
    sqlalchemy_app,
    sqlalchemy_client,
)
from tests.test_migration import TestMigration
from tests.test_sqlalchemy_api import (
    TestCategoriesAPI,
    TestDatabaseIntegration,
    TestItemsAPI,
    TestPriceHistoryAPI,
)

# Import all test classes
from tests.test_sqlalchemy_models import (
    TestCategoryModel,
    TestItemModel,
    TestModelQueries,
    TestPendingMovieSearchModel,
    TestPriceHistoryModel,
)

if __name__ == "__main__":
    # Run all SQLAlchemy tests
    pytest.main([__file__, "-v"])
