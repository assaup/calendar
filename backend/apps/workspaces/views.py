from rest_framework import viewsets

from .defaults import seed_categories
from .models import Category, Workspace
from .serializers import CategorySerializer, WorkspaceSerializer


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer

    def get_queryset(self):
        return Workspace.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        # новая доска сразу получает базовый набор категорий
        workspace = serializer.save(owner=self.request.user)
        seed_categories(workspace)


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        qs = Category.objects.filter(workspace__owner=self.request.user)
        workspace = self.request.query_params.get("workspace")
        if workspace:
            qs = qs.filter(workspace_id=workspace)
        return qs
