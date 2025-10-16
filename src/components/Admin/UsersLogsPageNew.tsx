import React, { useEffect } from 'react';
import { useUserLogsStore } from '@/stores/userLogsStore';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  LogIn,
  FileText,
  RefreshCw,
  X,
  Loader2,
  MapPin,
  Building2
} from 'lucide-react';

const UsersLogsPage: React.FC = () => {
  const {
    loginLogs,
    eventLogs,
    loginLogsLoading,
    eventLogsLoading,
    searchQuery,
    actionFilter,
    departmentFilter,
    dateFilter,
    fetchLoginLogs,
    fetchEventLogs,
    setSearchQuery,
    setActionFilter,
    setDepartmentFilter,
    setDateFilter,
    clearFilters,
    getFilteredLogs,
    getStats
  } = useUserLogsStore();

  // Fetch logs on mount
  useEffect(() => {
    fetchLoginLogs();
    fetchEventLogs();
  }, [fetchLoginLogs, fetchEventLogs]);

  const filteredLogs = getFilteredLogs();
  const stats = getStats();
  const loading = loginLogsLoading || eventLogsLoading;

  // Get unique departments
  const departments = Array.from(new Set([
    ...loginLogs.map(log => log.department),
    ...eventLogs.map(log => log.requestorDepartment)
  ])).sort();

  const hasActiveFilters = searchQuery || actionFilter !== 'all' || departmentFilter !== 'all' || dateFilter !== 'all';

  // Refresh all logs
  const handleRefresh = () => {
    fetchLoginLogs(true);
    fetchEventLogs(true);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Users Activity Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">Monitor user logins and submitted events</p>
          </div>
          <Button onClick={handleRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm">
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

          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Logins</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalLogins}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <LogIn className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Submitted Events</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalEvents}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unique Users</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.uniqueUsers}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Filters</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search users, events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="event">Submitted Event</SelectItem>
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

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-base font-medium">Activity Logs</CardTitle>
              </div>
              <Badge variant="secondary">
                {filteredLogs.length} logs
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Showing user logins and submitted events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-gray-600">Loading logs...</p>
                </div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No logs found</h3>
                <p className="text-gray-600">Try adjusting your search criteria or filters.</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>User / Event</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Date & Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log, index) => {
                      const isLoginLog = 'username' in log;
                      
                      return (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell>
                            {isLoginLog ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                                <LogIn className="w-3 h-3" />
                                Login
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200 gap-1">
                                <Calendar className="w-3 h-3" />
                                Event
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {isLoginLog ? log.username : log.requestor}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {isLoginLog ? log.email : log.eventTitle}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <Building2 className="w-3 h-3" />
                              {isLoginLog ? log.department : log.requestorDepartment}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isLoginLog ? (
                              <p className="text-sm text-gray-600">User logged in</p>
                            ) : (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <MapPin className="w-3 h-3" />
                                {log.location}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Clock className="w-3 h-3" />
                              {format(new Date(isLoginLog ? log.loginTime : log.submittedAt), 'MMM dd, yyyy HH:mm')}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UsersLogsPage;
