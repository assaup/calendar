"""Общие хелперы для тестов API (не тест-модуль — раннер его не собирает)."""

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.workspaces.models import Workspace

User = get_user_model()

PASSWORD = "S3cure-pass-for-tests"


def make_user(email: str = "owner@example.com", password: str = PASSWORD):
    """Пользователь как после регистрации: сигнал сам создаёт 2 доски с категориями."""
    return User.objects.create_user(username=email, email=email, password=password)


def first_ws(user) -> Workspace:
    return Workspace.objects.filter(owner=user).order_by("position", "id").first()


def second_ws(user) -> Workspace:
    return Workspace.objects.filter(owner=user).order_by("position", "id")[1]


def authed_client(user) -> APIClient:
    client = APIClient()
    client.force_authenticate(user)
    return client
