FROM python:3.11-slim AS builder
WORKDIR /build

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

# pip и setuptools в рантайме не нужны, удаляю: меньше пакетов — меньше CVE
# версии apt не фиксируем: Debian удаляет старые из репозитория, сборка сломается
# upgrade: базовый образ отстаёт от патчей Debian, иначе Trivy падает на уже исправленных CVE
# hadolint ignore=DL3008
RUN apt-get update \
    && apt-get upgrade -y \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && python -m pip uninstall -y --no-cache-dir setuptools pip

COPY --from=builder /opt/venv /opt/venv

COPY . .

# Собираем статику админки (БД не нужна)
RUN SECRET_KEY=build DEBUG=False python manage.py collectstatic --noinput

USER 1000:1000
EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health/', timeout=2)"]

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]