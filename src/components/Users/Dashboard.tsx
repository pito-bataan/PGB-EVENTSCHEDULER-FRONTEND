import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  CalendarDays, 
  Building2, 
  Bell,
  ArrowRight,
  Clock,
  MapPin,
  AlertCircle,
  X,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { useSocket } from '@/hooks/useSocket';
import { useDashboardStore } from '@/stores/dashboardStore';
import { Toaster } from 'sonner';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;


interface EventData {
  _id: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment?: string;
  location: string;
  locations?: string[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: string;
  taggedDepartments?: string[];
  createdBy?: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  time: string;
  read: boolean;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  eventId?: string;
  eventDate?: string;
  requirementId?: string;
  departmentNotes?: string;
}

const Dashboard: React.FC = () => {
  // Zustand store - replaces all useState calls above!
  const {
    notifications,
    upcomingEvents,
    totalUserEvents,
    totalSystemEvents,
    requirementsOverview,
    readNotifications,
    loading,
    fetchDashboardData,
    fetchReadNotifications,
    markNotificationAsRead,
    getFilteredRequirements,
    getUniqueEvents,
    getUnreadCount,
    refreshNotifications
  } = useDashboardStore();
  
  // Only keep local UI state
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('all');
  
  // Get current user data (memoized to prevent re-renders)
  const currentUser = useMemo(() => {
    return JSON.parse(localStorage.getItem('userData') || '{}');
  }, []);
  
  const userId = useMemo(() => {
    return currentUser._id || currentUser.id || 'unknown';
  }, [currentUser]);
  
  // User data loaded and memoized
  
  // Initialize Socket.IO for real-time updates
  const { onNotificationRead, offNotificationRead, onNewNotification, offNewNotification } = useSocket(userId);

  // Helper function to format time
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Helper function to make event title bold in status notifications
  const renderMessageWithBoldEventTitle = (message: string) => {
    // Pattern: 'for event "Event Title"'
    const eventTitleRegex = /(for event ")([^"]+)(")/g;
    const parts = message.split(eventTitleRegex);
    
    return parts.map((part, index) => {
      // If this part is an event title (every 4th part starting from index 2)
      if (index > 0 && (index - 2) % 4 === 0) {
        return <span key={index} className="font-bold">{part}</span>;
      }
      return part;
    });
  };

  // Helper function to calculate days until event
  const getDaysUntilEvent = (eventDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    
    const diffTime = event.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    
    return diffDays;
  };

  // Helper function to generate notification message
  const generateNotificationMessage = (event: EventData, isUserEvent: boolean, isTaggedEvent: boolean = false): string => {
    const daysUntil = getDaysUntilEvent(event.startDate);
    const formattedTime = formatTime(event.startTime);
    
    // Truncate event title if too long (max 40 characters)
    const truncatedTitle = event.eventTitle.length > 40 
      ? event.eventTitle.substring(0, 40) + "..." 
      : event.eventTitle;
    
    // Different message format for tagged events
    if (isTaggedEvent) {
      return `New event "${truncatedTitle}" has tagged your department`;
    }
    
    const eventPrefix = isUserEvent ? "Your event" : "Event";
    const departmentInfo = isUserEvent ? "" : ` (${event.requestorDepartment || 'Unknown Dept'})`;
    
    
    
    if (daysUntil === 1) {
      return `${eventPrefix} "${truncatedTitle}"${departmentInfo} is tomorrow at ${formattedTime}`;
    } else if (daysUntil === 2) {
      return `${eventPrefix} "${truncatedTitle}"${departmentInfo} is coming in 2 days at ${formattedTime}`;
    } else if (daysUntil > 0 && daysUntil <= 7) {
      return `${eventPrefix} "${truncatedTitle}"${departmentInfo} is coming in ${daysUntil} days at ${formattedTime}`;
    }
    return `${eventPrefix} "${truncatedTitle}"${departmentInfo} is scheduled for ${event.startDate} at ${formattedTime}`;
  };

  // Generate notifications from upcoming events
  const generateUpcomingEventNotifications = (events: EventData[]): Notification[] => {
    const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const userDepartment = currentUser.department || currentUser.departmentName || '';
    const userName = currentUser.name || '';
    
    
    return events
      .filter(event => {
        const daysUntil = getDaysUntilEvent(event.startDate);
        const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
        
        
        if (!isUpcoming) {
          return false;
        }
        
        // Only show notifications for:
        // 1. Events created by the current user (flexible name matching)
        // 2. Events where the user's department is specifically tagged
        // 3. If user name is empty, show all events for their department
        const isUserEvent = userName && event.requestor === userName;
        
        const isTaggedForUserDepartment = userDepartment && event.taggedDepartments?.includes(userDepartment);
        const isFromSameDepartment = userDepartment && event.requestorDepartment === userDepartment;
        
        // Also check if user created the event by ID (more reliable than name matching)
        const isUserEventById = event.createdBy === userId;
        
        // CRITICAL: For tagged events, ONLY show if event is APPROVED
        // User's own events can be shown regardless of status
        if (isTaggedForUserDepartment && !isUserEvent && !isUserEventById) {
          if (event.status !== 'approved') {
            console.log(`🚫 [NOTIFICATION] Hiding tagged event "${event.eventTitle}" - status: ${event.status} (not approved)`);
            return false;
          }
        }
        
        // If no user name, show events from same department or tagged department
        const shouldShow = isUserEvent || isUserEventById || isTaggedForUserDepartment || (!userName && isFromSameDepartment);
        
        
        return shouldShow;
      })
      .map(event => {
        const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
        const userName = currentUser.name || '';
        const userDepartment = currentUser.department || currentUser.departmentName || '';
        const userId = currentUser._id || currentUser.id || 'unknown';
        
        const isUserEvent = userName && event.requestor === userName;
        const isUserEventById = event.createdBy === userId;
        const isTaggedForUserDepartment = userDepartment && event.taggedDepartments?.includes(userDepartment);
        const isFromSameDepartment = userDepartment && event.requestorDepartment === userDepartment;
        
        // Determine category based on how the user is related to the event
        let category = "upcoming";
        let title = "Upcoming Event";
        
        if (isUserEvent || isUserEventById) {
          category = "upcoming";
        } else if (isTaggedForUserDepartment) {
          category = "tagged";
          title = "Tagged Event";
        }

        const contentFingerprint = createUpcomingEventFingerprint(event);
        const notificationId = `upcoming-${event._id}-${userId}-${contentFingerprint}`;
        
        return {
          id: notificationId,
          baseId: `upcoming-${event._id}-${userId}`,
          title: title,
          message: `Event "${event.eventTitle}" (${event.requestorDepartment}) is coming in ${getDaysUntilEvent(event.startDate)} days at ${formatTime(event.startTime)}`,
          type: "upcoming",
          category: category,
          time: getDaysUntilEvent(event.startDate) === 1 ? 
                "Tomorrow" : 
                `In ${getDaysUntilEvent(event.startDate)} days`,
          read: false,
          icon: AlertCircle,
          iconColor: getDaysUntilEvent(event.startDate) === 1 ? "text-red-600" : "text-orange-600",
          eventId: event._id,
          eventDate: event.startDate,
          contentFingerprint: contentFingerprint
        };
      });
  };

  // Create content fingerprint for upcoming events
  const createUpcomingEventFingerprint = (event: EventData) => {
    const contentString = `${event.eventTitle}-${event.startDate}-${event.startTime}-${event.status}-${event.location}`;
    return btoa(contentString);
  };

  // Create content fingerprint for change detection
  const createNotificationFingerprint = (req: any) => {
    // Create a hash of the notification content that changes when content changes
    const contentString = `${req.name}-${req.status}-${req.department}-${req.departmentNotes}-${req.lastUpdated}`;
    return btoa(contentString); // Simple base64 encoding as fingerprint
  };




  // Helper function to get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'declined': return 'text-red-600';
      case 'partially_fulfill': return 'text-blue-600';
      case 'in_preparation': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };








  // Fetch data on component mount using Zustand
  useEffect(() => {
    fetchDashboardData(userId);
    fetchReadNotifications(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // REMOVED fetchDashboardData and fetchReadNotifications to prevent infinite loop

  // Listen for Socket.IO new notification events (TRUE REAL-TIME, NO POLLING!)
  useEffect(() => {
    if (typeof onNewNotification === 'function') {
      const handleNewNotification = (notificationData: any) => {
        console.log('🔔 [DASHBOARD] Socket.IO notification received, refreshing dashboard');
        // Refresh dashboard when new notification arrives via Socket.IO
        fetchDashboardData(userId, true); // Force refresh to get new notifications
      };

      // Set up Socket.IO listener
      onNewNotification(handleNewNotification);
      
      // Cleanup
      return () => {
        if (typeof offNewNotification === 'function') {
          offNewNotification();
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only depend on userId, not on fetchDashboardData to prevent loops

  
  // Real-time notification read status listener (new notifications handled by GlobalNotificationSystem)
  useEffect(() => {
    // Check if functions are available
    if (!onNotificationRead) {
      return;
    }

    // Listen for notification read events (from other devices/sessions)
    const handleNotificationRead = (data: any) => {
      if (data.userId === userId) {
        // Update read status if it's for current user - this will be handled by the store
        // Dispatch global event for read status update
        window.dispatchEvent(new CustomEvent('notificationUpdate', { 
          detail: { type: 'read', data } 
        }));
      }
    };

    // Set up the listener
    onNotificationRead(handleNotificationRead);

    // Cleanup
    return () => {
      offNotificationRead();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // REMOVED onNotificationRead and offNotificationRead to prevent infinite loop

  // Real-time status update listener (REMOVED - was causing infinite loops)
  // useEffect(() => {
  //   if (!onStatusUpdate) {
  //     return;
  //   }

  //   const handleStatusUpdate = (statusData: any) => {
  //     // Refresh notifications when status update is received
  //     fetchEventsAndNotifications();
  //   };

  //   onStatusUpdate(handleStatusUpdate);

  //   return () => {
  //     if (offStatusUpdate) {
  //       offStatusUpdate();
  //     }
  //   };
  // }, [onStatusUpdate, offStatusUpdate, fetchEventsAndNotifications]);

  return (
  <div className="space-y-4 md:space-y-6 relative">
    {/* Notification Button - Fixed Top Right */}
    <div className="absolute top-0 right-0 z-10">
      <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="relative shadow-sm">
            <Bell className="h-5 w-5" />
            {getUnreadCount() > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{getUnreadCount() > 9 ? '9+' : getUnreadCount()}</span>
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[calc(100vw-2rem)] sm:w-96 p-0" align="end">
          <div className="p-3 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Notifications</h3>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    console.log('🔄 [DASHBOARD] Manual refresh triggered');
                    fetchDashboardData(userId, true);
                  }} 
                  className="h-6 w-6 p-0"
                  title="Refresh notifications"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setNotificationOpen(false)} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="all" className="w-full">
            <div className="px-3 py-2 border-b">
              <TabsList className="grid w-full grid-cols-4 h-8">
                <TabsTrigger value="all" className="text-xs relative px-2">
                  All
                  {getUnreadCount() > 0 && (
                    <Badge variant="destructive" className="ml-1 h-3 min-w-3 text-[10px] px-1">
                      {getUnreadCount()}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="upcoming" className="text-xs relative px-2">
                  Upcoming
                  {getUnreadCount('upcoming') > 0 && (
                    <Badge variant="destructive" className="ml-1 h-3 min-w-3 text-[10px] px-1">
                      {getUnreadCount('upcoming')}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tagged" className="text-xs relative px-2">
                  Tagged
                  {getUnreadCount('tagged') > 0 && (
                    <Badge variant="destructive" className="ml-1 h-3 min-w-3 text-[10px] px-1">
                      {getUnreadCount('tagged')}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="status" className="text-xs relative px-2">
                  Status
                  {getUnreadCount('status') > 0 && (
                    <Badge variant="destructive" className="ml-1 h-3 min-w-3 text-[10px] px-1">
                      {getUnreadCount('status')}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
              
              <div className="max-h-72 overflow-y-auto">
                <TabsContent value="all" className="mt-0">
                  <div className="space-y-0">
                    {loading ? (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-xs text-gray-500 mt-2">Loading notifications...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-4 text-center">
                        <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => {
                        const IconComponent = notification.icon;
                        const isRead = readNotifications.has(notification.id);
                        return (
                          <div 
                            key={notification.id} 
                            className={`p-3 hover:bg-gray-50 transition-colors border-l-2 cursor-pointer ${
                              !isRead ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-transparent bg-gray-50/50'
                            }`}
                            onClick={() => markNotificationAsRead(notification.id, notification)}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`p-1 rounded ${notification.iconColor}`}>
                                <IconComponent className="h-3 w-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <h4 className={`font-medium text-xs leading-tight ${
                                    !isRead ? 'text-gray-900' : 'text-gray-600'
                                  }`}>{notification.title}</h4>
                                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{notification.time}</span>
                                </div>
                                <p className={`text-xs mt-1 leading-relaxed ${
                                  !isRead ? 'text-gray-600' : 'text-gray-500'
                                }`}>{renderMessageWithBoldEventTitle(notification.message)}</p>
                                {!isRead && (
                                  <Badge variant="destructive" className="text-xs mt-1 h-4 px-1">New</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="upcoming" className="mt-0">
                  <div className="space-y-1">
                    {notifications.filter(n => n.category === 'upcoming').map((notification) => {
                      const IconComponent = notification.icon;
                      const isRead = readNotifications.has(notification.id);
                      return (
                        <div 
                          key={notification.id} 
                          className={`p-4 hover:bg-gray-50 transition-colors border-l-4 cursor-pointer ${
                            !isRead ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-transparent bg-gray-50/50'
                          }`}
                          onClick={() => markNotificationAsRead(notification.id, notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-gray-100 ${notification.iconColor}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className={`font-medium text-sm ${
                                  !isRead ? 'text-gray-900' : 'text-gray-600'
                                }`}>{notification.title}</h4>
                                <span className="text-xs text-gray-500">{notification.time}</span>
                              </div>
                              <p className={`text-sm mt-1 ${
                                !isRead ? 'text-gray-600' : 'text-gray-500'
                              }`}>{renderMessageWithBoldEventTitle(notification.message)}</p>
                              {!isRead && (
                                <div className="mt-2">
                                  <Badge variant="destructive" className="text-xs">New</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="tagged" className="mt-0">
                  <div className="space-y-1">
                    {notifications.filter(n => n.category === 'tagged').map((notification) => {
                      const IconComponent = notification.icon;
                      const isRead = readNotifications.has(notification.id);
                      return (
                        <div 
                          key={notification.id} 
                          className={`p-4 hover:bg-gray-50 transition-colors border-l-4 cursor-pointer ${
                            !isRead ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-transparent bg-gray-50/50'
                          }`}
                          onClick={() => markNotificationAsRead(notification.id, notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-gray-100 ${notification.iconColor}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className={`font-medium text-sm ${
                                  !isRead ? 'text-gray-900' : 'text-gray-600'
                                }`}>{notification.title}</h4>
                                <span className="text-xs text-gray-500">{notification.time}</span>
                              </div>
                              <p className={`text-sm mt-1 ${
                                !isRead ? 'text-gray-600' : 'text-gray-500'
                              }`}>{renderMessageWithBoldEventTitle(notification.message)}</p>
                              {!isRead && (
                                <div className="mt-2">
                                  <Badge variant="destructive" className="text-xs">New</Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
                
                <TabsContent value="status" className="mt-0">
                  <div className="space-y-1">
                    {notifications.filter(n => n.category === 'status').map((notification) => {
                      const IconComponent = notification.icon;
                      const isRead = readNotifications.has(notification.id);
                      return (
                        <div 
                          key={notification.id} 
                          className={`p-4 hover:bg-gray-50 transition-colors border-l-4 cursor-pointer ${
                            !isRead ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-transparent bg-gray-50/50'
                          }`}
                          onClick={() => markNotificationAsRead(notification.id, notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-gray-100 ${notification.iconColor}`}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className={`font-medium text-sm ${
                                  !isRead ? 'text-gray-900' : 'text-gray-600'
                                }`}>{notification.title}</h4>
                                <span className="text-xs text-gray-500">{notification.time}</span>
                              </div>
                              <p className={`text-sm mt-1 ${
                                !isRead ? 'text-gray-600' : 'text-gray-500'
                              }`}>{renderMessageWithBoldEventTitle(notification.message)}</p>
                              {!isRead && (
                                <div className="mt-2">
                                  <Badge variant="destructive" className="text-xs">New</Badge>
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

    {/* Header */}
    <div className="pr-14">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-sm md:text-base text-gray-600 mt-1 md:mt-2">Welcome to the Event Scheduler Dashboard</p>
    </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Total Events</h3>
                <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-1">
                  {loading ? '...' : totalUserEvents}
                </p>
                <p className="text-sm text-gray-500">Your events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-green-100 rounded-lg">
                <CalendarDays className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Upcoming Events</h3>
                <p className="text-2xl md:text-3xl font-bold text-green-600 mt-1">
                  {loading ? '...' : upcomingEvents.length}
                </p>
                <p className="text-sm text-gray-500">Next 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="p-2 md:p-3 bg-purple-100 rounded-lg">
                <Building2 className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900">Department Events</h3>
                <p className="text-2xl md:text-3xl font-bold text-purple-600 mt-1">
                  {loading ? '...' : totalSystemEvents}
                </p>
                <p className="text-sm text-gray-500">All system events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Upcoming Events Section */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-lg md:text-xl">Upcoming Events</CardTitle>
            <Button variant="outline" size="sm" className="gap-2 text-xs md:text-sm">
              View All
              <ArrowRight className="h-3 w-3 md:h-4 md:w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-3 md:space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading upcoming events...</p>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Events</h3>
                <p className="text-gray-500">You don't have any upcoming events in the next 30 days.</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event._id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0 w-full sm:w-auto">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">{event.eventTitle}</h3>
                    <p className="text-xs md:text-sm text-gray-600 truncate">
                      {event.requestorDepartment || 'Unknown Department'}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2 text-xs md:text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="truncate">{new Date(event.startDate).toLocaleDateString()} at {formatTime(event.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                        {event.locations && event.locations.length > 0 ? (
                          <span className="truncate">{event.locations.join(', ')}</span>
                        ) : (
                          <span className="truncate">{event.location || ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Badge 
                      className={
                        event.status === 'approved' || event.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : event.status === 'submitted' || event.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          : event.status === 'declined' || event.status === 'rejected'
                          ? 'bg-red-100 text-red-800 border-red-200'
                          : 'bg-gray-100 text-gray-800 border-gray-200'
                      }
                      variant="outline"
                    >
                      {event.status === 'approved' ? 'Approved' : 
                       event.status === 'confirmed' ? 'Confirmed' :
                       event.status === 'submitted' ? 'Pending' : 
                       event.status === 'pending' ? 'Pending' :
                       event.status === 'declined' ? 'Declined' :
                       event.status === 'rejected' ? 'Rejected' :
                       event.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Requirements Status Overview Section */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 lg:gap-4">
            <CardTitle className="text-lg md:text-xl">Requirements Status Overview</CardTitle>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
              {/* Event Filter Dropdown */}
              <Select value={selectedEventFilter} onValueChange={setSelectedEventFilter}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Events ({requirementsOverview.length})
                  </SelectItem>
                  {getUniqueEvents().map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title} ({getFilteredRequirements(event.id).length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Badge variant="outline" className="gap-1 text-xs md:text-sm">
              <AlertCircle className="h-3 w-3" />
              {getFilteredRequirements(selectedEventFilter).length} Showing
            </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-3 md:space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading requirements...</p>
              </div>
            ) : getFilteredRequirements(selectedEventFilter).length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedEventFilter === 'all' ? 'No Requirements' : 'No Requirements for Selected Event'}
                </h3>
                <p className="text-gray-500">
                  {selectedEventFilter === 'all' 
                    ? "You don't have any requirements in your events." 
                    : "This event doesn't have any requirements."}
                </p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto pr-1 md:pr-2 space-y-3 md:space-y-4">
                {getFilteredRequirements(selectedEventFilter).map((req) => (
                  <div key={`${req.eventId}-${req.id}`} className="bg-white border border-gray-200 rounded-lg md:rounded-xl p-3 md:p-5 hover:shadow-md transition-all duration-200">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex items-start gap-3 md:gap-4 flex-1 w-full sm:w-auto">
                        {/* Status Indicator */}
                        <div className="flex-shrink-0 mt-0.5 md:mt-1">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                            req.status === 'confirmed' ? 'bg-green-100' :
                            req.status === 'pending' ? 'bg-yellow-100' :
                            req.status === 'declined' ? 'bg-red-100' :
                            req.status === 'partially_fulfill' ? 'bg-blue-100' :
                            req.status === 'in_preparation' ? 'bg-purple-100' :
                            'bg-gray-100'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              req.status === 'confirmed' ? 'bg-green-500' :
                              req.status === 'pending' ? 'bg-yellow-500' :
                              req.status === 'declined' ? 'bg-red-500' :
                              req.status === 'partially_fulfill' ? 'bg-blue-500' :
                              req.status === 'in_preparation' ? 'bg-purple-500' :
                              'bg-gray-500'
                            }`}></div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 text-sm md:text-base lg:text-lg">{req.name}</h3>
                            <Badge variant="outline" className="text-xs font-medium px-2 py-1 w-fit">
                              {req.department}
                            </Badge>
                          </div>
                          
                          <p className="text-xs md:text-sm text-gray-600 mb-2 truncate">{req.eventTitle}</p>
                          
                          {/* Show quantity for physical requirements, notes for service requirements */}
                          {req.quantity ? (
                            (() => {
                              let displayTotal = req.totalQuantity;
                              if (req.availabilityNotes && req.availabilityNotes.startsWith('PAVILION_DEFAULT:')) {
                                const parts = req.availabilityNotes.split(':');
                                const parsed = parseInt(parts[1], 10);
                                if (!isNaN(parsed)) {
                                  displayTotal = parsed;
                                }
                              }
                              return (
                                <p className="text-xs md:text-sm text-gray-500 mb-2">
                                  Requested: <span className="font-medium">{req.quantity}</span> of <span className="font-medium">{displayTotal || 'N/A'}</span> available (location)
                                </p>
                              );
                            })()
                          ) : req.notes && (
                            <div className="bg-blue-50 rounded-lg p-2 md:p-3 mb-2">
                              <p className="text-xs text-blue-600 font-medium mb-1">Requestor's Notes:</p>
                              <p className="text-xs md:text-sm text-gray-700 break-words">{req.notes}</p>
                            </div>
                          )}
                          
                          {req.departmentNotes && (
                            <div className="bg-gray-50 rounded-lg p-2 md:p-3 mt-2 md:mt-3">
                              <p className="text-xs text-gray-600 font-medium mb-1">Department Notes:</p>
                              <p className="text-xs md:text-sm text-gray-700 break-words">{req.departmentNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="flex-shrink-0 sm:ml-4 w-full sm:w-auto">
                        <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium text-center ${
                          req.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          req.status === 'declined' ? 'bg-red-100 text-red-800' :
                          req.status === 'partially_fulfill' ? 'bg-blue-100 text-blue-800' :
                          req.status === 'in_preparation' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {req.status === 'confirmed' ? 'Confirmed' :
                           req.status === 'pending' ? 'Pending' :
                           req.status === 'declined' ? 'Declined' :
                           req.status === 'partially_fulfill' ? 'Partial' :
                           req.status === 'in_preparation' ? 'Preparing' :
                           req.status}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Separate Toaster for popup notifications only */}
      <Toaster 
        position="bottom-right" 
        richColors 
        closeButton 
        duration={5000}
        toastOptions={{
          style: {
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
        }}
      />
    </div>
  );
};

export default Dashboard;
