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
  locations?: string[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  dateTimeSlots?: Array<{
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  }>;
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
          
          // Check if main date matches
          if (eventStartDate === dateStr) {
            return true;
          }
          
          // Check if any additional dateTimeSlots match
          if (event.dateTimeSlots && event.dateTimeSlots.length > 0) {
            return event.dateTimeSlots.some(slot => {
              const slotDate = format(new Date(slot.startDate), 'yyyy-MM-dd');
              return slotDate === dateStr;
            });
          }
          
          return false;
        });
      },
      
      convertToCalendarEvents: (events: Event[]) => {
        const calEvents: CalendarEvent[] = [];
        
        events.forEach(event => {
          // Determine color based on status
          let color = '#E0E7FF'; // Default light blue
          if (event.status === 'approved') {
            color = '#D1FAE5'; // Light green for approved (green-200)
          } else if (event.status === 'submitted') {
            color = '#DBEAFE'; // Light blue for submitted (blue-200)
          } else if (event.status === 'cancelled') {
            color = '#FEF08A'; // Light yellow for cancelled (yellow-200)
          } else if (event.status === 'rejected') {
            color = '#FECACA'; // Light red for rejected (red-200)
          } else if (event.status === 'completed') {
            color = '#E9D5FF'; // Light purple for completed (purple-200)
          }
          
          // Helper function to format date consistently
          const formatDateForCalendar = (dateStr: string) => {
            // Convert ISO date to YYYY-MM-DD format
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          };
          
          // Add event for start date
          const mainDate = formatDateForCalendar(event.startDate);
          
          const mainEventEntry = {
            id: event._id,
            date: mainDate,
            title: event.eventTitle,
            type: 'booking' as const,
            color: color,
            className: 'cursor-pointer hover:opacity-80 transition-opacity'
          };
          calEvents.push(mainEventEntry);
          
          // Add events for additional date/time slots
          if (event.dateTimeSlots && event.dateTimeSlots.length > 0) {
            event.dateTimeSlots.forEach((slot: any, index: number) => {
              const slotDate = formatDateForCalendar(slot.startDate);
              
              const slotEventEntry = {
                id: `${event._id}-slot-${index}`,
                date: slotDate,
                title: event.eventTitle,
                type: 'booking' as const,
                color: color,
                className: 'cursor-pointer hover:opacity-80 transition-opacity'
              };
              calEvents.push(slotEventEntry);
            });
          }
        });

        return calEvents;
      },
    }),
    {
      name: 'admin-calendar-store',
    }
  )
);
