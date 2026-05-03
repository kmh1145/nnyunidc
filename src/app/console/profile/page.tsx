"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const [loading, setLoading] = React.useState(false)
  const [passwordLoading, setPasswordLoading] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [passwordMessage, setPasswordMessage] = React.useState("")

  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    phone: "",
  })

  const [passwordData, setPasswordData] = React.useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  React.useEffect(() => {
    if (session?.user) {
      setFormData({
        name: session.user.name || "",
        email: session.user.email || "",
        phone: (session.user as any).phone || "",
      })
    }
  }, [session])

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setMessage("个人信息更新成功")
        await update()
      } else {
        setMessage("更新失败，请重试")
      }
    } catch (error) {
      setMessage("更新失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMessage("")

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage("两次输入的密码不一致")
      setPasswordLoading(false)
      return
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage("密码长度不能少于6位")
      setPasswordLoading(false)
      return
    }

    try {
      const res = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      if (res.ok) {
        setPasswordMessage("密码修改成功")
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        const data = await res.json()
        setPasswordMessage(data.error || "修改失败")
      }
    } catch (error) {
      setPasswordMessage("修改失败，请重试")
    } finally {
      setPasswordLoading(false)
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
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">昵称</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入昵称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="请输入邮箱"
                  disabled
                />
                <p className="text-xs text-muted-foreground">邮箱不可修改</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="请输入手机号"
              />
            </div>
            {message && (
              <div className={`text-sm p-3 rounded-md ${message.includes("成功") ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
                {message}
              </div>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : "保存修改"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>修改密码</CardTitle>
          <CardDescription>更改您的登录密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">当前密码</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="请输入当前密码"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="newPassword">新密码</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="请输入新密码"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">确认新密码</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="请再次输入新密码"
                  required
                />
              </div>
            </div>
            {passwordMessage && (
              <div className={`text-sm p-3 rounded-md ${passwordMessage.includes("成功") ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}`}>
                {passwordMessage}
              </div>
            )}
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "修改中..." : "修改密码"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
