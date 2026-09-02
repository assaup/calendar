from django.contrib import admin

from .models import Note, NoteFolder


@admin.register(NoteFolder)
class NoteFolderAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "position")
    list_filter = ("workspace",)


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ("__str__", "workspace", "folder", "is_pinned", "updated_at")
    list_filter = ("workspace", "is_pinned")
    search_fields = ("title", "body")
