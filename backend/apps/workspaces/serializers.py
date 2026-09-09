from rest_framework import serializers

from .models import Category, Workspace


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "color", "position", "created_at"]
        read_only_fields = ["created_at"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "workspace", "name", "color"]

    def validate_workspace(self, workspace: Workspace) -> Workspace:
        request = self.context.get("request")
        if request and workspace.owner_id != request.user.id:
            raise serializers.ValidationError("Чужое пространство.")
        return workspace
