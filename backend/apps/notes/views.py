from rest_framework import viewsets

from apps.workspaces.validation import filter_by_workspace_param

from .models import Note, NoteFolder
from .serializers import NoteFolderSerializer, NoteSerializer


class NoteFolderViewSet(viewsets.ModelViewSet):
    serializer_class = NoteFolderSerializer

    def get_queryset(self):
        qs = NoteFolder.objects.filter(workspace__owner=self.request.user)
        return filter_by_workspace_param(qs, self.request)


class NoteViewSet(viewsets.ModelViewSet):
    serializer_class = NoteSerializer

    def get_queryset(self):
        qs = Note.objects.filter(workspace__owner=self.request.user)
        return filter_by_workspace_param(qs, self.request)
