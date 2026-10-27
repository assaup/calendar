"""Общие проверки для сериализаторов и ViewSet'ов, привязанных к доске."""

from django.core.validators import RegexValidator
from rest_framework import serializers

from .models import Workspace

# Цвет подставляется во фронте в style/color-mix(...) — только #rgb или #rrggbb
hex_color = RegexValidator(
    r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
    "Цвет должен быть в формате #RRGGBB.",
)


def filter_by_workspace_param(queryset, request):
    """?workspace=<id> — фильтр по доске. Нечисловое значение даёт пустой
    список, а не 500 на filter(workspace_id='abc')."""
    raw = request.query_params.get("workspace")
    if not raw:
        return queryset
    if not raw.isdigit():
        return queryset.none()
    return queryset.filter(workspace_id=int(raw))


class WorkspaceOwnedSerializerMixin:
    """Доска должна принадлежать текущему пользователю."""

    def validate_workspace(self, workspace: Workspace) -> Workspace:
        request = self.context.get("request")
        if request and workspace.owner_id != request.user.id:
            raise serializers.ValidationError("Чужое пространство.")
        return workspace


class FixedWorkspaceSerializerMixin(WorkspaceOwnedSerializerMixin):
    """Категорию/папку нельзя перенести на другую доску: на неё ссылаются
    задачи и заметки старой доски."""

    def validate_workspace(self, workspace: Workspace) -> Workspace:
        workspace = super().validate_workspace(workspace)
        if self.instance is not None and workspace.id != self.instance.workspace_id:
            raise serializers.ValidationError("Нельзя перенести на другую доску.")
        return workspace
