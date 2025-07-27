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
import { Plus, Check, X, Clock } from "lucide-react"

// Mock leave data
const mockLeaveRequests = [
  {
    id: 1,
    employeeId: "EMP001",
    employeeName: "Alice Johnson",
    leaveType: "Annual Leave",
    startDate: "2024-12-20",
    endDate: "2024-12-24",
    days: 5,
    reason: "Holiday vacation with family",
    status: "Pending",
    appliedDate: "2024-12-10",
    approvedBy: null,
  },
  {
    id: 2,
    employeeId: "EMP002",
    employeeName: "Bob Smith",
    leaveType: "Sick Leave",
    startDate: "2024-12-18",
    endDate: "2024-12-18",
    days: 1,
    reason: "Medical appointment",
    status: "Approved",
    appliedDate: "2024-12-15",
    approvedBy: "John Doe",
  },
  {
    id: 3,
    employeeId: "EMP003",
    employeeName: "Carol Davis",
    leaveType: "Personal Leave",
    startDate: "2025-01-02",
    endDate: "2025-01-03",
    days: 2,
    reason: "Personal matters",
    status: "Pending",
    appliedDate: "2024-12-12",
    approvedBy: null,
  },
]

const leaveTypes = [
  "Annual Leave",
  "Sick Leave",
  "Personal Leave",
  "Maternity Leave",
  "Paternity Leave",
  "Emergency Leave",
]

// Mock leave balances
const leaveBalances = [
  {
    employeeId: "EMP001",
    employeeName: "Alice Johnson",
    annualLeave: { total: 25, used: 10, remaining: 15 },
    sickLeave: { total: 10, used: 2, remaining: 8 },
  },
  {
    employeeId: "EMP002",
    employeeName: "Bob Smith",
    annualLeave: { total: 25, used: 15, remaining: 10 },
    sickLeave: { total: 10, used: 3, remaining: 7 },
  },
  {
    employeeId: "EMP003",
    employeeName: "Carol Davis",
    annualLeave: { total: 20, used: 5, remaining: 15 },
    sickLeave: { total: 10, used: 1, remaining: 9 },
  },
]

export function LeaveManagement() {
  const [leaveRequests, setLeaveRequests] = useState(mockLeaveRequests)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [newLeaveRequest, setNewLeaveRequest] = useState({
    employeeId: "",
    employeeName: "",
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  })

  const filteredRequests = leaveRequests.filter(
    (request) => selectedStatus === "all" || request.status.toLowerCase() === selectedStatus,
  )

  const handleAddLeaveRequest = () => {
    const startDate = new Date(newLeaveRequest.startDate)
    const endDate = new Date(newLeaveRequest.endDate)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1

    const request = {
      id: leaveRequests.length + 1,
      ...newLeaveRequest,
      days,
      status: "Pending",
      appliedDate: new Date().toISOString().split("T")[0],
      approvedBy: null,
    }

    setLeaveRequests([...leaveRequests, request])
    setNewLeaveRequest({
      employeeId: "",
      employeeName: "",
      leaveType: "",
      startDate: "",
      endDate: "",
      reason: "",
    })
    setIsAddDialogOpen(false)
  }

  const handleApproveLeave = (id: number) => {
    setLeaveRequests(
      leaveRequests.map((request) =>
        request.id === id ? { ...request, status: "Approved", approvedBy: "John Doe" } : request,
      ),
    )
  }

  const handleRejectLeave = (id: number) => {
    setLeaveRequests(
      leaveRequests.map((request) =>
        request.id === id ? { ...request, status: "Rejected", approvedBy: "John Doe" } : request,
      ),
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leave Management</h2>
          <p className="text-muted-foreground">Manage employee leave requests and balances</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Leave Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Submit Leave Request</DialogTitle>
              <DialogDescription>Fill in the details for the leave request</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="employeeId" className="text-right">
                  Employee ID
                </Label>
                <Input
                  id="employeeId"
                  value={newLeaveRequest.employeeId}
                  onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, employeeId: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="employeeName" className="text-right">
                  Employee Name
                </Label>
                <Input
                  id="employeeName"
                  value={newLeaveRequest.employeeName}
                  onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, employeeName: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="leaveType" className="text-right">
                  Leave Type
                </Label>
                <Select
                  value={newLeaveRequest.leaveType}
                  onValueChange={(value) => setNewLeaveRequest({ ...newLeaveRequest, leaveType: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">
                  Start Date
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={newLeaveRequest.startDate}
                  onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, startDate: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="endDate" className="text-right">
                  End Date
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={newLeaveRequest.endDate}
                  onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, endDate: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reason" className="text-right">
                  Reason
                </Label>
                <Textarea
                  id="reason"
                  value={newLeaveRequest.reason}
                  onChange={(e) => setNewLeaveRequest({ ...newLeaveRequest, reason: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddLeaveRequest}>Submit Request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Leave Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Balances</CardTitle>
          <CardDescription>Current leave balances for all employees</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Annual Leave</TableHead>
                <TableHead>Sick Leave</TableHead>
                <TableHead>Total Used</TableHead>
                <TableHead>Total Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveBalances.map((balance) => (
                <TableRow key={balance.employeeId}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{balance.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{balance.employeeId}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>
                        {balance.annualLeave.remaining}/{balance.annualLeave.total} days
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(balance.annualLeave.remaining / balance.annualLeave.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>
                        {balance.sickLeave.remaining}/{balance.sickLeave.total} days
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(balance.sickLeave.remaining / balance.sickLeave.total) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{balance.annualLeave.used + balance.sickLeave.used} days</TableCell>
                  <TableCell>{balance.annualLeave.remaining + balance.sickLeave.remaining} days</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Leave Requests</CardTitle>
              <CardDescription>Manage pending and processed leave requests</CardDescription>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{request.employeeName}</p>
                      <p className="text-sm text-muted-foreground">{request.employeeId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{request.leaveType}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{new Date(request.startDate).toLocaleDateString()}</p>
                      <p className="text-muted-foreground">to {new Date(request.endDate).toLocaleDateString()}</p>
                    </div>
                  </TableCell>
                  <TableCell>{request.days} days</TableCell>
                  <TableCell className="max-w-[200px] truncate">{request.reason}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        request.status === "Approved"
                          ? "default"
                          : request.status === "Rejected"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {request.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(request.appliedDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    {request.status === "Pending" && (
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleApproveLeave(request.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleRejectLeave(request.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {request.status !== "Pending" && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-1" />
                        {request.approvedBy}
                      </div>
                    )}
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
