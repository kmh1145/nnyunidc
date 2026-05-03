"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PaymentFailPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <CardTitle className="text-2xl">支付失败</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {orderId && (
              <p className="text-muted-foreground">
                订单号：<span className="font-medium text-foreground">{orderId}</span>
              </p>
            )}
            <p className="text-muted-foreground">
              支付过程中出现问题，请稍后重试或选择其他支付方式。
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Button asChild>
                <Link href={`/orders`}>查看订单</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/products">返回购物</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
