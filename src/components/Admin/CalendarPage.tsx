import React, { useEffect } from 'react';
import CustomCalendar from '@/components/ui/custom-calendar';
import type { CalendarEvent } from '@/components/ui/custom-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { getGlobalSocket } from '@/hooks/useSocket';
import { useAdminCalendarStore, type Event } from '@/stores/adminCalendarStore';

const AdminCalendarPage: React.FC = () => {
  
  // Zustand store
  const {
    events,
    calendarEvents,
    loading,
    fetchEvents,
    getEventsForDate
  } = useAdminCalendarStore();

  // Fetch events on mount
  useEffect(() => {
    fetchEvents(); // Will use cache if available
  }, [fetchEvents]);

  // Listen for real-time event updates via Socket.IO
  useEffect(() => {
    const socket = getGlobalSocket();
    
    if (!socket) {
      return;
    }

    const handleEventCreated = (data: any) => {
      // Force refresh when new event is created
      fetchEvents(true);
    };

    const handleEventUpdated = (data: any) => {
      // Force refresh calendar events when any event is updated
      fetchEvents(true);
    };

    const handleEventDeleted = (data: any) => {
      // Force refresh when event is deleted
      fetchEvents(true);
    };

    const handleEventStatusUpdated = (data: any) => {
      // Also refresh on status updates
      fetchEvents(true);
    };

    const handleConnect = () => {
      // Socket connected
    };

    // Remove any existing listeners first to prevent duplicates
    socket.off('event-created');
    socket.off('event-updated');
    socket.off('event-deleted');
    socket.off('event-status-updated');
    socket.off('connect');

    // Set up listeners
    socket.on('event-created', handleEventCreated);
    socket.on('event-updated', handleEventUpdated);
    socket.on('event-deleted', handleEventDeleted);
    socket.on('event-status-updated', handleEventStatusUpdated);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('event-created', handleEventCreated);
      socket.off('event-updated', handleEventUpdated);
      socket.off('event-deleted', handleEventDeleted);
      socket.off('event-status-updated', handleEventStatusUpdated);
      socket.off('connect', handleConnect);
    };
  }, []);

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
      case 'cancelled':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Cancelled</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case 'completed':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Custom event renderer with popover
  const renderEventWithPopover = (calEvent: CalendarEvent) => {
    const event = events.find(e => e._id === calEvent.id);
    if (!event) return null;

    // Determine badge color based on event status
    const getBadgeColor = (status: string) => {
      if (status === 'approved') {
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      } else if (status === 'submitted') {
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
      } else if (status === 'cancelled') {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
      } else if (status === 'rejected') {
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      } else if (status === 'completed') {
        return 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200';
      }
      return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
    };

    return (
      <Popover key={calEvent.id}>
        <PopoverTrigger asChild>
          <div className="mb-1">
            <Badge 
              variant="outline"
              className={`text-xs gap-1 ${getBadgeColor(event.status)} cursor-pointer transition-colors w-full justify-start`}
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

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">View all events and bookings in calendar view</p>
          </div>
          <Button
            onClick={() => fetchEvents(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
              <div className="flex items-center gap-2">
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">Cancelled</Badge>
                <span>Cancelled Event</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Rejected</Badge>
                <span>Rejected Event</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Completed</Badge>
                <span>Completed Event</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminCalendarPage;
