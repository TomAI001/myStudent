import io
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app import create_app


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.db_path = root / "test.db"
        self.app = create_app({
            "TESTING": True,
            "DATABASE": str(self.db_path),
            "UPLOAD_ROOT": str(root / "uploads"),
            "ADMIN_TEST_TOKEN": "teacher-test-token",
            "DEFAULT_CLASS_ID": "class-one",
        })
        self.client = self.app.test_client()

    def tearDown(self):
        self.temp.cleanup()

    def admin_headers(self):
        return {"Authorization": "Bearer teacher-test-token"}

    def test_migrated_password_is_hashed_and_login_is_shared_server_side(self):
        db = sqlite3.connect(self.db_path)
        try:
            password_hash = db.execute("select password_hash from student_accounts where username='student01'").fetchone()[0]
        finally:
            db.close()
        self.assertNotEqual(password_hash, "123456")
        self.assertTrue(password_hash.startswith("scrypt:"))

        login = self.client.post("/api/student/login", json={"username": "student01", "password": "123456"})
        self.assertEqual(login.status_code, 200)
        self.assertIn("HttpOnly", login.headers["Set-Cookie"])
        self.assertEqual(self.client.get("/api/student/session").status_code, 200)

    def test_teacher_can_create_edit_disable_and_reset_account(self):
        created = self.client.post("/api/admin/student-accounts", headers=self.admin_headers(), json={
            "studentId": "profile-1", "studentName": "张同学", "username": "zhang01",
            "password": "abc12345", "classIds": ["class-one"],
        })
        self.assertEqual(created.status_code, 201)
        account_id = created.json["account"]["id"]
        edited = self.client.patch(f"/api/admin/student-accounts/{account_id}", headers=self.admin_headers(), json={
            "studentName": "张小满", "username": "zhang02", "classIds": ["class-one"], "active": False,
        })
        self.assertEqual(edited.status_code, 200)
        self.assertFalse(edited.json["account"]["active"])
        reset = self.client.post(f"/api/admin/student-accounts/{account_id}/reset-password", headers=self.admin_headers(), json={"password": "newpass88"})
        self.assertEqual(reset.status_code, 200)

    def test_logged_in_student_can_upload_media(self):
        self.client.post("/api/student/login", json={"username": "student01", "password": "123456"})
        response = self.client.post("/api/media/upload", data={
            "folder": "homework/demo",
            "file": (io.BytesIO(b"small-image"), "work.png", "image/png"),
        }, content_type="multipart/form-data")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json["url"].startswith("/uploads/homework/demo/"))
        downloaded = self.client.get(response.json["url"])
        self.assertEqual(downloaded.status_code, 200)
        self.assertEqual(downloaded.data, b"small-image")


if __name__ == "__main__":
    unittest.main()
