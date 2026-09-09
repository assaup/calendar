from collections import defaultdict

import django.db.models.deletion
from django.db import migrations, models


def forwards(apps, schema_editor):
    """Категории были общими на пользователя, становятся своими на каждую доску.

    Чтобы ничего не потерять: копируем каждую старую категорию в КАЖДОЕ
    пространство владельца и перецепляем задачи на копию в их же пространстве.
    """
    Category = apps.get_model("workspaces", "Category")
    Workspace = apps.get_model("workspaces", "Workspace")
    Task = apps.get_model("tasks", "Task")

    old_categories = list(Category.objects.filter(workspace__isnull=True))
    by_owner = defaultdict(list)
    for c in old_categories:
        by_owner[c.owner_id].append(c)

    for owner_id, cats in by_owner.items():
        workspaces = list(Workspace.objects.filter(owner_id=owner_id))
        # (старый id категории, id пространства) -> новая категория
        mapping = {}
        for ws in workspaces:
            for c in cats:
                new_c = Category.objects.create(
                    workspace=ws, owner_id=owner_id, name=c.name, color=c.color
                )
                mapping[(c.id, ws.id)] = new_c

        tasks = Task.objects.filter(
            workspace__owner_id=owner_id, category__isnull=False
        )
        for t in tasks:
            new_c = mapping.get((t.category_id, t.workspace_id))
            if new_c is not None:
                t.category_id = new_c.id
                t.save(update_fields=["category"])

        for c in cats:
            c.delete()


class Migration(migrations.Migration):

    # Не оборачиваем в одну транзакцию: PostgreSQL не даёт создавать индекс /
    # менять схему, пока в транзакции есть отложенные события FK-триггеров
    # (а мы тут и данные переносим, и колонки меняем). В autocommit каждый шаг
    # фиксируется отдельно.
    atomic = False

    dependencies = [
        ("workspaces", "0001_initial"),
        ("tasks", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="category",
            name="workspace",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="categories",
                to="workspaces.workspace",
            ),
        ),
        migrations.RunPython(forwards, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="category",
            name="workspace",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="categories",
                to="workspaces.workspace",
            ),
        ),
        migrations.RemoveField(
            model_name="category",
            name="owner",
        ),
    ]
