"use client"

import * as React from "react"

const STEPS = ["数据库设置", "管理员设置", "站点信息", "正在安装", "完成安装"]

function Btn({ children, variant = "default", disabled = false, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" }) {
  const base = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-10 px-4 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
  const styles = variant === "outline" ? "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700" : "bg-blue-600 text-white hover:bg-blue-700"
  return <button className={`${base} ${styles} ${className}`} disabled={disabled} {...props}>{children}</button>
}

function Inp({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return <input className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" {...props} />
}

export default function InstallPage() {
  const [mounted, setMounted] = React.useState(false)
  const [step, setStep] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [dbTested, setDbTested] = React.useState(false)
  const [error, setError] = React.useState("")
  const [progress, setProgress] = React.useState(0)
  const [installLogs, setInstallLogs] = React.useState<string[]>([])
  const [result, setResult] = React.useState<any>(null)
  const [siteUrl, setSiteUrl] = React.useState("")

  const [db, setDb] = React.useState({ host: "localhost", port: "5432", name: "nnyunidc", user: "postgres", password: "" })
  const [admin, setAdmin] = React.useState({ name: "管理员", email: "", password: "", confirmPassword: "" })
  const [site, setSite] = React.useState({ title: "宁宁云IDC" })

  React.useEffect(() => {
    setSiteUrl(window.location.origin)
    setMounted(true)
  }, [])

  async function testDbConnection() {
    setTesting(true)
    setError("")
    try {
      const r = await fetch("/api/install/test-db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(db) })
      if (!r.ok) { const d = await r.json(); setError(d.error || "连接失败"); setDbTested(false); alert(d.error || "连接失败"); return }
      setDbTested(true); setError(""); alert("数据库连接成功！")
    } catch { setError("连接失败"); setDbTested(false); alert("连接失败") }
    finally { setTesting(false) }
  }

  async function handleNext() {
    if (step === 0) { if (!dbTested) { alert("请先点击测试连接"); return } setDbTested(false) }
    if (step === 1) {
      if (!admin.email || !admin.password) { setError("请填写邮箱和密码"); return }
      if (admin.password !== admin.confirmPassword) { setError("两次密码不一致"); return }
      if (admin.password.length < 6) { setError("密码至少6位"); return }
    }
    if (step === 2) { setStep(3); await runInstall(); return }
    setError(""); setStep(step + 1)
  }

  async function runInstall() {
    setProgress(10); addLog("正在连接数据库...")
    const connStr = `postgresql://${db.user}:${encodeURIComponent(db.password)}@${db.host}:${db.port}/${db.name}`

    setProgress(30); addLog("正在创建数据表...")
    try {
      const r1 = await fetch("/api/install/init-db", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ databaseUrl: connStr }) })
      if (!r1.ok) { addLog("创建数据表失败"); return }
      addLog("数据表创建成功")
    } catch (e) { addLog("失败: " + String(e)); return }

    setProgress(50); addLog("正在创建管理员...")
    try {
      const r2 = await fetch("/api/install/create-admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ databaseUrl: connStr, name: admin.name, email: admin.email, password: admin.password, siteTitle: site.title, siteUrl }) })
      if (!r2.ok) { addLog("创建管理员失败"); return }
      setResult(await r2.json()); addLog("管理员创建成功")
    } catch (e) { addLog("失败: " + String(e)); return }

    setProgress(80); addLog("正在写入配置...")
    try {
      const secret = Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")
      const r3 = await fetch("/api/install/write-config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ databaseUrl: connStr, nextauthSecret: secret, nextauthUrl: siteUrl, appUrl: siteUrl }) })
      if (!r3.ok) { addLog("写入配置失败"); return }
      addLog("配置写入成功")
    } catch (e) { addLog("失败: " + String(e)); return }

    setProgress(100); addLog("安装完成！"); setStep(4)
  }

  function addLog(msg: string) { setInstallLogs(p => [...p, msg]) }

  if (!mounted) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500">加载中...</p></div>

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">宁宁云IDC 安装向导</h1>
          <p className="text-gray-500">感谢选择宁宁云IDC服务器销售系统</p>
        </div>

        {step < 4 && (
          <div className="flex items-center justify-center mb-8 gap-0">
            {STEPS.slice(0, 3).map((s, i) => {
              const isActive = i === step; const isDone = i < step
              return <React.Fragment key={i}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm ${isActive ? "bg-blue-600 text-white font-bold" : isDone ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${isActive ? "border-white" : isDone ? "border-green-700" : "border-gray-400"}`}>{isDone ? "✓" : i + 1}</span>{s}
                </div>
                {i < 2 && <div className="w-12 h-px bg-gray-300 mx-1" />}
              </React.Fragment>
            })}
          </div>
        )}

        {step === 0 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-6">🗄️ 数据库设置</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1"><label className="text-sm font-medium">数据库主机</label><Inp value={db.host} onChange={e => setDb(d => ({ ...d, host: e.target.value }))} /></div>
                <div className="space-y-1"><label className="text-sm font-medium">端口</label><Inp value={db.port} onChange={e => setDb(d => ({ ...d, port: e.target.value }))} /></div>
              </div>
              <div className="space-y-1"><label className="text-sm font-medium">数据库名</label><Inp value={db.name} onChange={e => setDb(d => ({ ...d, name: e.target.value }))} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1"><label className="text-sm font-medium">用户名</label><Inp value={db.user} onChange={e => setDb(d => ({ ...d, user: e.target.value }))} /></div>
                <div className="space-y-1"><label className="text-sm font-medium">密码</label><Inp type="password" value={db.password} onChange={e => setDb(d => ({ ...d, password: e.target.value }))} /></div>
              </div>
              <div className="flex gap-2 items-center pt-2">
                <Btn variant="outline" onClick={testDbConnection} disabled={testing}>{testing ? "测试中..." : dbTested ? "✓ 重新测试" : "测试连接"}</Btn>
                {dbTested && <span className="text-green-600 text-sm">✓ 连接成功</span>}
              </div>
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-6">👤 管理员设置</h2>
            <div className="space-y-4">
              <div className="space-y-1"><label className="text-sm font-medium">昵称</label><Inp value={admin.name} onChange={e => setAdmin(a => ({ ...a, name: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-sm font-medium">邮箱 *</label><Inp type="email" value={admin.email} onChange={e => setAdmin(a => ({ ...a, email: e.target.value }))} placeholder="admin@example.com" /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1"><label className="text-sm font-medium">密码 *</label><Inp type="password" value={admin.password} onChange={e => setAdmin(a => ({ ...a, password: e.target.value }))} placeholder="至少6位" /></div>
                <div className="space-y-1"><label className="text-sm font-medium">确认密码 *</label><Inp type="password" value={admin.confirmPassword} onChange={e => setAdmin(a => ({ ...a, confirmPassword: e.target.value }))} placeholder="再次输入" /></div>
              </div>
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">{error}</div>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-6">🌐 站点信息</h2>
            <div className="space-y-4">
              <div className="space-y-1"><label className="text-sm font-medium">站点标题</label><Inp value={site.title} onChange={e => setSite(s => ({ ...s, title: e.target.value }))} /></div>
              <div className="space-y-1"><label className="text-sm font-medium">站点地址</label><Inp value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://your-domain.com" /></div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-lg shadow p-8">
            <h2 className="text-xl font-bold mb-6">⏳ 正在安装...</h2>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4"><div className="bg-blue-600 h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            <div className="space-y-1 max-h-64 overflow-y-auto bg-gray-50 rounded p-4">{installLogs.map((log, i) => <div key={i} className="text-sm font-mono text-gray-500">{log}</div>)}</div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-2">安装完成！</h2>
            <p className="text-gray-500 mb-6">宁宁云IDC 已成功安装</p>
            <div className="bg-gray-50 rounded-lg p-6 mb-6 text-left space-y-2">
              <h3 className="font-semibold mb-2">登录信息</h3>
              <div className="flex justify-between"><span className="text-gray-500">管理后台</span><span className="font-mono">{siteUrl}/admin/login</span></div>
              <div className="flex justify-between"><span className="text-gray-500">管理员邮箱</span><span className="font-mono">{admin.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">管理员密码</span><span className="font-mono">{admin.password}</span></div>
            </div>
            <div className="bg-orange-50 text-orange-700 p-4 rounded-md text-sm mb-6 text-left">
              <strong>⚠️ 安全提示：</strong>
              <ul className="list-disc pl-4 mt-2 space-y-1">
                <li>请删除 src/app/install 目录防止重复安装</li>
                <li>登录后请立即修改管理员密码</li>
                <li>在管理后台完善支付设置和邮件配置</li>
              </ul>
            </div>
            <Btn onClick={() => window.location.href = "/admin/login"}>前往管理后台</Btn>
          </div>
        )}

        {step < 3 && (
          <div className="flex justify-between mt-6">
            <Btn variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>上一步</Btn>
            <Btn onClick={handleNext} disabled={loading}>{loading ? "检测中..." : step === 2 ? "开始安装" : "下一步"}</Btn>
          </div>
        )}

        <div className="text-center text-xs text-gray-400 mt-8">宁宁云IDC · 开源的VPS/服务器自动销售平台</div>
      </div>
    </div>
  )
}
