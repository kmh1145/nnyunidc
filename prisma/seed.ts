import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import bcrypt from "bcryptjs"

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 开始初始化数据库...")

  // 创建默认管理员
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  })

  if (!existingAdmin) {
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
  } else {
    console.log("ℹ️  管理员已存在")
  }

  // 创建示例分类
  const categories = [
    { name: "VPS", slug: "vps", description: "虚拟专用服务器" },
    { name: "独立服务器", slug: "dedicated", description: "物理独立服务器" },
    { name: "云服务器", slug: "cloud", description: "弹性云服务器" },
  ]

  for (const category of categories) {
    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
    })

    if (!existing) {
      await prisma.category.create({ data: category })
      console.log(`✅ 分类创建成功: ${category.name}`)
    }
  }

  // 创建示例产品
  const vpsCategory = await prisma.category.findUnique({
    where: { slug: "vps" },
  })

  if (vpsCategory) {
    const products = [
      {
        name: "入门型 VPS",
        slug: "starter-vps",
        description: "适合个人项目和小型网站",
        price: 49,
        originalPrice: 69,
        stock: 100,
        categoryId: vpsCategory.id,
        images: [],
        specs: {
          cpu: 1,
          memory: 1,
          disk: 20,
          bandwidth: 100,
          os: "ubuntu-22.04",
          platform: "PVE",
        },
      },
      {
        name: "标准型 VPS",
        slug: "standard-vps",
        description: "适合中小型企业和应用",
        price: 99,
        originalPrice: 139,
        stock: 50,
        categoryId: vpsCategory.id,
        images: [],
        specs: {
          cpu: 2,
          memory: 4,
          disk: 50,
          bandwidth: 200,
          os: "ubuntu-22.04",
          platform: "PVE",
        },
      },
      {
        name: "高性能 VPS",
        slug: "premium-vps",
        description: "适合大型应用和高流量网站",
        price: 199,
        originalPrice: 269,
        stock: 30,
        categoryId: vpsCategory.id,
        images: [],
        specs: {
          cpu: 4,
          memory: 8,
          disk: 100,
          bandwidth: 500,
          os: "ubuntu-22.04",
          platform: "PVE",
        },
      },
    ]

    for (const product of products) {
      const existing = await prisma.product.findUnique({
        where: { slug: product.slug },
      })

      if (!existing) {
        await prisma.product.create({ data: product })
        console.log(`✅ 产品创建成功: ${product.name}`)
      }
    }
  }

  console.log("\n🎉 数据库初始化完成！")
  console.log("\n📧 默认管理员账号:")
  console.log("   邮箱: admin@nnyunidc.com")
  console.log("   密码: admin123456")
  console.log("\n⚠️  请在生产环境中修改默认密码！")
}

main()
  .catch((e) => {
    console.error("❌ 初始化失败:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
