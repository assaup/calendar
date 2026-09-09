"""Базовый набор категорий, которым наполняется каждая новая доска."""

BASE_CATEGORIES = [
    ("Работа", "#478bff"),
    ("Дом", "#5ec974"),
    ("Встречи", "#9068fd"),
    ("Быт", "#eb8f7f"),
]


def seed_categories(workspace):
    """Создаёт стартовые категории внутри пространства."""
    from .models import Category

    Category.objects.bulk_create(
        [Category(workspace=workspace, name=name, color=color) for name, color in BASE_CATEGORIES]
    )
