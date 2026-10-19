"""Тесты API задач и подзадач.

Тесты с пометкой BUG-xx описывают ОЖИДАЕМОЕ поведение и сейчас падают —
см. QA_REPORT.md.
"""

from rest_framework.test import APITestCase

from apps.tasks.models import SubTask, Task
from apps.testing import authed_client, first_ws, make_user, second_ws

URL = "/api/tasks/"


def detail(task_id) -> str:
    return f"{URL}{task_id}/"


class TaskCrudTests(APITestCase):
    def setUp(self):
        self.user = make_user("tasks@example.com")
        self.other = make_user("tasks-other@example.com")
        self.api = authed_client(self.user)
        self.ws = first_ws(self.user)
        self.ws2 = second_ws(self.user)
        self.cat = self.ws.categories.order_by("id").first()

    def create(self, **payload):
        payload.setdefault("workspace", self.ws.id)
        payload.setdefault("title", "Задача")
        return self.api.post(URL, payload, format="json")

    def test_create_defaults(self):
        resp = self.create()
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data["status"], "todo")
        self.assertIsNone(resp.data["priority"])
        self.assertIsNone(resp.data["category"])
        self.assertIsNone(resp.data["start_date"])
        self.assertIsNone(resp.data["due_date"])
        self.assertEqual(resp.data["subtasks"], [])
        self.assertIn("created_at", resp.data)

    def test_create_full_payload(self):
        resp = self.create(
            title="Купить плитку",
            description="Серая, 30x30",
            category=self.cat.id,
            status="in_progress",
            priority="medium",
            start_date="2026-10-01",
            due_date="2026-10-05",
            subtasks=[{"title": "a"}, {"title": "b", "done": True}],
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data["category"], self.cat.id)
        self.assertEqual(resp.data["due_date"], "2026-10-05")
        self.assertEqual([s["title"] for s in resp.data["subtasks"]], ["a", "b"])
        self.assertEqual([s["done"] for s in resp.data["subtasks"]], [False, True])

    def test_create_validation(self):
        self.assertEqual(self.api.post(URL, {"title": "x"}, format="json").status_code, 400)
        self.assertEqual(self.create(title="").status_code, 400)
        self.assertEqual(self.create(title="   ").status_code, 400)
        self.assertEqual(self.create(title="x" * 301).status_code, 400)
        self.assertEqual(self.create(status="archived").status_code, 400)
        self.assertEqual(self.create(priority="urgent").status_code, 400)
        self.assertEqual(self.create(due_date="31.12.2026").status_code, 400)
        self.assertEqual(self.create(position=-1).status_code, 400)

    def test_priority_can_be_cleared(self):
        task_id = self.create(priority="high").data["id"]
        resp = self.api.patch(detail(task_id), {"priority": None}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.data["priority"])

    def test_patch_partial_keeps_other_fields(self):
        task_id = self.create(description="d", priority="low", due_date="2026-10-10").data["id"]
        resp = self.api.patch(detail(task_id), {"status": "done"}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["description"], "d")
        self.assertEqual(resp.data["priority"], "low")
        self.assertEqual(resp.data["due_date"], "2026-10-10")

    def test_delete(self):
        task_id = self.create().data["id"]
        self.assertEqual(self.api.delete(detail(task_id)).status_code, 204)
        self.assertFalse(Task.objects.filter(id=task_id).exists())

    def test_filter_by_workspace(self):
        self.create(title="a")
        self.create(title="b", workspace=self.ws2.id)
        resp = self.api.get(URL, {"workspace": self.ws2.id})
        self.assertEqual([t["title"] for t in resp.data], ["b"])
        self.assertEqual(len(self.api.get(URL).data), 2)


class TaskOwnershipTests(APITestCase):
    def setUp(self):
        self.user = make_user("own@example.com")
        self.other = make_user("own-other@example.com")
        self.api = authed_client(self.user)
        self.ws = first_ws(self.user)
        self.foreign_ws = first_ws(self.other)
        self.foreign_task = Task.objects.create(workspace=self.foreign_ws, title="secret")

    def test_foreign_task_not_listed(self):
        self.assertEqual(self.api.get(URL).data, [])

    def test_foreign_task_detail_update_delete_404(self):
        url = detail(self.foreign_task.id)
        self.assertEqual(self.api.get(url).status_code, 404)
        self.assertEqual(self.api.patch(url, {"title": "x"}, format="json").status_code, 404)
        self.assertEqual(self.api.delete(url).status_code, 404)
        self.foreign_task.refresh_from_db()
        self.assertEqual(self.foreign_task.title, "secret")

    def test_cannot_move_own_task_to_foreign_workspace(self):
        task = Task.objects.create(workspace=self.ws, title="mine")
        resp = self.api.patch(detail(task.id), {"workspace": self.foreign_ws.id}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_cannot_use_foreign_category(self):
        foreign_cat = self.foreign_ws.categories.first()
        resp = self.api.post(
            URL, {"workspace": self.ws.id, "title": "x", "category": foreign_cat.id}, format="json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_cannot_use_category_from_other_own_workspace(self):
        cat2 = second_ws(self.user).categories.first()
        resp = self.api.post(
            URL, {"workspace": self.ws.id, "title": "x", "category": cat2.id}, format="json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_patch_category_only_checks_task_workspace(self):
        task = Task.objects.create(workspace=self.ws, title="t")
        cat2 = second_ws(self.user).categories.first()
        resp = self.api.patch(detail(task.id), {"category": cat2.id}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_bug02_moving_task_to_other_workspace_drops_or_rejects_old_category(self):
        """BUG-02: PATCH {workspace: другая доска} без поля category проходит
        валидацию (validate смотрит только attrs['category']) — задача остаётся с
        категорией старой доски."""
        cat = self.ws.categories.first()
        ws2 = second_ws(self.user)
        task = Task.objects.create(workspace=self.ws, title="t", category=cat)
        resp = self.api.patch(detail(task.id), {"workspace": ws2.id}, format="json")
        task.refresh_from_db()
        if resp.status_code == 200:
            self.assertTrue(
                task.category is None or task.category.workspace_id == task.workspace_id,
                "у задачи категория чужой доски",
            )
        else:
            self.assertEqual(resp.status_code, 400)
            self.assertEqual(task.workspace_id, self.ws.id)


class TaskDatesAndOrderTests(APITestCase):
    def setUp(self):
        self.user = make_user("dates@example.com")
        self.api = authed_client(self.user)
        self.ws = first_ws(self.user)

    def test_bug05_start_after_due_is_rejected(self):
        """BUG-05: start_date > due_date сохраняется; календарь молча меняет их местами,
        а доска/список считают срок по due_date."""
        resp = self.api.post(
            URL,
            {
                "workspace": self.ws.id,
                "title": "x",
                "start_date": "2026-10-20",
                "due_date": "2026-10-01",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_list_order_is_position_then_id(self):
        a = Task.objects.create(workspace=self.ws, title="a", position=2)
        b = Task.objects.create(workspace=self.ws, title="b", position=0)
        c = Task.objects.create(workspace=self.ws, title="c", position=1)
        ids = [t["id"] for t in self.api.get(URL).data]
        self.assertEqual(ids, [b.id, c.id, a.id])

    def test_bug14_new_task_goes_to_end_after_reordering(self):
        """BUG-14: новая задача всегда получает position=0. После перетаскивания
        (фронт проставляет position 0..n) новая задача после перезагрузки
        «прыгает» в начало списка, хотя локально была добавлена в конец."""
        a = self.api.post(URL, {"workspace": self.ws.id, "title": "a"}, format="json").data
        b = self.api.post(URL, {"workspace": self.ws.id, "title": "b"}, format="json").data
        # как делает moveTask на фронте
        self.api.patch(detail(a["id"]), {"position": 0}, format="json")
        self.api.patch(detail(b["id"]), {"position": 1}, format="json")
        c = self.api.post(URL, {"workspace": self.ws.id, "title": "c"}, format="json").data
        titles = [t["title"] for t in self.api.get(URL).data]
        self.assertEqual(titles, ["a", "b", "c"], f"c.position={c['position']}")


class SubtaskTests(APITestCase):
    def setUp(self):
        self.user = make_user("subs@example.com")
        self.api = authed_client(self.user)
        self.ws = first_ws(self.user)
        self.task_id = self.api.post(
            URL,
            {
                "workspace": self.ws.id,
                "title": "t",
                "subtasks": [{"title": "1"}, {"title": "2"}, {"title": "3"}],
            },
            format="json",
        ).data["id"]

    def test_subtasks_keep_order(self):
        resp = self.api.get(detail(self.task_id))
        self.assertEqual([s["title"] for s in resp.data["subtasks"]], ["1", "2", "3"])

    def test_patch_without_subtasks_keeps_them(self):
        self.api.patch(detail(self.task_id), {"title": "renamed"}, format="json")
        self.assertEqual(SubTask.objects.filter(task_id=self.task_id).count(), 3)

    def test_patch_replaces_subtasks(self):
        resp = self.api.patch(
            detail(self.task_id),
            {"subtasks": [{"title": "3", "done": True}, {"title": "1"}]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([s["title"] for s in resp.data["subtasks"]], ["3", "1"])
        self.assertEqual([s["done"] for s in resp.data["subtasks"]], [True, False])

    def test_patch_empty_list_clears_subtasks(self):
        self.api.patch(detail(self.task_id), {"subtasks": []}, format="json")
        self.assertEqual(SubTask.objects.filter(task_id=self.task_id).count(), 0)

    def test_subtask_title_required(self):
        resp = self.api.patch(detail(self.task_id), {"subtasks": [{"title": ""}]}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(SubTask.objects.filter(task_id=self.task_id).count(), 3)

    def test_subtasks_deleted_with_task(self):
        self.api.delete(detail(self.task_id))
        self.assertFalse(SubTask.objects.filter(task_id=self.task_id).exists())

    def test_list_query_count_is_constant(self):
        """N+1: список задач должен грузиться фиксированным числом запросов."""
        for i in range(5):
            self.api.post(
                URL,
                {"workspace": self.ws.id, "title": f"t{i}", "subtasks": [{"title": "s"}]},
                format="json",
            )
        # сессия/авторизация через force_authenticate не ходит в БД;
        # 1 — задачи (+select_related категории), 1 — prefetch подзадач
        with self.assertNumQueries(2):
            self.api.get(URL)
