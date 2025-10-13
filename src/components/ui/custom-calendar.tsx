import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EventCountBadge from '@/components/ui/event-count-badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isBefore, startOfDay, startOfWeek, endOfWeek } from 'date-fns';

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'available' | 'unavailable' | 'event' | 'custom' | 'booking';
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

  // Get calendar days for current month with proper week padding
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => 
      isSameDay(new Date(event.date), date)
    );
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

  // Default event renderer
  const defaultRenderEvent = (event: CalendarEvent) => {
    const getEventStyle = (type: string, customColor?: string) => {
      if (customColor) return { backgroundColor: customColor };
      
      switch (type) {
        case 'available':
          return 'bg-green-100 text-green-800 border-green-200';
        case 'unavailable':
          return 'bg-red-100 text-red-800 border-red-200';
        case 'event':
          return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'booking':
          return 'bg-purple-100 text-purple-800 border-purple-200';
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

    return (
      <Badge 
        key={event.id}
        variant="outline"
        className={`text-xs gap-1 mb-1 ${getEventStyle(event.type, event.color)} ${event.className || ''}`}
        style={event.color ? { backgroundColor: event.color } : undefined}
        title={event.title} // Show full title on hover
      >
        {getEventIcon(event.type)}
        <span className="truncate">{truncateTitle(event.title)}</span>
      </Badge>
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
              <div className="text-xs text-gray-500">
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
          {calendarDays.map((date, index) => {
            const dateEvents = getEventsForDate(date);
            const isToday = isSameDay(date, new Date());
            const isCurrentMonth = isSameMonth(date, currentDate);
            const isPastDate = isBefore(startOfDay(date), startOfDay(new Date()));
            const isSelected = isDateSelected(date);

            return (
              <motion.div
                key={date.toISOString()}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.01 }}
                className={`
                  relative p-4 ${cellHeight} border-r border-b border-gray-100 group
                  transition-all duration-200
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
              </motion.div>
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
    </div>
  );
};

export default CustomCalendar;
