#!/usr/bin/env bash
set -euo pipefail

release_name="aikc-media-speed-20260903"
release_url="https://raw.githubusercontent.com/TomAI001/myStudent/2543dc6/aikc-media-speed-20260903.zip"
release_sha="bc0c66ea49169e5d740d3eeafeb72706949aaa36dc240efbbb12eb0ab30127db"
release_zip="/home/ubuntu/${release_name}.zip"
release_dir="$(mktemp -d "/tmp/${release_name}.XXXXXX")"
release_root="${release_dir}/package"
api_root="/opt/growth-journal-api"
web_root="/var/www/growth-journal"
database="/var/lib/growth-journal/growth.db"
upload_root="/var/lib/growth-journal/uploads"
backup_root="/var/lib/growth-journal/backups"

cleanup() {
  rm -rf -- "${release_dir}"
}
trap cleanup EXIT

echo "[1/9] 下载并校验图片压缩与性能优化包"
curl -L --fail --retry 5 --connect-timeout 15 "${release_url}" -o "${release_zip}"
echo "${release_sha}  ${release_zip}" | sha256sum -c -
unzip -q -o "${release_zip}" -d "${release_dir}"
test -f "${release_root}/server/app.py"
test -f "${release_root}/server/core_data.py"
test -f "${release_root}/server/portal_features.py"
test -f "${release_root}/dist/index.html"

echo "[2/9] 安装图片处理依赖并检查后端代码"
sudo "${api_root}/venv/bin/pip" install -q -r "${release_root}/server/requirements.txt"
"${api_root}/venv/bin/python" -m py_compile \
  "${release_root}/server/app.py" \
  "${release_root}/server/core_data.py" \
  "${release_root}/server/portal_features.py"

echo "[3/9] 创建压缩前回滚备份"
stamp="$(date +%Y%m%d-%H%M%S)"
sudo install -d -o www-data -g www-data -m 0750 "${backup_root}"
database_backup="${backup_root}/growth-before-media-speed-${stamp}.db"
media_backup="${backup_root}/uploads-before-media-speed-${stamp}.tar.gz"
sudo -u www-data "${api_root}/venv/bin/python" - "${database}" "${database_backup}" <<'PY'
import sqlite3
import sys

source = sqlite3.connect(sys.argv[1])
target = sqlite3.connect(sys.argv[2])
source.backup(target)
target.close()
source.close()
print(sys.argv[2])
PY
sudo tar -C "/var/lib/growth-journal" -czf "${media_backup}" uploads

echo "[4/9] 更新后端程序（不覆盖数据库和上传目录）"
accounts_before="$(sudo "${api_root}/venv/bin/python" -c \
  'import sqlite3; db=sqlite3.connect("/var/lib/growth-journal/growth.db"); print(db.execute("select count(*) from student_accounts").fetchone()[0])')"
sudo install -m 0644 "${release_root}/server/app.py" "${api_root}/app.py"
sudo install -m 0644 "${release_root}/server/core_data.py" "${api_root}/core_data.py"
sudo install -m 0644 "${release_root}/server/portal_features.py" "${api_root}/portal_features.py"
sudo install -m 0644 "${release_root}/server/requirements.txt" "${api_root}/requirements.txt"

echo "[5/9] 提取课件内嵌大图并压缩现有照片"
sudo -u www-data env \
  "GROWTH_DATABASE=${database}" \
  "GROWTH_UPLOAD_ROOT=${upload_root}" \
  "PYTHONPATH=${api_root}" \
  "${api_root}/venv/bin/python" <<'PY'
from pathlib import Path

from app import compress_existing_uploaded_images, create_app, get_db
from core_data import migrate_embedded_data_images

app = create_app()
with app.app_context():
    db = get_db()
    extracted = migrate_embedded_data_images(db, Path(app.config["UPLOAD_ROOT"]))
    compressed = compress_existing_uploaded_images(db, Path(app.config["UPLOAD_ROOT"]))
    remaining = db.execute(
        "select count(*) from lessons where content_html like '%data:image%'"
    ).fetchone()[0]
    assert remaining == 0
    saved = compressed["bytes_before"] - compressed["bytes_after"]
    print({"embedded_images": extracted, **compressed, "bytes_saved": saved})
PY

echo "[6/9] 重启 API 并检查服务"
sudo systemctl restart growth-journal-api.service
sleep 4
curl --fail http://127.0.0.1:8001/api/health

echo "[7/9] 更新教师端、家长端和学生端前端"
sudo cp -a "${release_root}/dist/assets/." "${web_root}/assets/"
sudo install -m 0644 "${release_root}/dist/index.html" "${web_root}/index.html"
sudo chmod -R a+rX "${web_root}/assets" "${web_root}/index.html"
sudo nginx -t
sudo systemctl reload nginx

echo "[8/9] 核对公网接口、课程体积与学生账号"
curl --fail https://aikc.tech/api/health
term_id="$(sudo "${api_root}/venv/bin/python" -c \
  'import sqlite3; db=sqlite3.connect("/var/lib/growth-journal/growth.db"); row=db.execute("select id from terms order by start_date desc limit 1").fetchone(); print(row[0] if row else "")')"
test -n "${term_id}"
curl --fail --silent "https://aikc.tech/api/data/lessons?term_id=${term_id}" -o "${release_dir}/lessons.json"
list_bytes="$(wc -c < "${release_dir}/lessons.json")"
echo "课程目录接口大小：${list_bytes} bytes"
test "${list_bytes}" -lt 100000
accounts_after="$(sudo "${api_root}/venv/bin/python" -c \
  'import sqlite3; db=sqlite3.connect("/var/lib/growth-journal/growth.db"); print(db.execute("select count(*) from student_accounts").fetchone()[0])')"
echo "学生账号数（发布前/后）：${accounts_before}/${accounts_after}"
test "${accounts_before}" = "${accounts_after}"
grep -q 'assets/index-BbcuH0Sv.js' "${web_root}/index.html"

echo "[9/9] 发布完成"
echo "新照片由服务器统一转为 WebP；现有照片已在原路径压缩。"
echo "学生档案只读取档案与账号，课程正文改为编辑时按需加载。"
echo "数据库备份：${database_backup}"
echo "图片备份：${media_backup}"
