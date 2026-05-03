import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 获取站点配置（公开接口，不需要认证）
export async function GET() {
  try {
    let config = await prisma.siteConfig.findFirst()
    if (!config) {
      config = await prisma.siteConfig.create({
        data: {
          siteTitle: "宁宁云IDC",
          tabTitle: "宁宁云IDC",
          brandName: "宁宁云IDC",
          description: "专业服务器提供商",
        },
      })
    }
    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json({ error: "获取配置失败" }, { status: 500 })
  }
}

// 更新站点配置（需要管理员权限）
export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { siteTitle, tabTitle, brandName, logoUrl, faviconUrl, keywords, description, footer,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure } = body

    let config = await prisma.siteConfig.findFirst()
    const data = { siteTitle, tabTitle, brandName, logoUrl, faviconUrl, keywords, description, footer,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, smtpSecure }
    if (!config) {
      config = await prisma.siteConfig.create({ data })
    } else {
      config = await prisma.siteConfig.update({ where: { id: config.id }, data })
    }

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json({ error: "保存配置失败" }, { status: 500 })
  }
}
