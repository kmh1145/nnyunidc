import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import bcrypt from "bcryptjs"

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("未设置 DATABASE_URL 环境变量")
    process.exit(1)
  }

  console.log("正在连接数据库...")
  const pool = new pg.Pool({ connectionString: databaseUrl })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      console.log("数据库已初始化，跳过")
      return
    }

    console.log("开始初始化数据库...")

    const hashedPassword = await bcrypt.hash("admin123456", 10)
    await prisma.user.create({
      data: {
        name: "管理员",
        email: "admin@nnyunidc.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    })
    console.log("管理员已创建（admin@nnyunidc.com / admin123456）")

    const categories = [
      { name: "VPS", slug: "vps", description: "虚拟专用服务器", sortOrder: 0 },
      { name: "独立服务器", slug: "dedicated", description: "物理独立服务器", sortOrder: 1 },
      { name: "云服务器", slug: "cloud", description: "弹性云服务器", sortOrder: 2 },
    ]
    for (const cat of categories) {
      const exists = await prisma.category.findUnique({ where: { slug: cat.slug } })
      if (!exists) {
        await prisma.category.create({ data: cat })
        console.log("分类已创建:", cat.name)
      }
    }

    const siteConfig = await prisma.siteConfig.findFirst()
    if (!siteConfig) {
      await prisma.siteConfig.create({
        data: {
          siteTitle: "宁宁云IDC",
          tabTitle: "宁宁云IDC",
          brandName: "宁宁云IDC",
          description: "专业服务器提供商",
        },
      })
      console.log("站点配置已创建")
    }

    const payConfig = await prisma.paymentConfig.findFirst({ where: { method: "yipay" } })
    if (!payConfig) {
      await prisma.paymentConfig.create({
        data: {
          method: "yipay",
          name: "易支付",
          credentials: { apiUrl: "", merchantId: "", secretKey: "", defaultType: "alipay" },
          isActive: false,
        },
      })
      console.log("支付配置已创建（需在管理后台填写商户信息）")
    }

    console.log("\n数据库初始化完成！")
    console.log("默认管理员: admin@nnyunidc.com / admin123456")
    console.log("请登录管理后台完善配置\n")
  } catch (error) {
    console.error("初始化失败:", error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

initDatabase()
