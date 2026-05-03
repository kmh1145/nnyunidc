const { PrismaClient } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const pg = require("pg")
const bcrypt = require("bcryptjs")

async function main() {
  console.log("🌱 开始创建管理员...")

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // 创建默认管理员
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    })

    if (existingAdmin) {
      console.log("ℹ️  管理员已存在")
      console.log(`   邮箱: ${existingAdmin.email}`)
      return
    }

    const hashedPassword = await bcrypt.hash("admin123456", 10)

    const admin = await prisma.user.create({
      data: {
        name: "管理员",
        email: "admin@nnyunidc.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    })

    console.log("✅ 管理员创建成功")
    console.log(`   邮箱: ${admin.email}`)
    console.log(`   密码: admin123456`)
    console.log("\n⚠️  请在生产环境中修改默认密码！")
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((e) => {
  console.error("❌ 创建失败:", e)
  process.exit(1)
})
