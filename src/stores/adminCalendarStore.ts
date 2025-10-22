import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';
import { format } from 'date-fns';
import type { CalendarEvent } from '@/components/ui/custom-calendar';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export interface Event {
  _id: string;
  eventTitle: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: string;
  requestor: string;
  requestorDepartment: string;
}

interface AdminCalendarState {
  // Data
  events: Event[];
  calendarEvents: CalendarEvent[];
  
  // Loading & Cache
  loading: boolean;
  lastFetched: number | null;
  CACHE_DURATION: number;
  
  // Actions
  fetchEvents: (force?: boolean) => Promise<void>;
  clearCache: () => void;
  
  // Getters
  getEventsForDate: (date: Date) => Event[];
  convertToCalendarEvents: (events: Event[]) => CalendarEvent[];
}

export const useAdminCalendarStore = create<AdminCalendarState>()(
  devtools(
    (set, get) => ({
      // Initial state
      events: [],
      calendarEvents: [],
      loading: false,
      lastFetched: null,
      CACHE_DURATION: 5 * 60 * 1000, // 5 minutes cache
      
      // Actions
      fetchEvents: async (force = false) => {
        const state = get();
        const now = Date.now();
        
        // Check cache (unless forced)
        if (!force && state.lastFetched && (now - state.lastFetched) < state.CACHE_DURATION) {
          console.log('⚠️ Using cached events');
          return;
        }
        
        console.log('🔄 Fetching fresh events from API');
        set({ loading: true });
        
        try {
          const token = localStorage.getItem('authToken');
          const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          };

          const response = await axios.get(`${API_BASE_URL}/events`, { headers });
          
          if (response.data.success) {
            const allEvents = response.data.data;
            
            // Filter events (exclude only drafts)
            // Show submitted, approved, rejected, cancelled, and completed events
            const filteredEvents = allEvents.filter(
              (event: Event) => event.status !== 'draft'
            );
            
            // Convert to calendar events
            const calEvents = get().convertToCalendarEvents(filteredEvents);
            
            set({
              events: filteredEvents,
              calendarEvents: calEvents,
              lastFetched: now,
              loading: false
            });
          }
        } catch (error) {
          set({ loading: false });
        }
      },
      
      clearCache: () => {
        set({
          events: [],
          calendarEvents: [],
          lastFetched: null
        });
      },
      
      // Getters
      getEventsForDate: (date: Date) => {
        const state = get();
        const dateStr = format(date, 'yyyy-MM-dd');
        return state.events.filter(event => {
          const eventStartDate = format(new Date(event.startDate), 'yyyy-MM-dd');
          return eventStartDate === dateStr;
        });
      },
      
      convertToCalendarEvents: (events: Event[]) => {
        const calEvents: CalendarEvent[] = [];
        
        events.forEach(event => {
          // Determine color based on status
          console.log(`Event: ${event.eventTitle}, Status: "${event.status}"`);
          let color = '#E0E7FF'; // Default light blue
          if (event.status === 'approved') {
            color = '#D1FAE5'; // Light green for approved (green-200)
          } else if (event.status === 'submitted') {
            color = '#DBEAFE'; // Light blue for submitted (blue-200)
          } else if (event.status === 'cancelled') {
            color = '#FEF08A'; // Light yellow for cancelled (yellow-200) - SAME SHADE AS OTHERS!
            console.log(`✅ Cancelled event detected: ${event.eventTitle}, color: ${color}`);
          } else if (event.status === 'rejected') {
            color = '#FECACA'; // Light red for rejected (red-200)
          } else if (event.status === 'completed') {
            color = '#E9D5FF'; // Light purple for completed (purple-200)
          }
          console.log(`Final color for ${event.eventTitle}: ${color}`);
          
          // Add event for start date
          calEvents.push({
            id: event._id,
            date: event.startDate,
            title: event.eventTitle,
            type: 'booking',
            color: color,
            className: 'cursor-pointer hover:opacity-80 transition-opacity'
          });
        });

        return calEvents;
      },
    }),
    {
      name: 'admin-calendar-store',
    }
  )
);
