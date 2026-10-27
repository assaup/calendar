from django.db.models import Max
from rest_framework import viewsets

from apps.workspaces.validation import filter_by_workspace_param

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
        return filter_by_workspace_param(qs, self.request)

    def perform_create(self, serializer):
        # новая задача — в конец общего списка (позиции общие для всех досок,
        # их проставляет перетаскивание на фронте)
        if "position" in serializer.validated_data:
            serializer.save()
            return
        last = Task.objects.filter(workspace__owner=self.request.user).aggregate(m=Max("position"))[
            "m"
        ]
        serializer.save(position=0 if last is None else last + 1)
