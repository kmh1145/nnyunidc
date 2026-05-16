"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const registered = searchParams.get("registered")

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const callbackUrl = searchParams.get("callbackUrl") || "/console/servers"

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("邮箱或密码错误")
        setIsLoading(false)
      } else if (result?.ok) {
        // 登录成功，使用 window.location 进行完整页面跳转
        window.location.href = callbackUrl
      }
    } catch (error) {
      setError("登录失败，请稍后重试")
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">登录</CardTitle>
        <CardDescription className="text-center">
          输入您的账户信息登录
        </CardDescription>
      </CardHeader>
      <form method="post" onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {registered && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
              注册成功！请登录
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="请输入邮箱"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">密码</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                忘记密码？
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="请输入密码"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "登录中..." : "登录"}
          </Button>
          <div className="text-sm text-center text-muted-foreground">
            还没有账户？{" "}
            <Link href="/register" className="text-primary hover:underline">
              立即注册
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
