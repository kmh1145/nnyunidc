import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ProductCardProps {
  id: number
  name: string
  slug: string
  price: number
  originalPrice?: number
  period: string
  description: string
  features: string[]
  stock: number
  popular?: boolean
}

export function ProductCard({
  name,
  slug,
  price,
  originalPrice,
  period,
  description,
  features,
  stock,
  popular,
}: ProductCardProps) {
  return (
    <Card className="relative">
      {popular && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
          最受欢迎
        </div>
      )}
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <span className="text-3xl font-bold">¥{price}</span>
          <span className="text-muted-foreground">{period}</span>
          {originalPrice && (
            <span className="ml-2 text-sm text-muted-foreground line-through">
              ¥{originalPrice}
            </span>
          )}
        </div>
        <ul className="space-y-2 mb-4">
          {features.map((feature) => (
            <li key={feature} className="flex items-center text-sm">
              <svg
                className="mr-2 h-4 w-4 text-primary shrink-0"
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
        <div className="text-sm text-muted-foreground mb-4">
          库存: {stock} 台
        </div>
        <Button className="w-full" asChild>
          <Link href={`/products/${slug}`}>
            查看详情
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
