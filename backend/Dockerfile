# Прод-образ бэкенда (Django + gunicorn).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
RUN groupadd -g 1000 appgroup \
    && useradd -u 1000 -g appgroup --no-create-home --shell /usr/sbin/nologin appuser

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Собираем статику админки (БД не нужна)
RUN SECRET_KEY=build DEBUG=False python manage.py collectstatic --noinput

USER appuser
EXPOSE 8000

# Миграции при старте, затем gunicorn
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3"]
