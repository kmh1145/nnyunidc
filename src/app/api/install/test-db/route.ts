import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { host, port, name, user, password } = await request.json()
    const { Client } = await import("pg")
    const client = new Client({ host, port: parseInt(port), database: name, user, password, connectionTimeoutMillis: 5000 })
    await client.connect()
    await client.query("SELECT 1")
    await client.end()
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: `数据库连接失败: ${error.message}` }, { status: 400 })
  }
}
