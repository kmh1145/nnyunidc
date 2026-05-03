import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 获取所有支付配置
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const configs = await prisma.paymentConfig.findMany({
      orderBy: { method: "asc" },
    })
    return NextResponse.json(configs)
  } catch (error) {
    return NextResponse.json({ error: "获取支付配置失败" }, { status: 500 })
  }
}

// 创建或更新支付配置
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { method, name, credentials, settings, isActive } = body

    if (!method || !name || !credentials) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
    }

    const config = await prisma.paymentConfig.upsert({
      where: { method },
      update: { name, credentials, settings, isActive },
      create: { method, name, credentials, settings, isActive },
    })

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json({ error: "保存支付配置失败" }, { status: 500 })
  }
}
