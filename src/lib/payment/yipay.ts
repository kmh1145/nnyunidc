import crypto from "crypto"
import { PaymentGateway, PaymentOrder, PaymentResult, PaymentCallback } from "./gateway"

// 易支付支持的支付方式
const PAYMENT_TYPES: Record<string, string> = {
  alipay: "支付宝",
  wxpay: "微信支付",
}

export class YiPayGateway implements PaymentGateway {
  name = "yipay"
  private apiUrl: string
  private merchantId: string
  private secretKey: string
  private defaultType: string

  constructor(config?: { apiUrl?: string; merchantId?: string; secretKey?: string; defaultType?: string }) {
    this.apiUrl = config?.apiUrl || process.env.YIPAY_API_URL || ""
    this.merchantId = config?.merchantId || process.env.YIPAY_MERCHANT_ID || ""
    this.secretKey = config?.secretKey || process.env.YIPAY_SECRET_KEY || ""
    this.defaultType = config?.defaultType || "alipay"
  }

  /**
   * 计算 MD5 签名（易支付 V1 协议）
   * 1. 排除 sign, sign_type 和空值参数
   * 2. 按参数名 ASCII 码排序
   * 3. 拼接为 key=value&key=value&...
   * 4. 末尾拼接商户密钥
   * 5. MD5 加密，返回小写结果
   */
  sign(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params)
      .filter(key => key !== "sign" && key !== "sign_type")
      .filter(key => params[key] !== "" && params[key] !== null && params[key] !== undefined)
      .sort()

    const signStr = sortedKeys
      .map(key => `${key}=${params[key]}`)
      .join("&")

    const signSource = signStr + this.secretKey

    return crypto.createHash("md5").update(signSource).digest("hex").toLowerCase()
  }

  /**
   * 通过 API 接口创建支付（/mapi.php）
   * 返回支付链接、二维码等
   */
  async createPayment(
    order: PaymentOrder,
    options?: { type?: string; clientip?: string; device?: "pc" | "mobile" | "auto" }
  ): Promise<PaymentResult> {
    if (!this.apiUrl || !this.merchantId || !this.secretKey) {
      return { success: false, error: "支付网关未配置，请在管理员后台设置" }
    }

    try {
      const params: Record<string, any> = {
        pid: this.merchantId,
        type: options?.type || this.defaultType,
        out_trade_no: order.orderId,
        notify_url: order.callbackUrl,
        return_url: order.returnUrl,
        name: order.description.substring(0, 127),
        money: Number(order.amount).toFixed(2),
        clientip: options?.clientip || this.getDefaultClientIp(),
      }

      // 可选参数
      if (options?.device) {
        params.device = options.device
      }

      // 生成签名
      params.sign = this.sign(params)
      params.sign_type = "MD5"

      // 发送 API 请求
      const response = await fetch(`${this.apiUrl}/mapi.php`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params).toString(),
      })

      const data = await response.json()

      if (data.code === 1) {
        return {
          success: true,
          paymentId: data.trade_no || order.orderId,
          payUrl: data.payurl,
          formData: {
            qrcode: data.qrcode,
            urlscheme: data.urlscheme,
          },
        }
      }

      return {
        success: false,
        error: data.msg || "创建支付失败",
      }
    } catch (error) {
      console.error("YiPay createPayment error:", error)
      return { success: false, error: "创建支付失败，请重试" }
    }
  }

  /**
   * 生成页面跳转支付 URL（/submit.php）
   * 直接拼接 GET 参数，用户浏览器跳转到支付页面
   */
  createRedirectUrl(
    order: PaymentOrder,
    options?: { type?: string; clientip?: string; device?: "pc" | "mobile" | "auto" }
  ): string | null {
    if (!this.apiUrl || !this.merchantId || !this.secretKey) {
      return null
    }

    const params: Record<string, any> = {
      pid: this.merchantId,
      type: options?.type || this.defaultType,
      out_trade_no: order.orderId,
      notify_url: order.callbackUrl,
      return_url: order.returnUrl,
      name: order.description.substring(0, 127),
      money: Number(order.amount).toFixed(2),
      clientip: options?.clientip || this.getDefaultClientIp(),
    }

    if (options?.device) {
      params.device = options.device
    }

    params.sign = this.sign(params)
    params.sign_type = "MD5"

    return `${this.apiUrl}/submit.php?${new URLSearchParams(params).toString()}`
  }

  /**
   * 验证异步回调签名
   * 回调参数中 sign 和 sign_type 不参与签名计算
   */
  async verifyCallback(data: Record<string, any>): Promise<PaymentCallback> {
    const { sign, sign_type, ...params } = data

    const calculatedSign = this.sign(params)

    if (calculatedSign !== sign) {
      return {
        paymentId: data.trade_no || "",
        orderId: data.out_trade_no || "",
        amount: parseFloat(data.money) || 0,
        status: "failed",
        raw: data,
      }
    }

    // 易支付回调成功标志：trade_status = "TRADE_SUCCESS"
    const isSuccess = data.trade_status === "TRADE_SUCCESS"

    return {
      paymentId: data.trade_no || data.out_trade_no,
      orderId: data.out_trade_no,
      amount: parseFloat(data.money) || 0,
      status: isSuccess ? "success" : "pending",
      raw: data,
    }
  }

  /**
   * 查询支付订单状态
   * 使用 /api.php 接口
   */
  async queryPayment(outTradeNo: string): Promise<PaymentCallback> {
    if (!this.apiUrl || !this.merchantId || !this.secretKey) {
      return { paymentId: "", orderId: outTradeNo, amount: 0, status: "failed", raw: {} }
    }

    try {
      const params: Record<string, any> = {
        act: "order",
        pid: this.merchantId,
        key: this.secretKey,
        out_trade_no: outTradeNo,
      }

      const response = await fetch(
        `${this.apiUrl}/api.php?${new URLSearchParams(params).toString()}`
      )
      const data = await response.json()

      if (data.code === 1) {
        const isSuccess = data.status === 1 // 1=已付款
        return {
          paymentId: data.trade_no || outTradeNo,
          orderId: outTradeNo,
          amount: parseFloat(data.money) || 0,
          status: isSuccess ? "success" : "pending",
          raw: data,
        }
      }

      return {
        paymentId: "",
        orderId: outTradeNo,
        amount: 0,
        status: "pending",
        raw: data,
      }
    } catch (error) {
      console.error("YiPay queryPayment error:", error)
      return { paymentId: "", orderId: outTradeNo, amount: 0, status: "failed", raw: {} }
    }
  }

  private getDefaultClientIp(): string {
    return "127.0.0.1"
  }
}

export { PAYMENT_TYPES }
