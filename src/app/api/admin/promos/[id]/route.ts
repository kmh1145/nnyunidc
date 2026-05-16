import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 更新/删除优惠码
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await request.json()
  const { code, type, value, minAmount, maxUseCount, startsAt, expiresAt, isActive, productIds, description } = body
  if (code) { const e = await prisma.promoCode.findFirst({ where: { code, id: { not: id } } }); if (e) return NextResponse.json({ error: "优惠码已存在" }, { status: 400 }) }
  const promo = await prisma.promoCode.update({ where: { id }, data: { code, type, value, minAmount, maxUseCount, startsAt: startsAt ? new Date(startsAt) : undefined, expiresAt: expiresAt ? new Date(expiresAt) : undefined, isActive, productIds, description } })
  return NextResponse.json(promo)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || (session.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  await prisma.promoCodeUsage.deleteMany({ where: { promoCodeId: id } })
  await prisma.promoCode.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
