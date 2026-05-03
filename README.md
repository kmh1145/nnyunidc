# 宁宁云IDC

开源的 VPS/服务器自动销售平台，基于 Proxmox VE 实现自动开通、续费和服务器管理。

## 功能特性

- **自动化 VPS 开通** — 对接 PVE（Proxmox VE），支付完成后自动创建虚拟机并发送开通邮件
- **用户控制台** — 服务器管理（启动/停止/重启/关机）、账单列表、个人信息、工单系统、文档中心
- **管理后台** — 产品管理（拖拽排序）、分类管理、服务器管理、工单处理、支付设置、站务设置
- **模块化支付** — 易支付 V1 协议对接，支持支付宝和微信支付，预留自定义支付网关接口
- **响应式设计** — 适配 PC、平板和移动端
- **安全认证** — NextAuth JWT 登录，支持角色权限控制

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端框架 | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| 数据库 | PostgreSQL + Prisma 7 ORM |
| 认证 | NextAuth.js 4 (Credentials + JWT) |
| 支付 | 易支付 V1 (MD5 签名) |
| 虚拟化 | Proxmox VE REST API |
| 语言 | TypeScript |

## 快速开始

### 环境要求

- Node.js 22+
- pnpm
- PostgreSQL 18

### 本地开发

```bash
# 1. 克隆项目
git clone https://github.com/kmh1145/nnyunidc.git
cd nnyunidc

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env .env.local
# 编辑 .env.local，修改 DATABASE_URL 等配置

# 4. 初始化数据库
npx prisma db push
npx prisma db seed

# 5. 启动开发服务器
pnpm dev
```

访问 http://localhost:3000：
- 默认管理员：`admin@nnyunidc.com` / `admin123456`
- 登录后首先在管理后台"支付设置"中配置易支付参数
- 在"产品管理"中添加产品并配置 PVE 开通参数

### Docker 部署

```bash
# 1. 构建并启动（首次启动自动初始化数据库）
docker compose up -d --build

# 2. 查看启动日志
docker compose logs -f

# 3. 访问
open http://localhost:3000
```

首次启动时容器会自动执行 `prisma db push` 和数据库初始化，无需手动操作。

### 本地/手动部署

```bash
# 初始化数据库（首次部署）
npx prisma db push
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/init-db.ts

# 构建并启动
pnpm build
pnpm start
```

## 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://user:pass@localhost:5432/nnyunidc` |
| `NEXTAUTH_URL` | 站点地址 | `https://your-domain.com` |
| `NEXTAUTH_SECRET` | JWT 加密密钥 | 随机字符串，至少 32 位 |
| `NEXT_PUBLIC_APP_URL` | 前端地址 | `https://your-domain.com` |
| `YIPAY_API_URL` | 易支付网关地址 | `https://pay.example.com` |
| `YIPAY_MERCHANT_ID` | 易支付商户 ID | `1001` |
| `YIPAY_SECRET_KEY` | 易支付密钥 | 商户密钥 |
| `SMTP_HOST` | SMTP 服务器 | `smtp.example.com` |
| `SMTP_PORT` | SMTP 端口 | `587` |
| `SMTP_USER` | SMTP 用户名 | `user@example.com` |
| `SMTP_PASS` | SMTP 密码 | 密码 |
| `SMTP_FROM` | 发件人地址 | `noreply@nnyunidc.com` |

> 支付和 SMTP 配置也可以在管理后台"支付设置"中修改，支持热更新。

## 优势

- **全开源** — 不依赖第三方收费平台，数据完全自主可控
- **PVE 深度集成** — 支持节点管理、存储池选择、VNC 控制台、快照、克隆等完整功能
- **模块化架构** — 支付网关和服务器引擎均为接口化设计，便于扩展其他支付方式或云平台
- **Docker 一键部署** — 最小化配置即可上线运行
- **中文优先** — 管理后台、用户界面均为中文，适合国内用户
