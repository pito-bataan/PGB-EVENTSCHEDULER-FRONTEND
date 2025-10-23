import { create } from 'zustand';
import { format } from 'date-fns';
import { toast } from 'sonner';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

interface LocationAvailability {
  _id?: string;
  date: string;
  locationName: string;
  capacity: number;
  description: string;
  status: 'available' | 'unavailable';
  departmentName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface LocationBooking {
  eventId: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment: string;
  startTime: string;
  endTime: string;
  participants: number;
  vip?: number;
  vvip?: number;
  status: string;
}

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'available' | 'unavailable' | 'custom' | 'event' | 'booking';
  notes?: string;
}

interface ManageLocationState {
  // Core data
  currentUser: any | null;
  locationAvailabilities: LocationAvailability[];
  calendarEvents: CalendarEvent[];
  allEvents: any[];
  eventCounts: {[key: string]: number};
  locationBookings: {[key: string]: LocationBooking[]};
  
  // Loading states
  loading: boolean;
  bulkLoading: boolean;
  loadingBookings: {[key: string]: boolean};
  loadingEventDetails: boolean;
  
  // Progress modal states
  showProgressModal: boolean;
  progressValue: number;
  progressText: string;
  progressOperation: 'add' | 'delete' | '';
  
  // Cache timestamps
  lastLocationDataFetch: number;
  lastEventsDataFetch: number;
  
  // Actions
  initializeUser: () => Promise<void>;
  loadLocationData: (forceRefresh?: boolean) => Promise<void>;
  loadAllEventsAndCounts: (forceRefresh?: boolean) => Promise<void>;
  fetchLocationBookings: (locationName: string, selectedDate: Date) => Promise<void>;
  saveLocationAvailability: (locationData: Omit<LocationAvailability, '_id'>) => Promise<boolean>;
  deleteLocationAvailability: (locationId: string) => Promise<boolean>;
  bulkAddAllLocations: (calendarCurrentMonth: Date) => Promise<void>;
  bulkDeleteAllLocations: (calendarCurrentMonth: Date) => Promise<void>;
  setProgressModal: (show: boolean, operation?: 'add' | 'delete' | '', value?: number, text?: string) => void;
  getLocationEventCount: (locationName: string, dateStr: string) => number;
  getCurrentAndFutureDates: (calendarCurrentMonth: Date) => string[];
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useManageLocationStore = create<ManageLocationState>((set, get) => ({
  // Initial state
  currentUser: null,
  locationAvailabilities: [],
  calendarEvents: [],
  allEvents: [],
  eventCounts: {},
  locationBookings: {},
  loading: true,
  bulkLoading: false,
  loadingBookings: {},
  loadingEventDetails: false,
  showProgressModal: false,
  progressValue: 0,
  progressText: '',
  progressOperation: '',
  lastLocationDataFetch: 0,
  lastEventsDataFetch: 0,

  // Initialize user and load data
  initializeUser: async () => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        set({ currentUser: user });
        
        // Load both location data and events in parallel
        await Promise.all([
          get().loadLocationData(),
          get().loadAllEventsAndCounts()
        ]);
      } catch (error) {
        console.error('Error parsing user data:', error);
        set({ loading: false });
      }
    } else {
      set({ loading: false });
    }
  },

  // Load location data with 5-minute caching
  loadLocationData: async (forceRefresh = false) => {
    const now = Date.now();
    const { lastLocationDataFetch } = get();
    
    // Check cache validity
    if (!forceRefresh && now - lastLocationDataFetch < CACHE_DURATION) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        set({ loading: false });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/location-availability`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const locations = data.data || [];
        
        // Convert to calendar events
        const events: CalendarEvent[] = locations.map((location: LocationAvailability) => ({
          id: location._id!,
          date: location.date,
          title: `${location.locationName} (${location.status})`,
          type: location.status === 'available' ? 'available' : 'unavailable',
          notes: `Capacity: ${location.capacity} | ${location.description}`
        }));

        set({ 
          locationAvailabilities: locations,
          calendarEvents: events,
          lastLocationDataFetch: now,
          loading: false
        });
      } else {
        set({ loading: false });
      }
    } catch (error) {
      console.error('Error loading location data:', error);
      set({ loading: false });
    }
  },

  // Load all events with 5-minute caching
  loadAllEventsAndCounts: async (forceRefresh = false) => {
    const now = Date.now();
    const { lastEventsDataFetch } = get();
    
    // Check cache validity
    if (!forceRefresh && now - lastEventsDataFetch < CACHE_DURATION) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const events = data.data || [];
        
        // Calculate event counts per date
        const counts: {[key: string]: number} = {};
        
        events.forEach((event: any) => {
          // CRITICAL: Only count APPROVED events (hide submitted/on-hold)
          if (event.status === 'approved') {
            const eventStartDate = new Date(event.startDate);
            const eventEndDate = new Date(event.endDate);
            const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA');
            const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');
            
            const startDate = new Date(eventStartLocalDate);
            const endDate = new Date(eventEndLocalDate);
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              const dateKey = d.toLocaleDateString('en-CA');
              counts[dateKey] = (counts[dateKey] || 0) + 1;
            }
          }
        });

        set({ 
          allEvents: events,
          eventCounts: counts,
          lastEventsDataFetch: now
        });
      }
    } catch (error) {
    }
  },

  // Fetch location bookings
  fetchLocationBookings: async (locationName: string, selectedDate: Date) => {
    const locationKey = `${locationName}-${format(selectedDate, 'yyyy-MM-dd')}`;
    const { loadingBookings, locationBookings } = get();
    
    // Don't fetch if already loading or already have data
    if (loadingBookings[locationKey] || locationBookings[locationKey]) {
      return;
    }
    
    set({ 
      loadingBookings: { ...loadingBookings, [locationKey]: true }
    });
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        set({ 
          loadingBookings: { ...get().loadingBookings, [locationKey]: false }
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const events = data.data || [];
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        
        const locationEvents = events.filter((event: any) => {
          const eventLocation = (event.location || '').toLowerCase().trim();
          const searchLocation = locationName.toLowerCase().trim();
          
          const eventLocationMatch = eventLocation.includes(searchLocation) || 
                                    searchLocation.includes(eventLocation) ||
                                    eventLocation === searchLocation;
          
          const eventStartDate = new Date(event.startDate);
          const eventEndDate = new Date(event.endDate);
          const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA');
          const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');
          const isInDateRange = dateStr >= eventStartLocalDate && dateStr <= eventEndLocalDate;
          
          // CRITICAL: Only show APPROVED events in bookings (hide submitted/on-hold)
          return eventLocationMatch && isInDateRange && event.status === 'approved';
        });

        const bookings: LocationBooking[] = locationEvents.map((event: any) => ({
          eventId: event._id,
          eventTitle: event.eventTitle,
          requestor: event.requestor,
          requestorDepartment: event.requestorDepartment,
          startTime: event.startTime,
          endTime: event.endTime,
          participants: event.participants,
          vip: event.vip,
          vvip: event.vvip,
          status: event.status
        }));

        set({ 
          locationBookings: { ...get().locationBookings, [locationKey]: bookings }
        });
      }
    } catch (error) {
      console.error('Error fetching location bookings:', error);
    } finally {
      set({ 
        loadingBookings: { ...get().loadingBookings, [locationKey]: false }
      });
    }
  },

  // Save location availability
  saveLocationAvailability: async (locationData: Omit<LocationAvailability, '_id'>) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please login to save location availability');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/location-availability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
      });

      if (response.ok) {
        const result = await response.json();
        const newLocation = result.data;
        
        // Immediately update state with the new location for instant UI feedback
        const { locationAvailabilities, calendarEvents } = get();
        const updatedLocations = [...locationAvailabilities, newLocation];
        const newCalendarEvent: CalendarEvent = {
          id: newLocation._id,
          date: newLocation.date,
          title: `${newLocation.locationName} (${newLocation.status})`,
          type: newLocation.status === 'available' ? 'available' : 'unavailable',
          notes: `Capacity: ${newLocation.capacity} | ${newLocation.description}`
        };
        
        set({
          locationAvailabilities: updatedLocations,
          calendarEvents: [...calendarEvents, newCalendarEvent],
          lastLocationDataFetch: Date.now()
        });
        
        return true;
      } else {
        const result = await response.json();
        toast.error(result.message || 'Failed to save location');
        return false;
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast.error('Failed to save location availability');
      return false;
    }
  },

  // Delete location availability
  deleteLocationAvailability: async (locationId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please login to delete location');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/location-availability/${locationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Immediately update state by removing the deleted location for instant UI feedback
        const { locationAvailabilities, calendarEvents } = get();
        const updatedLocations = locationAvailabilities.filter(loc => loc._id !== locationId);
        const updatedEvents = calendarEvents.filter(event => event.id !== locationId);
        
        set({
          locationAvailabilities: updatedLocations,
          calendarEvents: updatedEvents,
          lastLocationDataFetch: Date.now()
        });
        
        return true;
      } else {
        const result = await response.json();
        toast.error(result.message || 'Failed to delete location');
        return false;
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location');
      return false;
    }
  },

  // Bulk add all locations
  bulkAddAllLocations: async (calendarCurrentMonth: Date) => {
    const { currentUser, locationAvailabilities, setProgressModal } = get();
    
    set({ bulkLoading: true });
    setProgressModal(true, 'add', 0, 'Preparing location data...');
    
    try {
      const futureDates = get().getCurrentAndFutureDates(calendarCurrentMonth);
      const defaultLocationNames = [
        'Atrium', 'Grand Lobby Entrance', 'Main Entrance Lobby', 'Main Entrance Leasable Area',
        '4th Flr. Conference Room 1', '4th Flr. Conference Room 2', '4th Flr. Conference Room 3',
        '5th Flr. Training Room 1 (BAC)', '5th Flr. Training Room 2', '6th Flr. Meeting Room 7',
        '6th Flr. DPOD', 'Bataan People\'s Center', '1BOSSCO', 'Emiliana Hall', 'Pavillion'
      ];
      
      // Pre-filter existing locations to avoid duplicates
      const existingLocationKeys = new Set(
        locationAvailabilities.map(loc => `${loc.date}-${loc.locationName.toLowerCase()}`)
      );

      setProgressModal(true, 'add', 10, 'Building location data...');

      // Build all location entries to create
      const locationsToCreate: any[] = [];
      
      for (const dateString of futureDates) {
        for (const locationName of defaultLocationNames) {
          const locationKey = `${dateString}-${locationName.toLowerCase()}`;
          
          if (existingLocationKeys.has(locationKey)) {
            continue;
          }

          // Find existing data for auto-population
          const existingLocationData = locationAvailabilities
            .filter(loc => loc.locationName === locationName)
            .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
            .find(loc => loc.capacity && loc.description);

          const locationData = {
            date: dateString,
            locationName: locationName,
            capacity: existingLocationData?.capacity || 50,
            description: existingLocationData?.description || `${locationName} - Available for events`,
            status: 'available' as 'available' | 'unavailable',
            departmentName: currentUser?.department || 'PMO'
          };

          locationsToCreate.push(locationData);
        }
      }

      if (locationsToCreate.length === 0) {
        setProgressModal(false);
        toast.info('All locations are already added for current and future dates!');
        return;
      }

      setProgressModal(true, 'add', 20, `Prepared ${locationsToCreate.length} location entries...`);

      // Process in batches
      const BATCH_SIZE = 20;
      const batches = [];
      for (let i = 0; i < locationsToCreate.length; i += BATCH_SIZE) {
        batches.push(locationsToCreate.slice(i, i + BATCH_SIZE));
      }

      let totalAdded = 0;
      let totalFailed = 0;

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const progressPercent = 20 + ((batchIndex / batches.length) * 70);
        
        setProgressModal(true, 'add', progressPercent, `Processing batch ${batchIndex + 1}/${batches.length}...`);
        
        const batchPromises = batch.map(async (locationData) => {
          try {
            const response = await fetch(`${API_BASE_URL}/location-availability`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(locationData)
            });

            return { success: response.ok };
          } catch (error) {
            return { success: false };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const batchSuccessCount = batchResults.filter(r => r.success).length;
        const batchFailCount = batchResults.filter(r => !r.success).length;
        
        totalAdded += batchSuccessCount;
        totalFailed += batchFailCount;
      }

      setProgressModal(true, 'add', 90, 'Updating interface...');
      // Force a complete refresh to ensure all data is synchronized
      await get().loadLocationData(true);
      
      setProgressModal(true, 'add', 100, 'Operation completed!');
      
      if (totalFailed > 0) {
        toast.success(`Added ${totalAdded} locations! ${totalFailed} failed to add.`, { duration: 6000 });
      } else {
        toast.success(`Successfully added all ${totalAdded} location entries!`);
      }

      setTimeout(() => setProgressModal(false), 1500);
      
    } catch (error) {
      console.error('Error in bulk add operation:', error);
      toast.error(`Error adding locations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProgressModal(false);
    } finally {
      set({ bulkLoading: false });
    }
  },

  // Bulk delete all locations
  bulkDeleteAllLocations: async (calendarCurrentMonth: Date) => {
    const { locationAvailabilities, allEvents, setProgressModal } = get();
    
    set({ bulkLoading: true });
    setProgressModal(true, 'delete', 0, 'Analyzing location data...');
    
    try {
      // Filter locations for the viewed month
      const viewedYear = calendarCurrentMonth.getFullYear();
      const viewedMonth = calendarCurrentMonth.getMonth();
      
      const locationsInViewedMonth = locationAvailabilities.filter(location => {
        const locationDate = new Date(location.date + 'T00:00:00');
        return locationDate.getFullYear() === viewedYear && 
               locationDate.getMonth() === viewedMonth;
      });

      if (locationsInViewedMonth.length === 0) {
        setProgressModal(false);
        toast.info(`No location data to delete for ${format(calendarCurrentMonth, 'MMMM yyyy')}!`);
        return;
      }

      setProgressModal(true, 'delete', 10, 'Checking for active bookings...');

      // Build active events lookup
      const activeEventsLookup = new Map();
      // CRITICAL: Only check APPROVED events (hide submitted/on-hold)
      allEvents
        .filter(event => event.status === 'approved')
        .forEach(event => {
          const eventLocation = (event.location || '').toLowerCase().trim();
          const eventStartDate = new Date(event.startDate);
          const eventEndDate = new Date(event.endDate);
          const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA');
          const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');

          if (!activeEventsLookup.has(eventLocation)) {
            activeEventsLookup.set(eventLocation, []);
          }
          activeEventsLookup.get(eventLocation).push({
            startDate: eventStartLocalDate,
            endDate: eventEndLocalDate
          });
        });

      setProgressModal(true, 'delete', 20, 'Separating protected locations...');

      // Separate locations into protected and deletable
      const locationsToDelete: any[] = [];
      const protectedLocations: any[] = [];

      for (const location of locationsInViewedMonth) {
        const searchLocation = location.locationName.toLowerCase().trim();
        let hasActiveEvents = false;

        for (const [eventLocation, events] of activeEventsLookup.entries()) {
          const locationMatch = eventLocation.includes(searchLocation) ||
                                 searchLocation.includes(eventLocation) ||
                                 eventLocation === searchLocation;

          if (locationMatch) {
            const hasOverlap = events.some((event: any) => 
              location.date >= event.startDate && location.date <= event.endDate
            );

            if (hasOverlap) {
              hasActiveEvents = true;
              break;
            }
          }
        }

        if (hasActiveEvents) {
          protectedLocations.push(location);
        } else {
          locationsToDelete.push(location);
        }
      }

      if (locationsToDelete.length === 0) {
        setProgressModal(false);
        toast.info(`All ${protectedLocations.length} location entries are protected due to active bookings!`);
        return;
      }

      setProgressModal(true, 'delete', 30, `Found ${locationsToDelete.length} locations to delete...`);

      // Process deletions in batches
      const BATCH_SIZE = 15;
      const batches = [];
      for (let i = 0; i < locationsToDelete.length; i += BATCH_SIZE) {
        batches.push(locationsToDelete.slice(i, i + BATCH_SIZE));
      }

      let totalDeleted = 0;
      let totalFailed = 0;

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const progressPercent = 30 + ((batchIndex / batches.length) * 60);
        
        setProgressModal(true, 'delete', progressPercent, `Deleting batch ${batchIndex + 1}/${batches.length}...`);
        
        const deletionPromises = batch.map(async (location) => {
          try {
            const response = await fetch(`${API_BASE_URL}/location-availability/${location._id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
              }
            });

            return { success: response.ok };
          } catch (error) {
            return { success: false };
          }
        });

        const batchResults = await Promise.all(deletionPromises);
        const batchSuccessCount = batchResults.filter(r => r.success).length;
        const batchFailCount = batchResults.filter(r => !r.success).length;
        
        totalDeleted += batchSuccessCount;
        totalFailed += batchFailCount;
      }

      setProgressModal(true, 'delete', 90, 'Refreshing location data...');
      await get().loadLocationData(true);
      
      setProgressModal(true, 'delete', 100, 'Operation completed!');
      
      if (protectedLocations.length > 0) {
        toast.success(
          `Deleted ${totalDeleted} location entries! ${protectedLocations.length} entries were protected due to active bookings.`,
          { duration: 6000 }
        );
      } else {
        toast.success(`Successfully deleted all ${totalDeleted} location entries!`);
      }

      setTimeout(() => setProgressModal(false), 1500);
      
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      toast.error(`Error deleting locations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setProgressModal(false);
    } finally {
      set({ bulkLoading: false });
    }
  },

  // Set progress modal state
  setProgressModal: (show: boolean, operation: 'add' | 'delete' | '' = '', value: number = 0, text: string = '') => {
    set({
      showProgressModal: show,
      progressOperation: operation,
      progressValue: value,
      progressText: text
    });
  },

  // Get location event count
  getLocationEventCount: (locationName: string, dateStr: string) => {
    const { allEvents } = get();
    return allEvents.filter((event: any) => {
      const eventLocation = (event.location || '').toLowerCase().trim();
      const searchLocation = locationName.toLowerCase().trim();
      const locationMatch = eventLocation.includes(searchLocation) || 
                           searchLocation.includes(eventLocation) ||
                           eventLocation === searchLocation;
      
      // Parse dates properly to avoid timezone issues
      const eventStartDate = new Date(event.startDate);
      const eventEndDate = new Date(event.endDate);
      
      // Format dates as YYYY-MM-DD in local timezone
      const formatLocalDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const eventStartLocalDate = formatLocalDate(eventStartDate);
      const eventEndLocalDate = formatLocalDate(eventEndDate);
      const dateMatch = dateStr >= eventStartLocalDate && dateStr <= eventEndLocalDate;
      
      // CRITICAL: Only show APPROVED events (hide submitted/on-hold)
      const statusMatch = event.status === 'approved';
      
      return locationMatch && dateMatch && statusMatch;
    }).length;
  },

  // Get current and future dates
  getCurrentAndFutureDates: (calendarCurrentMonth: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const viewedYear = calendarCurrentMonth.getFullYear();
    const viewedMonth = calendarCurrentMonth.getMonth();
    
    const dates: string[] = [];
    const daysInMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewedYear, viewedMonth, day);
      if (date >= today) {
        dates.push(format(date, 'yyyy-MM-dd'));
      }
    }
    
    return dates;
  }
}));
