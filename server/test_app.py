import io
import json
import sqlite3
import tempfile
import unittest
import zipfile
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
        self.client._context_stack.close()
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
        downloaded.close()

    def test_parent_uses_prefixed_student_account_and_same_password(self):
        created = self.client.post("/api/admin/student-accounts", headers=self.admin_headers(), json={
            "studentId": "profile-parent", "studentName": "王小星", "username": "wang01",
            "password": "parent88", "classIds": ["class-one"],
        })
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.json["account"]["parentUsername"], "awang01")
        self.assertEqual(created.json["account"]["parentName"], "王小星家长")
        self.assertEqual(created.json["account"]["currentPassword"], "parent88")
        db = sqlite3.connect(self.db_path)
        try:
            cipher = db.execute("select password_cipher from student_accounts where username='wang01'").fetchone()[0]
        finally:
            db.close()
        self.assertNotEqual(cipher, "parent88")
        login = self.client.post("/api/parent/login", json={"username": "awang01", "password": "parent88"})
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.json["student"]["studentId"], "profile-parent")
        self.assertEqual(self.client.get("/api/parent/session").status_code, 200)

    def test_parent_login_rejects_account_without_student_profile(self):
        created = self.client.post("/api/admin/student-accounts", headers=self.admin_headers(), json={
            "studentName": "未绑定同学", "username": "unbound01",
            "password": "parent88", "classIds": ["class-one"],
        })
        self.assertEqual(created.status_code, 201)
        login = self.client.post("/api/parent/login", json={"username": "aunbound01", "password": "parent88"})
        self.assertEqual(login.status_code, 401)

    def test_unbound_profile_can_be_recycled_restored_and_assigned(self):
        recycled = self.client.post("/api/admin/student-profiles/profile-new/recycle", headers=self.admin_headers(), json={
            "studentName": "新同学", "classId": "class-one",
        })
        self.assertEqual(recycled.status_code, 200)
        placeholder = recycled.json["account"]
        self.assertFalse(placeholder["credentialsAssigned"])
        self.assertIsNotNone(placeholder["deletedAt"])
        restored = self.client.post(f"/api/admin/student-accounts/{placeholder['id']}/restore", headers=self.admin_headers())
        self.assertEqual(restored.status_code, 200)
        assigned = self.client.post("/api/admin/student-accounts", headers=self.admin_headers(), json={
            "studentId": "profile-new", "studentName": "新同学", "username": "newstudent",
            "password": "newpass88", "classIds": ["class-one"],
        })
        self.assertEqual(assigned.status_code, 201)
        self.assertEqual(assigned.json["account"]["id"], placeholder["id"])
        self.assertTrue(assigned.json["account"]["credentialsAssigned"])

    def test_class_resource_assignment_is_independent(self):
        state = self.client.get("/api/admin/feature-state?class_id=class-one", headers=self.admin_headers())
        self.assertEqual(state.status_code, 200)
        course = next(item for item in state.json["resourceLibrary"] if item["kind"] == "course")
        assigned = self.client.put(f"/api/admin/class-resources/{course['id']}", headers=self.admin_headers(), json={
            "classId": "class-two", "assigned": True, "enabled": True,
        })
        self.assertEqual(assigned.status_code, 200)
        class_two = self.client.get("/api/admin/feature-state?class_id=class-two", headers=self.admin_headers()).json
        selected = next(item for item in class_two["resourceLibrary"] if item["id"] == course["id"])
        self.assertTrue(selected["assigned"])
        self.assertTrue(selected["enabled"])

    def test_course_zip_upload_syncs_course_and_assessment(self):
        package = io.BytesIO()
        assessment = {
            "title": "第五课课后测评",
            "questions": [{"id": "q1", "type": "choice", "title": "range(5)有几个数？", "options": ["4个", "5个"], "answer": "5个", "points": 10}],
        }
        with zipfile.ZipFile(package, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.writestr("lesson/index.html", "<!doctype html><h1>第五课</h1>")
            archive.writestr("lesson/assessment.json", json.dumps(assessment, ensure_ascii=False))
        package.seek(0)
        uploaded = self.client.post("/api/admin/course-packages", headers=self.admin_headers(), data={
            "classId": "class-one", "title": "第五课", "subtitle": "列表练习", "sequence": "5",
            "syncAssessment": "true", "file": (package, "lesson-five.zip", "application/zip"),
        }, content_type="multipart/form-data")
        self.assertEqual(uploaded.status_code, 200, uploaded.json)
        self.assertIsNotNone(uploaded.json["assessmentResourceId"])
        page = self.client.get(uploaded.json["path"])
        self.assertEqual(page.status_code, 200)
        self.assertIn(b"\xe7\xac\xac\xe4\xba\x94\xe8\xaf\xbe", page.data)
        page.close()
        state = self.client.get("/api/admin/feature-state?class_id=class-one", headers=self.admin_headers()).json
        self.assertTrue(any(item["title"] == "第五课" and item["published"] for item in state["courses"]))
        self.assertTrue(any(item["title"] == "第五课课后测评" and item["published"] for item in state["assessments"]))

    def test_attendance_start_auto_checkin_manual_leave_and_export(self):
        from openpyxl import load_workbook
        today = __import__("datetime").datetime.now().astimezone().date().isoformat()
        started = self.client.post("/api/admin/attendance/sessions", headers=self.admin_headers(), json={
            "classId": "class-one", "className": "Python班", "termId": "term-one", "termName": "暑假班",
            "date": today, "courseId": "class-one:lesson-1", "courseTitle": "第一课",
            "roster": [{"studentName": "林小满", "accountId": "demo-student-01"}],
        })
        self.assertEqual(started.status_code, 201, started.json)
        session_id = started.json["session"]["id"]
        self.client.post("/api/student/login", json={"username": "student01", "password": "123456"})
        touched = self.client.post("/api/student/attendance/touch", json={"classId": "class-one"})
        self.assertTrue(touched.json["checkedIn"])
        state = self.client.get("/api/admin/attendance?class_id=class-one&term_id=term-one", headers=self.admin_headers()).json
        record = next(item for item in state["sessions"][0]["records"] if item["accountId"] == "demo-student-01")
        self.assertEqual(record["status"], "present")
        changed = self.client.patch(
            f"/api/admin/attendance/sessions/{session_id}/records/{record['studentKey']}",
            headers=self.admin_headers(), json={"status": "leave"},
        )
        self.assertEqual(changed.json["session"]["counts"]["leave"], 1)
        exported = self.client.get("/api/admin/attendance/export?class_id=class-one&term_id=term-one", headers=self.admin_headers())
        self.assertEqual(exported.status_code, 200)
        self.assertTrue(exported.data.startswith(b"PK"))
        workbook = load_workbook(io.BytesIO(exported.data), read_only=True)
        self.assertEqual(workbook.active["A1"].value, "学生姓名")
        self.assertIn("第一课", workbook.active["B1"].value)
        workbook.close()
        exported.close()

        db = sqlite3.connect(self.db_path)
        db.execute("update student_accounts set student_id='profile-one',class_ids='[\"class-two\"]' where id='demo-student-01'")
        db.commit(); db.close()
        self.client.post("/api/parent/login", json={"username": "astudent01", "password": "123456"})
        parent_view = self.client.get("/api/parent/attendance?term_id=term-one")
        self.assertEqual(parent_view.status_code, 200)
        self.assertEqual(parent_view.json["groups"][0]["classId"], "class-one")
        self.assertEqual(parent_view.json["groups"][0]["leave"], 1)

    def test_student_xlsx_preview_generates_initials_and_collision_numbers(self):
        from openpyxl import Workbook, load_workbook
        template = self.client.get("/api/admin/student-import/template", headers=self.admin_headers())
        template_book = load_workbook(io.BytesIO(template.data), read_only=True)
        self.assertEqual(template_book.active.max_row, 1)
        self.assertEqual(template_book.active["A1"].value, "学生姓名")
        template_book.close(); template.close()
        workbook = Workbook(); sheet = workbook.active
        sheet.append(["学生姓名"]); sheet.append(["杨金鹏"]); sheet.append(["杨金鹏"]); sheet.append([None])
        payload = io.BytesIO(); workbook.save(payload); payload.seek(0)
        response = self.client.post("/api/admin/student-import/preview", headers=self.admin_headers(), data={
            "file": (payload, "students.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        }, content_type="multipart/form-data")
        self.assertEqual(response.status_code, 200, response.json)
        self.assertEqual([item["username"] for item in response.json["rows"]], ["yjp", "yjp1"])
        self.assertEqual(response.json["rows"][0]["parentUsername"], "ayjp")


if __name__ == "__main__":
    unittest.main()
