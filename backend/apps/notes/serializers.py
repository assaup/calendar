from rest_framework import serializers

from apps.workspaces.models import Workspace

from .models import Note, NoteFolder


class NoteFolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = NoteFolder
        fields = ["id", "workspace", "name", "position"]

    def validate_workspace(self, workspace: Workspace) -> Workspace:
        request = self.context.get("request")
        if request and workspace.owner_id != request.user.id:
            raise serializers.ValidationError("Чужое пространство.")
        return workspace


class NoteSerializer(serializers.ModelSerializer):
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

    def validate_workspace(self, workspace: Workspace) -> Workspace:
        request = self.context.get("request")
        if request and workspace.owner_id != request.user.id:
            raise serializers.ValidationError("Чужое пространство.")
        return workspace
