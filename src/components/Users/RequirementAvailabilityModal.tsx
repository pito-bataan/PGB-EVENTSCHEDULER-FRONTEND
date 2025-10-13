import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Building2,
  Package,
  Users,
  Eye,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  Edit3,
  Settings,
  Save
} from 'lucide-react';
import { format } from 'date-fns';

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

interface RequirementAvailability {
  requirementId: string;
  requirementText: string;
  isAvailable: boolean;
  notes: string;
  quantity: number;
  maxCapacity: number;
}

interface DepartmentBooking {
  departmentName: string;
  eventTitle: string;
  requestor: string;
  quantity: number;
  notes?: string;
  eventId: string;
  startTime?: string;
  endTime?: string;
}

interface EventDetails {
  _id: string;
  eventTitle: string;
  requestor: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  participants: number;
  vip?: number;
  vvip?: number;
  taggedDepartments: string[];
}

interface RequirementAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  departmentId: string;
  departmentName: string;
  requirements: Requirement[];
  onSave: (date: Date, availabilities: RequirementAvailability[]) => void;
  existingAvailabilities?: RequirementAvailability[];
  currentStartTime?: string;
  currentEndTime?: string;
}

const RequirementAvailabilityModal: React.FC<RequirementAvailabilityModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  departmentName,
  requirements,
  onSave,
  existingAvailabilities = []
}) => {
  const [availabilities, setAvailabilities] = useState<RequirementAvailability[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([]);
  const [showSelection, setShowSelection] = useState(true);
  const [activeTab, setActiveTab] = useState('availability');
  const [departmentBookings, setDepartmentBookings] = useState<{ [requirementId: string]: DepartmentBooking[] }>({});
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<EventDetails | null>(null);
  const [loadingEventDetails, setLoadingEventDetails] = useState(false);
  const [availabilityStartTime, setAvailabilityStartTime] = useState<string>('08:00');
  const [availabilityEndTime, setAvailabilityEndTime] = useState<string>('17:00');

  // Initialize states when modal opens
  useEffect(() => {
    if (isOpen && requirements.length > 0) {
      // If there are existing availabilities, show them directly (editing mode)
      if (existingAvailabilities.length > 0) {
        setShowSelection(false);
        setSelectedRequirements(existingAvailabilities.map(av => av.requirementId));
      } else {
        // New date, show selection first
        setShowSelection(true);
        setSelectedRequirements([]);
      }
      
      const initialAvailabilities = requirements.map(req => {
        const existing = existingAvailabilities.find(av => av.requirementId === req._id);
        return existing || {
          requirementId: req._id,
          requirementText: req.text,
          isAvailable: true,
          notes: '',
          quantity: req.type === 'physical' ? 100 : 1, // Default to 100 for physical items
          maxCapacity: req.type === 'physical' ? (req.totalQuantity || 100) : 1
        };
      });
      setAvailabilities(initialAvailabilities);
      
      // Fetch real booking data from API
      fetchDepartmentBookings();
    }
  }, [isOpen, requirements, existingAvailabilities]);

  // Refetch bookings when time range changes (but don't reset availabilities)
  useEffect(() => {
    if (isOpen && selectedDate) {
      fetchDepartmentBookings();
    }
  }, [availabilityStartTime, availabilityEndTime]);

  // Toggle requirement selection
  const toggleRequirementSelection = (requirementId: string) => {
    setSelectedRequirements(prev => 
      prev.includes(requirementId)
        ? prev.filter(id => id !== requirementId)
        : [...prev, requirementId]
    );
  };

  // Proceed to availability setting
  const proceedToAvailability = () => {
    if (selectedRequirements.length > 0) {
      setShowSelection(false);
    }
  };

  // Update a specific requirement's availability
  const updateAvailability = (requirementId: string, updates: Partial<RequirementAvailability>) => {
    setAvailabilities(prev => 
      prev.map(av => 
        av.requirementId === requirementId 
          ? { ...av, ...updates }
          : av
      )
    );
  };

  // Set all requirements to available/unavailable
  const setAllAvailability = (isAvailable: boolean) => {
    setAvailabilities(prev => 
      prev.map(av => ({ ...av, isAvailable }))
    );
  };

  // Fetch department bookings for the selected date
  const fetchDepartmentBookings = async () => {
    if (!selectedDate) return;

    setLoadingBookings(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch all events and filter client-side for date range matching
      const response = await fetch(`http://localhost:5000/api/events`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const eventsData = await response.json();
      const events = eventsData.data || [];

      // Process events to extract department bookings by requirement
      const bookingsByRequirement: { [requirementId: string]: DepartmentBooking[] } = {};

      events.forEach((event: any) => {
        // Check if the event actually occurs on the selected date
        const eventStartDate = new Date(event.startDate);
        const eventEndDate = new Date(event.endDate);
        const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        
        // Check if the selected date falls within the event's date range
        const eventStartDateOnly = new Date(eventStartDate.getFullYear(), eventStartDate.getMonth(), eventStartDate.getDate());
        const eventEndDateOnly = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate());
        
        const isEventOnSelectedDate = selectedDateOnly >= eventStartDateOnly && selectedDateOnly <= eventEndDateOnly;
        
        // Additional time overlap check - only include events that have time overlap with availability time range
        let hasTimeOverlap = true; // Default to true for all-day availability
        
        if (availabilityStartTime && availabilityEndTime && event.startTime && event.endTime) {
          // Convert times to minutes for easier comparison
          const parseTime = (timeStr: string) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
          };
          
          const availabilityStart = parseTime(availabilityStartTime);
          const availabilityEnd = parseTime(availabilityEndTime);
          const eventStart = parseTime(event.startTime);
          const eventEnd = parseTime(event.endTime);
          
          // Check if time ranges overlap: (start1 < end2) && (start2 < end1)
          hasTimeOverlap = (availabilityStart < eventEnd) && (eventStart < availabilityEnd);
          
          console.log(`Time overlap check for event "${event.eventTitle}":`, {
            availabilityTime: `${availabilityStartTime}-${availabilityEndTime}`,
            eventTime: `${event.startTime}-${event.endTime}`,
            hasOverlap: hasTimeOverlap
          });
        }
        
        if (isEventOnSelectedDate && hasTimeOverlap && event.departmentRequirements && event.taggedDepartments) {
          // Get the department that created this event (not the tagged departments)
          const eventOwnerDepartment = event.requestorDepartment || event.departmentName || event.department || event.createdByDepartment || 'Unknown Department';
          
          // Loop through each department's requirements
          event.taggedDepartments.forEach((deptName: string) => {
            const deptRequirements = event.departmentRequirements[deptName];
            if (Array.isArray(deptRequirements)) {
              deptRequirements.forEach((req: any) => {
                if (req.selected) {
                  // Find matching requirement ID from our current department's requirements
                  const matchingReq = requirements.find(r => r.text === req.name);
                  if (matchingReq) {
                    if (!bookingsByRequirement[matchingReq._id]) {
                      bookingsByRequirement[matchingReq._id] = [];
                    }
                    
                    bookingsByRequirement[matchingReq._id].push({
                      departmentName: eventOwnerDepartment, // Use event owner department instead of tagged department
                      eventTitle: event.eventTitle,
                      requestor: event.requestor,
                      quantity: req.quantity || 1,
                      notes: req.notes || '',
                      eventId: event._id,
                      startTime: event.startTime,
                      endTime: event.endTime
                    });
                  }
                }
              });
            }
          });
        }
      });

      setDepartmentBookings(bookingsByRequirement);
    } catch (error) {
      console.error('Error fetching department bookings:', error);
      // Set empty bookings on error
      setDepartmentBookings({});
    } finally {
      setLoadingBookings(false);
    }
  };

  // Fetch event details
  const fetchEventDetails = async (eventId: string) => {
    setLoadingEventDetails(true);
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(`http://localhost:5000/api/events/${eventId}`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch event details');
      }

      const eventData = await response.json();
      setSelectedEventDetails(eventData.data);
      setShowEventModal(true);
    } catch (error) {
      console.error('Error fetching event details:', error);
    } finally {
      setLoadingEventDetails(false);
    }
  };

  // Handle view event
  const handleViewEvent = (eventId: string) => {
    fetchEventDetails(eventId);
  };

  // Convert 24-hour time to 12-hour AM/PM format
  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const minute = minutes || '00';
    
    if (hour === 0) {
      return `12:${minute} AM`;
    } else if (hour < 12) {
      return `${hour}:${minute} AM`;
    } else if (hour === 12) {
      return `12:${minute} PM`;
    } else {
      return `${hour - 12}:${minute} PM`;
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedDate || selectedRequirements.length === 0) return;
    
    setIsSaving(true);
    try {
      // Only save availabilities for selected requirements
      const selectedAvailabilities = availabilities.filter(av => 
        selectedRequirements.includes(av.requirementId)
      );
      await onSave(selectedDate, selectedAvailabilities);
      onClose();
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Get summary stats
  const availableCount = availabilities.filter(av => av.isAvailable).length;
  const unavailableCount = availabilities.length - availableCount;

  if (!selectedDate) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="flex flex-col overflow-hidden"
        style={{ 
          maxWidth: '80rem', 
          width: '98vw', 
          height: '92vh', 
          maxHeight: '92vh', 
          padding: 0, 
          gap: 0 
        }}
      >
        {/* Fixed Header */}
        <div className="flex-shrink-0 p-6 pb-4 border-b bg-white">
          <DialogHeader>
            {/* Title with Time Range in Right Corner */}
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Edit3 className="w-5 h-5 text-blue-600" />
                Set Resource Availability
              </DialogTitle>
              
              {/* Compact Time Range in Right Corner */}
              <div className="flex items-center gap-3 p-3 bg-background border rounded-lg shadow-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={availabilityStartTime}
                    onChange={(e) => setAvailabilityStartTime(e.target.value)}
                    className="w-24 h-8 text-sm"
                    title="Availability Start Time"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={availabilityEndTime}
                    onChange={(e) => setAvailabilityEndTime(e.target.value)}
                    className="w-24 h-8 text-sm"
                    title="Availability End Time"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
              <p className="text-sm text-gray-600 flex items-center">
                <CalendarIcon className="w-4 h-4 mr-1" />
                {format(selectedDate, 'EEEE, MMMM dd, yyyy')}
              </p>
              <p className="text-sm text-gray-600 flex items-center">
                <Package className="w-4 h-4 mr-1" />
                {departmentName} - {requirements.length} Resources
              </p>
              <p className="text-xs text-blue-600 ml-auto">
                Time range: {availabilityStartTime} - {availabilityEndTime}
              </p>
            </div>
          </DialogHeader>

          {/* Summary Stats & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="gap-1 bg-green-100 text-green-800 border-green-200">
                <CheckCircle className="w-3 h-3" />
                Available: {availableCount}
              </Badge>
              <Badge variant="outline" className="gap-1 bg-red-100 text-red-800 border-red-200">
                <XCircle className="w-3 h-3" />
                Unavailable: {unavailableCount}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAllAvailability(true)}
                className="gap-1 text-xs"
              >
                <CheckCircle className="w-3 h-3" />
                All Available
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAllAvailability(false)}
                className="gap-1 text-xs"
              >
                <XCircle className="w-3 h-3" />
                All Unavailable
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable Content with Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="flex-shrink-0 px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="availability" className="gap-2">
                  <Settings className="w-4 h-4" />
                  Set Availability
                </TabsTrigger>
                <TabsTrigger value="bookings" className="gap-2 relative">
                  <Building2 className="w-4 h-4" />
                  Department Bookings
                  {(() => {
                    const totalBookings = Object.values(departmentBookings).reduce((total, bookings) => total + bookings.length, 0);
                    return totalBookings > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="ml-2 h-5 min-w-5 text-xs bg-purple-100 text-purple-800 border-purple-200"
                      >
                        {totalBookings}
                      </Badge>
                    );
                  })()}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <TabsContent value="availability" className="p-6 mt-0">
              {showSelection ? (
                /* Requirement Selection Screen */
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Select Requirements for this Date</h3>
                    <p className="text-sm text-muted-foreground">
                      Choose which requirements you need to set availability for on {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'this date'}
                    </p>
                  </div>

                  {/* Physical Requirements Selection */}
                  {requirements.filter(req => req.type === 'physical').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                        <Package className="w-5 h-5 text-purple-600" />
                        <h4 className="text-md font-semibold">Physical Requirements</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {requirements
                          .filter(req => req.type === 'physical')
                          .map(req => (
                            <Button
                              key={req._id}
                              variant={selectedRequirements.includes(req._id) ? "default" : "outline"}
                              className="h-auto p-4 justify-start text-left"
                              onClick={() => toggleRequirementSelection(req._id)}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <Package className="w-4 h-4 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{req.text}</p>
                                  <p className="text-xs opacity-70">Total: {req.totalQuantity || 1} units</p>
                                </div>
                                {selectedRequirements.includes(req._id) && (
                                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                )}
                              </div>
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Services Requirements Selection */}
                  {requirements.filter(req => req.type === 'service').length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                        <Settings className="w-5 h-5 text-orange-600" />
                        <h4 className="text-md font-semibold">Services Requirements</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {requirements
                          .filter(req => req.type === 'service')
                          .map(req => (
                            <Button
                              key={req._id}
                              variant={selectedRequirements.includes(req._id) ? "default" : "outline"}
                              className="h-auto p-4 justify-start text-left"
                              onClick={() => toggleRequirementSelection(req._id)}
                            >
                              <div className="flex items-center gap-3 w-full">
                                <Settings className="w-4 h-4 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{req.text}</p>
                                  <p className="text-xs opacity-70">
                                    {req.responsiblePerson ? `By: ${req.responsiblePerson}` : 'Service'}
                                  </p>
                                </div>
                                {selectedRequirements.includes(req._id) && (
                                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                )}
                              </div>
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Selection Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {selectedRequirements.length} requirement{selectedRequirements.length !== 1 ? 's' : ''} selected
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequirements(requirements.map(r => r._id))}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequirements([])}
                      >
                        Clear All
                      </Button>
                      <Button
                        onClick={proceedToAvailability}
                        disabled={selectedRequirements.length === 0}
                        className="gap-2"
                      >
                        Continue
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Availability Setting Screen */
                <div className="space-y-8">
              {/* Physical Requirements Section */}
              {availabilities.filter(av => selectedRequirements.includes(av.requirementId) && requirements.find(req => req._id === av.requirementId)?.type === 'physical').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                    <Package className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-foreground">Physical Requirements</h3>
                    <Badge variant="outline" className="ml-auto">
                      {availabilities.filter(av => selectedRequirements.includes(av.requirementId) && requirements.find(req => req._id === av.requirementId)?.type === 'physical').length} items
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {availabilities
                      .filter(av => selectedRequirements.includes(av.requirementId) && requirements.find(req => req._id === av.requirementId)?.type === 'physical')
                      .map((availability, index) => (
                <motion.div
                  key={availability.requirementId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md"
                >
                  {/* Header */}
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-foreground text-sm leading-tight">{availability.requirementText}</h4>
                        <p className="text-xs text-muted-foreground">ID: {availability.requirementId.slice(-8)}</p>
                      </div>
                    </div>
                    
                    {/* Availability Toggle */}
                    <div className="flex items-center justify-center gap-2 p-2 bg-muted/30 rounded-md">
                      <span className={`text-xs ${!availability.isAvailable ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        Unavailable
                      </span>
                      {(() => {
                        const bookings = departmentBookings[availability.requirementId] || [];
                        const hasActiveBookings = bookings.length > 0;
                        
                        return (
                          <Switch
                            checked={availability.isAvailable}
                            disabled={hasActiveBookings}
                            onCheckedChange={(checked) => 
                              updateAvailability(availability.requirementId, { isAvailable: checked })
                            }
                          />
                        );
                      })()}
                      <span className={`text-xs ${availability.isAvailable ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        Available
                      </span>
                    </div>
                    
                    {/* Show message if toggle is disabled due to bookings */}
                    {(() => {
                      const bookings = departmentBookings[availability.requirementId] || [];
                      const hasActiveBookings = bookings.length > 0;
                      
                      return hasActiveBookings && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                          <p className="text-xs text-orange-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Cannot change availability - {bookings.length} active booking{bookings.length !== 1 ? 's' : ''} exist for today
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Quantity Controls (only for physical items and if available) */}
                  {availability.isAvailable && requirements.find(req => req._id === availability.requirementId)?.type === 'physical' && (
                    <div className="mb-4 space-y-3">
                      {/* Total Quantity Display with Conflict Detection */}
                      <div className="p-2 bg-muted/30 rounded-md">
                        <Label className="text-xs font-medium text-muted-foreground">
                          Quantity Status
                        </Label>
                        {(() => {
                          const requirement = requirements.find(req => req._id === availability.requirementId);
                          // Use the actual availability quantity as total capacity, not the static requirement quantity
                          const totalCapacity = availability.quantity || requirement?.totalQuantity || 1;
                          const bookings = departmentBookings[availability.requirementId] || [];
                          const bookedQuantity = bookings.reduce((sum, booking) => sum + booking.quantity, 0);
                          const currentSetQuantity = availability.quantity;
                          const additionalUnits = Math.max(0, currentSetQuantity - bookedQuantity);
                          
                          return (
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">
                                {currentSetQuantity} units will be available
                              </p>
                              {bookedQuantity > 0 && (
                                <div className="space-y-1">
                                  <p className="text-xs text-orange-600">
                                    {bookedQuantity} units already booked (minimum required)
                                  </p>
                                  {additionalUnits > 0 && (
                                    <p className="text-xs text-green-600">
                                      +{additionalUnits} additional units available for booking
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* Set Quantity Input */}
                      <div>
                        <Label htmlFor={`quantity-${availability.requirementId}`} className="text-xs font-medium text-foreground">
                          Set Quantity for this Date (Can add more, cannot lessen below booked amount)
                        </Label>
                        <Input
                          id={`quantity-${availability.requirementId}`}
                          type="number"
                          min={(() => {
                            const bookings = departmentBookings[availability.requirementId] || [];
                            const bookedQuantity = bookings.reduce((sum, booking) => sum + booking.quantity, 0);
                            return bookedQuantity; // Minimum is the already booked quantity
                          })()}
                          value={availability.quantity}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            
                            // Allow empty input or just store the raw value while typing
                            if (inputValue === '') {
                              updateAvailability(availability.requirementId, { 
                                quantity: 0
                              });
                              return;
                            }
                            
                            const numericValue = parseInt(inputValue);
                            
                            // Only validate when user finishes typing (not on every keystroke)
                            updateAvailability(availability.requirementId, { 
                              quantity: numericValue || 0
                            });
                          }}
                          onBlur={(e) => {
                            // Only enforce minimum (booked quantity), allow any value above that
                            const bookings = departmentBookings[availability.requirementId] || [];
                            const bookedQuantity = bookings.reduce((sum, booking) => sum + booking.quantity, 0);
                            const inputValue = parseInt(e.target.value) || 0;
                            
                            console.log(`Simple validation for ${availability.requirementText}:`, {
                              inputValue,
                              bookedQuantity,
                              finalValue: Math.max(bookedQuantity, inputValue)
                            });
                            
                            // Only enforce minimum - no maximum limit
                            const validQuantity = Math.max(bookedQuantity, inputValue);
                            
                            updateAvailability(availability.requirementId, { 
                              quantity: validQuantity
                            });
                          }}
                          className="h-8 mt-1 text-sm"
                          placeholder="Enter quantity for this date"
                        />
                        {(() => {
                          const bookings = departmentBookings[availability.requirementId] || [];
                          const bookedQuantity = bookings.reduce((sum, booking) => sum + booking.quantity, 0);
                          
                          return (
                            <div className="mt-1 space-y-1">
                              <p className="text-xs text-muted-foreground">
                                How many units will be available on {selectedDate ? format(selectedDate, 'MMM dd, yyyy') : 'this date'}?
                              </p>
                              {bookedQuantity > 0 ? (
                                <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {bookedQuantity} units are booked for today
                                </p>
                              ) : (
                                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  No bookings for today - you can set any quantity
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <Label htmlFor={`notes-${availability.requirementId}`} className="text-xs font-medium text-foreground mb-2 block">
                      Notes {!availability.isAvailable && <span className="text-destructive">(Required for unavailable items)</span>}
                    </Label>
                    <Textarea
                      id={`notes-${availability.requirementId}`}
                      placeholder={
                        availability.isAvailable 
                          ? "Optional notes..."
                          : "Reason for unavailability..."
                      }
                      value={availability.notes}
                      onChange={(e) => 
                        updateAvailability(availability.requirementId, { notes: e.target.value })
                      }
                      className="min-h-[60px] resize-none text-sm"
                    />
                  </div>

                  {/* Validation Warning */}
                  {!availability.isAvailable && !availability.notes.trim() && (
                    <div className="flex items-center gap-2 mt-3 p-2 bg-muted border border-border rounded text-muted-foreground">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs">Please provide a reason for unavailability</span>
                    </div>
                  )}
                </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services Requirements Section */}
              {availabilities.filter(av => selectedRequirements.includes(av.requirementId) && requirements.find(req => req._id === av.requirementId)?.type === 'service').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                    <Settings className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-foreground">Services Requirements</h3>
                    <Badge variant="outline" className="ml-auto">
                      {availabilities.filter(av => selectedRequirements.includes(av.requirementId) && requirements.find(req => req._id === av.requirementId)?.type === 'service').length} services
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {availabilities
                      .filter(av => selectedRequirements.includes(av.requirementId) && requirements.find(req => req._id === av.requirementId)?.type === 'service')
                      .map((availability, index) => (
                <motion.div
                  key={availability.requirementId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md"
                >
                  {/* Header */}
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted text-muted-foreground">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-foreground text-sm leading-tight">{availability.requirementText}</h4>
                        <p className="text-xs text-muted-foreground">ID: {availability.requirementId.slice(-8)}</p>
                      </div>
                    </div>
                    
                    {/* Availability Toggle */}
                    <div className="flex items-center justify-center gap-2 p-2 bg-muted/30 rounded-md">
                      <span className={`text-xs ${!availability.isAvailable ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        Unavailable
                      </span>
                      {(() => {
                        const bookings = departmentBookings[availability.requirementId] || [];
                        const hasActiveBookings = bookings.length > 0;
                        
                        return (
                          <Switch
                            checked={availability.isAvailable}
                            disabled={hasActiveBookings}
                            onCheckedChange={(checked) => 
                              updateAvailability(availability.requirementId, { isAvailable: checked })
                            }
                          />
                        );
                      })()}
                      <span className={`text-xs ${availability.isAvailable ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        Available
                      </span>
                    </div>
                    
                    {/* Show message if toggle is disabled due to bookings */}
                    {(() => {
                      const bookings = departmentBookings[availability.requirementId] || [];
                      const hasActiveBookings = bookings.length > 0;
                      
                      return hasActiveBookings && (
                        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
                          <p className="text-xs text-orange-700 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Cannot change availability - {bookings.length} active booking{bookings.length !== 1 ? 's' : ''} exist for today
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor={`notes-${availability.requirementId}`} className="text-xs font-medium text-foreground mb-2 block">
                      Notes {!availability.isAvailable && <span className="text-destructive">(Required for unavailable services)</span>}
                    </Label>
                    <Textarea
                      id={`notes-${availability.requirementId}`}
                      placeholder={
                        availability.isAvailable 
                          ? "Optional notes..."
                          : "Reason for unavailability..."
                      }
                      value={availability.notes}
                      onChange={(e) => 
                        updateAvailability(availability.requirementId, { notes: e.target.value })
                      }
                      className="min-h-[60px] resize-none text-sm"
                    />
                  </div>

                  {/* Validation Warning */}
                  {!availability.isAvailable && !availability.notes.trim() && (
                    <div className="flex items-center gap-2 mt-3 p-2 bg-muted border border-border rounded text-muted-foreground">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs">Please provide a reason for unavailability</span>
                    </div>
                  )}
                </motion.div>
                    ))}
                  </div>
                </div>
              )}
                </div>
              )}
                </TabsContent>
                
                <TabsContent value="bookings" className="p-6 mt-0">
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">Department Bookings</h3>
                      <p className="text-sm text-muted-foreground">
                        View which departments have booked requirements on {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'this date'}
                      </p>
                    </div>

                    {loadingBookings ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-sm text-muted-foreground">Loading department bookings...</p>
                      </div>
                    ) : (
                      requirements.map(requirement => {
                      const bookings = departmentBookings[requirement._id] || [];
                      const totalQuantityBooked = bookings.reduce((sum, booking) => sum + booking.quantity, 0);
                      
                      // Get the actual availability quantity for this requirement
                      const availability = availabilities.find(av => av.requirementId === requirement._id);
                      const actualAvailableQuantity = availability ? availability.quantity : requirement.totalQuantity || 1;
                      
                      return (
                        <div key={requirement._id} className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            {requirement.type === 'physical' ? (
                              <Package className="w-5 h-5 text-purple-600" />
                            ) : (
                              <Settings className="w-5 h-5 text-orange-600" />
                            )}
                            <h4 className="text-md font-semibold">{requirement.text}</h4>
                            <Badge variant="outline" className="ml-auto">
                              {requirement.type === 'physical' 
                                ? `${totalQuantityBooked}/${actualAvailableQuantity} booked`
                                : `${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`
                              }
                            </Badge>
                          </div>

                          {bookings.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No bookings for this requirement on this date</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-3">
                              {bookings.map((booking, index) => (
                                <motion.div
                                  key={`${booking.eventId}-${index}`}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="p-4 rounded-lg border border-border bg-card text-card-foreground shadow-sm"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3 flex-1">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-600">
                                        <Building2 className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h5 className="font-medium text-foreground text-sm leading-tight mb-1">
                                          {booking.eventTitle}
                                        </h5>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                                          <span className="flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            {booking.departmentName}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {booking.requestor}
                                          </span>
                                          {requirement.type === 'physical' && (
                                            <span className="flex items-center gap-1">
                                              <Package className="w-3 h-3" />
                                              Qty: {booking.quantity}
                                            </span>
                                          )}
                                          {booking.startTime && booking.endTime && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {formatTime12Hour(booking.startTime)} - {formatTime12Hour(booking.endTime)}
                                            </span>
                                          )}
                                        </div>
                                        {booking.notes && (
                                          <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                            {booking.notes}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-1 h-7 px-2 text-xs"
                                      onClick={() => handleViewEvent(booking.eventId)}
                                      disabled={loadingEventDetails}
                                    >
                                      <Eye className="w-3 h-3" />
                                      {loadingEventDetails ? 'Loading...' : 'View Event'}
                                    </Button>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </div>
          </Tabs>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t bg-white">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {!showSelection && (
              <Button
                variant="outline"
                onClick={() => setShowSelection(true)}
                className="w-full sm:w-auto gap-2"
                disabled={isSaving}
              >
                <Edit3 className="w-4 h-4" />
                Change Selection
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:flex-1 gap-2"
              disabled={isSaving}
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            {!showSelection && (
              <Button
                onClick={handleSave}
                className="w-full sm:flex-1 gap-2"
                disabled={isSaving || selectedRequirements.length === 0}
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Availability'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Event Details Modal */}
    <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" />
            Event Details
          </DialogTitle>
        </DialogHeader>

        {selectedEventDetails && (
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Event Title</Label>
                  <p className="text-sm text-gray-900 mt-1 font-medium">{selectedEventDetails.eventTitle}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Requestor</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedEventDetails.requestor}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Location</Label>
                  <p className="text-sm text-gray-900 mt-1">{selectedEventDetails.location}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Tagged Departments</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedEventDetails.taggedDepartments.map((dept, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {dept}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Start Date & Time</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {format(new Date(selectedEventDetails.startDate), 'MMM dd, yyyy')} at {formatTime12Hour(selectedEventDetails.startTime)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">End Date & Time</Label>
                  <p className="text-sm text-gray-900 mt-1">
                    {format(new Date(selectedEventDetails.endDate), 'MMM dd, yyyy')} at {formatTime12Hour(selectedEventDetails.endTime)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Participants</Label>
                  <div className="flex items-center gap-4 mt-1">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{selectedEventDetails.participants} Total</span>
                    </div>
                    {selectedEventDetails.vip && selectedEventDetails.vip > 0 && (
                      <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-800 border-yellow-200">
                        {selectedEventDetails.vip} VIP
                      </Badge>
                    )}
                    {selectedEventDetails.vvip && selectedEventDetails.vvip > 0 && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-800 border-purple-200">
                        {selectedEventDetails.vvip} VVIP
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowEventModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default RequirementAvailabilityModal;
