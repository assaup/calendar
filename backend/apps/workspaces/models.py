from django.conf import settings
from django.db import models


class Workspace(models.Model):
    """Рабочее пространство: разделяет 'Работа' и 'Личное'. У каждого свои
    проекты, задачи, категории и заметки."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workspaces",
    )
    name = models.CharField(max_length=120)
    color = models.CharField(max_length=9, default="#44639f")
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return self.name


class Category(models.Model):
    """Категория/метка задачи (цвет + имя). Общая на все пространства
    пользователя (как в интерфейсе)."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=80)
    color = models.CharField(max_length=9, default="#868e96")

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name
