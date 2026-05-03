import { prisma } from "@/lib/db"
import { getServerEngineFromDB } from "./index"
import nodemailer from "nodemailer"

// 服务器开通服务
export class ServerProvisioningService {
  // 处理支付成功后的服务器开通
  static async handlePaymentSuccess(orderId: string): Promise<void> {
    try {
      // 获取订单信息
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      })

      if (!order) {
        console.error("Order not found:", orderId)
        return
      }

      // 遍历订单项，为每个产品创建服务器
      for (const item of order.items) {
        const product = item.product
        const specs = product.specs as any

        // 根据产品配置确定平台
        const platform = this.determinePlatform(specs)
        const engine = await getServerEngineFromDB(platform, prisma)

        // 创建服务器配置
        const config: any = {
          hostname: `vps-${orderId.slice(0, 8)}`,
          os: specs.osOptions?.[0] || "ubuntu-22.04",
          cpu: specs.cpu || 1,
          cpuSockets: specs.cpuSockets || 1,
          memory: specs.memory || 1,
          disk: specs.disk || 20,
          bandwidth: specs.bandwidth || 100,
          pve: specs.pve || {},
        }

        // 创建服务器
        const serverInfo = await engine.createServer(config)

        // 保存服务器信息到数据库
        await prisma.server.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            serverId: serverInfo.serverId,
            hostname: serverInfo.hostname,
            ipAddress: serverInfo.ipAddress,
            platform: platform as any,
            status: "RUNNING",
            config: config as any,
            expiresAt: serverInfo.expiresAt,
          },
        })

        // 发送开通通知邮件
        await this.sendProvisioningEmail(order.user.email, {
          orderId: order.id,
          hostname: serverInfo.hostname,
          ipAddress: serverInfo.ipAddress,
          username: serverInfo.username,
          password: serverInfo.password,
          expiresAt: serverInfo.expiresAt,
        })
      }

      console.log(`Server provisioning completed for order ${orderId}`)
    } catch (error) {
      console.error("Server provisioning error:", error)
      // 可以添加重试逻辑或通知管理员
    }
  }

  // 根据产品配置确定平台
  private static determinePlatform(specs: any): string {
    return specs?.platform || "PVE"
  }

  // 发送开通通知邮件
  private static async sendProvisioningEmail(
    email: string,
    data: {
      orderId: string
      hostname: string
      ipAddress: string
      username: string
      password: string
      expiresAt: Date
    }
  ): Promise<void> {
    try {
      // 从数据库获取 SMTP 配置
      const siteConfig = await (prisma as any).siteConfig.findFirst()
      const smtpHost = siteConfig?.smtpHost || process.env.SMTP_HOST || ""
      const smtpPort = siteConfig?.smtpPort || parseInt(process.env.SMTP_PORT || "0")
      const smtpUser = siteConfig?.smtpUser || process.env.SMTP_USER || ""
      const smtpPass = siteConfig?.smtpPass || process.env.SMTP_PASS || ""
      const smtpFrom = siteConfig?.smtpFrom || process.env.SMTP_FROM || ""
      const smtpSecure = siteConfig?.smtpSecure || false

      if (!smtpHost || !smtpUser) {
        console.warn("SMTP 未配置，跳过发送邮件")
        return
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 587,
        secure: smtpSecure,
        auth: { user: smtpUser, pass: smtpPass },
      })

      await transporter.sendMail({
        from: smtpFrom || smtpUser,
        to: email,
        subject: "服务器开通成功 - 宁宁云IDC",
        html: `
          <h1>服务器开通成功</h1>
          <p>您的服务器已成功开通，以下是详细信息：</p>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>订单号</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${data.orderId}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>主机名</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${data.hostname}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>IP地址</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${data.ipAddress}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>用户名</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${data.username}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>密码</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${data.password}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px;"><strong>到期时间</strong></td>
              <td style="border: 1px solid #ddd; padding: 8px;">${data.expiresAt.toLocaleDateString()}</td>
            </tr>
          </table>
          <p style="margin-top: 20px;">请妥善保管以上信息，如有问题请联系客服。</p>
        `,
      })
    } catch (error) {
      console.error("Send provisioning email error:", error)
    }
  }

  // 管理员手动开通服务器
  static async manualProvision(
    orderId: string,
    platform: string,
    config: any
  ): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true },
      })

      if (!order) {
        throw new Error("Order not found")
      }

      const engine = await getServerEngineFromDB(platform, prisma)
      const serverInfo = await engine.createServer(config)

      await prisma.server.create({
        data: {
          userId: order.userId,
          orderId: order.id,
          serverId: serverInfo.serverId,
          hostname: serverInfo.hostname,
          ipAddress: serverInfo.ipAddress,
          platform: platform as any,
          status: "RUNNING",
          config: config as any,
          expiresAt: serverInfo.expiresAt,
        },
      })

      await this.sendProvisioningEmail(order.user.email, {
        orderId: order.id,
        hostname: serverInfo.hostname,
        ipAddress: serverInfo.ipAddress,
        username: serverInfo.username,
        password: serverInfo.password,
        expiresAt: serverInfo.expiresAt,
      })
    } catch (error) {
      console.error("Manual provision error:", error)
      throw error
    }
  }
}
