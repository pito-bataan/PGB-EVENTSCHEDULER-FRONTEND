import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
interface Requirement {
  id: string;
  name: string;
  selected: boolean;
  notes: string;
  type: string;
  totalQuantity: number;
  isAvailable: boolean;
  availabilityNotes: string;
  quantity: number;
  status?: string;
  departmentNotes?: string;
  lastUpdated?: string;
}

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
  govFiles: Record<string, any>;
  taggedDepartments: string[];
  departmentRequirements: Record<string, Requirement[]>;
  status: string;
  submittedAt: string;
  createdBy: string;
}

interface TaggedDepartmentsState {
  // Data
  events: Event[];
  selectedEvent: Event | null;
  currentUserDepartment: string;
  
  // UI State
  loading: boolean;
  showNotesMap: Record<string, boolean>;
  notesMap: Record<string, string>;
  activeEventTab: 'ongoing' | 'completed';
  statusDialog: {
    isOpen: boolean;
    eventId: string;
    requirementId: string;
    status: string;
  };
  
  // Cache
  lastFetched: number | null;
  CACHE_DURATION: number;
  
  // Actions
  fetchTaggedEvents: (force?: boolean) => Promise<void>;
  setSelectedEvent: (event: Event | null) => void;
  setActiveEventTab: (tab: 'ongoing' | 'completed') => void;
  setShowNotes: (requirementId: string, show: boolean) => void;
  setNotes: (requirementId: string, notes: string) => void;
  setStatusDialog: (dialog: { isOpen: boolean; eventId: string; requirementId: string; status: string }) => void;
  updateRequirementStatus: (eventId: string, requirementId: string, status: string) => Promise<void>;
  updateRequirementNotes: (eventId: string, requirementId: string, notes: string) => Promise<void>;
  clearCache: () => void;
  
  // Getters
  getOngoingEvents: () => Event[];
  getCompletedEvents: () => Event[];
  getRequirementCounts: (event: Event) => {
    all: number;
    confirmed: number;
    pending: number;
    declined: number;
    partially_fulfill: number;
    in_preparation: number;
  };
}

export const useTaggedDepartmentsStore = create<TaggedDepartmentsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      events: [],
      selectedEvent: null,
      currentUserDepartment: '',
      loading: false,
      showNotesMap: {},
      notesMap: {},
      activeEventTab: 'ongoing',
      statusDialog: {
        isOpen: false,
        eventId: '',
        requirementId: '',
        status: ''
      },
      lastFetched: null,
      CACHE_DURATION: 5 * 60 * 1000, // 5 minutes cache
      
      // Actions
      fetchTaggedEvents: async (force = false) => {
        const state = get();
        const now = Date.now();
        
        // Check cache (unless forced)
        if (!force && state.lastFetched && (now - state.lastFetched) < state.CACHE_DURATION) {
          console.log('🎯 Using cached tagged events data');
          return;
        }
        
        console.log('🔄 Fetching fresh tagged events data...');
        set({ loading: true });
        
        try {
          const token = localStorage.getItem('authToken');
          
          if (!token) {
            console.error('No auth token found');
            set({ loading: false });
            return;
          }

          // Get current user's department from localStorage
          const userData = localStorage.getItem('userData');
          let userDepartment = '';
          if (userData) {
            try {
              const user = JSON.parse(userData);
              userDepartment = user.department || user.departmentName || '';
            } catch (error) {
              console.error('Error parsing user data:', error);
            }
          }

          const response = await fetch(`${API_BASE_URL}/api/events/tagged`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.status === 403) {
            console.error('Permission denied for tagged events');
            set({ loading: false });
            return;
          }

          if (response.status === 401) {
            console.error('Session expired');
            set({ loading: false });
            return;
          }

          if (!response.ok) {
            throw new Error('Failed to fetch tagged events');
          }

          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            set({
              events: data.data,
              currentUserDepartment: userDepartment,
              lastFetched: now,
              loading: false
            });
            console.log('✅ Tagged events data cached successfully');
          } else {
            console.error('Unexpected API response structure:', data);
            set({ events: [], loading: false });
          }
        } catch (error) {
          console.error('Error fetching tagged events:', error);
          set({ loading: false });
        }
      },
      
      setSelectedEvent: (event: Event | null) => {
        set({ selectedEvent: event });
      },
      
      setActiveEventTab: (tab: 'ongoing' | 'completed') => {
        set({ activeEventTab: tab });
      },
      
      setShowNotes: (requirementId: string, show: boolean) => {
        set(state => ({
          showNotesMap: {
            ...state.showNotesMap,
            [requirementId]: show
          }
        }));
      },
      
      setNotes: (requirementId: string, notes: string) => {
        set(state => ({
          notesMap: {
            ...state.notesMap,
            [requirementId]: notes
          }
        }));
      },
      
      setStatusDialog: (dialog) => {
        set({ statusDialog: dialog });
      },
      
      updateRequirementStatus: async (eventId: string, requirementId: string, status: string) => {
        try {
          console.log('🔄 Updating requirement status:', { eventId, requirementId, status });
          const token = localStorage.getItem('authToken');
          
          if (!token) {
            throw new Error('Please log in to update requirements');
          }

          const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/requirements/${requirementId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
          });

          if (response.status === 403) {
            throw new Error('You do not have permission to update this requirement');
          }

          if (response.status === 401) {
            throw new Error('Session expired. Please log in again');
          }

          if (!response.ok) {
            throw new Error('Failed to update requirement status');
          }

          // Refresh the events list to get updated data
          await get().fetchTaggedEvents(true);
          console.log('✅ Requirement status updated successfully');
          
        } catch (error) {
          console.error('Error updating requirement status:', error);
          throw error;
        }
      },
      
      updateRequirementNotes: async (eventId: string, requirementId: string, notes: string) => {
        try {
          console.log('🔄 Updating requirement notes:', { eventId, requirementId, notes });
          const token = localStorage.getItem('authToken');
          
          if (!token) {
            throw new Error('Please log in to update notes');
          }

          const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/requirements/${requirementId}/notes`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ departmentNotes: notes })
          });

          if (response.status === 403) {
            throw new Error('You do not have permission to update notes for this requirement');
          }

          if (response.status === 401) {
            throw new Error('Session expired. Please log in again');
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          }

          // Refresh the events list to get updated data
          await get().fetchTaggedEvents(true);
          console.log('✅ Requirement notes updated successfully');
          
        } catch (error) {
          console.error('Error updating requirement notes:', error);
          throw error;
        }
      },
      
      clearCache: () => {
        set({
          events: [],
          selectedEvent: null,
          lastFetched: null,
          showNotesMap: {},
          notesMap: {}
        });
      },
      
      // Getters
      getOngoingEvents: () => {
        const state = get();
        return state.events.filter(event => {
          const userDeptReqs = event.departmentRequirements[state.currentUserDepartment] || [];
          const confirmedCount = userDeptReqs.filter(r => (r.status || 'pending') === 'confirmed').length;
          const totalCount = userDeptReqs.length;
          return totalCount === 0 || confirmedCount < totalCount;
        });
      },
      
      getCompletedEvents: () => {
        const state = get();
        return state.events.filter(event => {
          const userDeptReqs = event.departmentRequirements[state.currentUserDepartment] || [];
          const confirmedCount = userDeptReqs.filter(r => (r.status || 'pending') === 'confirmed').length;
          const totalCount = userDeptReqs.length;
          return totalCount > 0 && confirmedCount === totalCount;
        });
      },
      
      getRequirementCounts: (event: Event) => {
        const state = get();
        const userDepartmentRequirements = event.departmentRequirements[state.currentUserDepartment] || [];
        const counts = {
          all: userDepartmentRequirements.length,
          confirmed: 0,
          pending: 0,
          declined: 0,
          partially_fulfill: 0,
          in_preparation: 0
        };

        userDepartmentRequirements.forEach(req => {
          const status = req.status || 'pending';
          if (counts.hasOwnProperty(status)) {
            counts[status as keyof typeof counts]++;
          }
        });

        return counts;
      },
    }),
    {
      name: 'tagged-departments-store',
    }
  )
);
