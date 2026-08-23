from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import sqlite3
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
from typing import Any

from flask import Flask, current_app, g, jsonify, request, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash
from werkzeug.utils import secure_filename


SESSION_COOKIE = "growth_student_session"
USERNAME_RE = re.compile(r"^[A-Za-z0-9._-]{3,32}$")
ALLOWED_MEDIA = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}
LOGIN_ATTEMPTS: dict[str, list[float]] = {}
ADMIN_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_now() -> str:
    return utc_now().isoformat()


def create_app(test_config: dict[str, Any] | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_mapping(
        DATABASE=os.getenv("GROWTH_DATABASE", "/var/lib/growth-journal/growth.db"),
        UPLOAD_ROOT=os.getenv("GROWTH_UPLOAD_ROOT", "/var/lib/growth-journal/uploads"),
        SUPABASE_URL=os.getenv("SUPABASE_URL", ""),
        SUPABASE_PUBLISHABLE_KEY=os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
        DEFAULT_CLASS_ID=os.getenv("DEFAULT_CLASS_ID", "python-summer"),
        ADMIN_TEST_TOKEN=os.getenv("ADMIN_TEST_TOKEN", ""),
        MAX_CONTENT_LENGTH=220 * 1024 * 1024,
        SESSION_DAYS=7,
    )
    if test_config:
        app.config.update(test_config)
    app.config["DATABASE"] = str(Path(app.config["DATABASE"]).resolve())
    app.config["UPLOAD_ROOT"] = str(Path(app.config["UPLOAD_ROOT"]).resolve())
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)  # type: ignore[method-assign]

    Path(app.config["DATABASE"]).parent.mkdir(parents=True, exist_ok=True)
    Path(app.config["UPLOAD_ROOT"]).mkdir(parents=True, exist_ok=True)
    with app.app_context():
        init_db()
        migrate_demo_accounts()

    register_routes(app)
    return app


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        connection = sqlite3.connect(current_app.config["DATABASE"], timeout=20)
        connection.row_factory = sqlite3.Row
        connection.execute("pragma foreign_keys = on")
        connection.execute("pragma journal_mode = wal")
        g.db = connection
    return g.db


def init_db() -> None:
    db = get_db()
    db.executescript(
        """
        create table if not exists student_accounts (
          id text primary key,
          student_id text,
          student_name text not null,
          username text not null collate nocase unique,
          password_hash text not null,
          class_ids text not null default '[]',
          active integer not null default 1 check (active in (0, 1)),
          created_at text not null,
          updated_at text not null
        );
        create table if not exists student_sessions (
          token_hash text primary key,
          account_id text not null references student_accounts(id) on delete cascade,
          created_at text not null,
          expires_at text not null,
          last_seen_at text not null
        );
        create table if not exists media_uploads (
          id text primary key,
          owner_kind text not null check (owner_kind in ('admin', 'student')),
          owner_id text not null,
          relative_path text not null unique,
          original_name text not null,
          mime_type text not null,
          size_bytes integer not null,
          created_at text not null
        );
        create index if not exists student_accounts_student_id_idx on student_accounts(student_id);
        create index if not exists student_sessions_account_id_idx on student_sessions(account_id);
        create index if not exists student_sessions_expires_at_idx on student_sessions(expires_at);
        """
    )
    db.commit()


def migrate_demo_accounts() -> None:
    db = get_db()
    class_id = current_app.config["DEFAULT_CLASS_ID"]
    seeds = [
        ("demo-student-01", "林小满", "student01", "scrypt:32768:8:1$e9e4eb222d559986$dc7dca2f1cecb5f0738d09cfd063f70ac5b5b415e85a0746c539d4238b23f22b071fa65127bb2ae7014899b17f71f8c163db8248eab337fb3ada26b7d27c24db"),
        ("demo-student-02", "陈星野", "student02", "scrypt:32768:8:1$9f50054b0971492f$f3b6b90b068269c331939dd87d932e87355c7761f55ec472540524b88eeede15eeaaf6416b5e46ebd4cec3fe459bf4b96bdad2fd5f17e942ffcb9da7f4f00de0"),
    ]
    for account_id, name, username, password_hash in seeds:
        exists = db.execute("select 1 from student_accounts where username = ?", (username,)).fetchone()
        if exists:
            continue
        now = iso_now()
        db.execute(
            """insert into student_accounts
               (id, student_id, student_name, username, password_hash, class_ids, active, created_at, updated_at)
               values (?, null, ?, ?, ?, ?, 1, ?, ?)""",
            (account_id, name, username, password_hash, json.dumps([class_id]), now, now),
        )
    db.commit()


def account_json(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "studentId": row["student_id"],
        "studentName": row["student_name"],
        "username": row["username"],
        "classIds": json.loads(row["class_ids"] or "[]"),
        "active": bool(row["active"]),
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def json_body() -> dict[str, Any]:
    value = request.get_json(silent=True)
    return value if isinstance(value, dict) else {}


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def student_from_cookie() -> sqlite3.Row | None:
    token = request.cookies.get(SESSION_COOKIE, "")
    if not token:
        return None
    now = iso_now()
    db = get_db()
    row = db.execute(
        """select a.* from student_sessions s
           join student_accounts a on a.id = s.account_id
           where s.token_hash = ? and s.expires_at > ? and a.active = 1""",
        (token_hash(token), now),
    ).fetchone()
    if row:
        db.execute("update student_sessions set last_seen_at = ? where token_hash = ?", (now, token_hash(token)))
        db.commit()
    return row


def require_student(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        account = student_from_cookie()
        if not account:
            return jsonify({"error": "请先登录学生账号。"}), 401
        g.student_account = account
        return view(*args, **kwargs)

    return wrapped


def verify_admin_token() -> dict[str, Any] | None:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    token = header[7:].strip()
    if not token:
        return None
    test_token = current_app.config.get("ADMIN_TEST_TOKEN")
    if test_token and secrets.compare_digest(token, test_token):
        return {"id": "test-admin", "email": "admin@test.local"}
    cached = ADMIN_CACHE.get(token_hash(token))
    if cached and cached[0] > time.time():
        return cached[1]
    url = current_app.config["SUPABASE_URL"].rstrip("/") + "/auth/v1/user"
    key = current_app.config["SUPABASE_PUBLISHABLE_KEY"]
    if not url.startswith("http") or not key:
        return None
    outbound = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}", "apikey": key})
    try:
        with urllib.request.urlopen(outbound, timeout=8) as response:
            user = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError):
        return None
    if not user.get("id"):
        return None
    ADMIN_CACHE[token_hash(token)] = (time.time() + 300, user)
    return user


def require_admin(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        user = verify_admin_token()
        if not user:
            return jsonify({"error": "管理员登录已失效，请重新登录。"}), 401
        g.admin_user = user
        return view(*args, **kwargs)

    return wrapped


def valid_password(value: Any) -> bool:
    return isinstance(value, str) and 6 <= len(value) <= 128


def valid_username(value: Any) -> bool:
    return isinstance(value, str) and bool(USERNAME_RE.fullmatch(value.strip()))


def normalized_class_ids(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return list(dict.fromkeys(str(item).strip() for item in value if str(item).strip()))[:20]


def login_is_limited(key: str) -> bool:
    cutoff = time.time() - 900
    attempts = [stamp for stamp in LOGIN_ATTEMPTS.get(key, []) if stamp > cutoff]
    LOGIN_ATTEMPTS[key] = attempts
    return len(attempts) >= 8


def record_login_failure(key: str) -> None:
    LOGIN_ATTEMPTS.setdefault(key, []).append(time.time())


def update_supabase_student(student_id: str, name: str) -> None:
    header = request.headers.get("Authorization", "")
    url = current_app.config["SUPABASE_URL"].rstrip("/") + f"/rest/v1/students?id=eq.{student_id}"
    key = current_app.config["SUPABASE_PUBLISHABLE_KEY"]
    if not url.startswith("http") or not key or not header:
        return
    outbound = urllib.request.Request(
        url,
        data=json.dumps({"name": name}).encode("utf-8"),
        method="PATCH",
        headers={"Authorization": header, "apikey": key, "Content-Type": "application/json", "Prefer": "return=minimal"},
    )
    try:
        urllib.request.urlopen(outbound, timeout=8).close()
    except urllib.error.URLError:
        pass


def register_routes(app: Flask) -> None:
    @app.teardown_appcontext
    def close_db(_error=None):
        connection = g.pop("db", None)
        if connection is not None:
            connection.close()

    @app.errorhandler(413)
    def too_large(_error):
        return jsonify({"error": "文件过大，视频不能超过 200MB。"}), 413

    @app.get("/api/health")
    def health():
        return jsonify({"ok": True, "service": "growth-journal-api"})

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename: str):
        return send_from_directory(current_app.config["UPLOAD_ROOT"], filename, conditional=True)

    @app.post("/api/student/login")
    def student_login():
        body = json_body()
        username = str(body.get("username", "")).strip()
        password = str(body.get("password", ""))
        rate_key = f"{request.remote_addr}:{username.lower()}"
        if login_is_limited(rate_key):
            return jsonify({"error": "尝试次数过多，请 15 分钟后再试。"}), 429
        row = get_db().execute("select * from student_accounts where username = ?", (username,)).fetchone()
        if not row or not row["active"] or not check_password_hash(row["password_hash"], password):
            record_login_failure(rate_key)
            time.sleep(0.25)
            return jsonify({"error": "账号或密码不正确。"}), 401
        LOGIN_ATTEMPTS.pop(rate_key, None)
        token = secrets.token_urlsafe(48)
        now = utc_now()
        expires = now + timedelta(days=int(current_app.config["SESSION_DAYS"]))
        db = get_db()
        db.execute("delete from student_sessions where expires_at <= ?", (now.isoformat(),))
        db.execute(
            "insert into student_sessions (token_hash, account_id, created_at, expires_at, last_seen_at) values (?, ?, ?, ?, ?)",
            (token_hash(token), row["id"], now.isoformat(), expires.isoformat(), now.isoformat()),
        )
        db.commit()
        response = jsonify({"account": account_json(row)})
        response.set_cookie(
            SESSION_COOKIE,
            token,
            max_age=int(current_app.config["SESSION_DAYS"]) * 86400,
            httponly=True,
            secure=request.is_secure,
            samesite="Lax",
            path="/",
        )
        return response

    @app.get("/api/student/session")
    @require_student
    def student_session():
        return jsonify({"account": account_json(g.student_account)})

    @app.post("/api/student/logout")
    def student_logout():
        token = request.cookies.get(SESSION_COOKIE, "")
        if token:
            db = get_db()
            db.execute("delete from student_sessions where token_hash = ?", (token_hash(token),))
            db.commit()
        response = jsonify({"ok": True})
        response.delete_cookie(SESSION_COOKIE, path="/", samesite="Lax")
        return response

    @app.post("/api/student/password")
    @require_student
    def student_password():
        body = json_body()
        current = str(body.get("currentPassword", ""))
        next_password = body.get("nextPassword")
        row = g.student_account
        if not check_password_hash(row["password_hash"], current):
            return jsonify({"error": "当前密码不正确。"}), 400
        if not valid_password(next_password):
            return jsonify({"error": "新密码需要 6–128 位。"}), 400
        db = get_db()
        db.execute(
            "update student_accounts set password_hash = ?, updated_at = ? where id = ?",
            (generate_password_hash(next_password), iso_now(), row["id"]),
        )
        db.execute("delete from student_sessions where account_id = ? and token_hash <> ?", (row["id"], token_hash(request.cookies[SESSION_COOKIE])))
        db.commit()
        return jsonify({"ok": True})

    @app.get("/api/admin/student-accounts")
    @require_admin
    def list_accounts():
        class_id = request.args.get("class_id", "").strip()
        rows = get_db().execute("select * from student_accounts order by student_name collate nocase, created_at").fetchall()
        accounts = [account_json(row) for row in rows]
        if class_id:
            accounts = [item for item in accounts if class_id in item["classIds"]]
        return jsonify({"accounts": accounts})

    @app.post("/api/admin/student-accounts")
    @require_admin
    def create_account():
        body = json_body()
        username = str(body.get("username", "")).strip()
        student_name = str(body.get("studentName", "")).strip()
        password = body.get("password")
        class_ids = normalized_class_ids(body.get("classIds"))
        if not student_name or len(student_name) > 80:
            return jsonify({"error": "请填写学生姓名。"}), 400
        if not valid_username(username):
            return jsonify({"error": "账号需为 3–32 位字母、数字、点、横线或下划线。"}), 400
        if not valid_password(password):
            return jsonify({"error": "密码需要 6–128 位。"}), 400
        if not class_ids:
            return jsonify({"error": "请选择学生所属班级。"}), 400
        now = iso_now()
        account_id = str(uuid.uuid4())
        student_id = str(body.get("studentId") or "").strip() or None
        try:
            db = get_db()
            db.execute(
                """insert into student_accounts
                   (id, student_id, student_name, username, password_hash, class_ids, active, created_at, updated_at)
                   values (?, ?, ?, ?, ?, ?, 1, ?, ?)""",
                (account_id, student_id, student_name, username, generate_password_hash(password), json.dumps(class_ids), now, now),
            )
            db.commit()
        except sqlite3.IntegrityError:
            return jsonify({"error": "这个登录账号已经存在。"}), 409
        row = get_db().execute("select * from student_accounts where id = ?", (account_id,)).fetchone()
        return jsonify({"account": account_json(row)}), 201

    @app.patch("/api/admin/student-accounts/<account_id>")
    @require_admin
    def update_account(account_id: str):
        db = get_db()
        row = db.execute("select * from student_accounts where id = ?", (account_id,)).fetchone()
        if not row:
            return jsonify({"error": "没有找到这个学生账号。"}), 404
        body = json_body()
        student_name = str(body.get("studentName", row["student_name"])).strip()
        username = str(body.get("username", row["username"])).strip()
        student_id = body.get("studentId", row["student_id"])
        student_id = str(student_id).strip() if student_id else None
        class_ids = normalized_class_ids(body.get("classIds", json.loads(row["class_ids"])))
        active = 1 if bool(body.get("active", bool(row["active"]))) else 0
        if not student_name or len(student_name) > 80 or not valid_username(username) or not class_ids:
            return jsonify({"error": "请检查姓名、登录账号和班级。"}), 400
        try:
            db.execute(
                """update student_accounts set student_id = ?, student_name = ?, username = ?, class_ids = ?, active = ?, updated_at = ?
                   where id = ?""",
                (student_id, student_name, username, json.dumps(class_ids), active, iso_now(), account_id),
            )
            if not active:
                db.execute("delete from student_sessions where account_id = ?", (account_id,))
            db.commit()
        except sqlite3.IntegrityError:
            return jsonify({"error": "这个登录账号已经存在。"}), 409
        if student_id and student_name != row["student_name"]:
            update_supabase_student(student_id, student_name)
        updated = db.execute("select * from student_accounts where id = ?", (account_id,)).fetchone()
        return jsonify({"account": account_json(updated)})

    @app.post("/api/admin/student-accounts/<account_id>/reset-password")
    @require_admin
    def reset_account_password(account_id: str):
        password = json_body().get("password")
        if not valid_password(password):
            return jsonify({"error": "密码需要 6–128 位。"}), 400
        db = get_db()
        result = db.execute(
            "update student_accounts set password_hash = ?, updated_at = ? where id = ?",
            (generate_password_hash(password), iso_now(), account_id),
        )
        db.execute("delete from student_sessions where account_id = ?", (account_id,))
        db.commit()
        if not result.rowcount:
            return jsonify({"error": "没有找到这个学生账号。"}), 404
        return jsonify({"ok": True})

    @app.post("/api/media/upload")
    def upload_media():
        admin = verify_admin_token()
        student = None if admin else student_from_cookie()
        if not admin and not student:
            return jsonify({"error": "请先登录后再上传。"}), 401
        uploaded = request.files.get("file")
        if not uploaded or not uploaded.filename:
            return jsonify({"error": "请选择要上传的文件。"}), 400
        mime = (uploaded.mimetype or "").lower()
        extension = ALLOWED_MEDIA.get(mime)
        if not extension:
            return jsonify({"error": "只支持常用图片和 MP4、WebM、MOV 视频。"}), 400
        folder = str(request.form.get("folder", "media"))
        folder_parts = [secure_filename(part) for part in folder.split("/") if secure_filename(part)][:5]
        date_parts = utc_now().strftime("%Y/%m").split("/")
        relative_dir = Path(*folder_parts, *date_parts)
        upload_id = str(uuid.uuid4())
        relative_path = (relative_dir / f"{upload_id}{extension}").as_posix()
        root = Path(current_app.config["UPLOAD_ROOT"]).resolve()
        destination = (root / relative_path).resolve()
        if root not in destination.parents:
            return jsonify({"error": "上传目录无效。"}), 400
        destination.parent.mkdir(parents=True, exist_ok=True)
        uploaded.save(destination)
        size = destination.stat().st_size
        max_size = 200 * 1024 * 1024 if mime.startswith("video/") else 25 * 1024 * 1024
        if size <= 0 or size > max_size:
            destination.unlink(missing_ok=True)
            return jsonify({"error": "图片不能超过 25MB，视频不能超过 200MB。"}), 413
        owner_kind = "admin" if admin else "student"
        owner_id = str((admin or {}).get("id") if admin else student["id"])
        db = get_db()
        db.execute(
            """insert into media_uploads
               (id, owner_kind, owner_id, relative_path, original_name, mime_type, size_bytes, created_at)
               values (?, ?, ?, ?, ?, ?, ?, ?)""",
            (upload_id, owner_kind, owner_id, relative_path, uploaded.filename[:240], mime, size, iso_now()),
        )
        db.commit()
        return jsonify({"id": upload_id, "url": f"/uploads/{relative_path}", "path": f"server:{upload_id}", "size": size})

    @app.delete("/api/media/<upload_id>")
    @require_admin
    def delete_media(upload_id: str):
        db = get_db()
        row = db.execute("select * from media_uploads where id = ?", (upload_id,)).fetchone()
        if not row:
            return jsonify({"ok": True})
        root = Path(current_app.config["UPLOAD_ROOT"]).resolve()
        destination = (root / row["relative_path"]).resolve()
        if root in destination.parents:
            destination.unlink(missing_ok=True)
        db.execute("delete from media_uploads where id = ?", (upload_id,))
        db.commit()
        return jsonify({"ok": True})
