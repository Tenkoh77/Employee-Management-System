"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Plus, Star, Clock, Target } from "lucide-react"

// Mock performance data
const mockPerformanceReviews = [
  {
    id: 1,
    employeeId: "EMP001",
    employeeName: "Alice Johnson",
    reviewPeriod: "Q4 2024",
    rating: 4.5,
    goals: "Complete React migration project",
    achievements: "Successfully led team migration, improved performance by 30%",
    feedback: "Excellent technical leadership and communication skills",
    reviewDate: "2024-12-15",
    reviewedBy: "John Doe",
  },
  {
    id: 2,
    employeeId: "EMP002",
    employeeName: "Bob Smith",
    reviewPeriod: "Q4 2024",
    rating: 4.0,
    goals: "Increase marketing campaign ROI",
    achievements: "Achieved 25% increase in campaign performance",
    feedback: "Strong analytical skills, good team collaboration",
    reviewDate: "2024-12-10",
    reviewedBy: "Jane Smith",
  },
]

// Mock work logs
const mockWorkLogs = [
  {
    id: 1,
    employeeId: "EMP001",
    employeeName: "Alice Johnson",
    date: "2024-12-16",
    hoursWorked: 8,
    project: "React Migration",
    taskDescription: "Implemented new component architecture",
    status: "Completed",
  },
  {
    id: 2,
    employeeId: "EMP001",
    employeeName: "Alice Johnson",
    date: "2024-12-15",
    hoursWorked: 7.5,
    project: "React Migration",
    taskDescription: "Code review and testing",
    status: "Completed",
  },
  {
    id: 3,
    employeeId: "EMP002",
    employeeName: "Bob Smith",
    date: "2024-12-16",
    hoursWorked: 8,
    project: "Marketing Campaign",
    taskDescription: "Campaign performance analysis",
    status: "In Progress",
  },
]

const projects = ["React Migration", "Marketing Campaign", "HR System", "Finance Dashboard", "Mobile App"]

export function PerformanceTracking() {
  const [performanceReviews, setPerformanceReviews] = useState(mockPerformanceReviews)
  const [workLogs, setWorkLogs] = useState(mockWorkLogs)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [isWorkLogDialogOpen, setIsWorkLogDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState("all")

  const [newReview, setNewReview] = useState({
    employeeId: "",
    employeeName: "",
    reviewPeriod: "",
    rating: 0,
    goals: "",
    achievements: "",
    feedback: "",
  })

  const [newWorkLog, setNewWorkLog] = useState({
    employeeId: "",
    employeeName: "",
    date: "",
    hoursWorked: 0,
    project: "",
    taskDescription: "",
  })

  const filteredWorkLogs = workLogs.filter((log) => selectedEmployee === "all" || log.employeeId === selectedEmployee)

  const handleAddReview = () => {
    const review = {
      id: performanceReviews.length + 1,
      ...newReview,
      reviewDate: new Date().toISOString().split("T")[0],
      reviewedBy: "John Doe",
    }
    setPerformanceReviews([...performanceReviews, review])
    setNewReview({
      employeeId: "",
      employeeName: "",
      reviewPeriod: "",
      rating: 0,
      goals: "",
      achievements: "",
      feedback: "",
    })
    setIsReviewDialogOpen(false)
  }

  const handleAddWorkLog = () => {
    const workLog = {
      id: workLogs.length + 1,
      ...newWorkLog,
      status: "Completed",
    }
    setWorkLogs([...workLogs, workLog])
    setNewWorkLog({
      employeeId: "",
      employeeName: "",
      date: "",
      hoursWorked: 0,
      project: "",
      taskDescription: "",
    })
    setIsWorkLogDialogOpen(false)
  }

  // Calculate performance metrics
  const avgRating = performanceReviews.reduce((sum, review) => sum + review.rating, 0) / performanceReviews.length
  const totalHours = workLogs.reduce((sum, log) => sum + log.hoursWorked, 0)
  const avgHoursPerDay = totalHours / workLogs.length

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Tracking</h2>
          <p className="text-muted-foreground">Monitor employee performance, reviews, and work logs</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isWorkLogDialogOpen} onOpenChange={setIsWorkLogDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Clock className="h-4 w-4 mr-2" />
                Log Work Hours
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Log Work Hours</DialogTitle>
                <DialogDescription>Record daily work hours and tasks</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="employeeId" className="text-right">
                    Employee ID
                  </Label>
                  <Input
                    id="employeeId"
                    value={newWorkLog.employeeId}
                    onChange={(e) => setNewWorkLog({ ...newWorkLog, employeeId: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="employeeName" className="text-right">
                    Employee Name
                  </Label>
                  <Input
                    id="employeeName"
                    value={newWorkLog.employeeName}
                    onChange={(e) => setNewWorkLog({ ...newWorkLog, employeeName: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={newWorkLog.date}
                    onChange={(e) => setNewWorkLog({ ...newWorkLog, date: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="hoursWorked" className="text-right">
                    Hours Worked
                  </Label>
                  <Input
                    id="hoursWorked"
                    type="number"
                    step="0.5"
                    value={newWorkLog.hoursWorked}
                    onChange={(e) => setNewWorkLog({ ...newWorkLog, hoursWorked: Number.parseFloat(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="project" className="text-right">
                    Project
                  </Label>
                  <Select
                    value={newWorkLog.project}
                    onValueChange={(value) => setNewWorkLog({ ...newWorkLog, project: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project} value={project}>
                          {project}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="taskDescription" className="text-right">
                    Task Description
                  </Label>
                  <Textarea
                    id="taskDescription"
                    value={newWorkLog.taskDescription}
                    onChange={(e) => setNewWorkLog({ ...newWorkLog, taskDescription: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddWorkLog}>Log Hours</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Performance Review
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Performance Review</DialogTitle>
                <DialogDescription>Create a new performance review for an employee</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="employeeId" className="text-right">
                    Employee ID
                  </Label>
                  <Input
                    id="employeeId"
                    value={newReview.employeeId}
                    onChange={(e) => setNewReview({ ...newReview, employeeId: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="employeeName" className="text-right">
                    Employee Name
                  </Label>
                  <Input
                    id="employeeName"
                    value={newReview.employeeName}
                    onChange={(e) => setNewReview({ ...newReview, employeeName: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reviewPeriod" className="text-right">
                    Review Period
                  </Label>
                  <Input
                    id="reviewPeriod"
                    placeholder="e.g., Q4 2024"
                    value={newReview.reviewPeriod}
                    onChange={(e) => setNewReview({ ...newReview, reviewPeriod: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="rating" className="text-right">
                    Rating (1-5)
                  </Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    step="0.1"
                    value={newReview.rating}
                    onChange={(e) => setNewReview({ ...newReview, rating: Number.parseFloat(e.target.value) })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="goals" className="text-right">
                    Goals
                  </Label>
                  <Textarea
                    id="goals"
                    value={newReview.goals}
                    onChange={(e) => setNewReview({ ...newReview, goals: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="achievements" className="text-right">
                    Achievements
                  </Label>
                  <Textarea
                    id="achievements"
                    value={newReview.achievements}
                    onChange={(e) => setNewReview({ ...newReview, achievements: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="feedback" className="text-right">
                    Feedback
                  </Label>
                  <Textarea
                    id="feedback"
                    value={newReview.feedback}
                    onChange={(e) => setNewReview({ ...newReview, feedback: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddReview}>Add Review</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating.toFixed(1)}/5</div>
            <Progress value={(avgRating / 5) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Logged</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours}</div>
            <p className="text-xs text-muted-foreground">Avg {avgHoursPerDay.toFixed(1)} hours/day</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">Across all teams</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Reviews */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Reviews</CardTitle>
          <CardDescription>Employee performance evaluations and feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Goals</TableHead>
                <TableHead>Achievements</TableHead>
                <TableHead>Review Date</TableHead>
                <TableHead>Reviewed By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceReviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{review.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{review.employeeId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{review.reviewPeriod}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="font-medium">{review.rating}/5</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{review.goals}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{review.achievements}</TableCell>
                  <TableCell>{new Date(review.reviewDate).toLocaleDateString()}</TableCell>
                  <TableCell>{review.reviewedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Work Logs */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Work Logs</CardTitle>
              <CardDescription>Daily work hours and task tracking</CardDescription>
            </div>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                <SelectItem value="EMP001">Alice Johnson</SelectItem>
                <SelectItem value="EMP002">Bob Smith</SelectItem>
                <SelectItem value="EMP003">Carol Davis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Task Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{log.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{log.employeeId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                  <TableCell>{log.hoursWorked}h</TableCell>
                  <TableCell>{log.project}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{log.taskDescription}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "Completed" ? "default" : "secondary"}>{log.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
