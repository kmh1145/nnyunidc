import { NextResponse } from "next/server"

export const runtime = "nodejs"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "未知错误"
}

export async function POST(request: Request) {
  let client: InstanceType<typeof import("pg").Client> | null = null

  try {
    const { host, port, name, user, password } = await request.json()
    const { Client } = await import("pg")
    client = new Client({ host, port: parseInt(port), database: name, user, password, connectionTimeoutMillis: 5000 })
    await client.connect()
    await client.query("SELECT 1")
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: `数据库连接失败: ${getErrorMessage(error)}` }, { status: 400 })
  } finally {
    await client?.end().catch(() => {})
  }
}
