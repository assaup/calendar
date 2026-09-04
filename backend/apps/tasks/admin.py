from django.contrib import admin

from .models import SubTask, Task


class SubTaskInline(admin.TabularInline):
    model = SubTask
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "workspace", "status", "priority", "due_date", "category")
    list_filter = ("status", "priority", "workspace", "category")
    search_fields = ("title", "description")
    date_hierarchy = "due_date"
    inlines = [SubTaskInline]
