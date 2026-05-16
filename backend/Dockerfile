FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && playwright install --with-deps chromium

COPY . .

RUN chmod +x /app/scripts/start-api.sh

ENV PYTHONPATH=/app

# API service (override for Celery worker/beat)
CMD ["/app/scripts/start-api.sh"]
