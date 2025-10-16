import React from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';
import { AlertCircle, Calendar } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000/api';

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

// Types
interface Event {
  _id: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: string;
  createdBy: string;
  taggedDepartments?: string[];
  departmentRequirements?: any;
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

interface DashboardState {
  // Data
  userEvents: Event[];
  upcomingEvents: Event[];
  notifications: Notification[];
  requirementsOverview: any[];
  readNotifications: Set<string>;
  
  // Counts
  totalUserEvents: number;
  totalSystemEvents: number;
  
  // Loading & Cache
  loading: boolean;
  lastFetched: number | null;
  CACHE_DURATION: number;
  
  // Actions
  fetchDashboardData: (userId: string, force?: boolean) => Promise<void>;
  fetchReadNotifications: (userId: string) => Promise<void>;
  markNotificationAsRead: (notificationId: string, notification: Notification) => Promise<void>;
  clearCache: () => void;
  refreshNotifications: (userId: string) => Promise<void>;
  
  // Getters
  getFilteredRequirements: (eventFilter: string) => any[];
  getUniqueEvents: () => Array<{id: string, title: string}>;
  getUnreadCount: (category?: string) => number;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      // Initial state
      userEvents: [],
      upcomingEvents: [],
      notifications: [],
      requirementsOverview: [],
      readNotifications: new Set<string>(),
      totalUserEvents: 0,
      totalSystemEvents: 0,
      loading: false,
      lastFetched: null,
      CACHE_DURATION: 30 * 1000, // 30 seconds for real-time updates
      
      // Actions
      fetchDashboardData: async (userId: string, force = false) => {
        const state = get();
        const now = Date.now();
        
        // Check cache (unless forced)
        if (!force && state.lastFetched && (now - state.lastFetched) < state.CACHE_DURATION) {
          return;
        }
        
        set({ loading: true });
        
        try {
          const token = localStorage.getItem('authToken');
          const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          };

          // Fetch user's events and all events for notifications
          const [userResponse, allEventsResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/events/my`, { headers }),
            axios.get(`${API_BASE_URL}/events`, { headers })
          ]);
          
          if (userResponse.data.success && allEventsResponse.data.success) {
            const userEvents = userResponse.data.data || [];
            const allEvents = allEventsResponse.data.data || [];
            
            // Filter upcoming events (next 30 days)
            const currentDate = new Date();
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(currentDate.getDate() + 30);
            
            const upcoming = userEvents.filter((event: Event) => {
              const eventDate = new Date(event.startDate);
              return eventDate >= currentDate && eventDate <= thirtyDaysFromNow && 
                     (event.status === 'approved' || event.status === 'submitted');
            });
            
            // Extract requirements
            const allRequirements: any[] = [];
            userEvents.forEach((event: any) => {
              if (event.departmentRequirements) {
                Object.entries(event.departmentRequirements).forEach(([department, requirements]) => {
                  (requirements as any[]).forEach((req: any) => {
                    allRequirements.push({
                      id: req.id,
                      name: req.name,
                      status: req.status || 'pending',
                      department: department,
                      eventTitle: event.eventTitle,
                      eventId: event._id,
                      departmentNotes: req.departmentNotes || '',
                      lastUpdated: req.lastUpdated,
                      quantity: req.quantity,
                      totalQuantity: req.totalQuantity
                    });
                  });
                });
              }
            });
            
            // Generate notifications from all upcoming events (including tagged ones)
            const allUpcoming = allEvents.filter((event: Event) => {
              const eventDate = new Date(event.startDate);
              return eventDate >= currentDate && eventDate <= thirtyDaysFromNow && 
                     (event.status === 'approved' || event.status === 'submitted');
            });
            
            // Get current user data for notification filtering
            const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
            const userDepartment = currentUser.department || currentUser.departmentName || '';
            const userName = currentUser.name || '';
            
            const upcomingNotifications = allUpcoming
              .filter((event: Event) => {
                const daysUntil = Math.ceil((new Date(event.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isUpcoming = daysUntil >= 0 && daysUntil <= 7;
                
                if (!isUpcoming) return false;
                
                // Show notifications for:
                // 1. Events created by the current user
                // 2. Events where the user's department is tagged
                // 3. Events created by user ID
                const isUserEvent = userName && event.requestor === userName;
                const isTaggedForUserDepartment = userDepartment && event.taggedDepartments?.includes(userDepartment);
                const isUserEventById = event.createdBy === userId;
                const isFromSameDepartment = userDepartment && event.requestorDepartment === userDepartment;
                
                return isUserEvent || isUserEventById || isTaggedForUserDepartment || (!userName && isFromSameDepartment);
              })
              .map((event: Event) => {
                const daysUntil = Math.ceil((new Date(event.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                const isUserEvent = userName && event.requestor === userName;
                const isUserEventById = event.createdBy === userId;
                const isTaggedForUserDepartment = userDepartment && event.taggedDepartments?.includes(userDepartment);
                
                // Determine category and title
                let category = "upcoming";
                let title = "Upcoming Event";
                
                if (isUserEvent || isUserEventById) {
                  category = "upcoming";
                } else if (isTaggedForUserDepartment) {
                  category = "tagged";
                  title = "Tagged Event";
                }
                
                return {
                  id: `upcoming-${event._id}-${userId}`,
                  title: title,
                  message: `Event "${event.eventTitle}" (${event.requestorDepartment}) is coming in ${daysUntil} days`,
                  type: "upcoming",
                  category: category,
                  time: daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`,
                  read: false,
                  icon: daysUntil === 1 ? AlertCircle : Calendar,
                  iconColor: daysUntil === 1 ? "text-red-600" : "text-orange-600",
                  eventId: event._id,
                  eventDate: event.startDate
                };
              });
            
            const statusNotifications = allRequirements
              .filter(req => req.status && req.status !== 'pending')
              .map(req => ({
                id: `status-${req.eventId}-${req.id}`,
                title: "Status Updated", 
                message: `"${req.name}" status: "${req.status}" by ${req.department} for event "${req.eventTitle}"`,
                type: "status",
                category: "status",
                time: req.lastUpdated ? new Date(req.lastUpdated).toLocaleString() : 'Recently',
                read: false,
                icon: AlertCircle,
                iconColor: getStatusColor(req.status),
                eventId: req.eventId,
                requirementId: req.id,
                departmentNotes: req.departmentNotes
              }));
            
            const allNotifications = [...upcomingNotifications, ...statusNotifications];
            
            set({
              userEvents,
              upcomingEvents: upcoming,
              requirementsOverview: allRequirements,
              notifications: allNotifications,
              totalUserEvents: userEvents.length,
              totalSystemEvents: allEvents.length,
              lastFetched: now,
              loading: false
            });
            
          }
        } catch (error) {
          set({ loading: false });
        }
      },
      
      fetchReadNotifications: async (userId: string) => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await axios.get(`${API_BASE_URL}/notifications/read-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.data.success) {
            set({ readNotifications: new Set(response.data.data) });
          }
        } catch (error) {
          // Fallback to localStorage
          const savedReadNotifications = localStorage.getItem(`readNotifications_${userId}`);
          if (savedReadNotifications) {
            set({ readNotifications: new Set(JSON.parse(savedReadNotifications)) });
          }
        }
      },
      
      markNotificationAsRead: async (notificationId: string, notification: Notification) => {
        const state = get();
        
        // Optimistically update UI
        const newReadSet = new Set(state.readNotifications);
        newReadSet.add(notificationId);
        set({ readNotifications: newReadSet });

        try {
          const token = localStorage.getItem('authToken');
          const response = await axios.post(`${API_BASE_URL}/notifications/mark-read`, {
            notificationId,
            eventId: notification.eventId,
            notificationType: notification.type,
            category: notification.category
          }, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.data.success) {
            // Rollback on failure
            const rollbackSet = new Set(state.readNotifications);
            rollbackSet.delete(notificationId);
            set({ readNotifications: rollbackSet });
          }
        } catch (error) {
          // Rollback on error
          const rollbackSet = new Set(state.readNotifications);
          rollbackSet.delete(notificationId);
          set({ readNotifications: rollbackSet });
        }
      },
      
      clearCache: () => {
        set({
          userEvents: [],
          upcomingEvents: [],
          notifications: [],
          requirementsOverview: [],
          totalUserEvents: 0,
          totalSystemEvents: 0,
          lastFetched: null
        });
      },
      
      refreshNotifications: async (userId: string) => {
        // Force refresh dashboard data
        const state = get();
        await state.fetchDashboardData(userId, true);
      },
      
      // Getters
      getFilteredRequirements: (eventFilter: string) => {
        const state = get();
        if (eventFilter === 'all') {
          return state.requirementsOverview;
        }
        return state.requirementsOverview.filter(req => req.eventId === eventFilter);
      },
      
      getUniqueEvents: () => {
        const state = get();
        const uniqueEvents = new Map();
        state.requirementsOverview.forEach(req => {
          if (!uniqueEvents.has(req.eventId)) {
            uniqueEvents.set(req.eventId, {
              id: req.eventId,
              title: req.eventTitle
            });
          }
        });
        return Array.from(uniqueEvents.values());
      },
      
      getUnreadCount: (category?: string) => {
        const state = get();
        let notificationsList = state.notifications;
        
        if (category) {
          notificationsList = notificationsList.filter(n => n.category === category);
        }
        
        return notificationsList.filter(n => !state.readNotifications.has(n.id)).length;
      },
    }),
    {
      name: 'dashboard-store',
    }
  )
);