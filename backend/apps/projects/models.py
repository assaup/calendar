from django.db import models


class Project(models.Model):
    """Проект внутри рабочего пространства (например 'Продюсер' или 'Дом')."""

    workspace = models.ForeignKey(
        "workspaces.Workspace",
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=9, default="#44639f")
    is_archived = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return self.name


class Section(models.Model):
    """Колонка на доске проекта (To Do / В работе / Готово / своя)."""

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="sections",
    )
    name = models.CharField(max_length=120)
    position = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["position", "id"]

    def __str__(self) -> str:
        return f"{self.project.name} / {self.name}"
