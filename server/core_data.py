from __future__ import annotations

import json
import mimetypes
import os
import re
import sqlite3
import urllib.request
import time
import uuid
from pathlib import Path
from typing import Any, Callable
from urllib.parse import urlparse

from flask import current_app, g, jsonify, request


def ensure_core_schema(db: sqlite3.Connection) -> None:
    db.executescript(
        """
        create table if not exists classes (
          id text primary key,
          name text not null,
          description text,
          created_at text not null
        );
        create table if not exists terms (
          id text primary key,
          class_id text not null references classes(id) on delete cascade,
          name text not null,
          start_date text not null,
          end_date text not null,
          created_at text not null
        );
        create table if not exists students (
          id text primary key,
          class_id text not null references classes(id),
          name text not null,
          avatar_url text,
          avatar_path text,
          joined_on text not null,
          created_at text not null
        );
        create table if not exists lessons (
          id text primary key,
          class_id text not null references classes(id) on delete cascade,
          term_id text not null references terms(id) on delete cascade,
          sequence_no integer not null,
          title text not null,
          lesson_date text not null,
          summary text,
          content_html text not null default '',
          created_at text not null,
          unique(term_id, sequence_no)
        );
        create table if not exists student_lesson_records (
          id text primary key,
          lesson_id text not null references lessons(id) on delete cascade,
          student_id text not null references students(id) on delete cascade,
          comment text not null default '',
          thinking_score integer not null default 3,
          focus_score integer not null default 3,
          creativity_score integer not null default 3,
          coding_score integer not null default 3,
          motivation_score integer not null default 3,
          created_at text not null,
          updated_at text not null,
          unique(lesson_id, student_id)
        );
        create table if not exists media (
          id text primary key,
          record_id text not null references student_lesson_records(id) on delete cascade,
          kind text not null check (kind in ('image', 'video')),
          url text not null,
          storage_path text not null,
          caption text,
          sort_order integer not null default 0,
          created_at text not null
        );
        create table if not exists homework (
          id text primary key,
          class_id text not null references classes(id) on delete cascade,
          term_id text not null references terms(id) on delete cascade,
          title text not null,
          assigned_date text not null,
          content_html text not null default '',
          created_at text not null
        );
        create index if not exists terms_class_idx on terms(class_id, start_date);
        create index if not exists students_class_idx on students(class_id, created_at);
        create index if not exists lessons_term_idx on lessons(term_id, sequence_no);
        create index if not exists records_student_idx on student_lesson_records(student_id, lesson_id);
        create index if not exists media_record_idx on media(record_id, sort_order);
        create index if not exists homework_term_idx on homework(term_id, assigned_date);
        """
    )
    db.commit()


def _dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row else None


def _items(value: Any) -> list[dict[str, Any]]:
    if isinstance(value, list):
        result: list[dict[str, Any]] = []
        for item in value:
            result.extend(_items(item))
        return result
    return [value] if isinstance(value, dict) else []


def register_core_routes(
    app,
    *,
    get_db: Callable[[], sqlite3.Connection],
    require_admin,
    verify_admin_token,
    student_from_cookie,
    parent_from_cookie,
    json_body,
    iso_now,
) -> None:
    def can_view_student(student_id: str) -> bool:
        if verify_admin_token():
            return True
        parent = parent_from_cookie()
        if parent and str(parent["student_id"] or "") == student_id:
            return True
        student = student_from_cookie()
        return bool(student and str(student["student_id"] or "") == student_id)

    @app.get("/api/data/classes")
    def list_classes():
        rows = get_db().execute("select * from classes order by created_at").fetchall()
        return jsonify({"items": [dict(row) for row in rows]})

    @app.get("/api/data/classes/<class_id>")
    def read_class(class_id: str):
        row = get_db().execute("select * from classes where id=?", (class_id,)).fetchone()
        return jsonify({"item": _dict(row)})

    @app.get("/api/data/terms")
    def list_terms():
        class_id = request.args.get("class_id", "").strip()
        rows = get_db().execute(
            "select * from terms where class_id=? order by start_date desc", (class_id,)
        ).fetchall()
        return jsonify({"items": [dict(row) for row in rows]})

    @app.get("/api/data/lessons")
    def list_lessons():
        term_id = request.args.get("term_id", "").strip()
        rows = get_db().execute(
            "select * from lessons where term_id=? order by sequence_no", (term_id,)
        ).fetchall()
        return jsonify({"items": [dict(row) for row in rows]})

    @app.get("/api/data/homework")
    def list_homework():
        term_id = request.args.get("term_id", "").strip()
        rows = get_db().execute(
            "select * from homework where term_id=? order by assigned_date desc", (term_id,)
        ).fetchall()
        return jsonify({"items": [dict(row) for row in rows]})

    @app.get("/api/data/students")
    @require_admin
    def list_students():
        class_id = request.args.get("class_id", "").strip()
        rows = get_db().execute(
            "select * from students where class_id=? order by created_at", (class_id,)
        ).fetchall()
        return jsonify({"items": [dict(row) for row in rows]})

    @app.get("/api/data/students/<student_id>")
    def read_student(student_id: str):
        if not can_view_student(student_id):
            return jsonify({"error": "没有权限查看这位学生。"}), 401
        row = get_db().execute("select * from students where id=?", (student_id,)).fetchone()
        return jsonify({"item": _dict(row)})

    @app.get("/api/data/records")
    def list_records():
        student_id = request.args.get("student_id", "").strip()
        lesson_ids = [value for value in request.args.get("lesson_ids", "").split(",") if value]
        if not student_id or not can_view_student(student_id):
            return jsonify({"error": "没有权限查看学生课评。"}), 401
        if not lesson_ids:
            return jsonify({"items": []})
        placeholders = ",".join("?" for _ in lesson_ids)
        rows = get_db().execute(
            f"select * from student_lesson_records where student_id=? and lesson_id in ({placeholders})",
            (student_id, *lesson_ids),
        ).fetchall()
        result: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            media = get_db().execute(
                "select * from media where record_id=? order by sort_order", (row["id"],)
            ).fetchall()
            item["media"] = [dict(entry) for entry in media]
            result.append(item)
        return jsonify({"items": result})

    @app.get("/api/data/records/one")
    @require_admin
    def read_record():
        student_id = request.args.get("student_id", "").strip()
        lesson_id = request.args.get("lesson_id", "").strip()
        row = get_db().execute(
            "select * from student_lesson_records where student_id=? and lesson_id=?",
            (student_id, lesson_id),
        ).fetchone()
        if not row:
            return jsonify({"item": None})
        item = dict(row)
        item["media"] = [
            dict(entry)
            for entry in get_db().execute(
                "select * from media where record_id=? order by sort_order", (row["id"],)
            ).fetchall()
        ]
        return jsonify({"item": item})

    @app.post("/api/admin/classes")
    @require_admin
    def create_class():
        body = json_body()
        name = str(body.get("name") or "").strip()
        if not name:
            return jsonify({"error": "请填写班级名称。"}), 400
        item = {
            "id": str(uuid.uuid4()), "name": name[:120],
            "description": str(body.get("description") or "").strip() or None,
            "created_at": iso_now(),
        }
        get_db().execute(
            "insert into classes (id,name,description,created_at) values (:id,:name,:description,:created_at)", item
        )
        get_db().commit()
        return jsonify({"item": item}), 201

    @app.post("/api/admin/terms")
    @require_admin
    def create_term():
        body = json_body()
        item = {
            "id": str(uuid.uuid4()), "class_id": str(body.get("class_id") or "").strip(),
            "name": str(body.get("name") or "").strip(),
            "start_date": str(body.get("start_date") or "").strip(),
            "end_date": str(body.get("end_date") or "").strip(), "created_at": iso_now(),
        }
        if not all(item[key] for key in ("class_id", "name", "start_date", "end_date")):
            return jsonify({"error": "请完整填写学期信息。"}), 400
        get_db().execute(
            "insert into terms (id,class_id,name,start_date,end_date,created_at) values (:id,:class_id,:name,:start_date,:end_date,:created_at)", item
        )
        get_db().commit()
        return jsonify({"item": item}), 201

    @app.post("/api/admin/students")
    @require_admin
    def create_student():
        body = json_body()
        item = {
            "id": str(body.get("id") or uuid.uuid4()), "class_id": str(body.get("class_id") or "").strip(),
            "name": str(body.get("name") or "").strip(), "avatar_url": body.get("avatar_url"),
            "avatar_path": body.get("avatar_path"), "joined_on": str(body.get("joined_on") or "").strip(),
            "created_at": iso_now(),
        }
        if not item["class_id"] or not item["name"] or not item["joined_on"]:
            return jsonify({"error": "请完整填写学生档案。"}), 400
        get_db().execute(
            """insert into students (id,class_id,name,avatar_url,avatar_path,joined_on,created_at)
               values (:id,:class_id,:name,:avatar_url,:avatar_path,:joined_on,:created_at)""", item,
        )
        get_db().commit()
        return jsonify({"item": item}), 201

    @app.patch("/api/admin/students/<student_id>")
    @require_admin
    def update_student(student_id: str):
        db = get_db()
        row = db.execute("select * from students where id=?", (student_id,)).fetchone()
        if not row:
            return jsonify({"error": "没有找到学生档案。"}), 404
        body = json_body()
        item = dict(row)
        for key in ("class_id", "name", "avatar_url", "avatar_path", "joined_on"):
            if key in body:
                item[key] = body[key]
        if not str(item["class_id"]).strip() or not str(item["name"]).strip():
            return jsonify({"error": "学生姓名和班级不能为空。"}), 400
        db.execute(
            """update students set class_id=:class_id,name=:name,avatar_url=:avatar_url,
               avatar_path=:avatar_path,joined_on=:joined_on where id=:id""", item,
        )
        db.commit()
        return jsonify({"item": item})

    @app.post("/api/admin/lessons")
    @require_admin
    def create_lesson():
        return save_lesson(None, json_body(), get_db, iso_now)

    @app.patch("/api/admin/lessons/<lesson_id>")
    @require_admin
    def update_lesson(lesson_id: str):
        return save_lesson(lesson_id, json_body(), get_db, iso_now)

    @app.delete("/api/admin/lessons/<lesson_id>")
    @require_admin
    def delete_lesson(lesson_id: str):
        db = get_db()
        media = db.execute(
            """select m.storage_path from media m join student_lesson_records r on r.id=m.record_id
               where r.lesson_id=?""", (lesson_id,),
        ).fetchall()
        for item in media:
            delete_server_upload(db, item["storage_path"])
        result = db.execute("delete from lessons where id=?", (lesson_id,))
        db.commit()
        return jsonify({"ok": True, "deleted": bool(result.rowcount)})

    @app.put("/api/admin/records")
    @require_admin
    def upsert_record():
        body = json_body()
        lesson_id = str(body.get("lesson_id") or "").strip()
        student_id = str(body.get("student_id") or "").strip()
        if not lesson_id or not student_id:
            return jsonify({"error": "课程和学生不能为空。"}), 400
        db = get_db()
        current = db.execute(
            "select * from student_lesson_records where lesson_id=? and student_id=?", (lesson_id, student_id)
        ).fetchone()
        now = iso_now()
        item = {
            "id": current["id"] if current else str(uuid.uuid4()), "lesson_id": lesson_id,
            "student_id": student_id, "comment": str(body.get("comment") or ""),
            "thinking_score": _score(body.get("thinking_score")), "focus_score": _score(body.get("focus_score")),
            "creativity_score": _score(body.get("creativity_score")), "coding_score": _score(body.get("coding_score")),
            "motivation_score": _score(body.get("motivation_score")),
            "created_at": current["created_at"] if current else now, "updated_at": now,
        }
        db.execute(
            """insert into student_lesson_records
               (id,lesson_id,student_id,comment,thinking_score,focus_score,creativity_score,coding_score,motivation_score,created_at,updated_at)
               values (:id,:lesson_id,:student_id,:comment,:thinking_score,:focus_score,:creativity_score,:coding_score,:motivation_score,:created_at,:updated_at)
               on conflict(lesson_id,student_id) do update set comment=excluded.comment,
               thinking_score=excluded.thinking_score,focus_score=excluded.focus_score,
               creativity_score=excluded.creativity_score,coding_score=excluded.coding_score,
               motivation_score=excluded.motivation_score,updated_at=excluded.updated_at""", item,
        )
        db.commit()
        saved = db.execute("select * from student_lesson_records where id=?", (item["id"],)).fetchone()
        return jsonify({"item": dict(saved)})

    @app.post("/api/admin/media-items")
    @require_admin
    def create_media_item():
        body = json_body()
        item = {
            "id": str(uuid.uuid4()), "record_id": str(body.get("record_id") or "").strip(),
            "kind": str(body.get("kind") or "image"), "url": str(body.get("url") or "").strip(),
            "storage_path": str(body.get("storage_path") or "").strip(), "caption": body.get("caption"),
            "sort_order": int(body.get("sort_order") or 0), "created_at": iso_now(),
        }
        if not item["record_id"] or not item["url"] or item["kind"] not in {"image", "video"}:
            return jsonify({"error": "媒体记录不完整。"}), 400
        get_db().execute(
            """insert into media (id,record_id,kind,url,storage_path,caption,sort_order,created_at)
               values (:id,:record_id,:kind,:url,:storage_path,:caption,:sort_order,:created_at)""", item,
        )
        get_db().commit()
        return jsonify({"item": item}), 201

    @app.delete("/api/admin/media-items/<media_id>")
    @require_admin
    def delete_media_item(media_id: str):
        db = get_db()
        row = db.execute("select * from media where id=?", (media_id,)).fetchone()
        if not row:
            return jsonify({"ok": True})
        delete_server_upload(db, row["storage_path"])
        db.execute("delete from media where id=?", (media_id,))
        db.commit()
        return jsonify({"ok": True})


def _score(value: Any) -> int:
    try:
        return max(1, min(5, int(value)))
    except (TypeError, ValueError):
        return 3


def save_lesson(lesson_id: str | None, body: dict[str, Any], get_db, iso_now):
    db = get_db()
    current = db.execute("select * from lessons where id=?", (lesson_id,)).fetchone() if lesson_id else None
    if lesson_id and not current:
        return jsonify({"error": "没有找到这节课程。"}), 404
    item = dict(current) if current else {"id": str(uuid.uuid4()), "created_at": iso_now()}
    for key in ("class_id", "term_id", "sequence_no", "title", "lesson_date", "summary", "content_html"):
        if key in body:
            item[key] = body[key]
    item["sequence_no"] = int(item.get("sequence_no") or 0)
    item.setdefault("lesson_date", "")
    item.setdefault("summary", None)
    item.setdefault("content_html", "")
    if not item.get("class_id") or not item.get("term_id") or not item.get("title") or item["sequence_no"] < 1:
        return jsonify({"error": "请完整填写课程信息。"}), 400
    try:
        db.execute(
            """insert into lessons (id,class_id,term_id,sequence_no,title,lesson_date,summary,content_html,created_at)
               values (:id,:class_id,:term_id,:sequence_no,:title,:lesson_date,:summary,:content_html,:created_at)
               on conflict(id) do update set class_id=excluded.class_id,term_id=excluded.term_id,
               sequence_no=excluded.sequence_no,title=excluded.title,lesson_date=excluded.lesson_date,
               summary=excluded.summary,content_html=excluded.content_html""", item,
        )
        db.commit()
    except sqlite3.IntegrityError:
        return jsonify({"error": "这个课次已经存在，请修改课次编号。"}), 409
    return jsonify({"item": item}), 200 if current else 201


def delete_server_upload(db: sqlite3.Connection, storage_path: str) -> None:
    if not str(storage_path or "").startswith("server:"):
        return
    upload_id = storage_path.split(":", 1)[1]
    row = db.execute("select relative_path from media_uploads where id=?", (upload_id,)).fetchone()
    if not row:
        return
    root = Path(current_app.config["UPLOAD_ROOT"]).resolve()
    destination = (root / row["relative_path"]).resolve()
    if root in destination.parents:
        destination.unlink(missing_ok=True)
    db.execute("delete from media_uploads where id=?", (upload_id,))


def migrate_seed_directory(db: sqlite3.Connection, seed_dir: Path, upload_root: Path) -> dict[str, int]:
    ensure_core_schema(db)
    migrated_downloads = 0

    def mirror_url(url: str, key: str, created_at: str, owner_id: str) -> str:
        nonlocal migrated_downloads
        parsed = urlparse(url)
        suffix = Path(parsed.path).suffix.lower()
        if not suffix or len(suffix) > 10:
            suffix = mimetypes.guess_extension("image/webp") or ".bin"
        safe_key = re.sub(r"[^A-Za-z0-9._-]", "-", key)[:160]
        upload_id = f"migration-{safe_key}"
        relative = f"migrated-media/{safe_key}{suffix}"
        destination = (upload_root / relative).resolve()
        destination.parent.mkdir(parents=True, exist_ok=True)
        if not destination.is_file():
            temporary = destination.with_suffix(destination.suffix + ".part")
            last_error: Exception | None = None
            for attempt in range(3):
                try:
                    media_request = urllib.request.Request(url, headers={"User-Agent": "aikc-migration/1.0"})
                    with urllib.request.urlopen(media_request, timeout=60) as response:
                        temporary.write_bytes(response.read())
                    os.replace(temporary, destination)
                    last_error = None
                    break
                except Exception as error:  # pragma: no cover - depends on the remote media host
                    last_error = error
                    temporary.unlink(missing_ok=True)
                    if attempt < 2:
                        time.sleep(attempt + 1)
            if last_error is not None:
                raise RuntimeError(f"failed to migrate media {key}: {last_error}") from last_error
            migrated_downloads += 1
        mime = mimetypes.guess_type(destination.name)[0] or "application/octet-stream"
        db.execute(
            """insert or ignore into media_uploads
               (id,owner_kind,owner_id,relative_path,original_name,mime_type,size_bytes,created_at)
               values (?,?,?,?,?,?,?,?)""",
            (upload_id, "admin", owner_id, relative, Path(parsed.path).name or destination.name,
             mime, destination.stat().st_size, created_at),
        )
        return f"/uploads/{relative}"

    table_files = (
        ("classes", "classes.json"), ("terms", "terms.json"), ("students", "students.json"),
        ("lessons", "lessons.json"), ("student_lesson_records", "student_lesson_records.json"),
        ("homework", "homework.json"),
    )
    counts: dict[str, int] = {}
    for table, filename in table_files:
        path = seed_dir / filename
        if not path.is_file():
            raise FileNotFoundError(f"missing seed file: {path}")
        rows = _items(json.loads(path.read_text(encoding="utf-8-sig")))
        columns = [row["name"] for row in db.execute(f"pragma table_info({table})").fetchall()]
        for row in rows:
            payload = {key: row.get(key) for key in columns if key in row}
            if table in {"lessons", "homework"} and payload.get("content_html"):
                serial = 0

                def replace_embedded(match: re.Match[str]) -> str:
                    nonlocal serial
                    serial += 1
                    return mirror_url(
                        match.group(0), f"inline-{payload.get('id', table)}-{serial}",
                        str(payload.get("created_at") or ""), f"{table}:{payload.get('id', '')}",
                    )

                payload["content_html"] = re.sub(r"https?://[^\"'<>\s]+", replace_embedded, payload["content_html"])
            names = list(payload)
            db.execute(
                f"insert or ignore into {table} ({','.join(names)}) values ({','.join('?' for _ in names)})",
                tuple(payload[name] for name in names),
            )
        counts[table] = len(rows)
    media_rows = _items(json.loads((seed_dir / "media.json").read_text(encoding="utf-8-sig")))
    for row in media_rows:
        item = dict(row)
        if str(item.get("url") or "").startswith("http"):
            item["url"] = mirror_url(item["url"], item["id"], item["created_at"], "migration")
            item["storage_path"] = f"server:migration-{item['id']}"
        db.execute(
            """insert or ignore into media (id,record_id,kind,url,storage_path,caption,sort_order,created_at)
               values (?,?,?,?,?,?,?,?)""",
            (item["id"], item["record_id"], item["kind"], item["url"], item["storage_path"],
             item.get("caption"), int(item.get("sort_order") or 0), item["created_at"]),
        )
    counts["media"] = len(media_rows)
    counts["downloaded_media"] = migrated_downloads
    for student in _items(json.loads((seed_dir / "students.json").read_text(encoding="utf-8-sig"))):
        db.execute(
            """update student_accounts set student_id=?,student_name=?,updated_at=?
               where student_name=? and (student_id is null or trim(student_id)='')""",
            (student["id"], student["name"], student.get("created_at") or "", student["name"]),
        )
    db.commit()
    return counts
