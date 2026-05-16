import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import bcrypt from "bcryptjs"

export const runtime = "nodejs"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误"
}

export async function POST(request: Request) {
  try {
    const { databaseUrl, name, email, password, siteTitle, siteUrl } = await request.json()
    const pool = new pg.Pool({ connectionString: databaseUrl })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    // 创建管理员
    const hashedPassword = await bcrypt.hash(password, 10)
    await prisma.user.create({
      data: { name, email, password: hashedPassword, role: "ADMIN" },
    })

    // 初始化分类
    const categories = [
      { name: "VPS", slug: "vps", description: "虚拟专用服务器", sortOrder: 0 },
      { name: "独立服务器", slug: "dedicated", description: "物理独立服务器", sortOrder: 1 },
      { name: "云服务器", slug: "cloud", description: "弹性云服务器", sortOrder: 2 },
    ]
    for (const cat of categories) {
      const e = await prisma.category.findUnique({ where: { slug: cat.slug } })
      if (!e) await prisma.category.create({ data: cat })
    }

    // 初始化站点配置
    const sc = await prisma.siteConfig.findFirst()
    if (!sc) {
      await prisma.siteConfig.create({
        data: { siteTitle, tabTitle: siteTitle, brandName: siteTitle, description: "专业服务器提供商" },
      })
    }

    // 初始化支付配置（占位）
    const pc = await prisma.paymentConfig.findFirst({ where: { method: "yipay" } })
    if (!pc) {
      await prisma.paymentConfig.create({
        data: {
          method: "yipay", name: "易支付",
          credentials: { apiUrl: "", merchantId: "", secretKey: "", defaultType: "alipay" },
          isActive: false,
        },
      })
    }

    await prisma.$disconnect()
    await pool.end()

    return NextResponse.json({
      success: true,
      adminEmail: email,
      adminPassword: password,
      loginUrl: `${siteUrl}/admin/login`,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
