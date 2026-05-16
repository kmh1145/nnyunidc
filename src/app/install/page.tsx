"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const STEPS = ["数据库设置", "管理员设置", "站点信息", "正在安装", "完成安装"]

export default function InstallPage() {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [progress, setProgress] = React.useState(0)
  const [installLogs, setInstallLogs] = React.useState<string[]>([])
  const [result, setResult] = React.useState<any>(null)

  // 数据库配置
  const [db, setDb] = React.useState({
    host: "localhost",
    port: "5432",
    name: "nnyunidc",
    user: "postgres",
    password: "",
  })

  // 管理员
  const [admin, setAdmin] = React.useState({
    name: "管理员",
    email: "",
    password: "",
    confirmPassword: "",
  })

  // 站点
  const [site, setSite] = React.useState({
    title: "宁宁云IDC",
    url: typeof window !== "undefined" ? window.location.origin : "",
  })

  async function testDbConnection() {
    setLoading(true)
    setError("")
    try {
      const r = await fetch("/api/install/test-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(db),
      })
      if (!r.ok) {
        const d = await r.json()
        setError(d.error || "数据库连接失败")
        return false
      }
      return true
    } catch {
      setError("数据库连接失败")
      return false
    } finally {
      setLoading(false)
    }
  }

  async function handleNext() {
    if (step === 0) {
      // 测试数据库连接
      const ok = await testDbConnection()
      if (!ok) return
    }

    if (step === 1) {
      if (!admin.email || !admin.password) {
        setError("请填写管理员邮箱和密码")
        return
      }
      if (admin.password !== admin.confirmPassword) {
        setError("两次输入的密码不一致")
        return
      }
      if (admin.password.length < 6) {
        setError("密码长度不能少于6位")
        return
      }
    }

    if (step === 2) {
      // 开始安装
      setStep(3)
      await runInstall()
      return
    }

    setError("")
    setStep(step + 1)
  }

  async function runInstall() {
    setProgress(10)
    addLog("正在测试数据库连接...")

    const connStr = `postgresql://${db.user}:${encodeURIComponent(db.password)}@${db.host}:${db.port}/${db.name}`

    // Step 1: Init DB
    addLog("正在创建数据库表结构...")
    setProgress(30)
    try {
      const r1 = await fetch("/api/install/init-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ databaseUrl: connStr }),
      })
      if (!r1.ok) {
        addLog("创建数据表失败")
        return
      }
      addLog("数据表创建成功")
    } catch (e) {
      addLog("创建数据表失败: " + String(e))
      return
    }

    // Step 2: Create admin
    setProgress(50)
    addLog("正在创建管理员账号...")
    try {
      const r2 = await fetch("/api/install/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseUrl: connStr,
          name: admin.name,
          email: admin.email,
          password: admin.password,
          siteTitle: site.title,
          siteUrl: site.url,
        }),
      })
      if (!r2.ok) {
        addLog("创建管理员失败")
        return
      }
      const data = await r2.json()
      setResult(data)
      addLog("管理员账号创建成功")
    } catch (e) {
      addLog("创建管理员失败: " + String(e))
      return
    }

    // Step 3: Write config
    setProgress(80)
    addLog("正在写入配置文件...")
    try {
      const r3 = await fetch("/api/install/write-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          databaseUrl: connStr,
          nextauthSecret: generateSecret(),
          nextauthUrl: site.url,
          appUrl: site.url,
        }),
      })
      if (!r3.ok) {
        addLog("写入配置文件失败")
        return
      }
      addLog("配置文件写入成功")
    } catch (e) {
      addLog("写入配置文件失败: " + String(e))
      return
    }

    setProgress(100)
    addLog("安装完成！")
    setStep(4)
  }

  function addLog(msg: string) {
    setInstallLogs(prev => [...prev, msg])
  }

  function generateSecret() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let s = ""
    for (let i = 0; i < 32; i++) s += chars.charAt(Math.floor(Math.random() * chars.length))
    return s
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">宁宁云IDC 安装向导</h1>
          <p className="text-muted-foreground">感谢选择宁宁云IDC服务器销售系统</p>
        </div>

        {/* Steps indicator */}
        {step < 4 && (
          <div className="flex items-center justify-center mb-8 gap-0">
            {STEPS.slice(0, 3).map((s, i) => (
              <React.Fragment key={i}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm ${i === step ? "bg-primary text-primary-foreground font-bold" : i < step ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${i === step ? 'border-primary-foreground' : i < step ? 'border-green-700' : 'border-gray-400'}">{i < step ? "✓" : i + 1}</span>
                  {s}
                </div>
                {i < 2 && <div className="w-12 h-px bg-gray-300 mx-1" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Step 0: Database */}
        {step === 0 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">🗄️ 数据库设置</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>数据库主机</Label>
                  <Input value={db.host} onChange={e => setDb(d => ({ ...d, host: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>端口</Label>
                  <Input value={db.port} onChange={e => setDb(d => ({ ...d, port: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>数据库名</Label>
                <Input value={db.name} onChange={e => setDb(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>用户名</Label>
                  <Input value={db.user} onChange={e => setDb(d => ({ ...d, user: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>密码</Label>
                  <Input type="password" value={db.password} onChange={e => setDb(d => ({ ...d, password: e.target.value }))} />
                </div>
              </div>
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}
            </div>
          </div>
        )}

        {/* Step 1: Admin */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">👤 管理员设置</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>管理员昵称</Label>
                <Input value={admin.name} onChange={e => setAdmin(a => ({ ...a, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>管理员邮箱 *</Label>
                <Input type="email" value={admin.email} onChange={e => setAdmin(a => ({ ...a, email: e.target.value }))} placeholder="admin@example.com" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>密码 *</Label>
                  <Input type="password" value={admin.password} onChange={e => setAdmin(a => ({ ...a, password: e.target.value }))} placeholder="至少6位" />
                </div>
                <div className="space-y-2">
                  <Label>确认密码 *</Label>
                  <Input type="password" value={admin.confirmPassword} onChange={e => setAdmin(a => ({ ...a, confirmPassword: e.target.value }))} placeholder="再次输入密码" />
                </div>
              </div>
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}
            </div>
          </div>
        )}

        {/* Step 2: Site */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">🌐 站点信息</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>站点标题</Label>
                <Input value={site.title} onChange={e => setSite(s => ({ ...s, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>站点地址</Label>
                <Input value={site.url} onChange={e => setSite(s => ({ ...s, url: e.target.value }))} placeholder="https://your-domain.com" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Installing */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-6">⏳ 正在安装...</h2>
            <div className="space-y-4">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div className="bg-primary h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto bg-gray-50 rounded p-4">
                {installLogs.map((log, i) => (
                  <div key={i} className="text-sm font-mono text-muted-foreground">{log}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">安装完成！</h2>
              <p className="text-muted-foreground mb-6">宁宁云IDC 已成功安装</p>

              <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left space-y-2">
                <h3 className="font-semibold mb-2">登录信息</h3>
                <div className="flex justify-between"><span className="text-muted-foreground">管理后台</span><span className="font-mono">{site.url}/admin/login</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">管理员邮箱</span><span className="font-mono">{admin.email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">管理员密码</span><span className="font-mono">{admin.password}</span></div>
              </div>

              <div className="bg-orange-50 text-orange-700 p-4 rounded-md text-sm mb-6 text-left">
                <strong>⚠️ 安全提示：</strong>
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  <li>请删除 /install 页面文件防止重复安装</li>
                  <li>登录后请立即修改管理员密码</li>
                  <li>在管理后台完善支付设置和邮件配置</li>
                </ul>
              </div>

              <Button size="lg" onClick={() => router.push("/admin/login")}>
                前往管理后台
              </Button>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        {step < 3 && (
          <div className="flex justify-between mt-6">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
              上一步
            </Button>
            <Button onClick={handleNext} disabled={loading}>
              {loading ? "检测中..." : step === 2 ? "开始安装" : "下一步"}
            </Button>
          </div>
        )}

        <div className="text-center text-xs text-muted-foreground mt-8">
          宁宁云IDC · 开源的VPS/服务器自动销售平台
        </div>
      </div>
    </div>
  )
}
