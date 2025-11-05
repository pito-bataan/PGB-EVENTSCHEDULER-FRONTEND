import React, { useState, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EventCountBadge from '@/components/ui/event-count-badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
  Clock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isBefore, startOfDay, startOfWeek, endOfWeek } from 'date-fns';

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'available' | 'unavailable' | 'event' | 'custom' | 'booking' | 'completed' | 'submitted' | 'approved' | 'rejected';
  notes?: string;
  color?: string;
  className?: string;
}

interface CustomCalendarProps {
  events?: CalendarEvent[];
  onDateClick?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
  showNavigation?: boolean;
  showLegend?: boolean;
  className?: string;
  cellHeight?: string;
  initialDate?: Date;
  renderDateContent?: (date: Date, events: CalendarEvent[]) => React.ReactNode;
  renderEvent?: (event: CalendarEvent) => React.ReactNode;
  showEventCount?: boolean;
  getEventCountForDate?: (date: Date) => number;
  selectedDates?: string[];
  isSelectionMode?: boolean;
}

const CustomCalendar: React.FC<CustomCalendarProps> = ({
  events = [],
  onDateClick,
  onMonthChange,
  showNavigation = true,
  showLegend = true,
  className = '',
  cellHeight = 'min-h-[100px]',
  initialDate = new Date(),
  renderDateContent,
  renderEvent,
  showEventCount = false,
  getEventCountForDate,
  selectedDates = [],
  isSelectionMode = false
}) => {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [showAllEventsModal, setShowAllEventsModal] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<CalendarEvent[]>([]);
  const [showEventDetailModal, setShowEventDetailModal] = useState(false);
  const [selectedEventDetail, setSelectedEventDetail] = useState<CalendarEvent | null>(null);

  // Get calendar days for current month with proper week padding
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const filtered = events.filter(event => {
      const eventDateStr = event.date; // Already in YYYY-MM-DD format
      const match = eventDateStr === dateStr;
      return match;
    });
    
    return filtered;
  };

  // Check if a date is selected
  const isDateSelected = (date: Date): boolean => {
    const dateStr = date.toLocaleDateString('en-CA');
    return selectedDates.includes(dateStr);
  };

  // Handle date selection
  const handleDateClick = (date: Date) => {
    // In selection mode, allow clicking on past dates for deletion
    if (!isSelectionMode) {
      // Don't allow clicking on past dates in normal mode
      const today = startOfDay(new Date());
      const clickedDate = startOfDay(date);
      
      if (isBefore(clickedDate, today)) {
        return; // Do nothing for past dates
      }
    }
    
    onDateClick?.(date);
  };

  // Navigate months
  const goToPreviousMonth = () => {
    const newDate = subMonths(currentDate, 1);
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  };

  const goToNextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    setCurrentDate(newDate);
    onMonthChange?.(newDate);
  };

  // Handle showing all events modal
  const handleShowAllEvents = (dateEvents: CalendarEvent[], e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDateEvents(dateEvents);
    setShowAllEventsModal(true);
  };

  // Handle showing event detail modal
  const handleShowEventDetail = (event: CalendarEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEventDetail(event);
    setShowEventDetailModal(true);
  };

  // Convert 24-hour time to 12-hour format with AM/PM
  const formatTime12Hour = (time24: string) => {
    if (time24 === 'N/A' || !time24) return 'N/A';
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Parse event notes to extract details
  const parseEventNotes = (notes?: string) => {
    if (!notes) return { 
      location: 'N/A', 
      status: 'N/A',
      startDate: 'N/A',
      endDate: 'N/A',
      startTime: 'N/A',
      endTime: 'N/A',
      dateTimeSlots: []
    };
    
    const locationMatch = notes.match(/Location: ([^|]+)/);
    const statusMatch = notes.match(/Status: ([^|]+)/);
    const startDateMatch = notes.match(/StartDate: ([^|]+)/);
    const endDateMatch = notes.match(/EndDate: ([^|]+)/);
    const startTimeMatch = notes.match(/StartTime: ([^|]+)/);
    const endTimeMatch = notes.match(/EndTime: ([^|]+)/);
    const dateSlotsMatch = notes.match(/DateTimeSlots: (\[[\s\S]*\])$/);
    
    let dateTimeSlots: any[] = [];
    if (dateSlotsMatch) {
      try {
        const jsonStr = dateSlotsMatch[1];
        console.log('Parsing dateTimeSlots:', jsonStr);
        dateTimeSlots = JSON.parse(jsonStr);
        console.log('Parsed dateTimeSlots:', dateTimeSlots);
      } catch (e) {
        console.error('Failed to parse dateTimeSlots:', e, 'Raw:', dateSlotsMatch[1]);
      }
    } else {
      console.log('No dateTimeSlots match found in notes:', notes);
    }
    
    return {
      location: locationMatch ? locationMatch[1].trim() : 'N/A',
      status: statusMatch ? statusMatch[1].trim() : 'N/A',
      startDate: startDateMatch ? startDateMatch[1].trim() : 'N/A',
      endDate: endDateMatch ? endDateMatch[1].trim() : 'N/A',
      startTime: formatTime12Hour(startTimeMatch ? startTimeMatch[1].trim() : 'N/A'),
      endTime: formatTime12Hour(endTimeMatch ? endTimeMatch[1].trim() : 'N/A'),
      dateTimeSlots: dateTimeSlots
    };
  };

  // Get status badge color based on status text
  const getStatusBadgeColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'completed') {
      return 'bg-violet-100 text-violet-800 border-violet-200';
    } else if (statusLower === 'submitted' || statusLower === 'pending') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    } else if (statusLower === 'approved') {
      return 'bg-green-100 text-green-800 border-green-200';
    } else if (statusLower === 'rejected' || statusLower === 'cancelled' || statusLower === 'declined') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // Default event renderer
  const defaultRenderEvent = (event: CalendarEvent) => {
    const getEventStyle = (type: string, customColor?: string) => {
      // If custom color is provided, don't apply default background classes
      if (customColor) return '';
      
      switch (type) {
        case 'available':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'unavailable':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'event':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'booking':
          return 'bg-purple-100 text-purple-800 border-purple-200';
        case 'completed':
          return 'bg-violet-100 text-violet-800 border-violet-200';
        case 'submitted':
          return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'approved':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'rejected':
          return 'bg-red-100 text-red-800 border-red-200';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    };

    const getEventIcon = (type: string) => {
      switch (type) {
        case 'available':
          return <CheckCircle className="w-2 h-2" />;
        case 'unavailable':
          return <XCircle className="w-2 h-2" />;
        case 'booking':
          return <Plus className="w-2 h-2" />;
        default:
          return null;
      }
    };

    // Truncate long event titles to prevent overflow
    const truncateTitle = (title: string, maxLength: number = 20) => {
      if (title.length <= maxLength) return title;
      return title.substring(0, maxLength - 3) + '...';
    };

    // Debug logging
    if (event.title.includes('Thermodynamics')) {
      console.log('🎨 Rendering Thermodynamics event:', {
        color: event.color,
        className: `inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border mb-1 ${event.color ? 'text-gray-800 border-transparent' : getEventStyle(event.type, event.color)} ${event.className || ''}`,
        style: event.color ? { backgroundColor: event.color, background: event.color } : undefined
      });
    }

    const eventDetails = parseEventNotes(event.notes);

    return (
      <Popover key={event.id}>
        <PopoverTrigger asChild>
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border mb-1 hover:opacity-80 transition-opacity ${event.color ? 'text-gray-800 border-transparent' : getEventStyle(event.type, event.color)} ${event.className || ''}`}
            style={event.color ? { backgroundColor: event.color, background: event.color } : undefined}
          >
            {getEventIcon(event.type)}
            <span className="truncate">{truncateTitle(event.title)}</span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-80" side="top" align="start">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm mb-2">{event.title}</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="font-medium">{eventDetails.location}</p>
                </div>
              </div>
              
              {/* Show date/time - different format for single vs multiple dates */}
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  {eventDetails.dateTimeSlots && eventDetails.dateTimeSlots.length > 0 ? (
                    // Multiple date/time slots
                    <>
                      <p className="text-xs text-gray-500 mb-1">Date/Time Slots</p>
                      <div className="space-y-1">
                        {/* Main date slot */}
                        <div className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                          <p className="font-medium">
                            {eventDetails.startDate !== 'N/A' 
                              ? `${format(new Date(eventDetails.startDate), 'MMM d, yyyy')} ${eventDetails.startTime} - ${eventDetails.endTime}`
                              : 'N/A'
                            }
                          </p>
                        </div>
                        
                        {/* Additional date/time slots */}
                        {eventDetails.dateTimeSlots.map((slot: any, idx: number) => (
                          <div key={idx} className="text-xs bg-gray-50 p-2 rounded border">
                            <p className="font-medium">
                              {format(new Date(slot.startDate), 'MMM d, yyyy')} {formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    // Single date/time
                    <>
                      <p className="text-xs text-gray-500 mb-1">Date & Time</p>
                      <p className="font-medium text-xs">
                        {eventDetails.startDate !== 'N/A' 
                          ? `${format(new Date(eventDetails.startDate), 'MMM d, yyyy')} at ${eventDetails.startTime} to ${eventDetails.endTime}`
                          : 'N/A'
                        }
                      </p>
                    </>
                  )}
                </div>
              </div>
              
              {eventDetails.status && (
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <Badge className={`${getStatusBadgeColor(eventDetails.status)} border text-xs`}>
                      {eventDetails.status}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Default date content renderer
  const defaultRenderDateContent = (date: Date, dateEvents: CalendarEvent[]) => {
    const isToday = isSameDay(date, new Date());
    const isCurrentMonth = isSameMonth(date, currentDate);
    const eventCount = showEventCount && getEventCountForDate ? getEventCountForDate(date) : 0;
    const isSelected = isDateSelected(date);

    return (
      <>
        {/* Date Number */}
        <div className={`
          text-sm font-medium mb-2
          ${isSelected ? 'text-orange-800 font-bold' : isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
        `}>
          {format(date, 'd')}
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-4 h-4 bg-orange-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        {/* Today Indicator */}
        {isToday && !showEventCount && !isSelected && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></div>
        )}

        {/* Event Count Badge */}
        {showEventCount && eventCount > 0 && !isSelected && (
          <EventCountBadge 
            count={eventCount}
            variant="destructive"
            size="sm"
            position="top-right"
          />
        )}

        {/* Events */}
        {dateEvents.length > 0 && (
          <div className="space-y-1">
            {dateEvents.slice(0, 2).map((event) => 
              renderEvent ? renderEvent(event) : defaultRenderEvent(event)
            )}
            {dateEvents.length > 2 && (
              <div 
                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer font-medium hover:underline"
                onClick={(e) => handleShowAllEvents(dateEvents, e)}
              >
                +{dateEvents.length - 2} more
              </div>
            )}
          </div>
        )}

        {/* Add Note Indicator */}
        {dateEvents.length === 0 && isCurrentMonth && !showEventCount && (
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="w-3 h-3 text-gray-400" />
          </div>
        )}
      </>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Calendar Navigation */}
      {showNavigation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Button variant="outline" onClick={goToPreviousMonth} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <h2 className="text-xl font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          
          <Button variant="outline" onClick={goToNextMonth} className="gap-2">
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Calendar Grid */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
      >
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date) => {
            const dateEvents = getEventsForDate(date);
            const isToday = isSameDay(date, new Date());
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isPastDate = isBefore(startOfDay(date), startOfDay(new Date()));
            const isSelected = isDateSelected(date);

            return (
              <div
                key={date.toISOString()}
                className={`
                  relative p-4 ${cellHeight} border-r border-b border-gray-100 group
                  transition-colors duration-150
                  ${!isCurrentMonth ? 'text-gray-400 bg-gray-25' : ''}
                  ${isToday && !isSelected ? 'bg-blue-50 border-blue-200' : ''}
                  ${isSelected ? 'bg-orange-100 border-orange-300 ring-2 ring-orange-200' : ''}
                  ${isSelectionMode 
                    ? 'cursor-pointer hover:bg-orange-50' 
                    : isPastDate 
                      ? 'cursor-not-allowed opacity-50 bg-gray-100 text-gray-400' 
                      : 'cursor-pointer hover:bg-gray-50'
                  }
                `}
                onClick={() => handleDateClick(date)}
              >
                {renderDateContent 
                  ? renderDateContent(date, dateEvents)
                  : defaultRenderDateContent(date, dateEvents)
                }
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Legend */}
      {showLegend && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-6 text-sm text-gray-600"
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-100 border border-green-200 rounded"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-100 border border-red-200 rounded"></div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-100 border border-purple-200 rounded"></div>
            <span>Has Bookings</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded"></div>
            <span>Today</span>
          </div>
        </motion.div>
      )}

      {/* All Events Modal */}
      <Dialog open={showAllEventsModal} onOpenChange={setShowAllEventsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Events</DialogTitle>
            <DialogDescription>
              {selectedDateEvents.length > 0 && 
                `${selectedDateEvents.length} event${selectedDateEvents.length > 1 ? 's' : ''} on ${format(new Date(selectedDateEvents[0].date), 'MMMM d, yyyy')}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {selectedDateEvents.map((event) => {
              const eventDetails = parseEventNotes(event.notes);
              const getEventStyle = (type: string) => {
                switch (type) {
                  case 'completed': return 'bg-violet-100 text-violet-800 border-violet-200';
                  case 'submitted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
                  case 'approved': return 'bg-green-100 text-green-800 border-green-200';
                  case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
                  default: return 'bg-gray-100 text-gray-800 border-gray-200';
                }
              };

              return (
                <div
                  key={event.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setShowAllEventsModal(false);
                    handleShowEventDetail(event);
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-2">{event.title}</h4>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          <span>{eventDetails.location}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getEventStyle(event.type)} border text-xs`}>
                      {eventDetails.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Event Detail Modal */}
      <Dialog open={showEventDetailModal} onOpenChange={setShowEventDetailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {selectedEventDetail && (() => {
            const details = parseEventNotes(selectedEventDetail.notes);
            return (
              <div className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold text-lg mb-4">{selectedEventDetail.title}</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Location</p>
                      <p className="font-medium">{details.location}</p>
                    </div>
                  </div>
                  
                  {/* Show date/time - different format for single vs multiple dates */}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      {details.dateTimeSlots && details.dateTimeSlots.length > 0 ? (
                        // Multiple date/time slots
                        <>
                          <p className="text-xs text-gray-500 mb-2">Date/Time Slots</p>
                          <div className="space-y-2">
                            {/* Main date slot */}
                            <div className="bg-blue-50 p-3 rounded border border-blue-200">
                              <p className="font-medium text-sm">
                                {details.startDate !== 'N/A' 
                                  ? `${format(new Date(details.startDate), 'MMMM d, yyyy')} ${details.startTime} - ${details.endTime}`
                                  : 'N/A'
                                }
                              </p>
                            </div>
                            
                            {/* Additional date/time slots */}
                            {details.dateTimeSlots.map((slot: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 p-3 rounded border">
                                <p className="font-medium text-sm">
                                  {format(new Date(slot.startDate), 'MMMM d, yyyy')} {formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        // Single date/time
                        <>
                          <p className="text-xs text-gray-500 mb-2">Date & Time</p>
                          <p className="font-medium">
                            {details.startDate !== 'N/A' 
                              ? `${format(new Date(details.startDate), 'MMMM d, yyyy')} at ${details.startTime} to ${details.endTime}`
                              : 'N/A'
                            }
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <Badge className={`${getStatusBadgeColor(details.status)} border text-xs`}>
                        {details.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomCalendar;
