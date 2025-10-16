import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

interface Event {
  _id: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment: string;
  location: string;
  participants: number;
  vip: number;
  vvip: number;
  withoutGov: boolean;
  multipleLocations: boolean;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  contactNumber: string;
  contactEmail: string;
  attachments: any[];
  noAttachments: boolean;
  taggedDepartments: string[];
  departmentRequirements: any;
  status: string;
  submittedAt?: string;
  createdBy: string;
  createdAt: string;
}

interface AllEventsState {
  // Data
  events: Event[];
  selectedEvent: Event | null;
  
  // Filters
  searchQuery: string;
  locationFilter: string;
  statusFilter: string;
  dateFilter: string;
  
  // Loading & Cache
  loading: boolean;
  lastFetched: number | null;
  CACHE_DURATION: number;
  
  // Actions
  fetchAllEvents: (force?: boolean) => Promise<void>;
  setSelectedEvent: (event: Event | null) => void;
  setSearchQuery: (query: string) => void;
  setLocationFilter: (location: string) => void;
  setStatusFilter: (status: string) => void;
  setDateFilter: (date: string) => void;
  clearFilters: () => void;
  clearCache: () => void;
  
  // Getters
  getFilteredEvents: () => Event[];
  getUniqueLocations: () => string[];
}

export const useAllEventsStore = create<AllEventsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      events: [],
      selectedEvent: null,
      searchQuery: '',
      locationFilter: 'all',
      statusFilter: 'all',
      dateFilter: 'all',
      loading: false,
      lastFetched: null,
      CACHE_DURATION: 5 * 60 * 1000, // 5 minutes cache
      
      // Actions
      fetchAllEvents: async (force = false) => {
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

          const response = await axios.get(`${API_BASE_URL}/events`, { headers });
          
          if (response.data.success) {
            const events = response.data.data || [];
            
            // Filter only approved and submitted events with locations
            const bookedEvents = events.filter((event: Event) => 
              (event.status === 'approved' || event.status === 'submitted') && 
              event.location
            );
            
            set({
              events: bookedEvents,
              lastFetched: now,
              loading: false
            });
          }
        } catch (error) {
          set({ loading: false });
        }
      },
      
      setSelectedEvent: (event: Event | null) => {
        set({ selectedEvent: event });
      },
      
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },
      
      setLocationFilter: (location: string) => {
        set({ locationFilter: location });
      },
      
      setStatusFilter: (status: string) => {
        set({ statusFilter: status });
      },
      
      setDateFilter: (date: string) => {
        set({ dateFilter: date });
      },
      
      clearFilters: () => {
        set({
          searchQuery: '',
          locationFilter: 'all',
          statusFilter: 'all',
          dateFilter: 'all'
        });
      },
      
      clearCache: () => {
        set({
          events: [],
          selectedEvent: null,
          lastFetched: null
        });
      },
      
      // Getters
      getFilteredEvents: () => {
        const state = get();
        let filtered = [...state.events];
        
        // Search filter
        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(event =>
            event.eventTitle.toLowerCase().includes(query) ||
            event.requestor.toLowerCase().includes(query) ||
            event.requestorDepartment.toLowerCase().includes(query) ||
            event.location.toLowerCase().includes(query)
          );
        }
        
        // Location filter
        if (state.locationFilter !== 'all') {
          filtered = filtered.filter(event => event.location === state.locationFilter);
        }
        
        // Status filter
        if (state.statusFilter !== 'all') {
          filtered = filtered.filter(event => event.status === state.statusFilter);
        }
        
        // Date filter
        if (state.dateFilter !== 'all') {
          const now = new Date();
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.startDate);
            
            switch (state.dateFilter) {
              case 'today':
                return eventDate.toDateString() === now.toDateString();
              case 'week':
                const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                return eventDate >= now && eventDate <= weekFromNow;
              case 'month':
                const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                return eventDate >= now && eventDate <= monthFromNow;
              case 'past':
                return eventDate < now;
              default:
                return true;
            }
          });
        }
        
        // Sort by date (newest first)
        return filtered.sort((a, b) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
      },
      
      getUniqueLocations: () => {
        const state = get();
        const locations = new Set(state.events.map(event => event.location));
        return Array.from(locations).sort();
      },
    }),
    {
      name: 'all-events-store',
    }
  )
);
