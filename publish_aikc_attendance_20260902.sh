#!/usr/bin/env bash
set -euo pipefail

release_name="aikc-attendance-20260902"
release_url="https://raw.githubusercontent.com/TomAI001/myStudent/65ddd3923916e16426c331d69b1918d6b933811f/aikc-attendance-20260902.zip"
release_sha="85f910cec9aa2ebba2cbe568a2cdf8d042d6c7c18129656dc290ba1ee41abb4c"
release_zip="/home/ubuntu/${release_name}.zip"
release_dir="$(mktemp -d "/tmp/${release_name}.XXXXXX")"
release_root="${release_dir}/package"
database="/var/lib/growth-journal/growth.db"

cleanup() {
  rm -rf -- "${release_dir}"
}
trap cleanup EXIT

echo "[1/8] 下载并校验发布包"
curl -L --fail --retry 5 --connect-timeout 15 "${release_url}" -o "${release_zip}"
echo "${release_sha}  ${release_zip}" | sha256sum -c -
unzip -q -o "${release_zip}" -d "${release_dir}"
test -f "${release_root}/dist/index.html"
test -f "${release_root}/server/app.py"
test -f "${release_root}/server/portal_features.py"

echo "[2/8] 检查后端代码和独立测试数据库"
/opt/growth-journal-api/venv/bin/python -m py_compile \
  "${release_root}/server/app.py" \
  "${release_root}/server/portal_features.py"
GROWTH_DATABASE="${release_dir}/check.db" \
GROWTH_UPLOAD_ROOT="${release_dir}/check-uploads" \
PYTHONPATH="${release_root}/server" \
  /opt/growth-journal-api/venv/bin/python -c \
  'from app import create_app; app = create_app(); print("STAGED_APP_OK", len(app.url_map._rules))'

echo "[3/8] 记录学生账号数量"
accounts_before="$(sudo /opt/growth-journal-api/venv/bin/python -c \
  'import sqlite3; db=sqlite3.connect("/var/lib/growth-journal/growth.db"); print(db.execute("select count(*) from student_accounts").fetchone()[0])')"
echo "学生账号数（发布前）：${accounts_before}"

echo "[4/8] 安装新增依赖"
sudo /opt/growth-journal-api/venv/bin/pip install \
  --disable-pip-version-check \
  -r "${release_root}/server/requirements.txt"

echo "[5/8] 更新后端程序（不覆盖数据库和上传资料）"
sudo install -m 0644 "${release_root}/server/app.py" /opt/growth-journal-api/app.py
sudo install -m 0644 "${release_root}/server/portal_features.py" /opt/growth-journal-api/portal_features.py
sudo systemctl restart growth-journal-api.service
sleep 4
curl --fail http://127.0.0.1:8001/api/health

echo "[6/8] 更新前端静态文件"
sudo cp -a "${release_root}/dist/." /var/www/growth-journal/
sudo chmod -R a+rX /var/www/growth-journal
sudo nginx -t
sudo systemctl reload nginx

echo "[7/8] 验证线上服务与学生数据"
curl --fail https://aikc.tech/api/health
grep -q 'assets/index-BqUvnHRZ.js' /var/www/growth-journal/index.html
accounts_after="$(sudo /opt/growth-journal-api/venv/bin/python -c \
  'import sqlite3; db=sqlite3.connect("/var/lib/growth-journal/growth.db"); print(db.execute("select count(*) from student_accounts").fetchone()[0])')"
echo "学生账号数（发布后）：${accounts_after}"
test "${accounts_before}" = "${accounts_after}"

echo "[8/8] 发布完成"
echo "课堂签到、家长出勤记录和 XLSX 批量导入已上线；学生账号数据保持完整。"
