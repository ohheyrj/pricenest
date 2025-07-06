"""
Main test file for SQLAlchemy implementation.
This imports and runs all SQLAlchemy tests from their respective modules.
"""

import pytest

# Import all test classes
from tests.test_sqlalchemy_models import (
    TestCategoryModel,
    TestItemModel,
    TestPriceHistoryModel,
    TestPendingMovieSearchModel,
    TestModelQueries,
)

from tests.test_sqlalchemy_api import (
    TestCategoriesAPI,
    TestItemsAPI,
    TestPriceHistoryAPI,
    TestDatabaseIntegration,
)

from tests.test_migration import TestMigration

# Import fixtures
from tests.conftest_sqlalchemy import (
    sqlalchemy_app,
    sqlalchemy_client,
    db_session,
    create_test_data,
    sample_category,
    sample_item,
    sample_movie_item,
)


if __name__ == "__main__":
    # Run all SQLAlchemy tests
    pytest.main([__file__, "-v"])
