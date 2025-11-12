import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import axios from 'axios';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export interface Event {
  _id: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment?: string;
  location: string;
  locations?: string[];
  participants: number;
  vip?: number;
  vvip?: number;
  withoutGov?: boolean;
  multipleLocations?: boolean;
  description?: string;
  eventType?: 'simple' | 'complex' | 'simple-meeting';
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  dateTimeSlots?: {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  }[];
  contactNumber: string;
  contactEmail: string;
  attachments: any[];
  noAttachments?: boolean;
  govFiles: {
    brieferTemplate?: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
      uploadedAt: Date;
    };
    availableForDL?: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
      uploadedAt: Date;
    };
    programme?: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
      uploadedAt: Date;
    };
  };
  taggedDepartments: string[];
  departmentRequirements: any;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  submittedAt?: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    department: string;
  };
  createdAt: string;
  updatedAt?: string;
}

interface AllEventsState {
  // Data
  events: Event[];
  departments: string[];
  selectedEvent: Event | null;
  
  // Filters
  searchQuery: string;
  locationFilter: string;
  statusFilter: string;
  departmentFilter: string;
  dateFilter: string;
  eventTypeFilter: string;
  sortBy: string;
  
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
  setDepartmentFilter: (department: string) => void;
  setDateFilter: (date: string) => void;
  setEventTypeFilter: (eventType: string) => void;
  setSortBy: (sortBy: string) => void;
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
      departments: [],
      selectedEvent: null,
      searchQuery: '',
      locationFilter: 'all',
      statusFilter: 'all',
      departmentFilter: 'all',
      dateFilter: 'all',
      eventTypeFilter: 'all',
      sortBy: 'status-priority', // Default to status priority (submitted first)
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
            
            // Extract unique departments
            const uniqueDepartments = new Set<string>();
            events.forEach((event: Event) => {
              if (event.taggedDepartments && event.taggedDepartments.length > 0) {
                event.taggedDepartments.forEach(dept => {
                  if (dept && dept.trim()) uniqueDepartments.add(dept.trim());
                });
              }
              if (event.requestorDepartment && event.requestorDepartment.trim()) {
                uniqueDepartments.add(event.requestorDepartment.trim());
              }
            });
            
            const departmentsList = Array.from(uniqueDepartments).sort();
            
            // Store ALL events (admin needs to see everything)
            set({
              events: events,
              departments: departmentsList,
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
      
      setDepartmentFilter: (department: string) => {
        set({ departmentFilter: department });
      },
      
      setDateFilter: (date: string) => {
        set({ dateFilter: date });
      },
      
      setEventTypeFilter: (eventType: string) => {
        set({ eventTypeFilter: eventType });
      },
      
      setSortBy: (sortBy: string) => {
        set({ sortBy: sortBy });
      },
      
      clearFilters: () => {
        set({
          searchQuery: '',
          locationFilter: 'all',
          statusFilter: 'all',
          departmentFilter: 'all',
          dateFilter: 'all',
          eventTypeFilter: 'all'
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
            event.requestorDepartment?.toLowerCase().includes(query) ||
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
        
        // Department filter
        if (state.departmentFilter !== 'all') {
          filtered = filtered.filter(event => 
            (event.taggedDepartments && event.taggedDepartments.includes(state.departmentFilter)) ||
            (event.requestorDepartment && event.requestorDepartment === state.departmentFilter)
          );
        }
        
        // Event Type filter
        if (state.eventTypeFilter !== 'all') {
          filtered = filtered.filter(event => event.eventType === state.eventTypeFilter);
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
        
        // Sort based on selected sorting option
        return filtered.sort((a, b) => {
          switch (state.sortBy) {
            case 'status-priority':
              // Priority order: submitted > approved > rejected > cancelled > completed
              const statusPriority = {
                'submitted': 5,
                'approved': 4,
                'rejected': 3,
                'cancelled': 2,
                'completed': 1
              };
              
              const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 0;
              const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 0;
              
              // If different status priorities, sort by priority
              if (aPriority !== bPriority) {
                return bPriority - aPriority;
              }
              
              // If same status priority, sort by creation date (newest first)
              return new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime();
              
            case 'upcoming-events':
              // Sort by start date (upcoming events first)
              return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
              
            case 'recent-created':
              // Sort by creation date (most recent first)
              return new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime();
              
            case 'event-title':
              // Sort alphabetically by event title
              return a.eventTitle.localeCompare(b.eventTitle);
              
            case 'requestor-name':
              // Sort alphabetically by requestor name
              return a.requestor.localeCompare(b.requestor);
              
            default:
              // Default to status priority
              return new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime();
          }
        });
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
