from rest_framework import viewsets
from rest_framework.exceptions import ValidationError

from .defaults import seed_categories
from .models import Category, Workspace
from .serializers import CategorySerializer, WorkspaceSerializer
from .validation import filter_by_workspace_param


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer

    def get_queryset(self):
        return Workspace.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        # новая доска сразу получает базовый набор категорий
        workspace = serializer.save(owner=self.request.user)
        seed_categories(workspace)

    def perform_destroy(self, instance):
        # без досок приложению некуда класть задачи
        if not self.get_queryset().exclude(pk=instance.pk).exists():
            raise ValidationError({"detail": "Нельзя удалить последнюю доску."})
        instance.delete()


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        qs = Category.objects.filter(workspace__owner=self.request.user)
        return filter_by_workspace_param(qs, self.request)
