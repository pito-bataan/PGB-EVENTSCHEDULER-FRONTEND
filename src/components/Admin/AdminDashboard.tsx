import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getGlobalSocket } from '@/hooks/useSocket';
import { useUserLogsStore } from '@/stores/userLogsStore';
import { useAdminDashboardStore } from '@/stores/adminDashboardStore';
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
import {
  Activity,
  Calendar,
  Clock,
  User,
  LogIn,
  MapPin,
  Building2,
  ArrowRight,
  TrendingUp,
  Users,
  FileText,
  Loader2,
  RefreshCw
} from 'lucide-react';
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // User logs store
  const {
    loginLogs,
    eventLogs,
    loginLogsLoading,
    eventLogsLoading,
    fetchLoginLogs,
    fetchEventLogs,
    getStats,
    initializeSocketListeners
  } = useUserLogsStore();

  // Admin dashboard store
  const {
    upcomingEvents,
    upcomingEventsLoading,
    fetchUpcomingEvents
  } = useAdminDashboardStore();

  // Listen for real-time event updates via Socket.IO
  useEffect(() => {
    const socket = getGlobalSocket();
    
    if (!socket) {
      console.log('❌ Dashboard: Global socket not available yet');
      return;
    }

    console.log('✅ Dashboard: Global socket available, setting up listeners');

    const handleEventUpdated = (data: any) => {
      console.log('📊 Dashboard: Received event-updated:', data);
      // Refresh upcoming events when any event is updated
      fetchUpcomingEvents(true);
    };

    const handleEventStatusUpdated = (data: any) => {
      console.log('📊 Dashboard: Received event-status-updated:', data);
      // Also refresh on status updates
      fetchUpcomingEvents(true);
    };

    // Remove any existing listeners first to prevent duplicates
    socket.off('event-updated');
    socket.off('event-status-updated');

    socket.on('event-updated', handleEventUpdated);
    socket.on('event-status-updated', handleEventStatusUpdated);

    return () => {
      console.log('🧹 Dashboard: Cleaning up socket listeners');
      socket.off('event-updated', handleEventUpdated);
      socket.off('event-status-updated', handleEventStatusUpdated);
    };
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchLoginLogs();
    fetchEventLogs();
    fetchUpcomingEvents();
    initializeSocketListeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = getStats();
  const loading = loginLogsLoading || eventLogsLoading;

  // Get recent logs (combine login and event logs, sort by date, take 8)
  const recentLogs = [...loginLogs, ...eventLogs]
    .sort((a, b) => {
      const dateA = 'loginTime' in a ? new Date(a.loginTime) : new Date(a.submittedAt);
      const dateB = 'loginTime' in b ? new Date(b.loginTime) : new Date(b.submittedAt);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
          </div>
          <Button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              fetchLoginLogs(true);
              fetchEventLogs(true);
              fetchUpcomingEvents(true);
            }}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading || upcomingEventsLoading}
          >
            <RefreshCw className={`w-4 h-4 ${(loading || upcomingEventsLoading) ? 'animate-spin' : ''}`} />
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
                  <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3" />
                    All activities
                  </p>
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
                  <p className="text-xs text-gray-500 mt-1">User sessions</p>
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
                  <p className="text-xs text-gray-500 mt-1">Event requests</p>
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
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.uniqueUsers}</p>
                  <p className="text-xs text-gray-500 mt-1">Unique users</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity & Upcoming Events */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/users-logs')}
                  className="gap-1 text-blue-600 hover:text-blue-700"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-xs">Latest user logins and event submissions</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentLogs.map((log, index) => {
                    const isLoginLog = 'username' in log;
                    return (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isLoginLog ? 'bg-green-100' : 'bg-purple-100'
                        }`}>
                          {isLoginLog ? (
                            <LogIn className="w-5 h-5 text-green-600" />
                          ) : (
                            <Calendar className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {isLoginLog ? log.username : log.requestor}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {isLoginLog ? `Logged in from ${log.department}` : `Submitted: ${log.eventTitle}`}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 whitespace-nowrap">
                          {format(new Date(isLoginLog ? log.loginTime : log.submittedAt), 'hh:mm a')}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <CardTitle className="text-base font-medium">Upcoming Events</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/admin/all-events')}
                  className="gap-1 text-purple-600 hover:text-purple-700"
                >
                  View All
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-xs">Approved events scheduled ahead</CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingEventsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event, index) => (
                    <div key={index} className="p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate mb-1">
                            {event.eventTitle}
                          </h4>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Clock className="w-3 h-3" />
                              {format(new Date(event.startDate), 'MMM dd, yyyy')} {event.startTime} - {event.endTime}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Building2 className="w-3 h-3" />
                              {event.requestorDepartment}
                            </div>
                          </div>
                        </div>
                        <Badge className={`text-xs ${
                          event.status === 'approved' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}>
                          {event.status === 'approved' ? 'Approved' : 'Submitted'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
