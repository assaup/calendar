from django.contrib import admin

from .models import Project, Section


class SectionInline(admin.TabularInline):
    model = Section
    extra = 1


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "is_archived", "position")
    list_filter = ("workspace", "is_archived")
    inlines = [SectionInline]
