import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Calendar,
  MapPin,
  User,
  Users,
  Building2,
  Clock,
  CalendarRange,
  Phone,
  Mail,
  Camera,
  Download
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, addDays, startOfWeek, endOfWeek } from 'date-fns';
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import { useMyCalendarStore } from '@/stores/myCalendarStore';

interface CalendarEvent {
  _id: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment?: string;
  contactNumber?: string;
  contactEmail?: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  dateTimeSlots?: Array<{
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
  }>;
  numberOfParticipants: number;
  numberOfVIP?: number;
  numberOfVVIP?: number;
  taggedDepartments?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'on-hold';
}

interface CalendarListViewProps {
  events: CalendarEvent[];
}

const CalendarListView: React.FC<CalendarListViewProps> = ({ events }) => {
  const [dateRange, setDateRange] = useState<{ from: Date; to?: Date }>({
    from: new Date(),
    to: undefined
  });
  const [screenshotModal, setScreenshotModal] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [capturingEventId, setCapturingEventId] = useState<string | null>(null);
  const eventRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Get current user and fetch function from store
  const { currentUser, fetchEvents } = useMyCalendarStore();
  
  // Initialize WebSocket
  const { onStatusUpdate, offStatusUpdate } = useSocket(currentUser?._id);

  // Set up real-time event updates via WebSocket
  useEffect(() => {
    if (!currentUser) return;

    // Listen for status updates
    onStatusUpdate((data: any) => {
      console.log('📡 Real-time status update received:', data);
      
      // Refresh events to get latest data
      fetchEvents(true); // Force refresh
      
      // Show toast notification
      if (data.eventTitle) {
        toast.info(`Event "${data.eventTitle}" status updated to ${data.status}`, {
          duration: 3000,
        });
      }
    });

    // Cleanup on unmount
    return () => {
      offStatusUpdate();
    };
  }, [currentUser, onStatusUpdate, offStatusUpdate, fetchEvents]);

  // Quick date selection functions
  const showToday = () => {
    const today = new Date();
    setDateRange({ from: today, to: undefined });
  };

  const showThisWeek = () => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 }); // Saturday
    setDateRange({ from: weekStart, to: weekEnd });
  };

  // Convert 24-hour time to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Filter events by date range
  const filteredEvents = events.filter(event => {
    const eventDate = startOfDay(new Date(event.startDate));
    const rangeStart = startOfDay(dateRange.from);
    const rangeEnd = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    
    return isWithinInterval(eventDate, { start: rangeStart, end: rangeEnd });
  });

  // Debug: Log first event to see structure
  if (filteredEvents.length > 0) {
    console.log('First event structure:', filteredEvents[0]);
  }

  // Get all dates in range
  const allDatesInRange = dateRange.to 
    ? eachDayOfInterval({ start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })
    : [dateRange.from];

  // Group events by date
  const groupedEvents = filteredEvents.reduce((acc, event) => {
    const date = format(new Date(event.startDate), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  // Create entries for dates with bookings only
  const dateEntries = allDatesInRange
    .map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return {
        date: dateStr,
        events: groupedEvents[dateStr] || []
      };
    })
    .filter(entry => entry.events.length > 0); // Only show dates with bookings

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'pending':
      case 'submitted':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'completed':
        return 'bg-violet-100 text-violet-700 border-violet-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    if (status.toLowerCase() === 'submitted') {
      return 'Pending';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Screenshot capture function using html-to-image
  const handleScreenshot = async (eventId: string, eventTitle: string) => {
    const element = eventRefs.current[eventId];
    const dateElement = eventRefs.current[`date-${eventId}`];
    
    if (!element) {
      toast.error('Failed to capture screenshot');
      return;
    }

    try {
      setCapturingEventId(eventId);
      
      // Wait a bit for the UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture both date header and event card together
      const containerToCapture = dateElement || element;
      
      // Capture the element as PNG
      const dataUrl = await htmlToImage.toPng(containerToCapture, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        },
        filter: (node) => {
          // Hide the screenshot button during capture
          if (node.classList && node.classList.contains('screenshot-button')) {
            return false;
          }
          return true;
        }
      });

      setScreenshotPreview(dataUrl);
      setScreenshotModal(true);
      setCapturingEventId(null);
    } catch (error) {
      console.error('Screenshot error:', error);
      toast.error('Failed to capture screenshot');
      setCapturingEventId(null);
    }
  };

  // Download screenshot
  const handleDownload = () => {
    if (!screenshotPreview) return;

    const link = document.createElement('a');
    link.download = `event-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.png`;
    link.href = screenshotPreview;
    link.click();
    
    toast.success('Screenshot downloaded successfully!');
    setScreenshotModal(false);
    setScreenshotPreview(null);
  };

  return (
    <div className="space-y-4">
      {/* Date Range Picker */}
      <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg border">
        <div className="flex items-center gap-3">
          <CalendarRange className="w-5 h-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Select Date Range</p>
            <p className="text-xs text-muted-foreground">Choose dates to view events</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="w-4 h-4" />
                {dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}
                  </>
                ) : (
                  format(dateRange.from, 'MMM dd, yyyy')
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={(range: any) => setDateRange(range || { from: new Date(), to: undefined })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Quick Date Buttons - Outside popover */}
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">Quick select:</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={showToday}
            className="bg-white shadow-sm"
          >
            Today
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={showThisWeek}
            className="bg-white shadow-sm"
          >
            This Week
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {dateEntries.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-semibold text-gray-600">No bookings found</p>
              <p className="text-sm text-gray-500 mt-2">Try selecting a different date range</p>
            </div>
          </div>
        ) : (
          dateEntries.map((entry, dateIndex) => (
            <motion.div
              key={entry.date}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dateIndex * 0.05 }}
            >
              <Card 
                className="border-2"
                ref={(el) => {
                  // Store ref for the date container with all its events
                  if (el && entry.events.length > 0) {
                    eventRefs.current[`date-${entry.events[0]._id}`] = el;
                  }
                }}
              >
                <CardContent className="p-6">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">
                        {format(new Date(entry.date), 'EEEE, MMMM d, yyyy')}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {entry.events.length} {entry.events.length === 1 ? 'event' : 'events'}
                      </p>
                    </div>
                  </div>

                  {/* Events for this date */}
                  <div className="space-y-4">
                    {entry.events.map((event, eventIndex) => (
                    <motion.div
                      key={event._id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: eventIndex * 0.1 }}
                    >
                      <Card 
                        className="bg-muted/30 border"
                        ref={(el) => { eventRefs.current[event._id] = el; }}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-lg font-bold text-foreground">
                              {event.eventTitle}
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleScreenshot(event._id, event.eventTitle)}
                              disabled={capturingEventId === event._id}
                              className="gap-2 screenshot-button"
                            >
                              {capturingEventId === event._id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                                  Capturing...
                                </>
                              ) : (
                                <>
                                  <Camera className="w-4 h-4" />
                                  Export Image
                                </>
                              )}
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 divide-x">
                            {/* Left Column - Basic Info */}
                            <div className="space-y-4 pr-6">
                              <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                  <User className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Requestor</p>
                                    <p className="text-sm font-semibold">{event.requestor}</p>
                                  </div>
                                </div>

                                {event.requestorDepartment && (
                                  <div className="flex items-start gap-3">
                                    <Building2 className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Requestor Department</p>
                                      <p className="text-sm font-semibold">{event.requestorDepartment}</p>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-start gap-3">
                                  <MapPin className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Location</p>
                                    <p className="text-sm font-semibold">{event.location}</p>
                                  </div>
                                </div>

                                {event.contactNumber && (
                                  <div className="flex items-start gap-3">
                                    <Phone className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Contact Number</p>
                                      <p className="text-sm font-semibold">{event.contactNumber}</p>
                                    </div>
                                  </div>
                                )}

                                {event.contactEmail && (
                                  <div className="flex items-start gap-3">
                                    <Mail className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <p className="text-xs font-medium text-muted-foreground mb-1">Contact Email</p>
                                      <p className="text-sm font-semibold">{event.contactEmail}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right Column - Event Details */}
                            <div className="space-y-4 pl-6">
                              <div className="space-y-3">
                                {/* Show multiple date/time slots if available */}
                                {event.dateTimeSlots && event.dateTimeSlots.length > 0 ? (
                                  <>
                                    {/* Day 1 */}
                                    <div className="flex items-start gap-3">
                                      <Clock className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Day 1 - Start</p>
                                          <p className="text-sm font-semibold">
                                            {format(new Date(event.startDate), 'MMM d, yyyy')} at {formatTime(event.startTime)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs font-medium text-muted-foreground mb-1">Day 1 - End</p>
                                          <p className="text-sm font-semibold">
                                            {format(new Date(event.endDate), 'MMM d, yyyy')} at {formatTime(event.endTime)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Additional days from dateTimeSlots */}
                                    {event.dateTimeSlots.map((slot, idx) => (
                                      <div key={idx} className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1 grid grid-cols-2 gap-4">
                                          <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Day {idx + 2} - Start</p>
                                            <p className="text-sm font-semibold">
                                              {format(new Date(slot.startDate), 'MMM d, yyyy')} at {formatTime(slot.startTime)}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Day {idx + 2} - End</p>
                                            <p className="text-sm font-semibold">
                                              {format(new Date(slot.endDate), 'MMM d, yyyy')} at {formatTime(slot.endTime)}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  <div className="flex items-start gap-3">
                                    <Clock className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Start</p>
                                        <p className="text-sm font-semibold">
                                          {format(new Date(event.startDate), 'MMM d, yyyy')} at {formatTime(event.startTime)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">End</p>
                                        <p className="text-sm font-semibold">
                                          {format(new Date(event.endDate), 'MMM d, yyyy')} at {formatTime(event.endTime)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-start gap-3">
                                  <Users className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Participants</p>
                                    <div className="space-y-1">
                                      <p className="text-sm font-semibold">
                                        Total: {(event as any).numberOfParticipants || (event as any).participants || 0}
                                      </p>
                                      {((event as any).numberOfVIP || (event as any).vip || 0) > 0 && (
                                        <p className="text-sm font-semibold">
                                          VIP: {(event as any).numberOfVIP || (event as any).vip}
                                        </p>
                                      )}
                                      {((event as any).numberOfVVIP || (event as any).vvip || 0) > 0 && (
                                        <p className="text-sm font-semibold">
                                          VVIP: {(event as any).numberOfVVIP || (event as any).vvip}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {event.taggedDepartments && event.taggedDepartments.length > 0 && (
                                  <div className="flex items-start gap-3">
                                    <Building2 className="w-5 h-5 text-gray-700 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-muted-foreground mb-2">Tagged Departments</p>
                                      <div className="flex flex-wrap gap-2">
                                        {event.taggedDepartments.map((dept, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {dept}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-start gap-3 pt-2">
                                  <div className="w-5 h-5 flex-shrink-0" />
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Status</p>
                                    <Badge className={`${getStatusColor(event.status)} border`}>
                                      {getStatusLabel(event.status)}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Screenshot Preview Modal */}
      <Dialog open={screenshotModal} onOpenChange={setScreenshotModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Screenshot Preview</DialogTitle>
            <DialogDescription>
              Preview your screenshot before downloading
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[500px] overflow-auto border rounded-lg bg-gray-50 p-4">
            {screenshotPreview && (
              <img 
                src={screenshotPreview} 
                alt="Screenshot preview" 
                className="w-full h-auto"
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setScreenshotModal(false);
                setScreenshotPreview(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarListView;
