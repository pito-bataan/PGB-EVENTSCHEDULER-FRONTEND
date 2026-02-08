    import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const API_BASE_URL = import.meta.env.VITE_API_URL;

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
  requirementsStatus?: 'on-hold' | 'released'; // Track if requirements are on-hold or released
  declineReason?: string;
  yesNoAnswer?: 'yes' | 'no';
  isCustom?: boolean;
  replies?: Array<{
    userId: string;
    userName: string;
    role: 'requestor' | 'department';
    message: string;
    createdAt: string;
    isRead?: boolean;
  }>;
}

interface Event {
  _id: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment: string;
  location: string;
  locations?: string[];
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
  activeEventTab: 'ongoing' | 'completed' | 'declined' | 'done' | 'cancelled';
  statusDialog: {
    isOpen: boolean;
    eventId: string;
    requirementId: string;
    status: string;
    requirementName?: string;
  };
  
  // Cache
  lastFetched: number | null;
  CACHE_DURATION: number;
  
  // Actions
  fetchTaggedEvents: (force?: boolean) => Promise<void>;
  setSelectedEvent: (event: Event | null) => void;
  setActiveEventTab: (tab: 'ongoing' | 'completed' | 'declined' | 'done' | 'cancelled') => void;
  setShowNotes: (requirementId: string, show: boolean) => void;
  setNotes: (requirementId: string, notes: string) => void;
  setStatusDialog: (dialog: { isOpen: boolean; eventId: string; requirementId: string; status: string; requirementName?: string }) => void;
  updateRequirementStatus: (eventId: string, requirementId: string, status: string, declineReason?: string) => Promise<void>;
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
          return;
        }
        
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
          console.log('📦 Fetched events data:', data.data?.length, 'events');
          if (data.success && Array.isArray(data.data)) {
            // Filter events to only show APPROVED or COMPLETED events with RELEASED requirements
            const filteredEvents = data.data
              .filter((event: Event) => {
                // CRITICAL: Only show events that are APPROVED or COMPLETED (keep completed events for records)
                const st = String(event.status || '').toLowerCase();
                if (!['approved', 'completed', 'cancelled'].includes(st)) {
                  console.log(`🚫 Hiding event "${event.eventTitle}" - status: ${event.status} (not approved/completed/cancelled)`);
                  return false;
                }
                return true;
              })
              .map((event: Event) => {
                // Only show requirements that have been released (not on-hold)
                const filteredRequirements: Record<string, Requirement[]> = {};
                
                Object.keys(event.departmentRequirements || {}).forEach(dept => {
                  const deptReqs = event.departmentRequirements[dept] || [];
                  // Only include requirements that are 'released' or don't have the field (backward compatibility)
                  const releasedReqs = deptReqs.filter(req => 
                    !req.requirementsStatus || req.requirementsStatus === 'released'
                  );
                  
                  if (releasedReqs.length > 0) {
                    filteredRequirements[dept] = releasedReqs;
                  }
                });
                
                return {
                  ...event,
                  departmentRequirements: filteredRequirements
                };
              })
              .filter((event: Event) => {
                // Only show events that have at least one released requirement for the user's department
                const userDeptReqs = event.departmentRequirements[userDepartment] || [];
                return userDeptReqs.length > 0;
              });
            
            console.log(`✅ Filtered to ${filteredEvents.length} APPROVED events with released requirements`);
            
            set({
              events: filteredEvents,
              currentUserDepartment: userDepartment,
              lastFetched: now,
              loading: false
            });
            console.log('✅ Events updated in store');
          } else {
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
      
      setActiveEventTab: (tab: 'ongoing' | 'completed' | 'declined' | 'done' | 'cancelled') => {
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
      
      updateRequirementStatus: async (eventId: string, requirementId: string, status: string, declineReason?: string) => {
        try {
          const token = localStorage.getItem('authToken');
          
          if (!token) {
            throw new Error('Please log in to update requirements');
          }

          console.log('🔄 Updating requirement status:', { eventId, requirementId, status, declineReason });

          const response = await fetch(`${API_BASE_URL}/api/events/${eventId}/requirements/${requirementId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status, declineReason })
          });

          console.log('📡 API Response status:', response.status);

          if (response.status === 403) {
            throw new Error('You do not have permission to update this requirement');
          }

          if (response.status === 401) {
            throw new Error('Session expired. Please log in again');
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ API Error:', errorData);
            throw new Error(errorData.message || 'Failed to update requirement status');
          }

          const responseData = await response.json();
          console.log('✅ API Success:', responseData);

          // Update the specific event in the store with the returned data
          if (responseData.success && responseData.data) {
            const currentEvents = get().events;
            const updatedEvents = currentEvents.map(event => 
              event._id === eventId ? responseData.data : event
            );
            set({ events: updatedEvents });
            console.log('🔄 Event updated in store with API response data');
            
            // DON'T fetch again immediately - it returns stale data from backend!
            // The backend needs time to save. We'll rely on Socket.IO for updates.
            console.log('⚠️ Skipping immediate fetch - using API response data');
          } else {
            // Only fetch if we didn't get updated data in response
            await get().fetchTaggedEvents(true);
          }
          
        } catch (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
      },
      
      updateRequirementNotes: async (eventId: string, requirementId: string, notes: string) => {
        try {
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
          
        } catch (error) {
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
          const st = String(event.status || '').toLowerCase();
          if (st === 'cancelled') return false;
          const userDeptReqs = event.departmentRequirements[state.currentUserDepartment] || [];
          const totalCount = userDeptReqs.length;
          const pendingCount = userDeptReqs.filter(r => (r.status || 'pending') === 'pending').length;
          return totalCount === 0 || pendingCount > 0;
        });
      },
      
      getCompletedEvents: () => {
        const state = get();
        return state.events.filter(event => {
          const userDeptReqs = event.departmentRequirements[state.currentUserDepartment] || [];
          const totalCount = userDeptReqs.length;
          const pendingCount = userDeptReqs.filter(r => (r.status || 'pending') === 'pending').length;
          const declinedCount = userDeptReqs.filter(r => (r.status || 'pending') === 'declined').length;
          return totalCount > 0 && pendingCount === 0 && declinedCount < totalCount;
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
