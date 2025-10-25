import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

interface UpcomingEvent {
  _id: string;
  eventTitle: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  location: string;
  locations?: string[];
  requestorDepartment: string;
  status: string;
}

interface DashboardStats {
  totalEvents: number;
  approvedEvents: number;
  submittedEvents: number;
  upcomingEvents: number;
}

interface AdminDashboardState {
  // Upcoming events
  upcomingEvents: UpcomingEvent[];
  upcomingEventsLoading: boolean;
  upcomingEventsLastFetched: number | null;
  
  // Dashboard stats
  stats: DashboardStats;
  statsLoading: boolean;
  statsLastFetched: number | null;
  
  // Cache duration (5 minutes)
  CACHE_DURATION: number;
  
  // Actions
  fetchUpcomingEvents: (force?: boolean) => Promise<void>;
  fetchDashboardStats: (force?: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const useAdminDashboardStore = create<AdminDashboardState>()(
  devtools(
    (set, get) => ({
      // Initial state
      upcomingEvents: [],
      upcomingEventsLoading: false,
      upcomingEventsLastFetched: null,
      
      stats: {
        totalEvents: 0,
        approvedEvents: 0,
        submittedEvents: 0,
        upcomingEvents: 0
      },
      statsLoading: false,
      statsLastFetched: null,
      
      CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
      
      // Fetch upcoming events
      fetchUpcomingEvents: async (force = false) => {
        const { upcomingEventsLastFetched, CACHE_DURATION } = get();
        const now = Date.now();
        
        // Check cache
        if (!force && upcomingEventsLastFetched && (now - upcomingEventsLastFetched < CACHE_DURATION)) {
          return;
        }
        
        set({ upcomingEventsLoading: true });
        
        try {
          const response = await axios.get(`${API_BASE_URL}/events`, {
            headers: getAuthHeaders()
          });
          
          if (response.data.success) {
            // Get today's date at midnight for comparison
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Filter for approved/submitted events from today onwards and sort by start date
            const upcoming = response.data.data
              .filter((event: UpcomingEvent) => 
                (event.status === 'approved' || event.status === 'submitted') &&
                new Date(event.startDate) >= today
              )
              .sort((a: UpcomingEvent, b: UpcomingEvent) => 
                new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
              )
              .slice(0, 8); // Get only 8 events
            
            set({
              upcomingEvents: upcoming,
              upcomingEventsLastFetched: now,
              upcomingEventsLoading: false
            });
          }
        } catch (error) {
          set({ upcomingEventsLoading: false });
        }
      },
      
      // Fetch dashboard stats
      fetchDashboardStats: async (force = false) => {
        const { statsLastFetched, CACHE_DURATION } = get();
        const now = Date.now();
        
        // Check cache
        if (!force && statsLastFetched && (now - statsLastFetched < CACHE_DURATION)) {
          return;
        }
        
        set({ statsLoading: true });
        
        try {
          const response = await axios.get(`${API_BASE_URL}/events`, {
            headers: getAuthHeaders()
          });
          
          if (response.data.success) {
            const events = response.data.data;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Calculate stats
            const stats: DashboardStats = {
              totalEvents: events.length,
              approvedEvents: events.filter((e: UpcomingEvent) => e.status === 'approved').length,
              submittedEvents: events.filter((e: UpcomingEvent) => e.status === 'submitted').length,
              upcomingEvents: events.filter((e: UpcomingEvent) => 
                (e.status === 'approved' || e.status === 'submitted') &&
                new Date(e.startDate) >= today
              ).length
            };
            
            set({
              stats,
              statsLastFetched: now,
              statsLoading: false
            });
          }
        } catch (error) {
          set({ statsLoading: false });
        }
      },
      
      // Refresh all data
      refreshAll: async () => {
        await Promise.all([
          get().fetchUpcomingEvents(true),
          get().fetchDashboardStats(true)
        ]);
      }
    }),
    { name: 'AdminDashboardStore' }
  )
);
