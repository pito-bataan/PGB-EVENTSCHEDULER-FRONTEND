import React, { useState, useEffect } from 'react';
import { useMyCalendarStore } from '@/stores/myCalendarStore';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import CustomCalendar, { type CalendarEvent } from '@/components/ui/custom-calendar';
import { 
  Calendar as CalendarIcon, 
  List,
  LayoutGrid,
  Package,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import CalendarListView from './CalendarListView';

const MyCalendarPage: React.FC = () => {
  // Zustand store
  const {
    currentUser,
    events,
    loading,
    calendarCurrentMonth,
    initializeUser,
    setCalendarCurrentMonth,
    getEventCountForDate,
    getMonthSummary
  } = useMyCalendarStore();

  // Local UI state that doesn't need caching
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Initialize user and fetch data using Zustand store
  // Empty deps array = only runs once on mount, respects Zustand cache
  useEffect(() => {
    initializeUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Convert events to calendar events with colored cells and event titles
  const calendarEvents: CalendarEvent[] = [];
  
  // Group events by date first to avoid duplicates
  const eventsByDate: { [date: string]: any[] } = {};
  
  events.forEach((event) => {
    // Parse dates using local timezone to avoid UTC conversion issues
    const eventStartDate = new Date(event.startDate);
    const eventEndDate = new Date(event.endDate);
    
    // Check if this event has bookings for the current user's department
    const hasBookingsForDepartment = event.taggedDepartments && 
      event.taggedDepartments.includes(currentUser?.department || '');
    
    // Show ALL events regardless of status (pending, submitted, approved, etc.)
    if (hasBookingsForDepartment) {
      // Add Day 1 (main start date)
      const currentStartDate = new Date(eventStartDate);
      currentStartDate.setHours(0, 0, 0, 0);
      
      const dateString = currentStartDate.getFullYear() + '-' + 
                        String(currentStartDate.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(currentStartDate.getDate()).padStart(2, '0');
      
      if (!eventsByDate[dateString]) {
        eventsByDate[dateString] = [];
      }
      
      // Only add if not already in the array for this date
      const alreadyExists = eventsByDate[dateString].some(e => e._id === event._id);
      if (!alreadyExists) {
        eventsByDate[dateString].push(event);
      }
      
      // Add additional days from dateTimeSlots for multi-day events
      if (event.dateTimeSlots && event.dateTimeSlots.length > 0) {
        event.dateTimeSlots.forEach((slot: any) => {
          const slotDate = new Date(slot.startDate);
          slotDate.setHours(0, 0, 0, 0);
          
          const slotDateString = slotDate.getFullYear() + '-' + 
                                String(slotDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                String(slotDate.getDate()).padStart(2, '0');
          
          if (!eventsByDate[slotDateString]) {
            eventsByDate[slotDateString] = [];
          }
          
          // Only add if not already in the array for this date
          const slotAlreadyExists = eventsByDate[slotDateString].some(e => e._id === event._id);
          if (!slotAlreadyExists) {
            eventsByDate[slotDateString].push(event);
          }
        });
      }
    }
  });
  
  
  // Now create separate calendar events for each event (to show vertically)
  Object.keys(eventsByDate).forEach(dateString => {
    const eventsForDate = eventsByDate[dateString];
    
    eventsForDate.forEach((event, index) => {
      // Determine event type based on status for color coding
      let eventType: 'booking' | 'completed' | 'submitted' | 'approved' | 'rejected' = 'booking';
      const status = event.status.toLowerCase();
      
      if (status === 'completed') {
        eventType = 'completed'; // Violet
      } else if (status === 'submitted' || status === 'pending') {
        eventType = 'submitted'; // Blue
      } else if (status === 'approved') {
        eventType = 'approved'; // Green
      } else if (status === 'rejected' || status === 'cancelled' || status === 'declined') {
        eventType = 'rejected'; // Red
      }
      
      // Handle multiple locations
      const locationDisplay = event.multipleLocations && event.locations && event.locations.length > 0
        ? event.locations.join(', ')
        : event.location;

      // Handle multiple date/time slots
      let dateTimeSlotsInfo = '';
      if (event.dateTimeSlots && event.dateTimeSlots.length > 0) {
        dateTimeSlotsInfo = ' | DateTimeSlots: ' + JSON.stringify(event.dateTimeSlots);
      }

      calendarEvents.push({
        id: `${event._id}-${dateString}`,
        date: dateString,
        title: event.eventTitle,
        type: eventType,
        notes: `Event: ${event.eventTitle} | Requestor: ${event.requestor} | Location: ${locationDisplay} | Status: ${event.status} | StartDate: ${event.startDate} | EndDate: ${event.endDate} | StartTime: ${event.startTime} | EndTime: ${event.endTime}${dateTimeSlotsInfo}`
      });
    });
  });

  // Calculate summary stats for the viewed month using store getter
  const { available: availableInMonth, unavailable: unavailableInMonth, total: totalRequirements } = getMonthSummary(calendarCurrentMonth);

  return (
    <div className="p-2 max-w-[98%] mx-auto">
      <Card className="shadow-lg">
        <CardContent className="p-8 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
                My Calendar
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your department's resource availability
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* View Toggle Buttons */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('calendar')}
                  className="gap-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Calendar
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="gap-2"
                >
                  <List className="w-4 h-4" />
                  List
                </Button>
              </div>
            </div>
          </motion.div>

          {/* COMMENTED OUT - Bulk Availability Management (moved to separate page) */}

          <Separator />

          {/* COMMENTED OUT - Selection Mode Status (moved to separate page) */}

          {/* Calendar or List View */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading resources...</span>
            </div>
          ) : viewMode === 'calendar' ? (
            <CustomCalendar
              events={calendarEvents}
              onDateClick={() => {}}
              onMonthChange={setCalendarCurrentMonth}
              showNavigation={true}
              showLegend={false}
              cellHeight="min-h-[140px]"
              showEventCount={false}
              getEventCountForDate={getEventCountForDate}
              selectedDates={[]}
              isSelectionMode={false}
            />
          ) : (
            <CalendarListView
              events={
                currentUser?.department === 'PGSO' 
                  ? events as any // PGSO sees ALL events
                  : events.filter(event => 
                      event.taggedDepartments && 
                      event.taggedDepartments.includes(currentUser?.department || '')
                    ) as any // Other departments see only their tagged events
              }
            />
          )}
        </CardContent>
      </Card>

      {/* COMMENTED OUT - Requirement Availability Modal (moved to separate page) */}

      {/* COMMENTED OUT - Progress Modal (moved to separate page) */}
    </div>
  );
};

export default MyCalendarPage;