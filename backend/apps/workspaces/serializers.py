from rest_framework import serializers

from .models import Category, Workspace
from .validation import FixedWorkspaceSerializerMixin, hex_color


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "color", "position", "created_at"]
        read_only_fields = ["created_at"]
        extra_kwargs = {"color": {"validators": [hex_color]}}


class CategorySerializer(FixedWorkspaceSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "workspace", "name", "color"]
        extra_kwargs = {"color": {"validators": [hex_color]}}

    def validate(self, attrs):
        # имена уникальны внутри доски: фронт сопоставляет категории разных
        # досок по имени (перенос/копирование задачи)
        workspace = attrs.get("workspace") or getattr(self.instance, "workspace", None)
        name = attrs.get("name")
        if workspace and name:
            dupes = Category.objects.filter(workspace=workspace, name__iexact=name.strip())
            if self.instance is not None:
                dupes = dupes.exclude(pk=self.instance.pk)
            if dupes.exists():
                raise serializers.ValidationError(
                    {"name": "Категория с таким названием на этой доске уже есть."}
                )
        return attrs
