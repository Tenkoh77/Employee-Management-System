"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, TrendingUp, FileText } from "lucide-react"
import { EmployeeManagement } from "@/components/employee-management"
import { LeaveManagement } from "@/components/leave-management"
import { PerformanceTracking } from "@/components/performance-tracking"
import { ReportsSection } from "@/components/reports-section"
import { NotificationsPanel } from "@/components/notifications-panel"

// Mock data for dashboard
const dashboardStats = {
  totalEmployees: 156,
  activeEmployees: 142,
  pendingLeaveRequests: 8,
  avgPerformanceRating: 4.2,
  totalHoursThisMonth: 5420,
  upcomingLeaves: 12,
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Employee Management System</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationsPanel />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">IM</span>
                </div>
                <span className="text-sm font-medium text-gray-700">Isheanesu Manyengavana (Manager)</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Employees</span>
            </TabsTrigger>
            <TabsTrigger value="leave" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Leave Management</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Dashboard Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.totalEmployees}</div>
                  <p className="text-xs text-muted-foreground">{dashboardStats.activeEmployees} active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Leave Requests</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.pendingLeaveRequests}</div>
                  <p className="text-xs text-muted-foreground">Requires approval</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.avgPerformanceRating}/5</div>
                  <p className="text-xs text-muted-foreground">This quarter</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Hours This Month</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.totalHoursThisMonth.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Across all projects</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Leave Requests</CardTitle>
                  <CardDescription>Latest leave applications requiring attention</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "Alice Johnson", type: "Annual Leave", dates: "Dec 20-24, 2024", status: "pending" },
                    { name: "Bob Smith", type: "Sick Leave", dates: "Dec 18, 2024", status: "approved" },
                    { name: "Carol Davis", type: "Personal Leave", dates: "Jan 2-3, 2025", status: "pending" },
                  ].map((request, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{request.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.type} • {request.dates}
                        </p>
                      </div>
                      <Badge variant={request.status === "approved" ? "default" : "secondary"}>{request.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Leaves</CardTitle>
                  <CardDescription>Employees on leave in the next 7 days</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "David Wilson", dates: "Dec 19-20, 2024", type: "Annual Leave" },
                    { name: "Emma Brown", dates: "Dec 23-27, 2024", type: "Holiday Leave" },
                    { name: "Frank Miller", dates: "Dec 26, 2024", type: "Personal Leave" },
                  ].map((leave, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{leave.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {leave.type} • {leave.dates}
                        </p>
                      </div>
                      <Badge variant="outline">Approved</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <EmployeeManagement />
          </TabsContent>

          <TabsContent value="leave">
            <LeaveManagement />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceTracking />
          </TabsContent>

          <TabsContent value="reports">
            <ReportsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
