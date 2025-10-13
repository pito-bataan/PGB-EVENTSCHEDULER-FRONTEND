import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Users, 
  Calendar, 
  Building2, 
  Activity,
  TrendingUp,
  Clock,
  Bell,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Settings,
  FileText,
  Shield,
  X
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Admin notifications data
  const notifications = [
    {
      id: 1,
      title: "New Event Request",
      message: "John Doe submitted a new event request for IT Training",
      type: "request",
      category: "requests",
      time: "5 minutes ago",
      read: false,
      icon: FileText,
      iconColor: "text-blue-600"
    },
    {
      id: 2,
      title: "User Registration",
      message: "New user Maria Santos registered from HR Department",
      type: "user",
      category: "users",
      time: "1 hour ago",
      read: false,
      icon: UserPlus,
      iconColor: "text-green-600"
    },
    {
      id: 3,
      title: "System Alert",
      message: "High number of concurrent users detected",
      type: "system",
      category: "system",
      time: "2 hours ago",
      read: true,
      icon: AlertCircle,
      iconColor: "text-orange-600"
    },
    {
      id: 4,
      title: "Event Approved",
      message: "Annual Budget Meeting has been approved and scheduled",
      type: "approval",
      category: "approvals",
      time: "3 hours ago",
      read: true,
      icon: CheckCircle,
      iconColor: "text-green-600"
    },
    {
      id: 5,
      title: "Security Update",
      message: "Password policy has been updated for all users",
      type: "security",
      category: "system",
      time: "1 day ago",
      read: true,
      icon: Shield,
      iconColor: "text-red-600"
    },
    {
      id: 6,
      title: "Department Update",
      message: "IT Department settings have been modified",
      type: "department",
      category: "departments",
      time: "2 days ago",
      read: true,
      icon: Settings,
      iconColor: "text-purple-600"
    }
  ];

  const stats = [
    {
      title: 'Total Users',
      value: '1,234',
      change: '+12%',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      title: 'Total Events',
      value: '856',
      change: '+8%',
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      title: 'Active Departments',
      value: '24',
      change: '+2%',
      icon: Building2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      title: 'Pending Requests',
      value: '43',
      change: '-5%',
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header with Notification */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to the Event Scheduler Admin Panel</p>
        </div>
        
        {/* Notification Dropdown */}
        <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80 p-0" align="end">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Admin Notifications</h3>
                <Button variant="ghost" size="sm" onClick={() => setNotificationOpen(false)} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="all" className="w-full">
              <div className="px-3 pt-2">
                <TabsList className="grid w-full grid-cols-4 h-8">
                  <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  <TabsTrigger value="requests" className="text-xs">Requests</TabsTrigger>
                  <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
                  <TabsTrigger value="system" className="text-xs">System</TabsTrigger>
                </TabsList>
              </div>
              
              <div className="max-h-72 overflow-y-auto">
                <TabsContent value="all" className="mt-0">
                  <div className="space-y-0">
                    {notifications.map((notification) => {
                      const IconComponent = notification.icon;
                      return (
                        <div key={notification.id} className={`p-3 hover:bg-gray-50 transition-colors border-l-2 ${
                          !notification.read ? 'border-l-blue-500 bg-blue-50/20' : 'border-l-transparent'
                        }`}>
                          <div className="flex items-start gap-2">
                            <div className={`p-1 rounded ${notification.iconColor}`}>
                              <IconComponent className="h-3 w-3" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <h4 className="font-medium text-xs text-gray-900 leading-tight">{notification.title}</h4>
                                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{notification.time}</span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notification.message}</p>
                              {!notification.read && (
                                <Badge variant="secondary" className="text-xs mt-1 h-4 px-1">New</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="requests" className="mt-0">
                  <div className="space-y-1">
                    {notifications.filter(n => n.category === 'requests').map((notification) => {
                      const IconComponent = notification.icon;
                      return (
                        <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                          !notification.read ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-transparent'
                        }`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-gray-100 ${notification.iconColor}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm text-gray-900">{notification.title}</h4>
                                <span className="text-xs text-gray-500">{notification.time}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              {!notification.read && (
                                <div className="mt-2">
                                  <Badge variant="secondary" className="text-xs">New</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="users" className="mt-0">
                  <div className="space-y-1">
                    {notifications.filter(n => n.category === 'users').map((notification) => {
                      const IconComponent = notification.icon;
                      return (
                        <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                          !notification.read ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-transparent'
                        }`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-gray-100 ${notification.iconColor}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm text-gray-900">{notification.title}</h4>
                                <span className="text-xs text-gray-500">{notification.time}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              {!notification.read && (
                                <div className="mt-2">
                                  <Badge variant="secondary" className="text-xs">New</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="system" className="mt-0">
                  <div className="space-y-1">
                    {notifications.filter(n => n.category === 'system').map((notification) => {
                      const IconComponent = notification.icon;
                      return (
                        <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                          !notification.read ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-transparent'
                        }`}>
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-gray-100 ${notification.iconColor}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm text-gray-900">{notification.title}</h4>
                                <span className="text-xs text-gray-500">{notification.time}</span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                              {!notification.read && (
                                <div className="mt-2">
                                  <Badge variant="secondary" className="text-xs">New</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </div>
              
              <div className="p-2 border-t">
                <Button variant="outline" className="w-full h-8 text-xs">
                  View All Notifications
                </Button>
              </div>
            </Tabs>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">{stat.change}</span>
                  <span className="text-xs text-gray-500 ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-red-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'New event request submitted', user: 'John Doe', time: '2 minutes ago' },
                { action: 'Event approved', user: 'Admin', time: '15 minutes ago' },
                { action: 'User registered', user: 'Jane Smith', time: '1 hour ago' },
                { action: 'Department tagged', user: 'Mike Johnson', time: '2 hours ago' }
              ].map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-600">by {activity.user}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-red-600" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: 'Provincial Meeting', date: 'Oct 15, 2024', department: 'Administration' },
                { title: 'IT Training Session', date: 'Oct 18, 2024', department: 'Information Technology' },
                { title: 'Budget Review', date: 'Oct 22, 2024', department: 'Finance' },
                { title: 'Health Summit', date: 'Oct 25, 2024', department: 'Health Department' }
              ].map((event, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-600">{event.department}</p>
                    <p className="text-xs text-gray-500">{event.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
