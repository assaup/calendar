FROM python:3.11-slim AS builder

RUN python -m venv --without-pip /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip --python /opt/venv/bin/python install --no-cache-dir -r requirements.txt



FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app
RUN groupadd -g 1000 appgroup \
    && useradd -u 1000 -g appgroup --no-create-home --shell /usr/sbin/nologin appuser

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv

COPY . .

# Собираем статику админки (БД не нужна)
RUN SECRET_KEY=build DEBUG=False python manage.py collectstatic --noinput

USER appuser
EXPOSE 8000

# Только сервер. Миграции запускает отдельный сервис migrate в compose
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
