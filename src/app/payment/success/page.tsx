"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")

  return (
    <div className="container py-8 px-4 md:px-6">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
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
            </div>
            <CardTitle className="text-2xl">支付成功！</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {orderId && (
              <p className="text-muted-foreground">
                订单号：<span className="font-medium text-foreground">{orderId}</span>
              </p>
            )}
            <p className="text-muted-foreground">
              您的支付已成功完成。服务器将在几分钟内自动开通，请注意查收邮件通知。
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Button asChild>
                <Link href="/orders">查看订单</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/products">继续购物</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
