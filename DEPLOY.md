# 🚀 考公行测题库 - 云端部署指南

本指南将带你从零完成数据库配置和云端部署。整个过程大约需要 **15-20分钟**。

---

## 📋 部署前准备

确保你的电脑上已安装：
- [Node.js 18+](https://nodejs.org)
- [Git](https://git-scm.com)

---

## 第一步：注册 GitHub 账号

1. 访问 [github.com](https://github.com)
2. 点击右上角 **Sign up**
3. 填写用户名、邮箱、密码，完成注册
4. 验证邮箱

---

## 第二步：创建 GitHub 仓库并推送代码

### 2.1 安装 Git（如果没有）
```bash
# Windows: 去 https://git-scm.com 下载安装
# 安装后重启终端
git --version  # 验证安装成功
```

### 2.2 初始化 Git 仓库
```bash
cd D:\考公题库\exam-prep

# 初始化
git init

# 添加所有文件
git add .

# 首次提交
git commit -m "初始版本：考公行测题库全功能"
```

### 2.3 在 GitHub 创建远程仓库
1. 登录 GitHub，点击右上角 **+** → **New repository**
2. 仓库名填: `exam-prep`（或你喜欢的名字）
3. 选择 **Public**（免费部署需要公开）
4. **不要** 勾选 "Add a README file"
5. 点击 **Create repository**

### 2.4 推送到 GitHub
```bash
# 替换 YOUR_USERNAME 为你的 GitHub 用户名
git remote add origin https://github.com/YOUR_USERNAME/exam-prep.git
git branch -M main
git push -u origin main
```

首次推送时会弹出 GitHub 登录窗口，授权即可。

---

## 第三步：创建 Neon 数据库（免费）

### 3.1 注册 Neon
1. 访问 [neon.tech](https://neon.tech)
2. 点击 **Sign Up** → 选择 **Continue with GitHub**（用刚创建的 GitHub 账号）
3. 授权后自动创建账号

### 3.2 创建数据库项目
1. 进入 Dashboard 后，点击 **New Project**
2. **Project name**: `exam-prep`
3. **Region**: 选择 **Asia Pacific (Singapore)** 或最近的区域
4. **Database name**: `neondb`（默认即可）
5. 点击 **Create Project**

### 3.3 获取连接字符串
1. 项目创建后，页面会显示连接信息
2. 复制 **Connection string**，格式如下：
   ```
   postgresql://username:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
3. 这就是你的 `DATABASE_URL`

### 3.4 推送数据库表结构
```bash
cd D:\考公题库\exam-prep

# 创建 .env 文件
copy .env.example .env

# 用记事本打开 .env，将 DATABASE_URL 替换为你复制的连接字符串
notepad .env

# 推送表结构到 Neon
npx prisma db push
```

看到 "Your database is now in sync with your Prisma schema" 表示成功！

---

## 第四步：部署到 Vercel（免费）

### 4.1 注册 Vercel
1. 访问 [vercel.com](https://vercel.com)
2. 点击 **Sign Up** → 选择 **Continue with GitHub**
3. 授权 GitHub 访问

### 4.2 导入项目
1. 进入 Vercel Dashboard
2. 点击 **Add New...** → **Project**
3. 找到你的 `exam-prep` 仓库，点击 **Import**

### 4.3 配置环境变量（重要！）
在 Import 页面，展开 **Environment Variables** 部分：

| Name | Value |
|------|-------|
| `DATABASE_URL` | 你的 Neon 连接字符串 |
| `DIRECT_URL` | 同上（相同的连接字符串） |

### 4.4 部署
1. 点击 **Deploy**
2. 等待 2-3 分钟构建完成
3. 部署成功后会显示你的网站URL，格式如：`https://exam-prep-xxx.vercel.app`

🎉 **恭喜！你的网站已经上线了！**

---

## 第五步：验证部署

访问你的网站URL，检查以下功能：
- [ ] 首页正常显示
- [ ] 可以注册/登录
- [ ] 可以做题
- [ ] 侧边栏导航正常
- [ ] AI辅导页面正常

---

## 🔧 常见问题

### Q: 构建失败怎么办？
查看 Vercel 的构建日志（Build Logs），通常是环境变量未配置。

### Q: 数据库连接超时？
确保 Neon 项目没有被暂停（免费版不活跃会自动暂停，访问后自动恢复）。

### Q: 如何绑定自定义域名？
在 Vercel Dashboard → Settings → Domains，添加你的域名并配置 DNS。

### Q: 如何更新网站？
```bash
# 修改代码后
git add .
git commit -m "更新描述"
git push
# Vercel 会自动重新部署
```

---

## 📊 免费额度说明

| 服务 | 免费额度 |
|------|---------|
| **Vercel** | 100GB 带宽/月, 无限部署 |
| **Neon** | 0.5GB 存储, 191小时计算/月 |
| **GitHub** | 无限公开仓库 |

对于个人学习使用完全够用！

---

## 📁 项目结构

```
exam-prep/
├── prisma/
│   └── schema.prisma    # 数据库模型定义
├── prisma.config.ts     # Prisma 配置
├── src/
│   ├── app/
│   │   ├── api/         # 后端 API 路由
│   │   │   ├── auth/    # 登录/注册
│   │   │   ├── records/ # 做题记录
│   │   │   ├── leaderboard/ # 排行榜
│   │   │   └── stats/   # 统计数据
│   │   ├── mock/        # 模拟考试
│   │   ├── checkin/     # 每日打卡
│   │   ├── leaderboard/ # 排行榜页面
│   │   ├── profile/     # 个人中心
│   │   └── ...          # 其他页面
│   └── lib/
│       ├── prisma.ts    # 数据库客户端
│       ├── auth.ts      # 认证逻辑
│       ├── storage.ts   # 本地存储
│       └── gamification.ts # 游戏化系统
├── .env.example         # 环境变量模板
├── vercel.json          # Vercel 部署配置
└── package.json
```
