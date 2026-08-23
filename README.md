# 咱们班的成长记录

一个面向编程班家长的公开成长展示网站。管理员可以维护班级、学期、学生、课程、每日作业和每节课的个人评价；家长通过手机选择班级和学生，查看课程内容、五项能力雷达图、学期成长趋势、评语、照片与短视频。

## 功能清单

### 管理员端 `/admin/login`

- 邮箱密码登录，仅管理员可操作
- 创建班级和多个学期
- 添加学生姓名、头像、班级和入班日期
- 使用富文本编辑器发布课程：标题、列表、代码块、图片、附件、链接
- 按每节课为学生填写学习评语
- 依据参考 PDF 的五项能力评分：思维、专注、创新、编程、学习动机，单项满分 5 分
- 上传课堂照片和 10–20 秒短视频
- 按班级统一布置每日作业
- 所有内容保存后立即在家长端公开，无草稿状态

### 家长展示端 `/`

- 手机优先的响应式页面
- 选择班级后，学生姓名以动态词云/成长星球形式出现
- 可切换历史学期
- 自动计算学期能力平均分和课程成长趋势
- 每节课先展示统一课程内容，再展示学生评价、雷达图、照片和视频

### 学生端 `/student/login`

- 游戏闯关风格的学生登录页与冒险大厅
- 进入所属班级、选择课程关卡并浏览内嵌网页课件
- 课件通过统一消息接口回传答题结果与积分，同一道题仅首次答对计分
- 本节课实时排行榜演示
- 浏览器内运行和保存基础 Python 程序
- 测评中心：选择题、判断题、程序填空自动评分，编程题等待教师评分
- 作业中心：在线代码、作业说明、最多 10 张照片和 1 个视频，支持重交及教师评语
- 交流广场：作品审核、Python 作品运行、点赞、评论、活动通知与站内报名
- 学生账号保存在腾讯云服务器 SQLite 数据库中，密码使用 scrypt 哈希保存
- 登录状态使用 HttpOnly Cookie，不在浏览器本地存储账号、密码或登录信息
- 学生可以修改密码，教师可以创建账号、修改姓名与账号、停用账号和重置密码
- 教师端新增“学生端管理”，集中管理教师、学生账号、ZIP 课件、测评、作业、作品审核和活动报名
- 已适配电脑、平板和手机

体验账号为 `student01`，初始密码为 `123456`。旧版两个体验账号会在服务器首次启动时迁移，数据库中只保存密码哈希。课堂图片、视频、学生作业附件和广场作品附件上传到腾讯云服务器磁盘。

## 技术方案

- 前端：React + TypeScript + Vite
- 家长端内容与教师身份：Supabase
- 学生账号、安全会话与媒体文件：腾讯云服务器上的 Flask、SQLite、Gunicorn 和 Nginx
- 代码托管：GitHub
- 网站部署：GitHub Pages（推荐，无需新账号或手机号）

## 第一次上线

### 1. 创建 Supabase 项目

1. 打开 [Supabase](https://supabase.com/)，使用 GitHub 账号登录并新建项目。
2. 妥善保存创建项目时设置的数据库密码。
3. 进入 `SQL Editor`，新建查询。
4. 复制 [`supabase/schema.sql`](./supabase/schema.sql) 的全部内容并运行。它会创建数据表、公开只读权限、管理员写入权限和 `student-media` 文件桶。

### 2. 创建唯一管理员账号

1. 在 Supabase 后台进入 `Authentication → Users`。
2. 点击 `Add user → Create new user`，填写你自己的邮箱和密码。
3. 在 `Authentication → Sign In / Providers → Email` 中关闭 **Allow new users to sign up**（允许新用户注册）。这一项很重要：关闭后只有你手动创建的账号能够登录后台。

### 3. 获取前端环境变量

1. 在 Supabase 进入 `Project Settings → Data API`。
2. 复制 `Project URL` 和 `Publishable key`（格式通常为 `sb_publishable_...`）。这是可以用于网页前端的公开密钥。不要复制 `Secret key` 或旧版的 `service_role` 密钥。
3. 本地开发时，把 [`.env.example`](./.env.example) 复制为 `.env.local`，填写：

```env
VITE_SUPABASE_URL=你的 Project URL
VITE_SUPABASE_PUBLISHABLE_KEY=你的 Publishable key
```

### 4. 上传 GitHub

在 GitHub 新建一个空仓库，然后在本项目目录执行：

```bash
git init
git add .
git commit -m "完成咱们班的成长记录第一版"
git branch -M main
git remote add origin 你的仓库地址
git push -u origin main
```

如果上级工作目录已经是另一个 Git 仓库，请在 GitHub Desktop 中把“学生展示界面”作为独立仓库添加，避免提交其他工作文件。

### 5. 部署到 GitHub Pages

1. 打开 GitHub 仓库的 `Settings → Secrets and variables → Actions`。
2. 点击 `New repository secret`，分别添加：
   - `VITE_SUPABASE_URL`：Supabase Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`：Supabase Publishable key
3. 进入 `Settings → Pages`。
4. 在 `Build and deployment → Source` 中选择 `GitHub Actions`。
5. 打开仓库的 `Actions` 页面，选择 `Deploy to GitHub Pages`，点击 `Run workflow`；之后每次推送代码都会自动重新部署。
6. 发布成功后的网址为 `https://tomai001.github.io/myStudent/`。

项目使用 Hash 路由以兼容 GitHub Pages。家长打开的学生页面链接会包含 `/#/`，这是正常现象。

## 推荐录入顺序

1. 登录 `/admin/login`
2. 创建班级
3. 创建学期
4. 添加 7 名学生及头像
5. 发布第一节课程
6. 进入“录入 / 查看评价”，逐名填写五项评分、评语并上传媒体
7. 发布每日作业
8. 点击左下角“查看家长端”检查公开效果

## 本地运行

要求 Node.js 20 或更高版本。

最简单的方式：直接双击项目根目录中的 `启动本地预览.cmd`。浏览器会自动打开网站，请保持命令窗口开启。不要直接双击 `index.html`，React/Vite 项目必须通过本地服务运行。

也可以在终端手动运行：

```bash
pnpm install
pnpm dev
```

生产构建检查：

```bash
pnpm build
```

## 文件与容量建议

- 图片上传时会在浏览器中自动缩放和压缩，适合每名学生约 5 张课堂照片。
- 单个视频限制为 50MB。建议使用 MP4，时长控制在 10–20 秒。
- 媒体属于公开展示内容，请确认已获得家长同意后再上传。
- 免费额度接近上限时，可删除不再展示的视频，或将视频放到外部视频平台后在课程正文插入链接。

## 参考评分标准

项目依据 `石笋街信息学进阶班学期总结-黄子宸.pdf` 固定五项能力维度。评分的目的在于记录孩子相对自己的变化，不用于学生之间排名。详细评价细则已内置在管理员评分界面的“查看评分参考”中。
