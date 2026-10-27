from rest_framework import serializers

from apps.workspaces.validation import (
    FixedWorkspaceSerializerMixin,
    WorkspaceOwnedSerializerMixin,
)

from .models import Note, NoteFolder


class NoteFolderSerializer(FixedWorkspaceSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = NoteFolder
        fields = ["id", "workspace", "name", "position"]


class NoteSerializer(WorkspaceOwnedSerializerMixin, serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = [
            "id",
            "workspace",
            "folder",
            "title",
            "body",
            "is_pinned",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        # папка — только из той же доски, что и заметка (а значит, и своя:
        # доска уже проверена на владельца)
        workspace = attrs.get("workspace") or getattr(self.instance, "workspace", None)
        if "folder" in attrs:
            folder = attrs["folder"]
            if folder is not None and workspace and folder.workspace_id != workspace.id:
                raise serializers.ValidationError({"folder": "Папка из другой доски."})
        elif self.instance is not None and "workspace" in attrs:
            # заметку перенесли на другую доску — старая папка ей больше не подходит
            folder = self.instance.folder
            if folder is not None and folder.workspace_id != workspace.id:
                attrs["folder"] = None
        return attrs
