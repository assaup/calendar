from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "status", "due_date", "category")
    list_filter = ("status", "project", "category")
    search_fields = ("title", "description")
    date_hierarchy = "due_date"
