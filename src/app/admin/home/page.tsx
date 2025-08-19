"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Upload, Database, FileSpreadsheet, TrendingUp, Users, Activity } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
interface DashboardStats {
  totalRecords: number
  totalSilos: number
  lastUpload: string | null
  isLoading: boolean
}

export default function AdminDashboard() {
    const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalRecords: 0,
    totalSilos: 0,
    lastUpload: null,
    isLoading: true,
  })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/upload")
        if (response.ok) {
          const data = await response.json()

          const uniqueSilos = new Set(data.data.map((row: any) => row.silo)).size

          setStats({
            totalRecords: data.data.length,
            totalSilos: uniqueSilos,
            lastUpload: data.data.length > 0 ? "Recently" : null,
            isLoading: false,
          })
        } else {
          setStats((prev) => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        setStats((prev) => ({ ...prev, isLoading: false }))
      }
    }

    fetchStats()
    if(localStorage.getItem("admin_authenticated") !== "true") {
      router.push("/admin/login")
    }
  }, [])

  const quickActions = [
    {
      title: "Upload Excel File",
      description: "Import new placement data from Excel files",
      icon: Upload,
      href: "/admin/upload",
      color: "bg-blue-500",
    },
    {
      title: "View Data",
      description: "Browse and filter existing placement records",
      icon: Database,
      href: "/admin/data",
      color: "bg-green-500",
    },
  ]

  const statCards = [
    {
      title: "Total Records",
      value: stats.totalRecords.toLocaleString(),
      icon: FileSpreadsheet,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Active Silos",
      value: stats.totalSilos.toString(),
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20",
    },
    {
      title: "System Status",
      value: "Online",
      icon: Activity,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
    },
  ]

  return (
    
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to the admin panel. Manage your placement data efficiently.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stats.isLoading ? "..." : stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.bgColor}`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Card
                  key={action.title}
                  className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-xl transition-shadow"
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${action.color} text-white`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{action.title}</CardTitle>
                        <CardDescription>{action.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Link href={action.href}>
                      <Button className="w-full">
                        Get Started
                        <TrendingUp className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Current system status and information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Database Status</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">Last Data Upload</span>
              <Badge variant="outline">{stats.lastUpload || "No uploads yet"}</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm font-medium">System Version</span>
              <Badge variant="outline">v1.0.0</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    
  )
}
