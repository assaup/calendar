from django.contrib import admin

from .models import Category, Workspace


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "position")
    list_filter = ("owner",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "color")
    list_filter = ("workspace",)
