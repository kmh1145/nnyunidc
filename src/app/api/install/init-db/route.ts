import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

export const runtime = "nodejs"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误"
}

export async function POST(request: Request) {
  try {
    const { databaseUrl } = await request.json()
    const pool = new pg.Pool({ connectionString: databaseUrl })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    // 使用 prisma db push 的逻辑：直接建表
    // 检查是否已存在 User 表（通过查询）
    try {
      await prisma.$queryRaw`SELECT 1 FROM "User" LIMIT 1`
      return NextResponse.json({ success: true, existed: true })
    } catch {
      // 表不存在，需要创建
    }

    // 手动创建所有表（简化版 prisma db push）
    const sql = `
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY, "email" TEXT UNIQUE NOT NULL, "name" TEXT,
        "password" TEXT NOT NULL, "phone" TEXT, "role" TEXT DEFAULT 'USER',
        "balance" DECIMAL DEFAULT 0, "credit" DECIMAL DEFAULT 0,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT UNIQUE NOT NULL,
        "description" TEXT, "sortOrder" INT DEFAULT 0, "parentId" TEXT,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT UNIQUE NOT NULL,
        "description" TEXT, "price" DECIMAL NOT NULL, "originalPrice" DECIMAL,
        "stock" INT NOT NULL, "sortOrder" INT DEFAULT 0, "categoryId" TEXT NOT NULL,
        "images" JSONB DEFAULT '[]', "specs" JSONB, "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "Order" (
        "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "totalAmount" DECIMAL NOT NULL,
        "status" TEXT DEFAULT 'PENDING', "shippingAddress" JSONB,
        "paymentMethod" TEXT, "paymentId" TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "OrderItem" (
        "id" TEXT PRIMARY KEY, "orderId" TEXT NOT NULL, "productId" TEXT NOT NULL,
        "quantity" INT NOT NULL, "price" DECIMAL NOT NULL
      );
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" TEXT PRIMARY KEY, "orderId" TEXT UNIQUE NOT NULL, "paymentMethod" TEXT NOT NULL,
        "paymentId" TEXT, "amount" DECIMAL NOT NULL, "status" TEXT DEFAULT 'PENDING',
        "callbackData" JSONB, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "Server" (
        "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "orderId" TEXT UNIQUE NOT NULL,
        "serverId" TEXT, "hostname" TEXT, "ipAddress" TEXT, "platform" TEXT NOT NULL,
        "status" TEXT DEFAULT 'CREATING', "config" JSONB, "expiresAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "PlatformConfig" (
        "id" TEXT PRIMARY KEY, "platform" TEXT UNIQUE NOT NULL, "name" TEXT NOT NULL,
        "apiUrl" TEXT NOT NULL, "credentials" JSONB NOT NULL, "settings" JSONB,
        "isActive" BOOLEAN DEFAULT true, "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "PaymentConfig" (
        "id" TEXT PRIMARY KEY, "method" TEXT UNIQUE NOT NULL, "name" TEXT NOT NULL,
        "credentials" JSONB NOT NULL, "settings" JSONB, "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "Ticket" (
        "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "subject" TEXT NOT NULL,
        "content" TEXT NOT NULL, "department" TEXT NOT NULL, "priority" TEXT DEFAULT 'MEDIUM',
        "status" TEXT DEFAULT 'OPEN', "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "TicketReply" (
        "id" TEXT PRIMARY KEY, "ticketId" TEXT NOT NULL, "userId" TEXT NOT NULL,
        "content" TEXT NOT NULL, "isAdmin" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "SiteConfig" (
        "id" TEXT PRIMARY KEY, "siteTitle" TEXT DEFAULT '宁宁云IDC',
        "tabTitle" TEXT DEFAULT '宁宁云IDC', "brandName" TEXT DEFAULT '宁宁云IDC',
        "logoUrl" TEXT, "faviconUrl" TEXT, "keywords" TEXT, "description" TEXT,
        "footer" TEXT, "smtpHost" TEXT, "smtpPort" INT, "smtpUser" TEXT,
        "smtpPass" TEXT, "smtpFrom" TEXT, "smtpSecure" BOOLEAN DEFAULT false,
        "smsProvider" TEXT, "smsConfig" JSONB, "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS "DocArticle" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "slug" TEXT UNIQUE NOT NULL, "content" TEXT NOT NULL, "category" TEXT DEFAULT 'general', "sortOrder" INT DEFAULT 0, "isPublished" BOOLEAN DEFAULT true, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS "PromoCode" ("id" TEXT PRIMARY KEY, "code" TEXT UNIQUE NOT NULL, "type" TEXT DEFAULT 'percent', "value" DECIMAL NOT NULL, "minAmount" DECIMAL DEFAULT 0, "maxUseCount" INT DEFAULT 0, "usedCount" INT DEFAULT 0, "startsAt" TIMESTAMPTZ, "expiresAt" TIMESTAMPTZ, "isActive" BOOLEAN DEFAULT true, "productIds" TEXT DEFAULT '', "description" TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS "PromoCodeUsage" ("id" TEXT PRIMARY KEY, "promoCodeId" TEXT NOT NULL, "userId" TEXT NOT NULL, "orderId" TEXT NOT NULL, "discount" DECIMAL NOT NULL, "createdAt" TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS "NewsCategory" ("id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "slug" TEXT UNIQUE NOT NULL, "description" TEXT, "sortOrder" INT DEFAULT 0, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS "NewsArticle" ("id" TEXT PRIMARY KEY, "title" TEXT NOT NULL, "slug" TEXT UNIQUE NOT NULL, "content" TEXT NOT NULL, "summary" TEXT, "categoryId" TEXT NOT NULL, "isPublished" BOOLEAN DEFAULT true, "isTop" BOOLEAN DEFAULT false, "viewCount" INT DEFAULT 0, "sortOrder" INT DEFAULT 0, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS "EmailTemplate" ("id" TEXT PRIMARY KEY, "code" TEXT UNIQUE NOT NULL, "name" TEXT NOT NULL, "subject" TEXT NOT NULL, "content" TEXT NOT NULL, "isActive" BOOLEAN DEFAULT true, "createdAt" TIMESTAMPTZ DEFAULT NOW(), "updatedAt" TIMESTAMPTZ DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS "SystemLog" ("id" TEXT PRIMARY KEY, "type" TEXT NOT NULL, "action" TEXT NOT NULL, "content" TEXT, "userId" TEXT, "ip" TEXT, "createdAt" TIMESTAMPTZ DEFAULT NOW());
    `

    // Split and execute each statement
    const statements = sql.split(";").filter(s => s.trim())
    for (const stmt of statements) {
      try { await prisma.$executeRawUnsafe(stmt.trim() + ";") } catch {}
    }

    await prisma.$disconnect()
    await pool.end()
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
