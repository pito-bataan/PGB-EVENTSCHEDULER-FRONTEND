import { useState, useEffect } from 'react';

interface Event {
  _id: string;
  eventTitle: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  requestor: string;
  requestorDepartment?: string;
  taggedDepartments: string[];
  status: string;
}

interface UseEventCountOptions {
  userDepartment?: string;
  filterByDepartment?: boolean;
  includeAllStatuses?: boolean;
}

export const useEventCount = (options: UseEventCountOptions = {}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    userDepartment,
    filterByDepartment = true,
    includeAllStatuses = false
  } = options;

  useEffect(() => {
    fetchEvents();
  }, [userDepartment, filterByDepartment, includeAllStatuses]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:5000/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }

      const data = await response.json();
      let fetchedEvents = data.data || [];

      // Filter events based on options
      if (filterByDepartment && userDepartment) {
        fetchedEvents = fetchedEvents.filter((event: Event) => 
          event.taggedDepartments?.includes(userDepartment) ||
          event.requestorDepartment === userDepartment
        );
      }

      // Filter by status if needed
      if (!includeAllStatuses) {
        fetchedEvents = fetchedEvents.filter((event: Event) => 
          ['submitted', 'approved'].includes(event.status)
        );
      }

      setEvents(fetchedEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  // Get event count for a specific date
  const getEventCountForDate = (date: Date): number => {
    const matchingEvents = events.filter(event => {
      // Parse dates using local timezone to match MyCalendarPage logic
      const eventStartDate = new Date(event.startDate);
      const eventEndDate = new Date(event.endDate);
      
      // Create timezone-safe date for comparison (normalize to local midnight)
      const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Compare dates by extracting date components to avoid time comparison
      const eventStartDateOnly = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());
      const eventEndDateOnly = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate());
      
      // Debug logging for timezone issues
      const isMatch = compareDate >= eventStartDateOnly && compareDate <= eventEndDateOnly;
      if (isMatch) {
        console.log(`🎯 Event Count Match:`, {
          eventTitle: event.eventTitle,
          eventStartDate: event.startDate,
          eventEndDate: event.endDate,
          parsedStartDate: eventStartDateOnly.toDateString(),
          parsedEndDate: eventEndDateOnly.toDateString(),
          compareDate: compareDate.toDateString(),
          calendarDate: date.toDateString()
        });
      }
      
      // Check if the date falls within the event's date range
      return isMatch;
    });
    
    return matchingEvents.length;
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): Event[] => {
    return events.filter(event => {
      // Parse dates using local timezone to match MyCalendarPage logic
      const eventStartDate = new Date(event.startDate);
      const eventEndDate = new Date(event.endDate);
      
      // Create timezone-safe date for comparison (normalize to local midnight)
      const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Compare dates by extracting date components to avoid time comparison
      const eventStartDateOnly = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());
      const eventEndDateOnly = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate());
      
      // Check if the date falls within the event's date range
      return compareDate >= eventStartDateOnly && compareDate <= eventEndDateOnly;
    });
  };

  // Get total event count for current month
  const getTotalEventCount = (): number => {
    return events.length;
  };

  // Get event count for today
  const getTodayEventCount = (): number => {
    return getEventCountForDate(new Date());
  };

  return {
    events,
    loading,
    error,
    getEventCountForDate,
    getEventsForDate,
    getTotalEventCount,
    getTodayEventCount,
    refetch: fetchEvents
  };
};
