# GitHub Actions CI/CD Workflows

This directory contains the GitHub Actions workflow files for the Price Tracker project.

## Current Workflows

### ci.yml - Continuous Integration Pipeline

A comprehensive CI pipeline that runs on every push and pull request to main/develop branches.

#### Workflow Features

**🔍 Code Quality Checks**
- Black code formatter validation
- Flake8 linting for Python code
- isort import order checking
- ESLint for JavaScript code quality

**🧪 Multi-Environment Testing**
- Python 3.9, 3.10, and 3.11 support
- Unit and integration test separation
- Frontend module testing
- Full application integration tests

**📊 Coverage & Reporting**
- Code coverage reports with pytest-cov
- Codecov integration for coverage tracking
- HTML coverage reports archived as artifacts
- Security scanning with Safety and Bandit

**🏗️ Build Validation**
- Frontend webpack builds (dev and production)
- Application startup validation
- Build artifact archiving

#### Workflow Jobs

1. **code-quality** - Runs linting and formatting checks
2. **test-python** - Python tests across multiple versions
3. **test-frontend** - JavaScript tests and webpack builds  
4. **test-integration** - Full integration testing
5. **security-scan** - Security vulnerability scanning
6. **build-summary** - Aggregates results and provides final status

#### Triggers

- **Push**: To main and develop branches
- **Pull Request**: Against main and develop branches  
- **Schedule**: Daily at 6 AM UTC to catch dependency issues
- **Manual**: Via workflow_dispatch for on-demand runs

#### Configuration Files

The CI workflow uses several configuration files:

- `.flake8` - Python linting configuration
- `pyproject.toml` - Black, isort, and coverage settings
- `.eslintrc.js` - JavaScript linting rules
- `pytest.ini` - Test execution and coverage settings
- `package.json` - Frontend build scripts and dependencies

#### Environment Requirements

- **Python**: 3.9, 3.10, 3.11
- **Node.js**: 18
- **Dependencies**: Installed via requirements.txt and package.json

#### Artifacts

The workflow produces several artifacts:

- **coverage-report**: HTML coverage reports (Python 3.11 only)
- **frontend-build**: Webpack build outputs
- **security-reports**: Safety and Bandit security scan results

#### Status Badges

Add these badges to your README.md:

```markdown
[![CI Pipeline](https://github.com/ohheyrj/pricenest/actions/workflows/ci.yml/badge.svg)](https://github.com/ohheyrj/pricenest/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/ohheyrj/pricenest/branch/main/graph/badge.svg)](https://codecov.io/gh/ohheyrj/pricenest)
```

## Future Workflows

### Docker Build & Push (Issue #29)
- Multi-architecture Docker builds
- Container registry publishing
- Image optimization and caching

### Security & Quality (Issue #30)
- Container security scanning
- Dependency vulnerability checks
- Extended static analysis

### Deployment Pipeline (Issue #31)
- Staging environment deployment
- Production deployment with approvals
- Health checks and rollback capabilities

## Development Notes

### Running CI Locally

You can run similar checks locally using:

```bash
# Code quality
python -m black --check src/ tests/
python -m flake8 src/ tests/
python -m isort --check-only src/ tests/

# Tests
python run_tests.py --type all

# Frontend
npm run lint
npm run build
npm run test:frontend
```

### Adding New Checks

To add new quality checks or tests:

1. Update the relevant job in `.github/workflows/ci.yml`
2. Add configuration files as needed
3. Test locally before pushing
4. Consider adding to the build-summary job if critical

### Performance

The CI pipeline is optimized for speed:

- Parallel job execution where possible
- Dependency caching for Python and Node.js
- Fail-fast on critical quality issues
- Conditional runs for heavy operations