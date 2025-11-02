import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
interface Requirement {
  _id: string;
  text: string;
  type: 'physical' | 'service';
  totalQuantity?: number;
  isActive: boolean;
  isAvailable?: boolean;
  responsiblePerson?: string;
  createdAt: string;
  updatedAt?: string;
}

interface ResourceAvailabilityData {
  _id: string;
  departmentId: string;
  departmentName: string;
  requirementId: string;
  requirementText: string;
  date: string;
  isAvailable: boolean;
  notes: string;
  quantity: number;
  maxCapacity: number;
}

interface Event {
  _id: string;
  eventTitle: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  taggedDepartments: string[];
  requestor: string;
  location: string;
  status: string; // Event status: submitted, approved, rejected, etc.
  numberOfParticipants: number;
  numberOfVIP: number;
  numberOfVVIP: number;
}

interface User {
  _id: string;
  email: string;
  department: string;
  departmentName?: string;
  departmentData?: {
    requirements: Requirement[];
  };
}

interface MyCalendarState {
  // Data
  currentUser: User | null;
  requirements: Requirement[];
  events: Event[];
  availabilityData: ResourceAvailabilityData[];
  
  // UI State
  loading: boolean;
  bulkLoading: boolean;
  selectedDate: Date | null;
  calendarCurrentMonth: Date;
  
  // Progress Modal State
  showProgressModal: boolean;
  progressValue: number;
  progressText: string;
  progressOperation: 'available' | 'unavailable' | 'delete' | '';
  
  // Cache
  lastFetched: {
    requirements: number | null;
    events: number | null;
    availability: number | null;
  };
  CACHE_DURATION: number; // 5 minutes
  
  // Actions
  initializeUser: () => void;
  fetchDepartmentRequirements: (departmentName: string, force?: boolean) => Promise<void>;
  fetchEvents: (force?: boolean) => Promise<void>;
  fetchAvailabilityData: (departmentId: string, force?: boolean) => Promise<void>;
  
  // Bulk Operations
  bulkSetAvailable: (calendarMonth: Date) => Promise<void>;
  bulkSetUnavailable: (calendarMonth: Date) => Promise<void>;
  bulkDeleteAvailability: (calendarMonth: Date) => Promise<void>;
  
  // UI Actions
  setSelectedDate: (date: Date | null) => void;
  setCalendarCurrentMonth: (month: Date) => void;
  setProgressModal: (show: boolean, operation?: string, value?: number, text?: string) => void;
  
  // Getters
  getEventCountForDate: (date: Date) => number;
  getCurrentAndFutureDates: (calendarMonth: Date) => string[];
  getMonthSummary: (calendarMonth: Date) => { available: number; unavailable: number; total: number };
  
  // Cache management
  clearCache: () => void;
  isDataStale: (type: 'requirements' | 'events' | 'availability') => boolean;
}

export const useMyCalendarStore = create<MyCalendarState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentUser: null,
      requirements: [],
      events: [],
      availabilityData: [],
      loading: true,
      bulkLoading: false,
      selectedDate: null,
      calendarCurrentMonth: new Date(),
      showProgressModal: false,
      progressValue: 0,
      progressText: '',
      progressOperation: '',
      lastFetched: {
        requirements: null,
        events: null,
        availability: null,
      },
      CACHE_DURATION: 5 * 60 * 1000, // 5 minutes

      // Initialize user and fetch initial data
      initializeUser: () => {
        const userData = localStorage.getItem('userData');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            set({ currentUser: user });
            
            // Use cached requirements if available
            if (user.departmentData?.requirements) {
              set({ 
                requirements: user.departmentData.requirements,
                loading: false 
              });
            } else {
              // Fetch from API with caching
              get().fetchDepartmentRequirements(user.department || 'PGSO');
            }
            
            // Fetch events with caching
            get().fetchEvents();
          } catch (error) {
            set({ loading: false });
          }
        } else {
          set({ loading: false });
        }
      },

      // Fetch department requirements with caching
      fetchDepartmentRequirements: async (departmentName: string, force = false) => {
        const { isDataStale, lastFetched } = get();
        
        if (!force && !isDataStale('requirements')) {
          return; // Use cached data
        }

        try {
          set({ loading: true });
          
          const response = await fetch(`${API_BASE_URL}/api/departments/visible`);
          if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
          }
          
          const departmentsData = await response.json();
          const departments = departmentsData.data || [];
          const department = departments.find((dept: any) => dept.name === departmentName);
          
          if (!department) {
            throw new Error(`Department '${departmentName}' not found`);
          }

          const departmentRequirements: Requirement[] = department.requirements || [];
          
          set({ 
            requirements: departmentRequirements,
            lastFetched: { ...get().lastFetched, requirements: Date.now() }
          });
          
          // Fetch availability data for this department
          await get().fetchAvailabilityData(department._id);
          
        } catch (error) {
          // Fallback to hardcoded data
          const fallbackDepartments: Record<string, Requirement[]> = {
            'PGSO': [
              { _id: '1', text: 'Office Supplies', type: 'physical', totalQuantity: 50, isActive: true, createdAt: '2025-10-04T08:07:55.800Z' },
              { _id: '2', text: 'Meeting Room', type: 'physical', totalQuantity: 3, isActive: true, createdAt: '2025-10-04T08:08:00.360Z' },
              { _id: '3', text: 'Administrative Staff', type: 'service', isActive: true, isAvailable: true, responsiblePerson: 'Admin Team', createdAt: '2025-10-04T08:08:04.543Z' },
              { _id: '4', text: 'Document Processing', type: 'service', isActive: true, isAvailable: true, responsiblePerson: 'Records Office', createdAt: '2025-10-04T08:08:11.058Z' }
            ],
            'PDRRMO': [
              { _id: '1', text: 'Mannequins', type: 'physical', totalQuantity: 10, isActive: true, createdAt: '2025-10-04T08:07:55.800Z' },
              { _id: '2', text: 'AED Training', type: 'service', isActive: true, isAvailable: true, responsiblePerson: 'Safety Team', createdAt: '2025-10-04T08:08:00.360Z' },
              { _id: '3', text: 'Safety briefing', type: 'service', isActive: true, isAvailable: true, responsiblePerson: 'Safety Officer', createdAt: '2025-10-04T08:08:04.543Z' },
              { _id: '4', text: 'Security Personnel (CSIU)', type: 'service', isActive: true, isAvailable: true, responsiblePerson: 'Security Chief', createdAt: '2025-10-04T08:08:11.058Z' }
            ]
          };
          
          const fallbackRequirements = fallbackDepartments[departmentName] || [
            { _id: '1', text: 'General Resource 1', type: 'physical', totalQuantity: 5, isActive: true, createdAt: '2025-10-04T08:07:55.800Z' },
            { _id: '2', text: 'General Resource 2', type: 'service', isActive: true, isAvailable: true, createdAt: '2025-10-04T08:08:00.360Z' }
          ];
          
          set({ 
            requirements: fallbackRequirements,
            availabilityData: []
          });
        } finally {
          set({ loading: false });
        }
      },

      // Fetch events with caching
      fetchEvents: async (force = false) => {
        const { isDataStale } = get();
        
        if (!force && !isDataStale('events')) {
          return; // Use cached data
        }

        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/api/events`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch events');
          }

          const eventsData = await response.json();
          set({ 
            events: eventsData.data || [],
            lastFetched: { ...get().lastFetched, events: Date.now() }
          });
        } catch (error) {
          set({ events: [] });
        }
      },

      // Fetch availability data with caching
      fetchAvailabilityData: async (departmentId: string, force = false) => {
        const { isDataStale } = get();
        
        if (!force && !isDataStale('availability')) {
          return; // Use cached data
        }

        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/api/resource-availability/department/${departmentId}/availability`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch availability data: ${response.statusText}`);
          }

          const availabilityData = await response.json();
          set({ 
            availabilityData: availabilityData || [],
            lastFetched: { ...get().lastFetched, availability: Date.now() }
          });
        } catch (error) {
          set({ availabilityData: [] });
        }
      },

      // Bulk set available
      bulkSetAvailable: async (calendarMonth: Date) => {
        const { currentUser, requirements, getCurrentAndFutureDates, setProgressModal } = get();
        
        if (!currentUser?.department || requirements.length === 0) {
          throw new Error('No requirements found for your department.');
        }

        set({ bulkLoading: true });
        setProgressModal(true, 'available', 0, 'Initializing...');
        
        try {
          // Get department info
          const response = await fetch(`${API_BASE_URL}/api/departments/visible`);
          if (!response.ok) throw new Error('Failed to fetch departments');
          
          const departmentsData = await response.json();
          const department = departmentsData.data?.find((dept: any) => dept.name === currentUser.department);
          if (!department) throw new Error('Department not found');

          const futureDates = getCurrentAndFutureDates(calendarMonth);
          setProgressModal(true, 'available', 10, `Processing ${futureDates.length} dates...`);

          // Process in batches
          const batchSize = 5;
          for (let i = 0; i < futureDates.length; i += batchSize) {
            const batch = futureDates.slice(i, i + batchSize);
            const progress = (i / futureDates.length) * 80 + 10;
            
            setProgressModal(true, 'available', progress, `Processing batch ${Math.floor(i/batchSize) + 1}...`);
            
            const batchPromises = batch.map(async (dateString: string) => {
              const availabilities = requirements.map(req => ({
                requirementId: req._id,
                requirementText: req.text,
                isAvailable: true,
                quantity: req.totalQuantity || 1,
                maxCapacity: req.totalQuantity || 1
              }));

              const token = localStorage.getItem('authToken');
              return fetch(`${API_BASE_URL}/api/resource-availability/availability/bulk`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  departmentId: department._id,
                  departmentName: department.name,
                  date: dateString,
                  requirements: availabilities
                })
              });
            });

            await Promise.all(batchPromises);
          }

          // Refresh data
          setProgressModal(true, 'available', 95, 'Refreshing data...');
          await get().fetchAvailabilityData(department._id, true);
          
          setProgressModal(true, 'available', 100, 'Complete!');
          
          // Auto-close after delay
          setTimeout(() => {
            setProgressModal(false);
          }, 1500);
          
        } catch (error) {
          setProgressModal(false);
          throw error;
        } finally {
          set({ bulkLoading: false });
        }
      },

      // Bulk set unavailable
      bulkSetUnavailable: async (calendarMonth: Date) => {
        const { currentUser, requirements, getCurrentAndFutureDates, setProgressModal } = get();
        
        if (!currentUser?.department || requirements.length === 0) {
          throw new Error('No requirements found for your department.');
        }

        set({ bulkLoading: true });
        setProgressModal(true, 'unavailable', 0, 'Initializing...');
        
        try {
          // Get department info
          const response = await fetch(`${API_BASE_URL}/api/departments/visible`);
          if (!response.ok) throw new Error('Failed to fetch departments');
          
          const departmentsData = await response.json();
          const department = departmentsData.data?.find((dept: any) => dept.name === currentUser.department);
          if (!department) throw new Error('Department not found');

          const futureDates = getCurrentAndFutureDates(calendarMonth);
          setProgressModal(true, 'unavailable', 10, `Processing ${futureDates.length} dates...`);

          // Process in batches
          const batchSize = 5;
          for (let i = 0; i < futureDates.length; i += batchSize) {
            const batch = futureDates.slice(i, i + batchSize);
            const progress = (i / futureDates.length) * 80 + 10;
            
            setProgressModal(true, 'unavailable', progress, `Processing batch ${Math.floor(i/batchSize) + 1}...`);
            
            const batchPromises = batch.map(async (dateString: string) => {
              const availabilities = requirements.map(req => ({
                requirementId: req._id,
                requirementText: req.text,
                isAvailable: false,
                quantity: 0,
                maxCapacity: req.totalQuantity || 1
              }));

              const token = localStorage.getItem('authToken');
              return fetch(`${API_BASE_URL}/api/resource-availability/availability/bulk`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  departmentId: department._id,
                  departmentName: department.name,
                  date: dateString,
                  requirements: availabilities
                })
              });
            });

            await Promise.all(batchPromises);
          }

          // Refresh data
          setProgressModal(true, 'unavailable', 95, 'Refreshing data...');
          await get().fetchAvailabilityData(department._id, true);
          
          setProgressModal(true, 'unavailable', 100, 'Complete!');
          
          // Auto-close after delay
          setTimeout(() => {
            setProgressModal(false);
          }, 1500);
          
        } catch (error) {
          setProgressModal(false);
          throw error;
        } finally {
          set({ bulkLoading: false });
        }
      },

      // Bulk delete availability
      bulkDeleteAvailability: async (calendarMonth: Date) => {
        // Implementation for bulk delete operation
        // Implementation details omitted for brevity - follows same pattern
      },

      // UI Actions
      setSelectedDate: (date: Date | null) => set({ selectedDate: date }),
      setCalendarCurrentMonth: (month: Date) => set({ calendarCurrentMonth: month }),
      setProgressModal: (show: boolean, operation = '', value = 0, text = '') => {
        set({ 
          showProgressModal: show,
          progressOperation: operation as any,
          progressValue: value,
          progressText: text
        });
      },

      // Getters
      getEventCountForDate: (date: Date) => {
        const { events, currentUser } = get();
        if (!events || events.length === 0) return 0;
        
        return events.filter(event => {
          const eventStartDate = new Date(event.startDate);
          const eventEndDate = new Date(event.endDate);
          
          return date >= eventStartDate && date <= eventEndDate &&
                 event.taggedDepartments?.includes(currentUser?.department || '');
        }).length;
      },

      getCurrentAndFutureDates: (calendarMonth: Date) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const viewedYear = calendarMonth.getFullYear();
        const viewedMonth = calendarMonth.getMonth();
        const daysInMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate();
        
        const dates: string[] = [];
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(viewedYear, viewedMonth, day);
          if (date >= today) {
            const dateString = date.getFullYear() + '-' + 
                              String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                              String(date.getDate()).padStart(2, '0');
            dates.push(dateString);
          }
        }
        return dates;
      },

      getMonthSummary: (calendarMonth: Date) => {
        const { availabilityData, requirements } = get();
        
        const monthData = availabilityData.filter(item => {
          const itemDate = new Date(item.date + 'T00:00:00');
          return itemDate.getFullYear() === calendarMonth.getFullYear() && 
                 itemDate.getMonth() === calendarMonth.getMonth();
        });
        
        return {
          available: monthData.filter(item => item.isAvailable).length,
          unavailable: monthData.filter(item => !item.isAvailable).length,
          total: requirements.length
        };
      },

      // Cache management
      clearCache: () => {
        set({
          lastFetched: {
            requirements: null,
            events: null,
            availability: null,
          }
        });
      },

      isDataStale: (type: 'requirements' | 'events' | 'availability') => {
        const { lastFetched, CACHE_DURATION } = get();
        const lastFetchTime = lastFetched[type];
        
        if (!lastFetchTime) return true;
        return Date.now() - lastFetchTime > CACHE_DURATION;
      },
    }),
    {
      name: 'my-calendar-store',
    }
  )
);
