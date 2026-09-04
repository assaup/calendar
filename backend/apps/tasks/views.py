from rest_framework import viewsets

from .models import Task
from .serializers import TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = (
            Task.objects.filter(workspace__owner=self.request.user)
            .select_related("category")
            .prefetch_related("subtasks")
        )
        workspace = self.request.query_params.get("workspace")
        if workspace:
            qs = qs.filter(workspace_id=workspace)
        return qs
