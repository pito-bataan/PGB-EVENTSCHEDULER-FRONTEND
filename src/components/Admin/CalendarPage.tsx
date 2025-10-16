import React, { useEffect, useState } from 'react';
import CustomCalendar from '@/components/ui/custom-calendar';
import type { CalendarEvent } from '@/components/ui/custom-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';

interface Event {
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

const AdminCalendarPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // API Configuration
  const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch all events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/events`, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        const allEvents = response.data.data;
        // Filter only approved and submitted events
        const filteredEvents = allEvents.filter(
          (event: Event) => event.status === 'approved' || event.status === 'submitted'
        );
        setEvents(filteredEvents);
        
        // Convert to calendar events
        const calEvents = convertToCalendarEvents(filteredEvents);
        setCalendarEvents(calEvents);
      }
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  // Convert events to calendar format
  const convertToCalendarEvents = (events: Event[]): CalendarEvent[] => {
    const calEvents: CalendarEvent[] = [];
    
    events.forEach(event => {
      // Add event for start date
      calEvents.push({
        id: event._id,
        date: event.startDate,
        title: event.eventTitle,
        type: 'booking',
        color: '#E0E7FF', // Light blue
        className: 'cursor-pointer hover:opacity-80 transition-opacity'
      });
    });

    return calEvents;
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date): Event[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => {
      const eventStartDate = format(new Date(event.startDate), 'yyyy-MM-dd');
      return eventStartDate === dateStr;
    });
  };

  // Format time to 12-hour format
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Submitted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Custom event renderer with popover
  const renderEventWithPopover = (calEvent: CalendarEvent) => {
    const event = events.find(e => e._id === calEvent.id);
    if (!event) return null;

    return (
      <Popover key={calEvent.id}>
        <PopoverTrigger asChild>
          <div className="mb-1">
            <Badge 
              variant="outline"
              className="text-xs gap-1 bg-blue-100 text-blue-800 border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors w-full justify-start"
              title={event.eventTitle}
            >
              <span className="truncate">{event.eventTitle}</span>
            </Badge>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" side="right" align="start">
          <div className="space-y-3">
            {/* Event Title */}
            <div>
              <h4 className="font-semibold text-base text-foreground mb-1">{event.eventTitle}</h4>
              {getStatusBadge(event.status)}
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Location</p>
                <p className="text-gray-600">{event.location}</p>
              </div>
            </div>

            {/* Start Date & Time */}
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">Start</p>
                <p className="text-gray-600">
                  {format(new Date(event.startDate), 'MMM dd, yyyy')} at {formatTime(event.startTime)}
                </p>
              </div>
            </div>

            {/* End Date & Time */}
            <div className="flex items-start gap-2 text-sm">
              <Clock className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-700">End</p>
                <p className="text-gray-600">
                  {format(new Date(event.endDate), 'MMM dd, yyyy')} at {formatTime(event.endTime)}
                </p>
              </div>
            </div>

            {/* Requestor Info */}
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                Requested by <span className="font-medium text-gray-700">{event.requestor}</span> from{' '}
                <span className="font-medium text-gray-700">{event.requestorDepartment}</span>
              </p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Custom date content renderer
  const renderDateContent = (date: Date, dateEvents: CalendarEvent[]) => {
    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    const isCurrentMonth = format(date, 'MMM') === format(new Date(), 'MMM');
    const eventsForDate = getEventsForDate(date);

    return (
      <>
        {/* Date Number */}
        <div className={`
          text-sm font-medium mb-2
          ${isToday ? 'text-blue-600 font-bold' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
        `}>
          {format(date, 'd')}
        </div>

        {/* Today Indicator */}
        {isToday && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
        )}

        {/* Events with Popovers */}
        {eventsForDate.length > 0 && (
          <div className="space-y-1">
            {eventsForDate.slice(0, 3).map((event) => {
              const calEvent = dateEvents.find(ce => ce.id === event._id);
              return calEvent ? renderEventWithPopover(calEvent) : null;
            })}
            {eventsForDate.length > 3 && (
              <div className="text-xs text-gray-500 font-medium">
                +{eventsForDate.length - 3} more
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">View all events and bookings in calendar view</p>
        </div>

        {/* Calendar Card */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Events Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading events...</p>
                </div>
              </div>
            ) : (
              <CustomCalendar
                events={calendarEvents}
                showNavigation={true}
                showLegend={false}
                cellHeight="min-h-[120px]"
                renderDateContent={renderDateContent}
              />
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="border-none shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
                <span>Event/Booking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Approved</Badge>
                <span>Approved Event</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Submitted</Badge>
                <span>Submitted Event</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCalendarPage;
