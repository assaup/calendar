"""Тесты регистрации, входа, выхода и /me.

Тесты с пометкой BUG-xx описывают ОЖИДАЕМОЕ поведение и сейчас падают —
см. QA_REPORT.md в корне репозитория.
"""

from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase

from apps.testing import PASSWORD, make_user
from apps.workspaces.models import Category, Workspace

User = get_user_model()

REGISTER = "/api/auth/register/"
LOGIN = "/api/auth/login/"
LOGOUT = "/api/auth/logout/"
ME = "/api/auth/me/"


class RegisterTests(APITestCase):
    def test_register_creates_user_logs_in_and_seeds_defaults(self):
        resp = self.client.post(
            REGISTER,
            {"email": "New@Example.com ", "password": PASSWORD, "name": "Маша"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data["email"], "new@example.com")  # нормализован
        self.assertEqual(resp.data["name"], "Маша")
        self.assertNotIn("password", resp.data)

        user = User.objects.get(email="new@example.com")
        self.assertEqual(user.username, "new@example.com")
        self.assertTrue(user.check_password(PASSWORD))
        # сид: 2 доски, по 4 категории в каждой
        self.assertEqual(Workspace.objects.filter(owner=user).count(), 2)
        self.assertEqual(Category.objects.filter(workspace__owner=user).count(), 8)

        # сессия уже есть — /me отвечает пользователем
        me = self.client.get(ME)
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["email"], "new@example.com")

    def test_register_duplicate_email_is_case_insensitive(self):
        make_user("dup@example.com")
        resp = self.client.post(
            REGISTER, {"email": "DUP@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("email", resp.data)

    def test_register_rejects_weak_password(self):
        for weak in ["123", "12345678", "password"]:
            resp = self.client.post(
                REGISTER, {"email": f"w{len(weak)}@example.com", "password": weak}, format="json"
            )
            self.assertEqual(resp.status_code, 400, weak)
            self.assertIn("password", resp.data)

    def test_register_rejects_invalid_email_and_missing_fields(self):
        self.assertEqual(
            self.client.post(REGISTER, {"email": "not-an-email", "password": PASSWORD}).status_code,
            400,
        )
        self.assertEqual(self.client.post(REGISTER, {}, format="json").status_code, 400)

    def test_register_name_is_optional(self):
        resp = self.client.post(
            REGISTER, {"email": "noname@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["name"], "")

    def test_bug09_password_similar_to_email_is_rejected(self):
        """BUG-09: validate_password вызывается без user, поэтому
        UserAttributeSimilarityValidator не работает — пароль = email принимается."""
        email = "verylongusername@example.com"
        resp = self.client.post(REGISTER, {"email": email, "password": email}, format="json")
        self.assertEqual(resp.status_code, 400)


class LoginTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = make_user("login@example.com")

    def test_login_ok_case_insensitive_email(self):
        resp = self.client.post(
            LOGIN, {"email": "  LOGIN@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        self.assertEqual(resp.data["id"], self.user.id)
        self.assertEqual(self.client.get(ME).status_code, 200)

    def test_login_wrong_password(self):
        resp = self.client.post(
            LOGIN, {"email": "login@example.com", "password": "wrong"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("detail", resp.data)

    def test_login_unknown_email_same_error_as_wrong_password(self):
        """Ответ не должен раскрывать, существует ли email."""
        unknown = self.client.post(
            LOGIN, {"email": "nobody@example.com", "password": "x"}, format="json"
        )
        wrong = self.client.post(LOGIN, {"email": "login@example.com", "password": "x"})
        self.assertEqual(unknown.status_code, wrong.status_code)
        self.assertEqual(unknown.data, wrong.data)

    def test_login_inactive_user_rejected(self):
        self.user.is_active = False
        self.user.save()
        resp = self.client.post(
            LOGIN, {"email": "login@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_bug08_login_with_case_duplicate_emails_does_not_crash(self):
        """BUG-08: уникальность email в БД регистрозависимая. Если через админку /
        createsuperuser появились 'Case@x' и 'case@x', User.objects.get(email__iexact)
        бросает MultipleObjectsReturned -> 500."""
        User.objects.create_user(
            username="Login@Example.com", email="Login@Example.com", password=PASSWORD
        )
        resp = self.client.post(
            LOGIN, {"email": "login@example.com", "password": PASSWORD}, format="json"
        )
        self.assertNotEqual(resp.status_code, 500)

    def test_bug07_login_is_rate_limited(self):
        """BUG-07: нет throttling на вход — пароль можно перебирать бесконечно."""
        codes = [
            self.client.post(
                LOGIN, {"email": "login@example.com", "password": f"bad{i}"}, format="json"
            ).status_code
            for i in range(30)
        ]
        self.assertIn(429, codes)


class LogoutAndMeTests(APITestCase):
    def setUp(self):
        self.user = make_user("me@example.com")

    def test_me_anonymous_401_and_sets_csrf_cookie(self):
        resp = self.client.get(ME)
        self.assertEqual(resp.status_code, 401)
        self.assertIn("csrftoken", resp.cookies)

    def test_logout_clears_session(self):
        self.client.login(username="me@example.com", password=PASSWORD)
        self.assertEqual(self.client.get(ME).status_code, 200)
        self.assertEqual(self.client.post(LOGOUT).status_code, 204)
        self.assertEqual(self.client.get(ME).status_code, 401)

    def test_bug11_logout_with_expired_session_succeeds(self):
        """BUG-11: logout требует IsAuthenticated. Если сессия истекла, фронт получает
        403 на logout, useAuth.logout бросает исключение и пользователь «застревает»
        в приложении. Выход должен быть идемпотентным."""
        resp = self.client.post(LOGOUT)
        self.assertIn(resp.status_code, (200, 204))


class CsrfTests(APITestCase):
    """Через реальную сессию (enforce_csrf_checks=True), как работает браузер."""

    def setUp(self):
        cache.clear()
        self.user = make_user("csrf@example.com")
        self.client = APIClient(enforce_csrf_checks=True)

    def test_authenticated_unsafe_request_requires_csrf_token(self):
        self.client.login(username="csrf@example.com", password=PASSWORD)
        resp = self.client.post("/api/workspaces/", {"name": "X"}, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_authenticated_unsafe_request_with_token_ok(self):
        self.client.login(username="csrf@example.com", password=PASSWORD)
        token = self.client.get(ME).cookies["csrftoken"].value
        resp = self.client.post(
            "/api/workspaces/", {"name": "X"}, format="json", HTTP_X_CSRFTOKEN=token
        )
        self.assertEqual(resp.status_code, 201)

    def test_bug12_login_requires_csrf_token(self):
        """BUG-12: APIView csrf_exempt + SessionAuthentication проверяет CSRF только для
        уже залогиненных. Вход/регистрация без CSRF-токена проходят (login CSRF)."""
        resp = self.client.post(
            LOGIN, {"email": "csrf@example.com", "password": PASSWORD}, format="json"
        )
        self.assertEqual(resp.status_code, 403)
