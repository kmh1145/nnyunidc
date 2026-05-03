"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useCart } from "@/lib/cart-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CheckoutPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { items, total, clearCart } = useCart()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [paymentMethod] = React.useState("yipay")
  const [paymentType, setPaymentType] = React.useState("alipay")

  if (items.length === 0) {
    router.push("/cart")
    return null
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(event.currentTarget)
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      paymentMethod,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: total,
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "订单创建失败")
      }

      const order = await response.json()

      // 创建支付
      const paymentResponse = await fetch("/api/payment/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          paymentMethod,
          paymentType,
        }),
      })

      if (!paymentResponse.ok) {
        const paymentError = await paymentResponse.json()
        throw new Error(paymentError.message || "创建支付失败")
      }

      const paymentData = await paymentResponse.json()

      if (paymentData.payUrl) {
        // 跳转到支付页面
        window.location.href = paymentData.payUrl
      } else {
        clearCart()
        router.push(`/checkout/success?orderId=${order.id}`)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "订单创建失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8">结算</h1>

      <form onSubmit={onSubmit}>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>联系信息</CardTitle>
                <CardDescription>请填写您的联系信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">姓名</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={session?.user?.name || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={session?.user?.email || ""}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">手机号</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="请输入手机号（选填）"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>支付方式</CardTitle>
                <CardDescription>选择您的支付方式</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentType === "alipay"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setPaymentType("alipay")}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="alipay"
                      checked={paymentType === "alipay"}
                      onChange={() => setPaymentType("alipay")}
                      className="h-4 w-4 text-primary"
                    />
                    <div>
                      <div className="font-medium">支付宝</div>
                      <div className="text-sm text-muted-foreground">
                        通过易支付网关使用支付宝付款
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      paymentType === "wxpay"
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setPaymentType("wxpay")}
                  >
                    <input
                      type="radio"
                      name="paymentType"
                      value="wxpay"
                      checked={paymentType === "wxpay"}
                      onChange={() => setPaymentType("wxpay")}
                      className="h-4 w-4 text-primary"
                    />
                    <div>
                      <div className="font-medium">微信支付</div>
                      <div className="text-sm text-muted-foreground">
                        通过易支付网关使用微信支付
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>订单详情</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <div>
                        <div>{item.name}</div>
                        <div className="text-muted-foreground">
                          x{item.quantity}
                        </div>
                      </div>
                      <div className="font-medium">
                        ¥{item.price * item.quantity}
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">商品小计</span>
                      <span>¥{total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">优惠</span>
                      <span className="text-green-600">-¥0</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                      <span>总计</span>
                      <span>¥{total}</span>
                    </div>
                  </div>
                </div>
                <Button type="submit" className="w-full mt-6" size="lg" disabled={isLoading}>
                  {isLoading ? "提交订单中..." : "提交订单"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  )
}
