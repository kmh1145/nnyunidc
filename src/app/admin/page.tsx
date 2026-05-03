import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminDashboardPage() {
  // 示例统计数据
  const stats = [
    {
      title: "总用户数",
      value: "1,234",
      change: "+12%",
      changeType: "positive",
    },
    {
      title: "总订单数",
      value: "567",
      change: "+8%",
      changeType: "positive",
    },
    {
      title: "活跃服务器",
      value: "890",
      change: "+15%",
      changeType: "positive",
    },
    {
      title: "本月收入",
      value: "¥45,678",
      change: "+20%",
      changeType: "positive",
    },
  ]

  const recentOrders = [
    { id: "ORD-001", user: "张三", amount: "¥99", status: "已完成" },
    { id: "ORD-002", user: "李四", amount: "¥199", status: "处理中" },
    { id: "ORD-003", user: "王五", amount: "¥399", status: "已支付" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-muted-foreground">系统概览</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.changeType === "positive" ? "text-green-600" : "text-red-600"
              }`}>
                {stat.change} 较上月
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近订单</CardTitle>
            <CardDescription>最新的订单记录</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{order.id}</div>
                    <div className="text-sm text-muted-foreground">{order.user}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{order.amount}</div>
                    <div className="text-sm text-muted-foreground">{order.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>服务器状态</CardTitle>
            <CardDescription>服务器运行状态概览</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>运行中</span>
                </div>
                <span className="font-medium">890</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                  <span>已停止</span>
                </div>
                <span className="font-medium">45</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                  <span>异常</span>
                </div>
                <span className="font-medium">12</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
