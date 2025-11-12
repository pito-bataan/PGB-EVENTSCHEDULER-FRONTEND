import React, { useEffect, useState } from 'react';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
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
  Building2,
  ChevronLeft,
  ChevronRight
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
    getStats,
    initializeSocketListeners
  } = useUserLogsStore();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  
  // Toggle row expansion
  const toggleRowExpansion = (index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Fetch logs and initialize Socket.IO on mount
  useEffect(() => {
    fetchLoginLogs(); // This now fetches activity logs (login, reschedule, etc.)
    fetchEventLogs();
    initializeSocketListeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = getFilteredLogs();
  const stats = getStats();
  const loading = loginLogsLoading || eventLogsLoading;
  
  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, actionFilter, departmentFilter, dateFilter]);

  // Get unique departments
  const departments = Array.from(new Set([
    ...loginLogs.map(log => log.department),
    ...eventLogs.map(log => log.requestorDepartment)
  ])).sort();

  const hasActiveFilters = searchQuery || actionFilter !== 'all' || departmentFilter !== 'all' || dateFilter !== 'all';

  // Truncate event title in description
  const truncateEventTitle = (description: string, maxLength: number = 50) => {
    // Find text between quotes
    const match = description.match(/"([^"]*)"/);
    if (match && match[1].length > maxLength) {
      const truncated = match[1].substring(0, maxLength) + '...';
      return description.replace(match[1], truncated);
    }
    return description;
  };

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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                  <p className="text-sm font-medium text-gray-600">Reschedules</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalReschedules}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
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
                  <SelectItem value="reschedule_event">Reschedule Event</SelectItem>
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
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>User / Event / Requestor / Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Date & Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log, index) => {
                      const isActivityLog = 'action' in log;
                      const isLoginLog = isActivityLog && log.action === 'login';
                      const isRescheduleLog = isActivityLog && log.action === 'reschedule_event';
                      const isExpanded = expandedRows.has(index);
                      
                      return (
                        <>
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell>
                              {isLoginLog ? (
                                <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
                                  <LogIn className="w-3 h-3" />
                                  Login
                                </Badge>
                              ) : isRescheduleLog ? (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Reschedule
                                </Badge>
                              ) : isActivityLog ? (
                                <Badge className="bg-gray-100 text-gray-800 border-gray-200 gap-1">
                                  <Activity className="w-3 h-3" />
                                  {log.action.replace('_', ' ')}
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
                                  {isLoginLog ? (
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                  ) : (
                                    <User className="w-4 h-4 text-blue-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-sm">
                                    {isLoginLog ? log.department : isActivityLog ? log.username : log.requestor}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate max-w-xs" title={isLoginLog ? log.email : isActivityLog ? log.email : log.eventTitle}>
                                    {isLoginLog ? log.email : isActivityLog ? log.email : log.eventTitle}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <Building2 className="w-3 h-3" />
                                {isActivityLog ? log.department : log.requestorDepartment}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isLoginLog ? (
                                <p className="text-sm text-gray-600">{log.department}</p>
                              ) : isActivityLog ? (
                                <div 
                                  className="cursor-pointer hover:text-blue-600 transition-colors"
                                  onClick={() => toggleRowExpansion(index)}
                                >
                                  <p className="text-sm text-gray-600 truncate max-w-md">{log.description}</p>
                                  <span className="text-xs text-blue-500 mt-1 block">
                                    {isExpanded ? '▲ Click to collapse' : '▼ Click to expand'}
                                  </span>
                                </div>
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
                                {format(new Date(isActivityLog ? log.timestamp : log.submittedAt), 'MMM dd, yyyy hh:mm a')}
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Row */}
                          {isExpanded && isActivityLog && (
                            <TableRow key={`${index}-expanded`} className="bg-blue-50">
                              <TableCell colSpan={5} className="py-4">
                                <div className="pl-12">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Full Details:</p>
                                  <p className="text-sm text-gray-600">
                                    {log.description.split('"').map((part, i) => 
                                      i % 2 === 1 ? <span key={i} className="font-bold">"{part}"</span> : part
                                    ).reduce((acc: any[], curr, i) => {
                                      if (i === 0) return [curr];
                                      // Bold dates and times (e.g., "Oct 23, 2025", "8:00 AM")
                                      const withBoldDatesAndTimes = typeof curr === 'string' 
                                        ? curr.split(/(\w{3}\s+\d{1,2},\s+\d{4}|\d{1,2}:\d{2}\s*(?:AM|PM))/gi).map((segment, j) => 
                                            /\w{3}\s+\d{1,2},\s+\d{4}|\d{1,2}:\d{2}\s*(?:AM|PM)/i.test(segment) 
                                              ? <span key={`${i}-${j}`} className="font-bold">{segment}</span> 
                                              : segment
                                          )
                                        : curr;
                                      return [...acc, withBoldDatesAndTimes];
                                    }, [])}
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} logs
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="gap-1"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Previous
                        </Button>
                      </PaginationItem>
                      
                      {/* First page */}
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => setCurrentPage(1)}
                          isActive={currentPage === 1}
                          className="cursor-pointer"
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>

                      {/* Show ellipsis if current page is far from start */}
                      {currentPage > 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      {/* Show pages around current page */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show pages near current page (not first or last)
                          return page > 1 && page < totalPages && Math.abs(page - currentPage) <= 1;
                        })
                        .map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}

                      {/* Show ellipsis if current page is far from end */}
                      {currentPage < totalPages - 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}

                      {/* Last page */}
                      {totalPages > 1 && (
                        <PaginationItem>
                          <PaginationLink
                            onClick={() => setCurrentPage(totalPages)}
                            isActive={currentPage === totalPages}
                            className="cursor-pointer"
                          >
                            {totalPages}
                          </PaginationLink>
                        </PaginationItem>
                      )}
                      
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="gap-1"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UsersLogsPage;
