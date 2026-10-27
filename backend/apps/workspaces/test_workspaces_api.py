"""Тесты досок (workspaces) и категорий.

Тесты с пометкой BUG-xx описывают ОЖИДАЕМОЕ поведение и сейчас падают —
см. QA_REPORT.md.
"""

from rest_framework.test import APITestCase

from apps.notes.models import Note, NoteFolder
from apps.tasks.models import Task
from apps.testing import authed_client, first_ws, make_user, second_ws
from apps.workspaces.models import Category, Workspace


class WorkspaceApiTests(APITestCase):
    def setUp(self):
        self.user = make_user("ws@example.com")
        self.other = make_user("other@example.com")
        self.api = authed_client(self.user)

    def test_requires_auth(self):
        self.assertEqual(self.client.get("/api/workspaces/").status_code, 403)

    def test_list_only_own_in_position_order(self):
        resp = self.api.get("/api/workspaces/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([w["name"] for w in resp.data], ["Личное", "Работа"])
        self.assertEqual(
            {w["id"] for w in resp.data},
            set(Workspace.objects.filter(owner=self.user).values_list("id", flat=True)),
        )

    def test_create_seeds_base_categories(self):
        resp = self.api.post("/api/workspaces/", {"name": "Стройка", "color": "#478bff"})
        self.assertEqual(resp.status_code, 201)
        ws = Workspace.objects.get(id=resp.data["id"])
        self.assertEqual(ws.owner, self.user)
        self.assertEqual(
            sorted(ws.categories.values_list("name", flat=True)),
            sorted(["Работа", "Дом", "Встречи", "Быт"]),
        )

    def test_create_ignores_owner_in_payload(self):
        resp = self.api.post(
            "/api/workspaces/", {"name": "Hack", "owner": self.other.id}, format="json"
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(Workspace.objects.get(id=resp.data["id"]).owner, self.user)

    def test_create_requires_name(self):
        self.assertEqual(self.api.post("/api/workspaces/", {"name": ""}).status_code, 400)

    def test_rename(self):
        ws = first_ws(self.user)
        resp = self.api.patch(f"/api/workspaces/{ws.id}/", {"name": "Дом"}, format="json")
        self.assertEqual(resp.status_code, 200)
        ws.refresh_from_db()
        self.assertEqual(ws.name, "Дом")

    def test_foreign_workspace_is_404(self):
        foreign = first_ws(self.other)
        self.assertEqual(self.api.get(f"/api/workspaces/{foreign.id}/").status_code, 404)
        self.assertEqual(
            self.api.patch(f"/api/workspaces/{foreign.id}/", {"name": "x"}).status_code, 404
        )
        self.assertEqual(self.api.delete(f"/api/workspaces/{foreign.id}/").status_code, 404)
        self.assertTrue(Workspace.objects.filter(id=foreign.id).exists())

    def test_delete_cascades_tasks_notes_categories(self):
        ws = first_ws(self.user)
        Task.objects.create(workspace=ws, title="t")
        folder = NoteFolder.objects.create(workspace=ws, name="f")
        Note.objects.create(workspace=ws, folder=folder, title="n")
        self.assertEqual(self.api.delete(f"/api/workspaces/{ws.id}/").status_code, 204)
        self.assertFalse(Task.objects.filter(workspace_id=ws.id).exists())
        self.assertFalse(Note.objects.filter(workspace_id=ws.id).exists())
        self.assertFalse(NoteFolder.objects.filter(workspace_id=ws.id).exists())
        self.assertFalse(Category.objects.filter(workspace_id=ws.id).exists())

    def test_bug06_cannot_delete_last_workspace(self):
        """BUG-06: можно удалить ВСЕ доски через API. Фронт падает при пустом списке
        (WorkspaceSwitcher: active.color при active === undefined), а создать задачу
        больше некуда."""
        a, b = first_ws(self.user), second_ws(self.user)
        self.assertEqual(self.api.delete(f"/api/workspaces/{a.id}/").status_code, 204)
        resp = self.api.delete(f"/api/workspaces/{b.id}/")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(Workspace.objects.filter(owner=self.user).count(), 1)

    def test_bug10_color_must_be_hex(self):
        """BUG-10: цвет — произвольная строка до 9 символов, формат не проверяется."""
        resp = self.api.post("/api/workspaces/", {"name": "x", "color": "red;}"}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_bug04_bad_workspace_query_param_is_not_500(self):
        """BUG-04: ?workspace=abc -> ValueError в filter(workspace_id=...) -> 500."""
        for url in ("/api/categories/", "/api/tasks/", "/api/notes/", "/api/folders/"):
            resp = self.api.get(url, {"workspace": "abc"})
            self.assertNotEqual(resp.status_code, 500, url)


class CategoryApiTests(APITestCase):
    def setUp(self):
        self.user = make_user("cat@example.com")
        self.other = make_user("cat-other@example.com")
        self.api = authed_client(self.user)
        self.ws = first_ws(self.user)
        self.ws2 = second_ws(self.user)

    def test_list_only_own_and_filter_by_workspace(self):
        resp = self.api.get("/api/categories/")
        self.assertEqual(len(resp.data), 8)
        resp = self.api.get("/api/categories/", {"workspace": self.ws.id})
        self.assertEqual(len(resp.data), 4)
        self.assertTrue(all(c["workspace"] == self.ws.id for c in resp.data))

    def test_filter_by_foreign_workspace_returns_nothing(self):
        resp = self.api.get("/api/categories/", {"workspace": first_ws(self.other).id})
        self.assertEqual(resp.data, [])

    def test_create_in_foreign_workspace_rejected(self):
        resp = self.api.post(
            "/api/categories/",
            {"workspace": first_ws(self.other).id, "name": "x", "color": "#000000"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_foreign_category_is_404(self):
        foreign = Category.objects.filter(workspace__owner=self.other).first()
        self.assertEqual(
            self.api.patch(f"/api/categories/{foreign.id}/", {"name": "x"}).status_code, 404
        )
        self.assertEqual(self.api.delete(f"/api/categories/{foreign.id}/").status_code, 404)

    def test_delete_category_detaches_tasks(self):
        cat = self.ws.categories.first()
        task = Task.objects.create(workspace=self.ws, title="t", category=cat)
        self.assertEqual(self.api.delete(f"/api/categories/{cat.id}/").status_code, 204)
        task.refresh_from_db()
        self.assertIsNone(task.category)

    def test_bug03_moving_category_to_other_workspace_is_forbidden(self):
        """BUG-03: PATCH category.workspace на другую доску разрешён — задачи старой
        доски остаются с категорией чужой доски (нарушение инварианта из
        TaskSerializer.validate)."""
        cat = self.ws.categories.first()
        Task.objects.create(workspace=self.ws, title="t", category=cat)
        resp = self.api.patch(
            f"/api/categories/{cat.id}/", {"workspace": self.ws2.id}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        cat.refresh_from_db()
        self.assertEqual(cat.workspace_id, self.ws.id)

    def test_bug15_duplicate_category_name_in_same_workspace_rejected(self):
        """BUG-15: одноимённые категории в одной доске. Фронт сопоставляет категории
        между досками по имени (TaskModal.changeWorkspace, pasteCopy) — дубли дают
        непредсказуемый выбор."""
        resp = self.api.post(
            "/api/categories/",
            {"workspace": self.ws.id, "name": "Дом", "color": "#000000"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
