from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.notes.views import NoteFolderViewSet, NoteViewSet
from apps.tasks.views import TaskViewSet
from apps.workspaces.views import CategoryViewSet, WorkspaceViewSet


def health(_request):
    return JsonResponse({"status": "ok", "service": "planner-api"})


router = DefaultRouter()
router.register("workspaces", WorkspaceViewSet, basename="workspace")
router.register("categories", CategoryViewSet, basename="category")
router.register("tasks", TaskViewSet, basename="task")
router.register("notes", NoteViewSet, basename="note")
router.register("folders", NoteFolderViewSet, basename="folder")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health, name="health"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include(router.urls)),
]
