from rest_framework import viewsets

from .models import Note, NoteFolder
from .serializers import NoteFolderSerializer, NoteSerializer


class NoteFolderViewSet(viewsets.ModelViewSet):
    serializer_class = NoteFolderSerializer

    def get_queryset(self):
        qs = NoteFolder.objects.filter(workspace__owner=self.request.user)
        workspace = self.request.query_params.get("workspace")
        if workspace:
            qs = qs.filter(workspace_id=workspace)
        return qs


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer

    def get_queryset(self):
        qs = Note.objects.filter(workspace__owner=self.request.user)
        workspace = self.request.query_params.get("workspace")
        if workspace:
            qs = qs.filter(workspace_id=workspace)
        return qs
