import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import crypto from "crypto"
import nodemailer from "nodemailer"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { message: "请输入邮箱" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      // 为了安全，即使用户不存在也返回成功
      return NextResponse.json(
        { message: "如果该邮箱已注册，我们将发送重置链接" },
        { status: 200 }
      )
    }

    // 生成重置令牌
    const resetToken = crypto.randomBytes(32).toString("hex")
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1小时后过期

    // 保存令牌到数据库（这里简化处理，实际应该有专门的表）
    await prisma.user.update({
      where: { id: user.id },
      data: {
        // 注意：这里需要在User模型中添加resetToken和resetTokenExpiry字段
        // 为了简化，我们暂时跳过数据库存储
      }
    })

    // 发送邮件
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`

    // 配置邮件发送器（需要配置SMTP）
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.example.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    })

    // 发送邮件
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@nnyunidc.com",
      to: email,
      subject: "重置密码 - 宁宁云IDC",
      html: `
        <h1>重置密码</h1>
        <p>您好，${user.name || "用户"}</p>
        <p>您请求了密码重置。请点击以下链接重置密码：</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>此链接将在1小时后失效。</p>
        <p>如果您没有请求重置密码，请忽略此邮件。</p>
      `,
    })

    return NextResponse.json(
      { message: "如果该邮箱已注册，我们将发送重置链接" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { message: "发送失败，请稍后重试" },
      { status: 500 }
    )
  }
}
