from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.workspaces.defaults import seed_categories
from apps.workspaces.models import Workspace

User = get_user_model()

DEFAULT_WORKSPACES = [("Личное", "#2b8a3e"), ("Работа", "#364fc7")]


@receiver(post_save, sender=User)
def seed_defaults(sender, instance, created, **kwargs):
    """У нового пользователя создаём стартовые доски, у каждой — свои категории."""
    if not created:
        return
    for i, (name, color) in enumerate(DEFAULT_WORKSPACES):
        workspace = Workspace.objects.create(owner=instance, name=name, color=color, position=i)
        seed_categories(workspace)
