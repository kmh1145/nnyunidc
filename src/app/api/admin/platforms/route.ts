import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 获取所有平台配置
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const configs = await prisma.platformConfig.findMany({
      orderBy: { platform: "asc" },
    })
    return NextResponse.json(configs)
  } catch (error) {
    return NextResponse.json({ error: "获取平台配置失败" }, { status: 500 })
  }
}

// 创建或更新平台配置
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { platform, name, apiUrl, credentials, settings, isActive } = body

    if (!platform || !name || !apiUrl || !credentials) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 })
    }

    const config = await prisma.platformConfig.upsert({
      where: { platform },
      update: { name, apiUrl, credentials, settings, isActive },
      create: { platform, name, apiUrl, credentials, settings, isActive },
    })

    return NextResponse.json(config)
  } catch (error) {
    return NextResponse.json({ error: "保存平台配置失败" }, { status: 500 })
  }
}
