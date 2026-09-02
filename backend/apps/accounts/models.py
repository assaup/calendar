from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Пользователь приложения. Личное приложение — без командного доступа."""

    email = models.EmailField("email", unique=True)

    def __str__(self) -> str:
        return self.username or self.email
