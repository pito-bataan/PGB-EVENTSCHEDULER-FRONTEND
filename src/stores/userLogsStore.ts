import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
let socket: Socket | null = null;

interface ActivityLog {
  _id: string;
  userId: string;
  username: string;
  email: string;
  department: string;
  action: string;
  description: string;
  eventId?: string;
  eventTitle?: string;
  details?: any;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

interface EventLog {
  _id: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment: string;
  location: string;
  status: string;
  submittedAt: string;
  createdAt: string;
}

interface UserLogsState {
  // Activity logs (includes login, reschedule, etc.)
  activityLogs: ActivityLog[];
  activityLogsLoading: boolean;
  activityLogsLastFetched: number | null;
  
  // Event logs (submitted events)
  eventLogs: EventLog[];
  eventLogsLoading: boolean;
  eventLogsLastFetched: number | null;
  
  // Filters
  searchQuery: string;
  actionFilter: 'all' | 'login' | 'event' | 'reschedule_event';
  departmentFilter: string;
  dateFilter: 'all' | 'today' | 'week' | 'month';
  
  // Cache duration (5 minutes)
  CACHE_DURATION: number;
  
  // Actions
  fetchActivityLogs: (force?: boolean) => Promise<void>;
  fetchEventLogs: (force?: boolean) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setActionFilter: (filter: 'all' | 'login' | 'event' | 'reschedule_event') => void;
  setDepartmentFilter: (department: string) => void;
  setDateFilter: (filter: 'all' | 'today' | 'week' | 'month') => void;
  clearFilters: () => void;
  getFilteredLogs: () => (ActivityLog | EventLog)[];
  getStats: () => {
    totalLogs: number;
    totalLogins: number;
    totalReschedules: number;
    totalEvents: number;
    uniqueUsers: number;
  };
  initializeSocketListeners: () => void;
  addNewActivityLog: (log: ActivityLog) => void;
  addNewEventLog: (log: EventLog) => void;
  // Backward compatibility
  loginLogs: ActivityLog[];
  loginLogsLoading: boolean;
  fetchLoginLogs: (force?: boolean) => Promise<void>;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const useUserLogsStore = create<UserLogsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activityLogs: [],
      activityLogsLoading: false,
      activityLogsLastFetched: null,
      
      eventLogs: [],
      eventLogsLoading: false,
      eventLogsLastFetched: null,
      
      searchQuery: '',
      actionFilter: 'all',
      departmentFilter: 'all',
      dateFilter: 'all',
      
      CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
      
      // Backward compatibility
      get loginLogs() { return get().activityLogs.filter(log => log.action === 'login'); },
      get loginLogsLoading() { return get().activityLogsLoading; },
      
      // Fetch activity logs (login, reschedule, etc.)
      fetchActivityLogs: async (force = false) => {
        const { activityLogsLastFetched, CACHE_DURATION } = get();
        const now = Date.now();
        
        // Check cache
        if (!force && activityLogsLastFetched && (now - activityLogsLastFetched < CACHE_DURATION)) {
          return;
        }
        
        set({ activityLogsLoading: true });
        
        try {
          const response = await axios.get(`${API_BASE_URL}/user-activity-logs`, {
            headers: getAuthHeaders()
          });
          
          if (response.data.success) {
            set({
              activityLogs: response.data.data,
              activityLogsLastFetched: now,
              activityLogsLoading: false
            });
          }
        } catch (error) {
          console.error('Error fetching activity logs:', error);
          set({ activityLogsLoading: false });
        }
      },
      
      // Backward compatibility
      fetchLoginLogs: async (force = false) => {
        return get().fetchActivityLogs(force);
      },
      
      // Fetch event logs (submitted events)
      fetchEventLogs: async (force = false) => {
        const { eventLogsLastFetched, CACHE_DURATION } = get();
        const now = Date.now();
        
        // Check cache
        if (!force && eventLogsLastFetched && (now - eventLogsLastFetched < CACHE_DURATION)) {
          return;
        }
        
        set({ eventLogsLoading: true });
        
        try {
          const response = await axios.get(`${API_BASE_URL}/events`, {
            headers: getAuthHeaders()
          });
          
          if (response.data.success) {
            // Filter only submitted events
            const submittedEvents = response.data.data.filter(
              (event: EventLog) => event.status === 'submitted'
            );
            
            set({
              eventLogs: submittedEvents,
              eventLogsLastFetched: now,
              eventLogsLoading: false
            });
          }
        } catch (error) {
          console.error('Error fetching event logs:', error);
          set({ eventLogsLoading: false });
        }
      },
      
      // Set search query
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      // Set action filter
      setActionFilter: (filter) => set({ actionFilter: filter }),
      
      // Set department filter
      setDepartmentFilter: (department) => set({ departmentFilter: department }),
      
      // Set date filter
      setDateFilter: (filter) => set({ dateFilter: filter }),
      
      // Clear all filters
      clearFilters: () => set({
        searchQuery: '',
        actionFilter: 'all',
        departmentFilter: 'all',
        dateFilter: 'all'
      }),
      
      // Get filtered logs
      getFilteredLogs: () => {
        const {
          activityLogs,
          eventLogs,
          searchQuery,
          actionFilter,
          departmentFilter,
          dateFilter
        } = get();
        
        let allLogs: (ActivityLog | EventLog)[] = [];
        
        // Combine logs based on action filter
        if (actionFilter === 'all') {
          allLogs = [...activityLogs, ...eventLogs];
        } else if (actionFilter === 'login' || actionFilter === 'reschedule_event') {
          allLogs = activityLogs.filter(log => log.action === actionFilter);
        } else if (actionFilter === 'event') {
          allLogs = [...eventLogs];
        }
        
        // Apply search filter
        if (searchQuery) {
          allLogs = allLogs.filter(log => {
            if ('action' in log) {
              // Activity log
              return (
                log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.eventTitle && log.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()))
              );
            } else {
              // Event log
              return (
                log.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.requestor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.requestorDepartment.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.location.toLowerCase().includes(searchQuery.toLowerCase())
              );
            }
          });
        }
        
        // Apply department filter
        if (departmentFilter !== 'all') {
          allLogs = allLogs.filter(log => {
            if ('action' in log) {
              return log.department === departmentFilter;
            } else {
              return log.requestorDepartment === departmentFilter;
            }
          });
        }
        
        // Apply date filter
        if (dateFilter !== 'all') {
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          allLogs = allLogs.filter(log => {
            const logDate = new Date('action' in log ? log.timestamp : log.submittedAt);
            
            switch (dateFilter) {
              case 'today':
                return logDate >= today;
              case 'week':
                return logDate >= weekAgo;
              case 'month':
                return logDate >= monthAgo;
              default:
                return true;
            }
          });
        }
        
        // Sort by date (newest first)
        allLogs.sort((a, b) => {
          const dateA = new Date('action' in a ? a.timestamp : a.submittedAt);
          const dateB = new Date('action' in b ? b.timestamp : b.submittedAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        return allLogs;
      },
      
      // Get stats
      getStats: () => {
        const { activityLogs, eventLogs } = get();
        
        const loginLogs = activityLogs.filter(log => log.action === 'login');
        const rescheduleLogs = activityLogs.filter(log => log.action === 'reschedule_event');
        
        const uniqueUsers = new Set([
          ...activityLogs.map(log => log.userId),
          ...eventLogs.map(log => log.requestor)
        ]).size;
        
        return {
          totalLogs: activityLogs.length + eventLogs.length,
          totalLogins: loginLogs.length,
          totalReschedules: rescheduleLogs.length,
          totalEvents: eventLogs.length,
          uniqueUsers
        };
      },
      
      // Initialize Socket.IO listeners for real-time updates
      initializeSocketListeners: () => {
        if (socket) return; // Already initialized
        
        socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
          transports: ['websocket', 'polling']
        });
        
        // Listen for new activity logs
        socket.on('new-activity-log', (activityLog: ActivityLog) => {
          get().addNewActivityLog(activityLog);
        });
        
        // Listen for new event submissions
        socket.on('new-event-submitted', (event: EventLog) => {
          if (event.status === 'submitted') {
            get().addNewEventLog(event);
          }
        });
      },
      
      // Add new activity log to the list
      addNewActivityLog: (log: ActivityLog) => {
        set((state) => ({
          activityLogs: [log, ...state.activityLogs]
        }));
      },
      
      // Add new event log to the list
      addNewEventLog: (log: EventLog) => {
        set((state) => ({
          eventLogs: [log, ...state.eventLogs]
        }));
      }
    }),
    { name: 'UserLogsStore' }
  )
);
