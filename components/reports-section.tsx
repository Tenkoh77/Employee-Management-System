"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, FileText, BarChart3, PieChart, TrendingUp } from "lucide-react"

// Mock report data
const reportTemplates = [
  {
    id: 1,
    name: "Employee Performance Report",
    description: "Comprehensive performance analysis with ratings and feedback",
    type: "Performance",
    lastGenerated: "2024-12-15",
    format: "PDF",
  },
  {
    id: 2,
    name: "Leave Usage Summary",
    description: "Leave balances and usage patterns by department",
    type: "Leave",
    lastGenerated: "2024-12-10",
    format: "Excel",
  },
  {
    id: 3,
    name: "Work Hours Analysis",
    description: "Time tracking and productivity metrics",
    type: "Hours",
    lastGenerated: "2024-12-12",
    format: "PDF",
  },
  {
    id: 4,
    name: "Department Overview",
    description: "Employee distribution and departmental statistics",
    type: "Overview",
    lastGenerated: "2024-12-08",
    format: "Excel",
  },
]

// Mock chart data for visualization
const performanceData = [
  { department: "Engineering", avgRating: 4.2, employees: 25 },
  { department: "Marketing", avgRating: 4.0, employees: 15 },
  { department: "HR", avgRating: 4.5, employees: 8 },
  { department: "Finance", avgRating: 4.1, employees: 12 },
  { department: "Operations", avgRating: 3.9, employees: 18 },
]

const leaveData = [
  { type: "Annual Leave", used: 245, total: 400 },
  { type: "Sick Leave", used: 89, total: 150 },
  { type: "Personal Leave", used: 34, total: 80 },
  { type: "Maternity/Paternity", used: 12, total: 30 },
]

const hoursData = [
  { month: "Aug", hours: 1680 },
  { month: "Sep", hours: 1720 },
  { month: "Oct", hours: 1650 },
  { month: "Nov", hours: 1780 },
  { month: "Dec", hours: 1420 },
]

export function ReportsSection() {
  const [selectedReportType, setSelectedReportType] = useState("all")
  const [selectedPeriod, setSelectedPeriod] = useState("current-month")

  const filteredReports = reportTemplates.filter(
    (report) => selectedReportType === "all" || report.type.toLowerCase() === selectedReportType,
  )

  const handleGenerateReport = (reportId: number) => {
    // In a real application, this would trigger report generation
    console.log(`Generating report ${reportId}`)
  }

  const handleDownloadReport = (reportId: number) => {
    // In a real application, this would download the report
    console.log(`Downloading report ${reportId}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">Generate comprehensive reports and view analytics</p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">Current Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="current-quarter">Current Quarter</SelectItem>
              <SelectItem value="last-quarter">Last Quarter</SelectItem>
              <SelectItem value="current-year">Current Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedReportType} onValueChange={setSelectedReportType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Report type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="leave">Leave</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="overview">Overview</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reports Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.1/5</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Utilization</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <p className="text-xs text-muted-foreground">Of allocated leave days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,250</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Department Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Department</CardTitle>
          <CardDescription>Average performance ratings across departments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {performanceData.map((dept) => (
              <div key={dept.department} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-24 text-sm font-medium">{dept.department}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[200px]">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(dept.avgRating / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="font-medium">{dept.avgRating}/5</span>
                  <span className="text-muted-foreground">({dept.employees} employees)</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leave Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Usage Overview</CardTitle>
          <CardDescription>Current leave utilization across different types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leaveData.map((leave) => (
              <div key={leave.type} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-32 text-sm font-medium">{leave.type}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[200px]">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(leave.used / leave.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="font-medium">
                    {leave.used}/{leave.total}
                  </span>
                  <span className="text-muted-foreground">({Math.round((leave.used / leave.total) * 100)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Work Hours Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Work Hours Trend</CardTitle>
          <CardDescription>Monthly work hours over the last 5 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end space-x-4 h-64">
            {hoursData.map((data, index) => (
              <div key={data.month} className="flex flex-col items-center flex-1">
                <div
                  className="bg-blue-600 rounded-t w-full min-w-[40px]"
                  style={{ height: `${(data.hours / 2000) * 200}px` }}
                ></div>
                <div className="mt-2 text-sm font-medium">{data.month}</div>
                <div className="text-xs text-muted-foreground">{data.hours}h</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>Generate and download various reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="border">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <CardDescription className="mt-1">{report.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{report.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleGenerateReport(report.id)}>
                        Generate
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
