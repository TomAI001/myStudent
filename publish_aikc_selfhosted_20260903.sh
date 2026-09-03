#!/usr/bin/env bash
set -euo pipefail

release_name="aikc-selfhosted-20260903-v2"
release_url="https://raw.githubusercontent.com/TomAI001/myStudent/main/aikc-selfhosted-20260903-v2.zip"
release_sha="7dea39a7e04310dfc5192bc8c023f9404cb691f81d37c863922a6999880215f3"
release_zip="/home/ubuntu/${release_name}.zip"
release_dir="$(mktemp -d "/tmp/${release_name}.XXXXXX")"
release_root="${release_dir}/package"
database="/var/lib/growth-journal/growth.db"
upload_root="/var/lib/growth-journal/uploads"
web_root="/var/www/growth-journal"
api_root="/opt/growth-journal-api"
legacy_seed="/var/lib/growth-journal/migrations/legacy-local-seed-20260903"
admin_email="${GROWTH_ADMIN_EMAIL:-tt578071052@gmail.com}"

if [[ -n "${GROWTH_ADMIN_PASSWORD:-}" ]]; then
  admin_password="${GROWTH_ADMIN_PASSWORD}"
else
  read -r -s -p "请输入教师端初始密码（输入时不会显示）：" admin_password </dev/tty
  echo >/dev/tty
fi
if [[ ${#admin_password} -lt 6 ]]; then
  echo "密码至少需要 6 位。" >&2
  exit 1
fi

cleanup() {
  rm -rf -- "${release_dir}"
}
trap cleanup EXIT

echo "[1/10] 下载并校验自托管发布包"
curl -L --fail --retry 5 --connect-timeout 15 "${release_url}" -o "${release_zip}"
echo "${release_sha}  ${release_zip}" | sha256sum -c -
unzip -q -o "${release_zip}" -d "${release_dir}"
test -f "${release_root}/dist/index.html"
test -f "${release_root}/server/app.py"
test -f "${release_root}/server/core_data.py"
test -f "${release_root}/server/portal_features.py"

echo "[2/10] 检查后端程序和独立测试数据库"
sudo "${api_root}/venv/bin/pip" install --disable-pip-version-check -r "${release_root}/server/requirements.txt"
"${api_root}/venv/bin/python" -m py_compile \
  "${release_root}/server/app.py" \
  "${release_root}/server/core_data.py" \
  "${release_root}/server/portal_features.py"
GROWTH_DATABASE="${release_dir}/check.db" \
GROWTH_UPLOAD_ROOT="${release_dir}/check-uploads" \
GROWTH_ADMIN_EMAIL="teacher@example.com" \
GROWTH_ADMIN_PASSWORD="123456" \
PYTHONPATH="${release_root}/server" \
  "${api_root}/venv/bin/python" -c \
  'from app import create_app; app=create_app(); assert len(app.url_map._rules) >= 60; print("STAGED_APP_OK", len(app.url_map._rules))'

echo "[3/10] 备份现有 SQLite 数据库"
backup_dir="/var/lib/growth-journal/backups"
backup_file="${backup_dir}/growth-before-selfhosted-$(date +%Y%m%d-%H%M%S).db"
sudo install -d -o www-data -g www-data -m 0750 "${backup_dir}"
sudo -u www-data "${api_root}/venv/bin/python" - "${database}" "${backup_file}" <<'PY'
import sqlite3
import sys

source = sqlite3.connect(sys.argv[1])
target = sqlite3.connect(sys.argv[2])
source.backup(target)
target.close()
source.close()
print(sys.argv[2])
PY

echo "[4/10] 记录学生账号数量并更新后端程序"
accounts_before="$(sudo "${api_root}/venv/bin/python" -c \
  'import sqlite3; db=sqlite3.connect("/var/lib/growth-journal/growth.db"); print(db.execute("select count(*) from student_accounts").fetchone()[0])')"
echo "学生账号数（发布前）：${accounts_before}"
sudo install -m 0644 "${release_root}/server/app.py" "${api_root}/app.py"
sudo install -m 0644 "${release_root}/server/core_data.py" "${api_root}/core_data.py"
sudo install -m 0644 "${release_root}/server/portal_features.py" "${api_root}/portal_features.py"

echo "[5/10] 将旧数据快照移出公网目录"
sudo install -d -o root -g www-data -m 0750 "$(dirname "${legacy_seed}")"
if [[ -d "${web_root}/local-seed" && ! -e "${legacy_seed}" ]]; then
  sudo mv "${web_root}/local-seed" "${legacy_seed}"
fi
sudo test -f "${legacy_seed}/classes.json"
sudo chmod -R g+rX "${legacy_seed}"

echo "[6/10] 导入课程、课评和媒体到本机 SQLite"
sudo -u www-data env \
  "GROWTH_DATABASE=${database}" \
  "GROWTH_UPLOAD_ROOT=${upload_root}" \
  "GROWTH_ADMIN_EMAIL=${admin_email}" \
  "GROWTH_ADMIN_PASSWORD=${admin_password}" \
  "PYTHONPATH=${api_root}" \
  "${api_root}/venv/bin/python" - "${legacy_seed}" <<'PY'
import json
import sys
from pathlib import Path

from app import create_app, get_db
from core_data import migrate_seed_directory

app = create_app()
with app.app_context():
    result = migrate_seed_directory(get_db(), Path(sys.argv[1]), Path(app.config["UPLOAD_ROOT"]))
    db = get_db()
    counts = {
        name: db.execute("select count(*) from " + name).fetchone()[0]
        for name in ("classes", "terms", "students", "lessons", "student_lesson_records", "homework", "media")
    }
    assert counts["classes"] >= 1
    assert counts["students"] >= 7
    assert counts["lessons"] >= 6
    assert counts["student_lesson_records"] >= 39
    assert counts["homework"] >= 5
    assert counts["media"] >= 114
    assert db.execute("select count(*) from media where url like 'http%'").fetchone()[0] == 0
    assert db.execute("select count(*) from lessons where content_html like '%https://%' or content_html like '%http://%'").fetchone()[0] == 0
    print(json.dumps({"migration": result, "database": counts}, ensure_ascii=False))
PY
unset admin_password

echo "[7/10] 清除旧 Supabase 配置并启动 API"
if [[ -f "${api_root}/production.env" ]]; then
  sudo sed -i '/^SUPABASE_/d' "${api_root}/production.env"
fi
sudo systemctl restart growth-journal-api.service
sleep 4
curl --fail http://127.0.0.1:8001/api/health

echo "[8/10] 更新前端（不覆盖数据库和上传资料）"
sudo cp -a "${release_root}/dist/." "${web_root}/"
sudo chmod -R a+rX "${web_root}"
sudo nginx -t
sudo systemctl reload nginx

echo "[9/10] 核对线上接口、管理员和学生账号"
curl --fail https://aikc.tech/api/health
curl --fail https://aikc.tech/api/data/classes >/dev/null
grep -q 'assets/index-' "${web_root}/index.html"
accounts_after="$(sudo "${api_root}/venv/bin/python" -c \
  'import sqlite3; db=sqlite3.connect("/var/lib/growth-journal/growth.db"); print(db.execute("select count(*) from student_accounts").fetchone()[0])')"
echo "学生账号数（发布后）：${accounts_after}"
test "${accounts_before}" = "${accounts_after}"

echo "[10/10] 发布完成"
echo "全站已改用腾讯云服务器 SQLite 和本机上传目录，不再依赖 Supabase。"
echo "教师端账号：${admin_email}"
echo "数据库备份：${backup_file}"
