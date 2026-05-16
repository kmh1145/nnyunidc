import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")

  const where: any = {}
  if (type && type !== "all") where.type = type

  const [logs] = await Promise.all([
    prisma.systemLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
  ])
  return NextResponse.json(logs)
}
