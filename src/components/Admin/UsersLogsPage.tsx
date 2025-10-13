import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  LogIn,
  LogOut,
  UserPlus,
  Settings,
  FileText,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Shield
} from 'lucide-react';

// Mock data for user logs
const mockUserLogs = [
  {
    id: 1,
    userId: 'user_001',
    userName: 'Juan Dela Cruz',
    department: 'PGSO',
    action: 'LOGIN',
    description: 'User logged into the system',
    timestamp: '2024-10-08T08:30:00Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome/118.0.0.0',
    status: 'SUCCESS'
  },
  {
    id: 2,
    userId: 'user_002',
    userName: 'Maria Santos',
    department: 'HR',
    action: 'EVENT_CREATE',
    description: 'Created new event: Basic Basketball Coaching',
    timestamp: '2024-10-08T09:15:00Z',
    ipAddress: '192.168.1.101',
    userAgent: 'Firefox/119.0',
    status: 'SUCCESS'
  },
  {
    id: 3,
    userId: 'user_003',
    userName: 'Pedro Garcia',
    department: 'IT',
    action: 'LOGOUT',
    description: 'User logged out of the system',
    timestamp: '2024-10-08T10:45:00Z',
    ipAddress: '192.168.1.102',
    userAgent: 'Safari/17.0',
    status: 'SUCCESS'
  },
  {
    id: 4,
    userId: 'user_001',
    userName: 'Juan Dela Cruz',
    department: 'PGSO',
    action: 'PASSWORD_CHANGE',
    description: 'Changed account password',
    timestamp: '2024-10-08T11:20:00Z',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome/118.0.0.0',
    status: 'SUCCESS'
  },
  {
    id: 5,
    userId: 'user_004',
    userName: 'Ana Rodriguez',
    department: 'Finance',
    action: 'LOGIN_FAILED',
    description: 'Failed login attempt - incorrect password',
    timestamp: '2024-10-08T12:10:00Z',
    ipAddress: '192.168.1.103',
    userAgent: 'Chrome/118.0.0.0',
    status: 'FAILED'
  },
  {
    id: 6,
    userId: 'user_002',
    userName: 'Maria Santos',
    department: 'HR',
    action: 'PROFILE_UPDATE',
    description: 'Updated profile information',
    timestamp: '2024-10-08T13:30:00Z',
    ipAddress: '192.168.1.101',
    userAgent: 'Firefox/119.0',
    status: 'SUCCESS'
  },
  {
    id: 7,
    userId: 'user_005',
    userName: 'Carlos Mendoza',
    department: 'Legal',
    action: 'FILE_DOWNLOAD',
    description: 'Downloaded event attachment: event-report.pdf',
    timestamp: '2024-10-08T14:15:00Z',
    ipAddress: '192.168.1.104',
    userAgent: 'Edge/118.0.0.0',
    status: 'SUCCESS'
  },
  {
    id: 8,
    userId: 'user_003',
    userName: 'Pedro Garcia',
    department: 'IT',
    action: 'SYSTEM_ACCESS',
    description: 'Accessed admin dashboard',
    timestamp: '2024-10-08T15:00:00Z',
    ipAddress: '192.168.1.102',
    userAgent: 'Safari/17.0',
    status: 'SUCCESS'
  }
];

const UsersLogsPage: React.FC = () => {
  const [logs, setLogs] = useState(mockUserLogs);
  const [filteredLogs, setFilteredLogs] = useState(mockUserLogs);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Filter logs based on search and filters
  useEffect(() => {
    let filtered = logs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(log => log.department === departmentFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, actionFilter, statusFilter, departmentFilter]);

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return <LogIn className="w-4 h-4" />;
      case 'LOGOUT':
        return <LogOut className="w-4 h-4" />;
      case 'LOGIN_FAILED':
        return <XCircle className="w-4 h-4" />;
      case 'EVENT_CREATE':
        return <Calendar className="w-4 h-4" />;
      case 'PASSWORD_CHANGE':
        return <Shield className="w-4 h-4" />;
      case 'PROFILE_UPDATE':
        return <User className="w-4 h-4" />;
      case 'FILE_DOWNLOAD':
        return <Download className="w-4 h-4" />;
      case 'SYSTEM_ACCESS':
        return <Settings className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  // Get action badge variant
  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'default';
      case 'LOGOUT':
        return 'secondary';
      case 'LOGIN_FAILED':
        return 'destructive';
      case 'EVENT_CREATE':
        return 'default';
      case 'PASSWORD_CHANGE':
        return 'outline';
      case 'PROFILE_UPDATE':
        return 'secondary';
      case 'FILE_DOWNLOAD':
        return 'outline';
      case 'SYSTEM_ACCESS':
        return 'default';
      default:
        return 'secondary';
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'WARNING':
        return (
          <Badge variant="outline" className="text-yellow-700 border-yellow-200 bg-yellow-50">
            <AlertCircle className="w-3 h-3 mr-1" />
            Warning
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  // Format action name for display
  const formatActionName = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get unique departments
  const departments = [...new Set(logs.map(log => log.department))];

  // Get unique actions
  const actions = [...new Set(logs.map(log => log.action))];

  // Stats data
  const stats = {
    totalLogs: logs.length,
    successfulActions: logs.filter(log => log.status === 'SUCCESS').length,
    failedActions: logs.filter(log => log.status === 'FAILED').length,
    uniqueUsers: new Set(logs.map(log => log.userId)).size
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users Logs</h1>
            <p className="text-gray-600 mt-1">Monitor and track all user activities in the system</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Successful Actions</p>
                <p className="text-2xl font-bold text-green-600">{stats.successfulActions}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed Actions</p>
                <p className="text-2xl font-bold text-red-600">{stats.failedActions}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-blue-600">{stats.uniqueUsers}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users, actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Action Filter */}
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actions.map(action => (
                    <SelectItem key={action} value={action}>
                      {formatActionName(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="SUCCESS">Success</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="WARNING">Warning</SelectItem>
                </SelectContent>
              </Select>

              {/* Department Filter */}
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setActionFilter('all');
                  setStatusFilter('all');
                  setDepartmentFilter('all');
                }}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Logs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Activity Logs
              </div>
              <Badge variant="secondary">
                {filteredLogs.length} of {logs.length} logs
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{log.userName}</p>
                            <p className="text-xs text-gray-500">{log.userId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionBadgeVariant(log.action)} className="gap-1">
                          {getActionIcon(log.action)}
                          {formatActionName(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-900 max-w-xs truncate" title={log.description}>
                          {log.description}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.department}</Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(log.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="w-3 h-3" />
                          {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-600 font-mono">{log.ipAddress}</p>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default UsersLogsPage;
