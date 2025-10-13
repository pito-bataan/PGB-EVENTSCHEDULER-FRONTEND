import React, { useState, useEffect } from 'react';
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
  Calendar, 
  CalendarDays, 
  Building2, 
  Bell,
  ArrowRight,
  Clock,
  MapPin,
  AlertCircle,
  X
} from 'lucide-react';
import axios from 'axios';
import { useSocket } from '@/hooks/useSocket';
import { Toaster } from 'sonner';

const API_BASE_URL = 'http://localhost:5000/api';


interface Event {
  _id: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment?: string;
  location: string;
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
}

const Dashboard: React.FC = () => {
  console.log('🏠 Dashboard component loaded/re-rendered');
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [totalUserEvents, setTotalUserEvents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const [totalSystemEvents, setTotalSystemEvents] = useState(0);
  
  // Get current user data
  const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
  const userId = currentUser._id || currentUser.id || 'unknown';
  
  // Initialize Socket.IO for real-time read status updates only (popups handled by GlobalNotificationSystem)
  const { onNotificationRead, offNotificationRead } = useSocket(userId);

  // Helper function to format time
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Helper function to calculate days until event
  const getDaysUntilEvent = (eventDate: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    
    const diffTime = event.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Date calculation:`, {
      today: today.toISOString().split('T')[0],
      eventDate: eventDate,
      eventParsed: event.toISOString().split('T')[0],
      diffTime,
      diffDays
    });
    
    return diffDays;
  };

  // Helper function to generate notification message
  const generateNotificationMessage = (event: Event, isUserEvent: boolean, isTaggedEvent: boolean = false): string => {
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
    
    
    console.log(`📝 Event title truncation:`, {
      originalTitle: event.eventTitle,
      originalLength: event.eventTitle.length,
      truncatedTitle: truncatedTitle,
      wasTruncated: event.eventTitle.length > 40
    });
    
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
  const generateUpcomingEventNotifications = (events: Event[]): Notification[] => {
    const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
    const userDepartment = currentUser.department || currentUser.departmentName || '';
    const userName = currentUser.name || '';
    
    console.log(`🔔 Filtering notifications for user: ${userName}, department: ${userDepartment}`);
    console.log(`📊 Processing ${events.length} events for notifications`);
    console.log(`🔍 Current user data from localStorage:`, currentUser);
    
    return events
      .filter(event => {
        const daysUntil = getDaysUntilEvent(event.startDate);
        const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
        
        console.log(`📅 Event "${event.eventTitle}" analysis:`, {
          startDate: event.startDate,
          daysUntil,
          isUpcoming,
          status: event.status
        });
        
        if (!isUpcoming) {
          console.log(`⏭️ Skipping "${event.eventTitle}" - not upcoming (${daysUntil} days)`);
          return false;
        }
        
        // Only show notifications for:
        // 1. Events created by the current user (flexible name matching)
        // 2. Events where the user's department is specifically tagged
        // 3. If user name is empty, show all events for their department
        const isUserEvent = userName && event.requestor === userName;
        
        console.log(`🔍 User matching debug for "${event.eventTitle}":`, {
          eventRequestor: event.requestor,
          currentUserName: userName,
          currentUserId: userId,
          eventCreatedBy: event.createdBy,
          isUserEvent: isUserEvent,
          isUserEventById: event.createdBy === userId
        });
        const isTaggedForUserDepartment = userDepartment && event.taggedDepartments?.includes(userDepartment);
        const isFromSameDepartment = userDepartment && event.requestorDepartment === userDepartment;
        
        // Also check if user created the event by ID (more reliable than name matching)
        const isUserEventById = event.createdBy === userId;
        
        // If no user name, show events from same department or tagged department
        const shouldShow = isUserEvent || isUserEventById || isTaggedForUserDepartment || (!userName && isFromSameDepartment);
        
        console.log(`🔍 Event "${event.eventTitle}" filtering:`, {
          requestor: event.requestor,
          requestorDepartment: event.requestorDepartment,
          taggedDepartments: event.taggedDepartments,
          currentUserName: userName,
          currentUserDepartment: userDepartment,
          isUserEvent,
          isTaggedForUserDepartment,
          isFromSameDepartment,
          shouldShow,
          daysUntil
        });
        
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
          title = "Your Upcoming Event";
        } else if (isTaggedForUserDepartment) {
          category = "tagged";
          title = "New Event Notification";  // This matches your screenshot
        } else if (isFromSameDepartment || !userName) {
          // If from same department or no user name, treat as upcoming
          category = "upcoming";
          title = "Upcoming Event";
        }
        
        console.log(`📂 Event "${event.eventTitle}" categorization:`, {
          isUserEvent,
          isTaggedForUserDepartment,
          isFromSameDepartment,
          category,
          title,
          taggedDepartments: event.taggedDepartments,
          requestorDepartment: event.requestorDepartment,
          userDepartment
        });
        
        return {
          id: `upcoming-${event._id}-${userId}`,
          title: title,
          message: generateNotificationMessage(event, isUserEvent || isUserEventById, isTaggedForUserDepartment),
          type: "upcoming",
          category: category,
          time: getDaysUntilEvent(event.startDate) === 1 ? "Tomorrow" : 
                getDaysUntilEvent(event.startDate) === 2 ? "In 2 days" :
                `In ${getDaysUntilEvent(event.startDate)} days`,
          read: false,
          icon: AlertCircle,
          iconColor: getDaysUntilEvent(event.startDate) === 1 ? "text-red-600" : "text-orange-600",
          eventId: event._id,
          eventDate: event.startDate
        };
      });
  };

  // Fetch events and generate notifications
  const fetchEventsAndNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch user's own events only
      const userResponse = await axios.get(`${API_BASE_URL}/events/my`, { headers });

      if (userResponse.data.success) {
        const userEvents = userResponse.data.data || [];
        
        // Set total user events count
        setTotalUserEvents(userEvents.length);
        
        // Filter upcoming events (next 30 days) - only user's own events
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        
        const upcoming = userEvents.filter((event: Event) => {
          const eventDate = new Date(event.startDate);
          return eventDate >= now && eventDate <= thirtyDaysFromNow && 
                 (event.status === 'approved' || event.status === 'submitted');
        });
        
        setUpcomingEvents(upcoming);
        
        // For notifications and total system events count, fetch all events
        const allEventsResponse = await axios.get(`${API_BASE_URL}/events`, { headers });
        if (allEventsResponse.data.success) {
          const allEvents = allEventsResponse.data.data || [];
          
          // Set total system events count (all events in the system)
          setTotalSystemEvents(allEvents.length);
          
          const allUpcoming = allEvents.filter((event: Event) => {
            const eventDate = new Date(event.startDate);
            return eventDate >= now && eventDate <= thirtyDaysFromNow && 
                   (event.status === 'approved' || event.status === 'submitted');
          });
          
          // Generate notifications from all upcoming events (including tagged ones)
          const eventNotifications = generateUpcomingEventNotifications(allUpcoming);
          setNotifications(eventNotifications);
          
          console.log(`📊 User Events: ${userEvents.length}, System Events: ${allEvents.length}`);
          console.log(`📅 Found ${upcoming.length} user's upcoming events`);
          console.log(`🔔 Generated ${eventNotifications.length} notifications from ${allUpcoming.length} upcoming events`);
          console.log(`🎯 Current date: ${new Date().toISOString().split('T')[0]}`);
          console.log(`🎯 Looking for events on: 2025-10-11 (tomorrow)`);
          
          // Debug: Show all upcoming events with their dates
          allUpcoming.forEach((event: Event) => {
            console.log(`📅 Upcoming event: "${event.eventTitle}" on ${event.startDate} (${getDaysUntilEvent(event.startDate)} days)`);
          });
        }
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setNotifications([]);
      setUpcomingEvents([]);
    } finally {
      setLoading(false);
    }
  };

  // Load read notifications from database
  const loadReadNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/notifications/read-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setReadNotifications(new Set(response.data.data));
        console.log(`📖 Loaded ${response.data.data.length} read notifications from database`);
      }
    } catch (error) {
      console.error('Error loading read notifications:', error);
      // Fallback to localStorage for backward compatibility
      const savedReadNotifications = localStorage.getItem(`readNotifications_${userId}`);
      if (savedReadNotifications) {
        setReadNotifications(new Set(JSON.parse(savedReadNotifications)));
        console.log('📖 Loaded read notifications from localStorage fallback');
      }
    }
  };

  // Mark notification as read in database
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      // Find the notification to get its details
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) {
        console.error('Notification not found:', notificationId);
        return;
      }

      // Optimistically update UI
      const newReadSet = new Set(readNotifications);
      newReadSet.add(notificationId);
      setReadNotifications(newReadSet);

      // Save to database
      const token = localStorage.getItem('authToken');
      const response = await axios.post(`${API_BASE_URL}/notifications/mark-read`, {
        notificationId,
        eventId: notification.eventId,
        notificationType: notification.type,
        category: notification.category
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.data.success) {
        console.log(`✅ Marked notification as read in database: ${notificationId}`);
        
        // Dispatch global event for immediate UI updates
        window.dispatchEvent(new CustomEvent('notificationUpdate', { 
          detail: { type: 'read', notificationId, userId } 
        }));
      } else {
        // Rollback on failure
        const rollbackSet = new Set(readNotifications);
        rollbackSet.delete(notificationId);
        setReadNotifications(rollbackSet);
        console.error('Failed to mark notification as read:', response.data.message);
      }
    } catch (error) {
      // Rollback on error
      const rollbackSet = new Set(readNotifications);
      rollbackSet.delete(notificationId);
      setReadNotifications(rollbackSet);
      console.error('Error marking notification as read:', error);
    }
  };

  // Get unread notification count
  const getUnreadCount = (notificationsList: Notification[]) => {
    return notificationsList.filter(n => !readNotifications.has(n.id)).length;
  };




  // Fetch data on component mount
  useEffect(() => {
    fetchEventsAndNotifications();
    loadReadNotifications();
  }, []);

  // Listen for global notification events from GlobalNotificationSystem
  useEffect(() => {
    const handleGlobalNotificationUpdate = (event: any) => {
      console.log('📢 Dashboard received global notification update:', event.detail);
      if (event.detail.type === 'new') {
        // Refresh notifications when new notification arrives
        setTimeout(() => {
          fetchEventsAndNotifications().then(() => {
            console.log('✅ Dashboard refreshed from global notification');
            loadReadNotifications();
          });
        }, 500);
      }
    };

    window.addEventListener('notificationUpdate', handleGlobalNotificationUpdate);
    
    return () => {
      window.removeEventListener('notificationUpdate', handleGlobalNotificationUpdate);
    };
  }, []);

  console.log('🔧 About to set up notification listeners useEffect...');
  
  // Real-time notification read status listener (new notifications handled by GlobalNotificationSystem)
  useEffect(() => {
    console.log('🔔 Setting up notification read status listener for userId:', userId);
    
    // Check if functions are available
    if (!onNotificationRead) {
      console.error('❌ onNotificationRead function not available!');
      return;
    }

    // Listen for notification read events (from other devices/sessions)
    const handleNotificationRead = (data: any) => {
      console.log('👀 Received notification read event:', data);
      if (data.userId === userId) {
        // Update read status if it's for current user
        setReadNotifications(prev => {
          const newSet = new Set(prev);
          newSet.add(data.notificationId);
          return newSet;
        });
        
        // Dispatch global event for read status update
        window.dispatchEvent(new CustomEvent('notificationUpdate', { 
          detail: { type: 'read', data } 
        }));
      }
    };

    // Set up listener
    console.log('🔧 Setting up onNotificationRead listener...');
    onNotificationRead(handleNotificationRead);
    console.log('✅ Notification read listener setup complete');

    // Cleanup listener on unmount
    return () => {
      console.log('🔕 Cleaning up notification read listener');
      offNotificationRead();
    };
  }, [userId]);


  return (
    <div className="space-y-6">
      {/* Header with Notification */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome to the Event Scheduler Dashboard</p>
        </div>
        
        {/* Notification Dropdown */}
        <DropdownMenu open={notificationOpen} onOpenChange={setNotificationOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {getUnreadCount(notifications) > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-96 p-0" align="end">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Notifications</h3>
                <Button variant="ghost" size="sm" onClick={() => setNotificationOpen(false)} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue="all" className="w-full">
              <div className="px-3 pt-2">
                <TabsList className="grid w-full grid-cols-4 h-9 gap-1">
                  <TabsTrigger value="all" className="text-xs relative px-2">
                    All
                    {getUnreadCount(notifications) > 0 && (
                      <Badge variant="destructive" className="ml-1 h-3 min-w-3 text-[10px] px-1">
                        {getUnreadCount(notifications)}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="upcoming" className="text-xs relative px-2">
                    Upcoming
                    {getUnreadCount(notifications.filter(n => n.category === 'upcoming')) > 0 && (
                      <Badge variant="destructive" className="ml-1 h-3 min-w-3 text-[10px] px-1">
                        {getUnreadCount(notifications.filter(n => n.category === 'upcoming'))}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="tagged" className="text-xs relative px-2">
                    Tagged
                    {getUnreadCount(notifications.filter(n => n.category === 'tagged')) > 0 && (
                      <Badge variant="destructive" className="ml-1 h-3 min-w-3 text-[10px] px-1">
                        {getUnreadCount(notifications.filter(n => n.category === 'tagged'))}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="status" className="text-xs relative px-2">
                    Status
                    {getUnreadCount(notifications.filter(n => n.category === 'status')) > 0 && (
                      <Badge variant="destructive" className="ml-1 h-3 min-w-3 text-[10px] px-1">
                        {getUnreadCount(notifications.filter(n => n.category === 'status'))}
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
                            onClick={() => markNotificationAsRead(notification.id)}
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
                                }`}>{notification.message}</p>
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
                          onClick={() => markNotificationAsRead(notification.id)}
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
                              }`}>{notification.message}</p>
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
                          onClick={() => markNotificationAsRead(notification.id)}
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
                              }`}>{notification.message}</p>
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
                          onClick={() => markNotificationAsRead(notification.id)}
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
                              }`}>{notification.message}</p>
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
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Total Events</h3>
                <p className="text-3xl font-bold text-blue-600 mt-1">
                  {loading ? '...' : totalUserEvents}
                </p>
                <p className="text-sm text-gray-500">Your events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CalendarDays className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Upcoming Events</h3>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {loading ? '...' : upcomingEvents.length}
                </p>
                <p className="text-sm text-gray-500">Next 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Department Events</h3>
                <p className="text-3xl font-bold text-purple-600 mt-1">
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
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Upcoming Events</CardTitle>
            <Button variant="outline" size="sm" className="gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                <div key={event._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{event.eventTitle}</h3>
                    <p className="text-sm text-gray-600 truncate">
                      {event.requestorDepartment || 'Unknown Department'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(event.startDate).toLocaleDateString()} at {formatTime(event.startTime)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{event.location}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <Badge variant={event.status === 'approved' ? 'default' : 'secondary'}>
                      {event.status === 'approved' ? 'Approved' : event.status === 'submitted' ? 'Pending' : event.status}
                    </Badge>
                  </div>
                </div>
              ))
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
