from django.db import transaction
from rest_framework import serializers

from apps.workspaces.models import Category
from apps.workspaces.validation import WorkspaceOwnedSerializerMixin

from .models import SubTask, Task


class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ["id", "title", "done"]


class TaskSerializer(WorkspaceOwnedSerializerMixin, serializers.ModelSerializer):
    subtasks = SubTaskSerializer(many=True, required=False)

    class Meta:
        model = Task
        fields = [
            "id",
            "workspace",
            "category",
            "title",
            "description",
            "status",
            "priority",
            "start_date",
            "due_date",
            "position",
            "subtasks",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_category(self, category):
        request = self.context.get("request")
        if category and request and category.workspace.owner_id != request.user.id:
            raise serializers.ValidationError("Чужая категория.")
        return category

    def validate(self, attrs):
        # категория должна принадлежать тому же пространству, что и задача
        workspace = attrs.get("workspace") or getattr(self.instance, "workspace", None)
        if "category" in attrs:
            category = attrs["category"]
            if category and workspace and category.workspace_id != workspace.id:
                raise serializers.ValidationError(
                    {"category": "Категория из другого пространства."}
                )
        elif self.instance is not None and "workspace" in attrs:
            # задачу перенесли на другую доску без категории в запросе —
            # берём одноимённую категорию новой доски или убираем
            old = self.instance.category
            if old is not None and old.workspace_id != workspace.id:
                attrs["category"] = Category.objects.filter(
                    workspace=workspace, name__iexact=old.name
                ).first()

        # начало не позже срока; проверяем, только когда в запросе есть даты, —
        # частичный PATCH других полей у старых задач не ломается
        if "start_date" in attrs or "due_date" in attrs:
            start = attrs.get("start_date", getattr(self.instance, "start_date", None))
            due = attrs.get("due_date", getattr(self.instance, "due_date", None))
            if start and due and start > due:
                raise serializers.ValidationError({"due_date": "Срок не может быть раньше начала."})
        return attrs

    def _sync_subtasks(self, task: Task, subs):
        # обновляем на месте по порядку, лишние удаляем, недостающие создаём —
        # автосохранение формы не пересоздаёт подзадачи (id не меняются)
        existing = list(task.subtasks.order_by("position", "id"))
        changed = []
        for i, (row, data) in enumerate(zip(existing, subs, strict=False)):
            title, done = data["title"], data.get("done", False)
            if (row.title, row.done, row.position) != (title, done, i):
                row.title, row.done, row.position = title, done, i
                changed.append(row)
        if changed:
            SubTask.objects.bulk_update(changed, ["title", "done", "position"])
        if len(existing) > len(subs):
            SubTask.objects.filter(pk__in=[r.pk for r in existing[len(subs) :]]).delete()
        SubTask.objects.bulk_create(
            [
                SubTask(task=task, position=i, title=s["title"], done=s.get("done", False))
                for i, s in enumerate(subs)
                if i >= len(existing)
            ]
        )

    @transaction.atomic
    def create(self, validated_data):
        subs = validated_data.pop("subtasks", [])
        task = Task.objects.create(**validated_data)
        if subs:
            self._sync_subtasks(task, subs)
        return task

    @transaction.atomic
    def update(self, instance, validated_data):
        subs = validated_data.pop("subtasks", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if subs is not None:
            self._sync_subtasks(instance, subs)
        return instance
