import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    title: "高性能服务器",
    description: "采用最新硬件，提供卓越的计算性能和网络速度",
    icon: "⚡",
  },
  {
    title: "全球数据中心",
    description: "覆盖全球多个数据中心，为您的业务提供低延迟服务",
    icon: "🌍",
  },
  {
    title: "99.9% 正常运行",
    description: "企业级SLA保障，确保您的业务稳定运行",
    icon: "🛡️",
  },
  {
    title: "24/7 技术支持",
    description: "专业技术团队全天候在线，随时为您解决问题",
    icon: "💬",
  },
]

const products = [
  {
    name: "入门型 VPS",
    price: "¥49",
    period: "/月",
    description: "适合个人项目和小型网站",
    features: ["1 核 CPU", "1GB 内存", "20GB SSD", "1TB 流量"],
  },
  {
    name: "标准型 VPS",
    price: "¥99",
    period: "/月",
    description: "适合中小型企业和应用",
    features: ["2 核 CPU", "4GB 内存", "50GB SSD", "2TB 流量"],
    popular: true,
  },
  {
    name: "高性能 VPS",
    price: "¥199",
    period: "/月",
    description: "适合大型应用和高流量网站",
    features: ["4 核 CPU", "8GB 内存", "100GB SSD", "4TB 流量"],
  },
]

export default function Home() {
  return (
    <div className="flex flex-col gap-16 py-8 md:py-16 px-4 md:px-6">
      {/* Hero Section */}
      <section className="container flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
          高性能服务器
          <br />
          <span className="text-primary">为您的业务赋能</span>
        </h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl">
          提供VPS、独立服务器和云服务器，支持PVE、阿里云、腾讯云等多种平台，
          一键部署，自动开通，让您的业务快速上线。
        </p>
        <div className="flex gap-4">
          <Button size="lg" asChild>
            <Link href="/products">查看产品</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/contact">联系我们</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
            为什么选择我们
          </h2>
          <p className="mt-2 text-muted-foreground">
            我们提供最优质的服务器服务，满足您的各种需求
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 justify-items-center">
          {features.map((feature) => (
            <Card key={feature.title} className="text-center w-full max-w-xs">
              <CardHeader className="items-center">
                <div className="text-4xl mb-2">{feature.icon}</div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Products Section */}
      <section className="container">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl">
            热门产品
          </h2>
          <p className="mt-2 text-muted-foreground">
            选择适合您需求的服务器方案
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <Card
              key={product.name}
              className={product.popular ? "border-primary shadow-lg w-full" : "w-full"}
            >
              <CardHeader>
                {product.popular && (
                  <div className="text-xs font-medium text-primary mb-2">
                    最受欢迎
                  </div>
                )}
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{product.price}</span>
                  <span className="text-muted-foreground">{product.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {product.features.map((feature) => (
                    <li key={feature} className="flex items-center text-sm">
                      <svg
                        className="mr-2 h-4 w-4 text-primary"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={product.popular ? "default" : "outline"}
                >
                  立即购买
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">
              准备好开始了吗？
            </h2>
            <p className="mb-6 opacity-90">
              立即注册，享受首月8折优惠
            </p>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/register">免费注册</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
