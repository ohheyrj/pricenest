# Clean, optimized Dockerfile for Price Tracker
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update -o Acquire::Check-Valid-Until=false && apt-get install -y \
    curl \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY src/ ./src/

# Create data directory and user with proper permissions
RUN mkdir -p /app/data && \
    useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/database/config || exit 1

# Expose port
EXPOSE 8000

# Run the application
CMD ["python", "src/app.py"]