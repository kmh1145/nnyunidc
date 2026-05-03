"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = React.useState(false)
  const [success, setSuccess] = React.useState("")
  const [error, setError] = React.useState("")

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setSuccess("")
    setError("")

    const formData = new FormData(event.currentTarget)
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
    }

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "更新失败")
      }

      await update({ name: data.name })
      setSuccess("个人信息已更新")
    } catch (error) {
      setError(error instanceof Error ? error.message : "更新失败，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">个人信息</h1>
        <p className="text-muted-foreground">管理您的账户信息</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>更新您的个人信息</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="space-y-4">
            {success && (
              <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
                {success}
              </div>
            )}
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
                disabled
              />
              <p className="text-xs text-muted-foreground">
                邮箱地址不可修改
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="请输入手机号"
              />
            </div>
          </CardContent>
          <div className="px-6 pb-6">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "保存中..." : "保存修改"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
