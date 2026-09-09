from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.workspaces.models import Workspace

User = get_user_model()


class TaskApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="a", email="a@e.com", password="x")
        # сид-сигнал создал пространства
        self.ws = Workspace.objects.filter(owner=self.user).first()

    def test_defaults_seeded(self):
        self.assertEqual(Workspace.objects.filter(owner=self.user).count(), 2)
        # у каждой доски свой базовый набор категорий
        for ws in Workspace.objects.filter(owner=self.user):
            self.assertEqual(ws.categories.count(), 4)

    def test_create_task_with_subtasks(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(
            "/api/tasks/",
            {
                "workspace": self.ws.id,
                "title": "T",
                "priority": "high",
                "subtasks": [{"title": "s1", "done": True}],
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["priority"], "high")
        self.assertEqual(len(resp.data["subtasks"]), 1)

    def test_tasks_are_owner_scoped(self):
        other = User.objects.create_user(username="b", email="b@e.com", password="x")
        other_ws = Workspace.objects.filter(owner=other).first()
        self.client.force_authenticate(self.user)
        # чужое пространство отклоняется
        resp = self.client.post(
            "/api/tasks/", {"workspace": other_ws.id, "title": "X"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        # чужие задачи не видны
        self.client.force_authenticate(other)
        self.client.post("/api/tasks/", {"workspace": other_ws.id, "title": "Y"}, format="json")
        self.client.force_authenticate(self.user)
        resp = self.client.get("/api/tasks/")
        self.assertEqual(len(resp.data), 0)

    def test_category_scoped_to_workspace(self):
        self.client.force_authenticate(self.user)
        # категория создаётся внутри конкретной доски
        resp = self.client.post(
            "/api/categories/",
            {"workspace": self.ws.id, "name": "Кровля", "color": "#478bff"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        cat_id = resp.data["id"]
        # задача в ДРУГОЙ доске не может взять эту категорию
        other_ws = Workspace.objects.filter(owner=self.user).exclude(id=self.ws.id).first()
        resp = self.client.post(
            "/api/tasks/",
            {"workspace": other_ws.id, "title": "T", "category": cat_id},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_requires_auth(self):
        self.assertEqual(self.client.get("/api/tasks/").status_code, 403)
