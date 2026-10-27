"""Тесты API заметок и папок.

Тесты с пометкой BUG-xx описывают ОЖИДАЕМОЕ поведение и сейчас падают —
см. QA_REPORT.md.
"""

import time

from rest_framework.test import APITestCase

from apps.notes.models import Note, NoteFolder
from apps.testing import authed_client, first_ws, make_user, second_ws


class NoteApiTests(APITestCase):
    def setUp(self):
        self.user = make_user("notes@example.com")
        self.other = make_user("notes-other@example.com")
        self.api = authed_client(self.user)
        self.ws = first_ws(self.user)
        self.ws2 = second_ws(self.user)

    def create_note(self, **payload):
        payload.setdefault("workspace", self.ws.id)
        return self.api.post("/api/notes/", payload, format="json")

    def test_create_empty_note(self):
        resp = self.create_note(title="", body="")
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertFalse(resp.data["is_pinned"])
        self.assertIsNone(resp.data["folder"])

    def test_body_html_roundtrip(self):
        html = '<p>Привет <strong>мир</strong></p><ul data-type="taskList"></ul>'
        note_id = self.create_note(body=html).data["id"]
        self.assertEqual(self.api.get(f"/api/notes/{note_id}/").data["body"], html)

    def test_order_pinned_first_then_recently_updated(self):
        a = self.create_note(title="a").data["id"]
        time.sleep(0.01)
        b = self.create_note(title="b").data["id"]
        time.sleep(0.01)
        c = self.create_note(title="c").data["id"]
        self.api.patch(f"/api/notes/{a}/", {"is_pinned": True}, format="json")
        ids = [n["id"] for n in self.api.get("/api/notes/").data]
        self.assertEqual(ids, [a, c, b])

    def test_filter_by_workspace(self):
        self.create_note(title="a")
        self.create_note(title="b", workspace=self.ws2.id)
        resp = self.api.get("/api/notes/", {"workspace": self.ws2.id})
        self.assertEqual([n["title"] for n in resp.data], ["b"])

    def test_foreign_note_is_hidden(self):
        foreign = Note.objects.create(workspace=first_ws(self.other), title="secret")
        self.assertEqual(self.api.get("/api/notes/").data, [])
        self.assertEqual(self.api.get(f"/api/notes/{foreign.id}/").status_code, 404)
        self.assertEqual(
            self.api.patch(f"/api/notes/{foreign.id}/", {"title": "x"}).status_code, 404
        )
        self.assertEqual(self.api.delete(f"/api/notes/{foreign.id}/").status_code, 404)

    def test_create_in_foreign_workspace_rejected(self):
        resp = self.create_note(workspace=first_ws(self.other).id)
        self.assertEqual(resp.status_code, 400)

    def test_bug01_cannot_attach_note_to_foreign_folder(self):
        """BUG-01 (безопасность): у NoteSerializer нет проверки folder. Можно привязать
        свою заметку к папке ЧУЖОГО пользователя (перебором id) — IDOR на запись."""
        foreign_folder = NoteFolder.objects.create(workspace=first_ws(self.other), name="чужая")
        resp = self.create_note(folder=foreign_folder.id)
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Note.objects.filter(folder=foreign_folder).exists())

    def test_bug01_folder_must_be_in_same_workspace(self):
        """BUG-01: папка другой (своей) доски тоже не должна приниматься — на фронте
        такая заметка «теряется»: в списке папок её доски этой папки нет."""
        folder2 = NoteFolder.objects.create(workspace=self.ws2, name="f2")
        resp = self.create_note(folder=folder2.id)
        self.assertEqual(resp.status_code, 400)
        note_id = self.create_note().data["id"]
        resp = self.api.patch(f"/api/notes/{note_id}/", {"folder": folder2.id}, format="json")
        self.assertEqual(resp.status_code, 400)


class FolderApiTests(APITestCase):
    def setUp(self):
        self.user = make_user("folders@example.com")
        self.other = make_user("folders-other@example.com")
        self.api = authed_client(self.user)
        self.ws = first_ws(self.user)
        self.ws2 = second_ws(self.user)

    def test_crud(self):
        resp = self.api.post("/api/folders/", {"workspace": self.ws.id, "name": "Идеи"})
        self.assertEqual(resp.status_code, 201)
        fid = resp.data["id"]
        resp = self.api.patch(f"/api/folders/{fid}/", {"name": "Планы"}, format="json")
        self.assertEqual(resp.data["name"], "Планы")
        self.assertEqual(self.api.delete(f"/api/folders/{fid}/").status_code, 204)

    def test_name_required(self):
        resp = self.api.post("/api/folders/", {"workspace": self.ws.id, "name": ""})
        self.assertEqual(resp.status_code, 400)

    def test_delete_folder_keeps_notes(self):
        folder = NoteFolder.objects.create(workspace=self.ws, name="f")
        note = Note.objects.create(workspace=self.ws, folder=folder, title="n")
        self.api.delete(f"/api/folders/{folder.id}/")
        note.refresh_from_db()
        self.assertIsNone(note.folder)

    def test_foreign_folder_hidden(self):
        foreign = NoteFolder.objects.create(workspace=first_ws(self.other), name="x")
        self.assertEqual(self.api.get("/api/folders/").data, [])
        self.assertEqual(self.api.delete(f"/api/folders/{foreign.id}/").status_code, 404)
        resp = self.api.post("/api/folders/", {"workspace": foreign.workspace_id, "name": "y"})
        self.assertEqual(resp.status_code, 400)

    def test_bug03_moving_folder_to_other_workspace_is_forbidden(self):
        """BUG-03: смена workspace у папки разрешена — заметки остаются в старой доске,
        но ссылаются на папку новой."""
        folder = NoteFolder.objects.create(workspace=self.ws, name="f")
        Note.objects.create(workspace=self.ws, folder=folder, title="n")
        resp = self.api.patch(
            f"/api/folders/{folder.id}/", {"workspace": self.ws2.id}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
