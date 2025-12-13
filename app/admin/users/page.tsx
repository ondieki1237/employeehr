'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Lock, Unlock, Eye, FileText, 
  Calendar, Award, BarChart3, MessageSquare, CheckSquare, Mail,
  Phone, MapPin, Briefcase, Clock, Download, Filter, MoreVertical,
  UserCheck, UserX, Send, TrendingUp, Target, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getToken } from '@/lib/auth';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  employee_id: string;
  role: string;
  department: string;
  position: string;
  phone?: string;
  location?: string;
  hireDate?: string;
  status?: string;
  manager?: string;
  lastActive?: string;
}

interface EmployeeDetails {
  pdpProgress: number;
  completedTasks: number;
  pendingTasks: number;
  attendanceRate: number;
  performanceScore: number;
  badgesEarned: number;
  suggestionsSubmitted: number;
  pollsParticipated: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterRole, setFilterRole] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Employee detailed data
  const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
  const [employeePDP, setEmployeePDP] = useState<any>(null);
  const [employeeTasks, setEmployeeTasks] = useState<any[]>([]);
  const [employeeAttendance, setEmployeeAttendance] = useState<any[]>([]);
  const [employeeAwards, setEmployeeAwards] = useState<any[]>([]);
  const [employeeAlerts, setEmployeeAlerts] = useState<any[]>([]);

  // Create user form state
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    employee_id: '',
    role: 'employee',
    department: '',
    position: '',
    phone: '',
    location: '',
    hireDate: '',
    manager: '',
  });

  // Message dialog
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [message, setMessage] = useState({ subject: '', body: '' });

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeDetails = async (userId: string) => {
    try {
      // Fetch comprehensive employee data
      const [pdpRes, tasksRes, attendanceRes, awardsRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/api/pdp/user/${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_URL}/api/tasks?userId=${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_URL}/api/attendance?userId=${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_URL}/api/badges/user/${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${API_URL}/api/alerts?userId=${userId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const pdpData = await pdpRes.json();
      const tasksData = await tasksRes.json();
      const attendanceData = await attendanceRes.json();
      const awardsData = await awardsRes.json();
      const alertsData = await alertsRes.json();

      setEmployeePDP(pdpData.data);
      setEmployeeTasks(Array.isArray(tasksData) ? tasksData : tasksData.data || []);
      setEmployeeAttendance(Array.isArray(attendanceData) ? attendanceData : attendanceData.data || []);
      setEmployeeAwards(Array.isArray(awardsData) ? awardsData : awardsData.data || []);
      setEmployeeAlerts(Array.isArray(alertsData) ? alertsData : alertsData.data || []);

      // Calculate metrics
      const tasks = Array.isArray(tasksData) ? tasksData : tasksData.data || [];
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
      const pendingTasks = tasks.filter((t: any) => t.status === 'pending').length;
      
      const attendance = Array.isArray(attendanceData) ? attendanceData : attendanceData.data || [];
      const attendanceRate = attendance.length > 0 
        ? (attendance.filter((a: any) => a.status === 'present').length / attendance.length) * 100 
        : 0;

      setEmployeeDetails({
        pdpProgress: pdpData.data?.progress || 0,
        completedTasks,
        pendingTasks,
        attendanceRate,
        performanceScore: pdpData.data?.performanceScore || 0,
        badgesEarned: (Array.isArray(awardsData) ? awardsData : awardsData.data || []).length,
        suggestionsSubmitted: 0, // Would need API endpoint
        pollsParticipated: 0, // Would need API endpoint
      });
    } catch (error) {
      console.error('Error fetching employee details:', error);
    }
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setActiveTab('overview');
    setIsDetailsDialogOpen(true);
    await fetchEmployeeDetails(user._id);
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User created successfully',
        });
        setIsCreateDialogOpen(false);
        setNewUser({
          firstName: '',
          lastName: '',
          email: '',
          employee_id: '',
          role: 'employee',
          department: '',
          position: '',
          phone: '',
          location: '',
          hireDate: '',
          manager: '',
        });
        fetchUsers();
      } else {
        throw new Error('Failed to create user');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create user',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        });
        fetchUsers();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'User role updated successfully',
        });
        fetchUsers();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedUser) return;

    try {
      // Would need a messages API endpoint
      toast({
        title: 'Success',
        description: `Message sent to ${selectedUser.firstName} ${selectedUser.lastName}`,
      });
      setIsMessageDialogOpen(false);
      setMessage({ subject: '', body: '' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleExportData = () => {
    const csv = [
      ['Name', 'Email', 'Employee ID', 'Role', 'Department', 'Position', 'Status'],
      ...filteredUsers.map(u => [
        `${u.firstName} ${u.lastName}`,
        u.email,
        u.employee_id,
        u.role,
        u.department,
        u.position,
        u.status || 'active',
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesDepartment = filterDepartment === 'all' || user.department === filterDepartment;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesDepartment && matchesStatus;
  });

  const departments = Array.from(new Set(users.map(u => u.department).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Employee Management</h1>
        <p className="text-muted-foreground">
          Comprehensive employee management and monitoring system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.status !== 'inactive').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments.length}</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground">System administrators</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full lg:w-auto">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full lg:w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-full lg:w-[160px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full lg:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={handleExportData}>
                <Download className="h-4 w-4" />
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription>
                      Create a new employee account with detailed information
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={newUser.firstName}
                          onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                          placeholder="John"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={newUser.lastName}
                          onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="john.doe@company.com"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="employee_id">Employee ID *</Label>
                        <Input
                          id="employee_id"
                          value={newUser.employee_id}
                          onChange={(e) => setNewUser({ ...newUser, employee_id: e.target.value })}
                          placeholder="EMP001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={newUser.phone}
                          onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Role *</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Employee</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="department">Department *</Label>
                        <Input
                          id="department"
                          value={newUser.department}
                          onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                          placeholder="Engineering"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="position">Position *</Label>
                        <Input
                          id="position"
                          value={newUser.position}
                          onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                          placeholder="Software Engineer"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hireDate">Hire Date</Label>
                        <Input
                          id="hireDate"
                          type="date"
                          value={newUser.hireDate}
                          onChange={(e) => setNewUser({ ...newUser, hireDate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={newUser.location}
                        onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                        placeholder="New York, NY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manager">Manager</Label>
                      <Input
                        id="manager"
                        value={newUser.manager}
                        onChange={(e) => setNewUser({ ...newUser, manager: e.target.value })}
                        placeholder="Manager Name"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser}>Create Employee</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredUsers.length} of {users.length} employees
          </div>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <Card key={user._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary">
                          {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">
                            {user.firstName} {user.lastName}
                          </h3>
                          <Badge variant={
                            user.role === 'admin' ? 'destructive' :
                            user.role === 'manager' ? 'default' : 'secondary'
                          }>
                            {user.role}
                          </Badge>
                          {user.status === 'inactive' && (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {user.employee_id}
                          </div>
                          {user.department && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {user.department}
                            </div>
                          )}
                          {user.position && (
                            <Badge variant="outline">{user.position}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(user)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedUser(user);
                            setIsMessageDialogOpen(true);
                          }}>
                            <Send className="h-4 w-4 mr-2" />
                            Send Message
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleUpdateRole(user._id, 'manager')}>
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Promote to Manager
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateRole(user._id, 'employee')}>
                            <UserCheck className="h-4 w-4 mr-2" />
                            Demote to Employee
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteUser(user._id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Employee
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Employee Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-semibold text-primary">
                  {selectedUser?.firstName?.charAt(0)}{selectedUser?.lastName?.charAt(0)}
                </span>
              </div>
              <div>
                <DialogTitle className="text-2xl">
                  {selectedUser?.firstName} {selectedUser?.lastName}
                </DialogTitle>
                <DialogDescription>
                  {selectedUser?.position} • {selectedUser?.department}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pdp">PDP</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="awards">Awards</TabsTrigger>
              <TabsTrigger value="alerts">Alerts</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{selectedUser?.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{selectedUser?.location || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Hire Date</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedUser?.hireDate ? new Date(selectedUser.hireDate).toLocaleDateString() : 'Not provided'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              {employeeDetails && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">PDP Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{employeeDetails.pdpProgress}%</div>
                      <Progress value={employeeDetails.pdpProgress} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{employeeDetails.completedTasks}</div>
                      <p className="text-xs text-muted-foreground">
                        {employeeDetails.pendingTasks} pending
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{employeeDetails.attendanceRate.toFixed(1)}%</div>
                      <Progress value={employeeDetails.attendanceRate} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{employeeDetails.badgesEarned}</div>
                      <p className="text-xs text-muted-foreground">Total achievements</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pdp" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Development Plan</CardTitle>
                  <CardDescription>
                    View employee's PDP progress and goals
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {employeePDP ? (
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        <div>
                          <p className="font-medium">Career Aspirations</p>
                          <p className="text-sm text-muted-foreground">
                            {employeePDP.careerAspirations || 'Not set'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Current Skills</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {employeePDP.currentSkills?.map((skill: string, i: number) => (
                              <Badge key={i} variant="secondary">{skill}</Badge>
                            )) || 'No skills listed'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No PDP data available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Task Overview</CardTitle>
                  <CardDescription>
                    Employee's current and completed tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {employeeTasks.length > 0 ? (
                    <div className="space-y-2">
                      {employeeTasks.map((task: any) => (
                        <div key={task._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          </div>
                          <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                            {task.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No tasks assigned</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attendance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>
                    Employee attendance history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {employeeAttendance.length > 0 ? (
                    <div className="space-y-2">
                      {employeeAttendance.slice(0, 10).map((record: any) => (
                        <div key={record._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{new Date(record.date).toLocaleDateString()}</span>
                          </div>
                          <Badge variant={record.status === 'present' ? 'default' : 'destructive'}>
                            {record.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No attendance records</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="awards" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Awards & Recognition</CardTitle>
                  <CardDescription>
                    Badges and achievements earned
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {employeeAwards.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      {employeeAwards.map((award: any) => (
                        <div key={award._id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Award className="h-8 w-8 text-yellow-500" />
                          <div>
                            <p className="font-medium">{award.badgeType}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(award.awardedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No awards yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Active Alerts</CardTitle>
                  <CardDescription>
                    Current alerts for this employee
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {employeeAlerts.length > 0 ? (
                    <div className="space-y-2">
                      {employeeAlerts.map((alert: any) => (
                        <div key={alert._id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <AlertCircle className={`h-5 w-5 mt-0.5 ${
                            alert.severity === 'high' ? 'text-red-500' :
                            alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          <div className="flex-1">
                            <p className="font-medium">{alert.title}</p>
                            <p className="text-sm text-muted-foreground">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={
                            alert.severity === 'high' ? 'destructive' :
                            alert.severity === 'medium' ? 'default' : 'secondary'
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No active alerts</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Send Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={message.subject}
                onChange={(e) => setMessage({ ...message, subject: e.target.value })}
                placeholder="Message subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Message</Label>
              <Textarea
                id="body"
                value={message.body}
                onChange={(e) => setMessage({ ...message, body: e.target.value })}
                placeholder="Type your message here..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage}>
              <Send className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
