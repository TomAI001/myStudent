#!/usr/bin/env bash
set -euo pipefail

commit="f57846dddac60ee5769856cdbf3003e49174280f"
archive_url="https://codeload.github.com/TomAI001/python-pixel-quest-/zip/${commit}"
archive_sha="723165fa840369488b04a82bb974e6f0f5df4885da0555aee2938c4e4f4105e9"
archive_path="/home/ubuntu/python-pixel-quest-f57846d.zip"
work_dir="$(mktemp -d /tmp/python-pixel-quest.XXXXXX)"
source_dir="${work_dir}/python-pixel-quest--${commit}"
target_dir="/var/www/growth-journal/python-pixel-quest"

cleanup() {
  rm -rf -- "${work_dir}"
}
trap cleanup EXIT

echo "[1/5] 下载并校验 GitHub 提交 ${commit:0:7}"
curl -L --fail --retry 5 --connect-timeout 15 "${archive_url}" -o "${archive_path}"
echo "${archive_sha}  ${archive_path}" | sha256sum -c -
unzip -q -o "${archive_path}" -d "${work_dir}"

echo "[2/5] 检查学生端、教师端和图片素材"
for file in index.html teacher.html app.js teacher.js config.js styles.css dungeon.css teacher.css; do
  test -f "${source_dir}/${file}"
done
test -d "${source_dir}/assets"

echo "[3/5] 发布到独立子目录，不改动原网站"
sudo mkdir -p "${target_dir}"
sudo mkdir -p "${target_dir}/assets"
sudo cp -a \
  "${source_dir}/index.html" \
  "${source_dir}/teacher.html" \
  "${source_dir}/app.js" \
  "${source_dir}/teacher.js" \
  "${source_dir}/config.js" \
  "${source_dir}/styles.css" \
  "${source_dir}/dungeon.css" \
  "${source_dir}/teacher.css" \
  "${target_dir}/"
sudo cp -a "${source_dir}/assets/." "${target_dir}/assets/"
sudo chmod -R a+rX "${target_dir}"

echo "[4/5] 检查 Nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "[5/5] 验证线上学生端与教师端"
curl --fail --silent --show-error https://aikc.tech/python-pixel-quest/ | grep -q "Python 像素闯关"
curl --fail --silent --show-error https://aikc.tech/python-pixel-quest/teacher.html | grep -q "老师控制台"
echo "学生端：https://aikc.tech/python-pixel-quest/"
echo "教师端：https://aikc.tech/python-pixel-quest/teacher.html"
echo "Python 像素闯关发布完成。"
