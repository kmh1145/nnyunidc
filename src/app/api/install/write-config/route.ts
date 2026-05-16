import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"

export async function POST(request: Request) {
  try {
    const { databaseUrl, nextauthSecret, nextauthUrl, appUrl } = await request.json()

    // .env.local 的内容
    const envContent = `# 数据库
DATABASE_URL="${databaseUrl}"

# NextAuth
NEXTAUTH_URL="${nextauthUrl}"
NEXTAUTH_SECRET="${nextauthSecret}"

# 应用地址
NEXT_PUBLIC_APP_URL="${appUrl}"

# 支付配置（安装后在管理后台修改）
# YIPAY_API_URL=
# YIPAY_MERCHANT_ID=
# YIPAY_SECRET_KEY=

# SMTP 邮件配置（安装后在管理后台修改）
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=
`

    const envPath = path.join(process.cwd(), ".env.local")
    fs.writeFileSync(envPath, envContent)

    // 创建安装锁文件，防止重复安装
    const lockPath = path.join(process.cwd(), ".install.lock")
    fs.writeFileSync(lockPath, new Date().toISOString())

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
