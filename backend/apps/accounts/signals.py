from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.workspaces.models import Category, Workspace

User = get_user_model()

DEFAULT_WORKSPACES = [("Личное", "#2b8a3e"), ("Работа", "#364fc7")]
DEFAULT_CATEGORIES = [
    ("Работа", "#478bff"),
    ("Дом", "#5ec974"),
    ("Встречи", "#9068fd"),
    ("Быт", "#eb8f7f"),
]


@receiver(post_save, sender=User)
def seed_defaults(sender, instance, created, **kwargs):
    """У нового пользователя создаём стартовые пространства и категории."""
    if not created:
        return
    for i, (name, color) in enumerate(DEFAULT_WORKSPACES):
        Workspace.objects.create(owner=instance, name=name, color=color, position=i)
    for name, color in DEFAULT_CATEGORIES:
        Category.objects.create(owner=instance, name=name, color=color)
