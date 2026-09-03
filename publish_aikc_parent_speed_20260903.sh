#!/usr/bin/env bash
set -euo pipefail

release_name="aikc-parent-speed-20260903"
release_url="https://raw.githubusercontent.com/TomAI001/myStudent/10d217f/aikc-parent-speed-20260903.zip"
release_sha="5b9c451de490fb2fc8350eff0fb23b991ca783e0a18c10b7449a75cb9d6f691b"
release_zip="/home/ubuntu/${release_name}.zip"
release_dir="$(mktemp -d "/tmp/${release_name}.XXXXXX")"
release_root="${release_dir}/package"
api_root="/opt/growth-journal-api"
web_root="/var/www/growth-journal"
database="/var/lib/growth-journal/growth.db"
upload_root="/var/lib/growth-journal/uploads"

cleanup() {
  rm -rf -- "${release_dir}"
}
trap cleanup EXIT

echo "[1/7] 下载并校验家长端性能修复包"
curl -L --fail --retry 5 --connect-timeout 15 "${release_url}" -o "${release_zip}"
echo "${release_sha}  ${release_zip}" | sha256sum -c -
unzip -q -o "${release_zip}" -d "${release_dir}"
test -f "${release_root}/server/core_data.py"
test -f "${release_root}/dist/index.html"

echo "[2/7] 检查后端代码并备份数据库"
"${api_root}/venv/bin/python" -m py_compile "${release_root}/server/core_data.py"
backup_dir="/var/lib/growth-journal/backups"
backup_file="${backup_dir}/growth-before-parent-speed-$(date +%Y%m%d-%H%M%S).db"
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

echo "[3/7] 提取并压缩课程正文中的内嵌图片"
accounts_before="$(sudo "${api_root}/venv/bin/python" -c \
  'import sqlite3; db=sqlite3.connect("/var/lib/growth-journal/growth.db"); print(db.execute("select count(*) from student_accounts").fetchone()[0])')"
sudo install -m 0644 "${release_root}/server/core_data.py" "${api_root}/core_data.py"
sudo -u www-data env \
  "GROWTH_DATABASE=${database}" \
  "GROWTH_UPLOAD_ROOT=${upload_root}" \
  "PYTHONPATH=${api_root}" \
  "${api_root}/venv/bin/python" <<'PY'
from pathlib import Path

from app import create_app, get_db
from core_data import migrate_embedded_data_images

app = create_app()
with app.app_context():
    db = get_db()
    before = db.execute("select max(length(content_html)) from lessons").fetchone()[0] or 0
    converted = migrate_embedded_data_images(db, Path(app.config["UPLOAD_ROOT"]))
    after = db.execute("select max(length(content_html)) from lessons").fetchone()[0] or 0
    assert db.execute("select count(*) from lessons where content_html like '%data:image%'").fetchone()[0] == 0
    assert after < 1000000
    print({"converted": converted, "before_html_bytes": before, "after_html_bytes": after})
PY

echo "[4/7] 启动精简课程接口"
sudo systemctl restart growth-journal-api.service
sleep 4
curl --fail http://127.0.0.1:8001/api/health

echo "[5/7] 更新家长端按需加载前端"
sudo cp -a "${release_root}/dist/assets/." "${web_root}/assets/"
sudo install -m 0644 "${release_root}/dist/index.html" "${web_root}/index.html"
sudo chmod -R a+rX "${web_root}/assets" "${web_root}/index.html"
sudo nginx -t
sudo systemctl reload nginx

echo "[6/7] 验证公网速度与学生账号"
curl --fail https://aikc.tech/api/health
curl --fail --silent \
  "https://aikc.tech/api/data/lessons?term_id=8327f998-10af-4939-bf20-60b4c1c3b28d" \
  -o "${release_dir}/lessons.json"
list_bytes="$(wc -c < "${release_dir}/lessons.json")"
echo "课程目录接口大小：${list_bytes} bytes"
test "${list_bytes}" -lt 100000
curl --fail --silent \
  "https://aikc.tech/api/data/lessons/433f5107-4475-4714-8d29-571edb65a0db" \
  -o "${release_dir}/lesson-four.json"
detail_bytes="$(wc -c < "${release_dir}/lesson-four.json")"
echo "第4课正文接口大小：${detail_bytes} bytes"
test "${detail_bytes}" -lt 100000
grep -q 'assets/index-J6P8FQEU.js' "${web_root}/index.html"
accounts_after="$(sudo "${api_root}/venv/bin/python" -c \
  'import sqlite3; db=sqlite3.connect("/var/lib/growth-journal/growth.db"); print(db.execute("select count(*) from student_accounts").fetchone()[0])')"
echo "学生账号数：${accounts_after}"
test "${accounts_before}" = "${accounts_after}"

echo "[7/7] 家长端性能优化发布完成"
echo "课程目录改为轻量加载，课程正文按点击加载；大图已从数据库提取并压缩。"
echo "数据库备份：${backup_file}"
