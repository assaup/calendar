from rest_framework import serializers

from apps.workspaces.models import Workspace

from .models import SubTask, Task


class SubTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubTask
        fields = ["id", "title", "done"]


class TaskSerializer(serializers.ModelSerializer):
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

    def validate_workspace(self, workspace: Workspace) -> Workspace:
        request = self.context.get("request")
        if request and workspace.owner_id != request.user.id:
            raise serializers.ValidationError("Чужое пространство.")
        return workspace

    def validate_category(self, category):
        request = self.context.get("request")
        if category and request and category.owner_id != request.user.id:
            raise serializers.ValidationError("Чужая категория.")
        return category

    def _sync_subtasks(self, task: Task, subs):
        task.subtasks.all().delete()
        SubTask.objects.bulk_create(
            [
                SubTask(task=task, position=i, title=s["title"], done=s.get("done", False))
                for i, s in enumerate(subs)
            ]
        )

    def create(self, validated_data):
        subs = validated_data.pop("subtasks", [])
        task = Task.objects.create(**validated_data)
        if subs:
            self._sync_subtasks(task, subs)
        return task

    def update(self, instance, validated_data):
        subs = validated_data.pop("subtasks", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if subs is not None:
            self._sync_subtasks(instance, subs)
        return instance
