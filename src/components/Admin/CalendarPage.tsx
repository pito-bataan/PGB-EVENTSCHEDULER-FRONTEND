import React, { useEffect, useState } from 'react';
import CustomCalendar from '@/components/ui/custom-calendar';
import type { CalendarEvent } from '@/components/ui/custom-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Clock, RefreshCw, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getGlobalSocket } from '@/hooks/useSocket';
import { useAdminCalendarStore, type Event } from '@/stores/adminCalendarStore';
import { jsPDF } from 'jspdf';

// Extend jsPDF with autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

const AdminCalendarPage: React.FC = () => {
  const [showMoreEventsDialog, setShowMoreEventsDialog] = useState(false);
  const [moreEventsDate, setMoreEventsDate] = useState<Date | null>(null);
  const [moreDateEvents, setMoreDateEvents] = useState<CalendarEvent[]>([]);
  
  // Zustand store
  const {
    events,
    calendarEvents,
    loading,
    fetchEvents,
    showGovOnly,
    setShowGovOnly,
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

  // Generate Event Summary PDF for selected date
  const generateEventSummaryPDF = (calEvents: CalendarEvent[], date: Date) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Event Summary Report', pageWidth / 2, 20, { align: 'center' });
    
    // Date
    doc.setFontSize(12);
    doc.text(`Date: ${format(date, 'MMMM dd, yyyy')}`, pageWidth / 2, 28, { align: 'center' });
    
    // Total events count
    doc.setFontSize(10);
    doc.text(`Total Events: ${calEvents.length}`, 14, 38);
    
    // Prepare table data
    const tableData = calEvents.map((calEvent) => {
      const baseId = calEvent.id.includes('-slot-') 
        ? calEvent.id.split('-slot-')[0] 
        : calEvent.id;
      const event = events.find(e => e._id === baseId);
      if (!event) return null;
      
      // Format time range
      let timeRange = '';
      if (calEvent.id.includes('-slot-') && event.dateTimeSlots) {
        const slotIndex = parseInt(calEvent.id.split('-slot-')[1]);
        const slot = event.dateTimeSlots[slotIndex];
        if (slot) {
          timeRange = `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
        }
      } else {
        timeRange = `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
      }
      
      return [
        event.eventTitle,
        event.requestor,
        event.requestorDepartment,
        timeRange,
        event.status.charAt(0).toUpperCase() + event.status.slice(1)
      ];
    }).filter(Boolean);
    
    // Create table
    (doc as any).autoTable({
      startY: 45,
      head: [['Event Title', 'Requestor', 'Department', 'Time', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [220, 38, 38], // Red color
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: 0
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 40 },
        4: { cellWidth: 30 }
      },
      margin: { top: 45, right: 14, bottom: 20, left: 14 }
    });
    
    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy hh:mm a')}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
    
    // Download PDF
    doc.save(`Event_Summary_${format(date, 'yyyy-MM-dd')}.pdf`);
    
    toast.success('Event Summary PDF generated successfully!');
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
    // Extract base ID (remove -slot-X suffix if present)
    const baseId = calEvent.id.includes('-slot-') 
      ? calEvent.id.split('-slot-')[0] 
      : calEvent.id;
    
    const event = events.find(e => e._id === baseId);
    if (!event) return null;
    
    // Determine if this is a slot and get the slot data
    const isSlot = calEvent.id.includes('-slot-');
    let displayStartDate = event.startDate;
    let displayStartTime = event.startTime;
    let displayEndDate = event.endDate;
    let displayEndTime = event.endTime;
    
    if (isSlot && event.dateTimeSlots) {
      const slotIndex = parseInt(calEvent.id.split('-slot-')[1]);
      const slot = event.dateTimeSlots[slotIndex];
      if (slot) {
        displayStartDate = slot.startDate;
        displayStartTime = slot.startTime;
        displayEndDate = slot.endDate || slot.startDate;
        displayEndTime = slot.endTime;
      }
    }

    // Determine badge color based on event status
    const getBadgeColor = (status: string) => {
      if (status === 'approved') {
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      } else if (status === 'submitted') {
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
      } else if (status === 'cancelled') {
        return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
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
                <p className="font-medium text-gray-700">Location{event.locations && event.locations.length > 1 ? 's' : ''}</p>
                {event.locations && event.locations.length > 1 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {event.locations.map((loc, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs font-medium">
                        {loc}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">{event.location}</p>
                )}
              </div>
            </div>

            {/* Date & Time - Day by Day for multi-day events */}
            {(() => {
              const hasMultipleDays = event.dateTimeSlots && event.dateTimeSlots.length > 0;
              
              if (!hasMultipleDays) {
                // Single day event - show simple start/end
                return (
                  <>
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-700">Start</p>
                        <p className="text-gray-600">
                          {format(new Date(displayStartDate), 'MMM dd, yyyy')} at {formatTime(displayStartTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <Clock className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-gray-700">End</p>
                        <p className="text-gray-600">
                          {format(new Date(displayEndDate), 'MMM dd, yyyy')} at {formatTime(displayEndTime)}
                        </p>
                      </div>
                    </div>
                  </>
                );
              }
              
              // Multi-day event - show Day 1, Day 2, etc.
              return (
                <div className="space-y-2">
                  <p className="font-medium text-gray-700 text-sm flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    Event Schedule ({event.dateTimeSlots!.length + 1} days)
                  </p>
                  
                  {/* Day 1 */}
                  <div className="pl-6 border-l-2 border-blue-200">
                    <p className="text-sm font-medium text-gray-800">Day 1</p>
                    <p className="text-xs text-gray-600">
                      {format(new Date(event.startDate), 'MMM dd, yyyy')} • {formatTime(event.startTime)} - {formatTime(event.endTime)}
                    </p>
                  </div>
                  
                  {/* Additional Days */}
                  {event.dateTimeSlots!.map((slot, index) => (
                    <div key={index} className="pl-6 border-l-2 border-blue-200">
                      <p className="text-sm font-medium text-gray-800">Day {index + 2}</p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(slot.startDate), 'MMM dd, yyyy')} • {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Requestor Info */}
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500">
                Requested by <span className="font-medium text-gray-700">{event.requestor}</span> from{' '}
                <span className="font-medium text-gray-700">{event.requestorDepartment}</span>
              </p>
            </div>

            {/* Gov Files */}
            {(event.govFiles?.brieferTemplate?.filename || event.govFiles?.programme?.filename || event.govFiles?.availableForDL?.filename) && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">Gov Files</p>
                <div className="space-y-2">
                  {event.govFiles?.brieferTemplate?.filename && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-600">Briefer Template</p>
                        <p className="text-xs text-gray-500 truncate">
                          {event.govFiles.brieferTemplate.originalName || event.govFiles.brieferTemplate.filename}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1"
                          onClick={() => window.open(`${API_BASE_URL}/events/govfile/${event.govFiles!.brieferTemplate!.filename}`, '_blank')}
                        >
                          <FileText className="w-3 h-3" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1"
                          onClick={() => window.open(`${API_BASE_URL}/events/govfile/${event.govFiles!.brieferTemplate!.filename}?download=true`, '_blank')}
                        >
                          <Download className="w-3 h-3" />
                          DL
                        </Button>
                      </div>
                    </div>
                  )}

                  {event.govFiles?.programme?.filename && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-600">Programme</p>
                        <p className="text-xs text-gray-500 truncate">
                          {event.govFiles.programme.originalName || event.govFiles.programme.filename}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1"
                          onClick={() => window.open(`${API_BASE_URL}/events/govfile/${event.govFiles!.programme!.filename}`, '_blank')}
                        >
                          <FileText className="w-3 h-3" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1"
                          onClick={() => window.open(`${API_BASE_URL}/events/govfile/${event.govFiles!.programme!.filename}?download=true`, '_blank')}
                        >
                          <Download className="w-3 h-3" />
                          DL
                        </Button>
                      </div>
                    </div>
                  )}

                  {event.govFiles?.availableForDL?.filename && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-600">Available for DL</p>
                        <p className="text-xs text-gray-500 truncate">
                          {event.govFiles.availableForDL.originalName || event.govFiles.availableForDL.filename}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1"
                          onClick={() => window.open(`${API_BASE_URL}/events/govfile/${event.govFiles!.availableForDL!.filename}`, '_blank')}
                        >
                          <FileText className="w-3 h-3" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 gap-1"
                          onClick={() => window.open(`${API_BASE_URL}/events/govfile/${event.govFiles!.availableForDL!.filename}?download=true`, '_blank')}
                        >
                          <Download className="w-3 h-3" />
                          DL
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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

    const handleShowMore = (e: React.MouseEvent) => {
      e.stopPropagation();
      setMoreEventsDate(date);
      setMoreDateEvents(dateEvents);
      setShowMoreEventsDialog(true);
    };

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
              // Find calendar event by matching either the exact ID or the base ID (for slots)
              const calEvent = dateEvents.find(ce => 
                ce.id === event._id || ce.id.startsWith(event._id + '-slot-')
              );
              
              return calEvent ? renderEventWithPopover(calEvent) : null;
            })}
            {eventsForDate.length > 3 && (
              <button
                type="button"
                onClick={handleShowMore}
                className="text-xs text-gray-500 font-medium hover:text-gray-700 underline-offset-2 hover:underline text-left"
              >
                +{eventsForDate.length - 3} more
              </button>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <Dialog open={showMoreEventsDialog} onOpenChange={setShowMoreEventsDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {moreEventsDate
                  ? `Events on ${format(moreEventsDate, 'MMM dd, yyyy')}`
                  : 'Events'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {moreDateEvents.length === 0 ? (
                <div className="text-sm text-gray-500 py-4">No events</div>
              ) : (
                moreDateEvents.map((calEvent) => renderEventWithPopover(calEvent))
              )}
            </div>
            {/* Generate PDF Button */}
            {moreDateEvents.length > 0 && moreEventsDate && (
              <div className="pt-4 border-t">
                <Button
                  onClick={() => generateEventSummaryPDF(moreDateEvents, moreEventsDate)}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Event Summary PDF
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Calendar</h1>
            <p className="text-sm text-muted-foreground mt-1">View all events and bookings in calendar view</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowGovOnly(!showGovOnly)}
              variant={showGovOnly ? 'default' : 'outline'}
              size="sm"
            >
              Gov’s Calendar
            </Button>
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
