import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Building2,
  FileText,
  Search,
  Filter,
  Eye,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock3,
  Download,
  Paperclip,
  Edit,
  AlertTriangle
} from 'lucide-react';

interface Event {
  _id: string;
  eventTitle: string;
  requestor: string;
  location: string;
  description?: string;
  participants: number;
  vip?: number;
  vvip?: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  contactNumber: string;
  contactEmail: string;
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
  }>;
  govFiles?: {
    brieferTemplate?: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
    };
    availableForDL?: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
    };
    programme?: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
    };
  };
  taggedDepartments: string[];
  departmentRequirements: any;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'ongoing';
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = 'http://localhost:5000/api';

const locations = [
  'Add Custom Location',
  'Atrium',
  'Grand Lobby Entrance',
  'Main Entrance Lobby',
  'Main Entrance Leasable Area',
  '4th Flr. Conference Room 1',
  '4th Flr. Conference Room 2',
  '4th Flr. Conference Room 3',
  '5th Flr. Training Room 1 (BAC)',
  '5th Flr. Training Room 2',
  '6th Flr. DPOD',
  'Bataan People\'s Center',
  'Capitol Quadrangle',
  '1BOSSCO',
  'Emiliana Hall',
  'Pavillion'
];

const MyEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEventFiles, setSelectedEventFiles] = useState<Event | null>(null);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [selectedEventDepartments, setSelectedEventDepartments] = useState<Event | null>(null);
  const [showDepartmentsModal, setShowDepartmentsModal] = useState(false);
  const [selectedEditEvent, setSelectedEditEvent] = useState<Event | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: ''
  });
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(false);
  const [customLocation, setCustomLocation] = useState('');
  const [conflictingEvents, setConflictingEvents] = useState<any[]>([]);

  // Fetch available dates for selected location
  const fetchAvailableDates = async (locationName: string) => {
    try {
      if (!locationName || locationName === 'Add Custom Location') {
        setAvailableDates([]);
        return;
      }

      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(`${API_BASE_URL}/location-availability`, { headers });
      
      if (response.data.success) {
        // Filter availability records for the selected location
        const locationAvailabilities = response.data.data.filter(
          (item: any) => item.locationName === locationName && item.status === 'available'
        );
        
        // Convert date strings to Date objects (timezone-safe)
        const dates = locationAvailabilities.map((item: any) => {
          // Parse date as local date to avoid timezone issues
          const dateParts = item.date.split('-');
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
          const day = parseInt(dateParts[2]);
          return new Date(year, month, day);
        });
        setAvailableDates(dates);
      } else {
        setAvailableDates([]);
      }
    } catch (error) {
      console.error('Error fetching available dates:', error);
      setAvailableDates([]);
    }
  };

  // Check if a date should be disabled (not available for the selected location)
  const isDateDisabled = (date: Date) => {
    if (availableDates.length === 0) {
      return false; // If no available dates loaded yet, don't disable any dates
    }
    
    // Use timezone-safe date comparison by comparing year, month, day only
    const clickedYear = date.getFullYear();
    const clickedMonth = date.getMonth();
    const clickedDay = date.getDate();
    
    const matchFound = availableDates.some(availableDate => {
      const availableYear = availableDate.getFullYear();
      const availableMonth = availableDate.getMonth();
      const availableDay = availableDate.getDate();
      
      return clickedYear === availableYear && 
             clickedMonth === availableMonth && 
             clickedDay === availableDay;
    });
    
    return !matchFound;
  };

  // Fetch available dates when edit modal opens and location is already set
  useEffect(() => {
    if (showEditModal && editFormData.location && editFormData.location !== 'Add Custom Location') {
      fetchAvailableDates(editFormData.location);
    }
  }, [showEditModal, editFormData.location]);

  // Auto-check for venue conflicts when edit modal schedule changes
  useEffect(() => {
    const checkConflicts = async () => {
      if (editFormData.startDate && editFormData.location && showEditModal) {
        // Check conflicts for the entire day at this location to show booked time slots
        const response = await fetch(`${API_BASE_URL}/events`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const eventsData = await response.json();
          const events = eventsData.data || [];
          
          // Filter events that are on the same date and location, excluding the current event being edited
          const conflicts = events.filter((event: any) => {
            if (!event.startDate || !event.location || !editFormData.startDate) return false;
            
            // Exclude the current event being edited from conflicts
            if (selectedEditEvent && event._id === selectedEditEvent._id) return false;
            
            // Only check conflicts for the SAME location
            if (event.location !== editFormData.location) return false;
            
            const eventStartDate = new Date(event.startDate);
            const selectedDate = new Date(editFormData.startDate);
            
            // Check if dates match (same day)
            return eventStartDate.toDateString() === selectedDate.toDateString();
          });
          
          setConflictingEvents(conflicts);
          console.log(`🔍 Found ${conflicts.length} existing bookings for ${editFormData.location} on ${editFormData.startDate} (excluding current event)`);
          conflicts.forEach((event: any) => {
            console.log(`   📅 "${event.eventTitle}" - ${event.startTime} to ${event.endTime}`);
          });
        }
      } else if (!showEditModal) {
        // Clear conflicts when modal is closed
        setConflictingEvents([]);
      }
    };

    // Debounce the conflict checking to avoid too many API calls
    const timeoutId = setTimeout(checkConflicts, 300);
    return () => clearTimeout(timeoutId);
  }, [editFormData.startDate, editFormData.location, showEditModal, selectedEditEvent]);

  // Fetch user's events
  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(`${API_BASE_URL}/events/my`, { headers });

      if (response.data.success) {
        setEvents(response.data.data);
        console.log('✅ Events loaded:', response.data.data);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events', {
        description: 'Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEvents();
  }, []);

  // Get dynamic status based on dates
  const getDynamicStatus = (event: Event) => {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
    
    const endDate = new Date(event.endDate);
    endDate.setHours(23, 59, 59, 999); // Set to end of day
    
    const startDate = new Date(event.startDate);
    startDate.setHours(0, 0, 0, 0); // Set to start of day
    
    // If event has ended, mark as completed (unless it's rejected or cancelled)
    if (currentDate > endDate && event.status !== 'rejected' && event.status !== 'cancelled') {
      return 'completed';
    }
    
    // If event is approved/submitted and starts in the future, mark as incoming
    if ((event.status === 'approved' || event.status === 'submitted') && startDate > currentDate) {
      return 'incoming';
    }
    
    // If event is happening today or ongoing (approved/submitted), mark as ongoing
    if ((event.status === 'approved' || event.status === 'submitted') && startDate <= currentDate && currentDate <= endDate) {
      return 'ongoing';
    }
    return event.status;
  };

  // Filter and sort events
  const filteredAndSortedEvents = events
    .map(event => ({
      ...event,
      dynamicStatus: getDynamicStatus(event)
    }))
    .filter(event => {
      const matchesSearch = event.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           event.requestor.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || event.dynamicStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date-asc':
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case 'date-desc':
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case 'title':
          return a.eventTitle.localeCompare(b.eventTitle);
        default:
          return 0;
      }
    });

  // Get status badge variant and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { 
          variant: 'secondary' as const, 
          icon: <FileText className="w-3 h-3" />,
          label: 'Draft'
        };
      case 'submitted':
        return { 
          variant: 'default' as const, 
          icon: <Clock3 className="w-3 h-3" />,
          label: 'Submitted'
        };
      case 'approved':
        return { 
          variant: 'default' as const, 
          icon: <CheckCircle className="w-3 h-3" />,
          label: 'Approved',
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      case 'rejected':
        return { 
          variant: 'destructive' as const, 
          icon: <XCircle className="w-3 h-3" />,
          label: 'Rejected'
        };
      case 'completed':
        return { 
          variant: 'default' as const, 
          icon: <CheckCircle className="w-3 h-3" />,
          label: 'Completed',
          className: 'bg-blue-100 text-blue-800 border-blue-200'
        };
      case 'incoming':
        return { 
          variant: 'default' as const, 
          icon: <CalendarIcon className="w-3 h-3" />,
          label: 'Incoming',
          className: 'bg-purple-100 text-purple-800 border-purple-200'
        };
      case 'cancelled':
        return { 
          variant: 'destructive' as const, 
          icon: <XCircle className="w-3 h-3" />,
          label: 'Cancelled'
        };
      case 'ongoing':
        return { 
          variant: 'default' as const, 
          icon: <Clock className="w-3 h-3" />,
          label: 'Ongoing',
          className: 'bg-orange-100 text-orange-800 border-orange-200'
        };
      default:
        return { 
          variant: 'secondary' as const, 
          icon: <AlertCircle className="w-3 h-3" />,
          label: status
        };
    }
  };

  // Format time helper
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Generate time options with 30-minute intervals from 7:00 AM to 10:00 PM
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 7; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const displayTime = formatTime(timeString);
        times.push({ value: timeString, label: displayTime });
      }
    }
    return times;
  };

  // Check if a specific time slot is booked for the selected location and date
  const isTimeSlotBooked = (timeSlot: string) => {
    if (!editFormData.startDate || !editFormData.location || conflictingEvents.length === 0) {
      return false;
    }

    return conflictingEvents.some(event => {
      if (event.location !== editFormData.location) return false;
      
      const eventStartTime = event.startTime;
      const eventEndTime = event.endTime;
      
      // Convert times to minutes for easier comparison
      const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const slotMinutes = timeToMinutes(timeSlot);
      const eventStartMinutes = timeToMinutes(eventStartTime);
      const eventEndMinutes = timeToMinutes(eventEndTime);
      
      // For both start and end time: check if slot falls within existing event time range
      // If existing event is 8:00-10:00, then 8:00, 8:30, 9:00, 9:30, 10:00 should all be blocked
      // This prevents any overlap with existing bookings
      return slotMinutes >= eventStartMinutes && slotMinutes <= eventEndMinutes;
    });
  };

  // Get available end times based on selected start time
  const getAvailableEndTimes = () => {
    if (!editFormData.startTime) return generateTimeOptions();
    
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = timeToMinutes(editFormData.startTime);
    
    return generateTimeOptions().filter(timeOption => {
      const optionMinutes = timeToMinutes(timeOption.value);
      // End time must be after start time
      return optionMinutes > startMinutes;
    });
  };

  // Format MIME type helper - truncate long MIME types
  const formatMimeType = (mimetype: string) => {
    if (!mimetype) return '';
    
    // Common MIME type mappings for better display
    const mimeTypeMap: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'application/vnd.ms-powerpoint': 'PPT',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'text/plain': 'TXT',
      'text/csv': 'CSV'
    };

    // Return mapped type if available
    if (mimeTypeMap[mimetype]) {
      return mimeTypeMap[mimetype];
    }

    // If MIME type is longer than 25 characters, truncate with ellipsis
    if (mimetype.length > 25) {
      return mimetype.substring(0, 22) + '...';
    }

    return mimetype;
  };

  // Format file name helper - truncate long file names
  const formatFileName = (fileName: string, maxLength: number = 20) => {
    if (!fileName) return '';
    
    // If file name is longer than maxLength, truncate with ellipsis
    if (fileName.length > maxLength) {
      // Try to preserve file extension
      const lastDotIndex = fileName.lastIndexOf('.');
      if (lastDotIndex > 0 && lastDotIndex > fileName.length - 10) {
        const extension = fileName.substring(lastDotIndex);
        const nameWithoutExt = fileName.substring(0, lastDotIndex);
        const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3);
        return truncatedName + '...' + extension;
      } else {
        return fileName.substring(0, maxLength - 3) + '...';
      }
    }

    return fileName;
  };

  // View event details
  const handleViewEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      await axios.delete(`${API_BASE_URL}/events/${eventId}`, { headers });
      
      toast.success('Event deleted successfully');
      fetchMyEvents(); // Refresh the list
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };


  // Handle files modal
  const handleShowFiles = (event: Event) => {
    setSelectedEventFiles(event);
    setShowFilesModal(true);
  };

  // Handle departments modal
  const handleShowDepartments = (event: Event) => {
    setSelectedEventDepartments(event);
    setShowDepartmentsModal(true);
  };

  // Handle edit event
  const handleEditEvent = (event: Event) => {
    setSelectedEditEvent(event);
    setEditFormData({
      location: event.location,
      startDate: event.startDate,
      startTime: event.startTime,
      endDate: event.endDate,
      endTime: event.endTime
    });
    setShowCustomLocationInput(false);
    setCustomLocation('');
    setShowEditModal(true);
  };

  // Handle save edited event
  const handleSaveEditedEvent = async () => {
    if (!selectedEditEvent) return;

    // Check for time conflicts before saving
    if (editFormData.startDate && editFormData.startTime && editFormData.endTime && editFormData.location) {
      const hasConflict = conflictingEvents.some(event => {
        if (event.location !== editFormData.location) return false;
        
        // Convert times to minutes for easier comparison
        const timeToMinutes = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const newStartMinutes = timeToMinutes(editFormData.startTime);
        const newEndMinutes = timeToMinutes(editFormData.endTime);
        const eventStartMinutes = timeToMinutes(event.startTime);
        const eventEndMinutes = timeToMinutes(event.endTime);
        
        // Check if the new time range overlaps with existing event
        return (newStartMinutes < eventEndMinutes && newEndMinutes > eventStartMinutes);
      });

      if (hasConflict) {
        const conflictDetails = conflictingEvents
          .filter(event => {
            if (event.location !== editFormData.location) return false;
            
            const timeToMinutes = (time: string) => {
              const [hours, minutes] = time.split(':').map(Number);
              return hours * 60 + minutes;
            };
            
            const newStartMinutes = timeToMinutes(editFormData.startTime);
            const newEndMinutes = timeToMinutes(editFormData.endTime);
            const eventStartMinutes = timeToMinutes(event.startTime);
            const eventEndMinutes = timeToMinutes(event.endTime);
            
            return (newStartMinutes < eventEndMinutes && newEndMinutes > eventStartMinutes);
          })
          .map((event: any) => 
            `"${event.eventTitle}" (${formatTime(event.startTime)}-${formatTime(event.endTime)})`
          ).join(', ');
        
        toast.error(`Cannot save! Time conflict detected at ${editFormData.location}`, {
          description: `Your selected time (${formatTime(editFormData.startTime)}-${formatTime(editFormData.endTime)}) conflicts with: ${conflictDetails}`,
          duration: 8000,
        });
        return; // Don't save if there are conflicts
      }
    }

    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const updateData = {
        location: editFormData.location,
        startDate: editFormData.startDate,
        startTime: editFormData.startTime,
        endDate: editFormData.endDate,
        endTime: editFormData.endTime
      };

      const response = await axios.put(
        `${API_BASE_URL}/events/${selectedEditEvent._id}`, 
        updateData, 
        { headers }
      );

      if (response.data.success) {
        toast.success('Event updated successfully!');
        setShowEditModal(false);
        fetchMyEvents(); // Refresh the events list
      } else {
        toast.error('Failed to update event');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

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
              <h1 className="text-2xl font-semibold">My Events</h1>
              <p className="text-sm text-muted-foreground">
                View and manage your event requests
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={fetchMyEvents}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                onClick={() => window.location.href = '/users/request-event'}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Event
              </Button>
            </div>
          </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Events</p>
                <p className="text-2xl font-bold">{events.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Submitted</p>
                <p className="text-2xl font-bold text-orange-600">
                  {events.filter(e => e.status === 'submitted').length}
                </p>
              </div>
              <Clock3 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {events.filter(e => getDynamicStatus(e) === 'approved').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-blue-600">
                  {events.filter(e => getDynamicStatus(e) === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search events by title, location, or requestor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="incoming">Incoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Sort by:</span>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="date-asc">Event Date (Earliest)</SelectItem>
                      <SelectItem value="date-desc">Event Date (Latest)</SelectItem>
                      <SelectItem value="title">Title (A-Z)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Events List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4 mt-8 max-h-[70vh] overflow-y-auto pr-2"
      >
        {loading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading your events...</span>
              </div>
            </CardContent>
          </Card>
        ) : filteredAndSortedEvents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No events found' : 'No events yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'You haven\'t created any event requests yet.'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <Button onClick={() => window.location.href = '/users/request-event'}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Event
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAndSortedEvents.map((event, index) => {
            const statusInfo = getStatusInfo(event.dynamicStatus);
            
            return (
              <motion.div
                key={event._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 space-y-3">
                        {/* Status Badge and Right Actions */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={statusInfo.variant}
                              className={`gap-1 ${statusInfo.className || ''}`}
                            >
                              {statusInfo.icon}
                              {statusInfo.label}
                            </Badge>
                            {event.dynamicStatus !== event.status && (
                              <span className="text-xs text-gray-500">
                                (Auto-updated)
                              </span>
                            )}
                          </div>
                          
                          {/* Right Side Actions */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditEvent(event)}
                              className="gap-1 h-7 px-2 text-xs"
                            >
                              <Edit className="w-3 h-3" />
                              Edit
                            </Button>
                            {(event.status === 'draft' || event.status === 'rejected') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteEvent(event._id)}
                                className="gap-1 h-7 px-2 text-xs text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Title */}
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate" title={event.eventTitle}>
                            {event.eventTitle}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Requested by {event.requestor}
                          </p>
                        </div>

                        {/* Event Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <CalendarIcon className="w-4 h-4" />
                            <span>
                              {format(new Date(event.startDate), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span>
                              {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{event.participants} participants</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            <span>{event.taggedDepartments.length} departments</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            Created {format(new Date(event.createdAt), 'MMM dd, yyyy')}
                          </div>
                        </div>

                        {/* Bottom Action Buttons */}
                        <div className="flex items-center gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewEvent(event)}
                            className="gap-1 h-7 px-2 text-xs"
                          >
                            <Eye className="w-3 h-3" />
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowDepartments(event)}
                            className="gap-1 h-7 px-2 text-xs"
                          >
                            <Building2 className="w-3 h-3" />
                            Tagged Departments
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowFiles(event)}
                            className="gap-1 h-7 px-2 text-xs"
                          >
                            <Paperclip className="w-3 h-3" />
                            Files
                          </Button>
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          </div>
        )}
      </motion.div>

      {/* Event Details Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="max-w-none w-[40vw] min-w-[40vw] max-h-[90vh] overflow-y-auto p-8" style={{ width: '40vw', maxWidth: '40vw' }}>
          <DialogHeader>
            <DialogTitle className="text-xl">Event Details</DialogTitle>
            <DialogDescription>
              Complete information about your event request
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Event Title</label>
                    <p className="text-sm text-gray-900 mt-1 truncate" title={selectedEvent.eventTitle}>{selectedEvent.eventTitle}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Requestor</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedEvent.requestor}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedEvent.location}</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      <Badge 
                        variant={getStatusInfo(selectedEvent.status).variant}
                        className={`gap-1 ${getStatusInfo(selectedEvent.status).className || ''}`}
                      >
                        {getStatusInfo(selectedEvent.status).icon}
                        {getStatusInfo(selectedEvent.status).label}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Participants</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {selectedEvent.participants} total
                      {selectedEvent.vip && selectedEvent.vip > 0 && ` (${selectedEvent.vip} VIP)`}
                      {selectedEvent.vvip && selectedEvent.vvip > 0 && ` (${selectedEvent.vvip} VVIP)`}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Contact Number</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedEvent.contactNumber}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Contact Email</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedEvent.contactEmail}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="text-sm text-gray-900 mt-1">{format(new Date(selectedEvent.createdAt), 'PPp')}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Description</h4>
                  <div className={`bg-gray-50 rounded-lg p-4 border border-gray-200 ${selectedEvent.description.length > 800 ? 'max-h-48 overflow-y-auto scroll-smooth' : ''}`}>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {selectedEvent.description}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Schedule */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Schedule</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Start</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(selectedEvent.startDate), 'EEEE, MMMM dd, yyyy')} at {formatTime(selectedEvent.startTime)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-sm font-medium">End</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(selectedEvent.endDate), 'EEEE, MMMM dd, yyyy')} at {formatTime(selectedEvent.endTime)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Timestamps - Bottom Right */}
              <div className="flex justify-end">
                {selectedEvent.submittedAt && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Submitted:</span> {format(new Date(selectedEvent.submittedAt), 'PPpp')}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Tagged Departments Modal */}
      <Dialog open={showDepartmentsModal} onOpenChange={setShowDepartmentsModal}>
        <DialogContent className="!max-w-5xl !w-[85vw] max-h-[80vh] overflow-y-auto p-8" style={{ width: '85vw', maxWidth: '1024px' }}>
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-medium text-gray-900">
              Tagged Departments
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Departments involved in this event and their requirements
            </DialogDescription>
          </DialogHeader>
          
          {selectedEventDepartments && (
            <div className="space-y-6">
              {/* Tagged Departments List */}
              <div>
                <h4 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Tagged Departments ({selectedEventDepartments.taggedDepartments.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedEventDepartments.taggedDepartments.map((dept, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{dept}</p>
                        <p className="text-xs text-blue-600">Department</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Department Requirements */}
              {selectedEventDepartments.departmentRequirements && Object.keys(selectedEventDepartments.departmentRequirements).length > 0 && (
                <div>
                  <h4 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-orange-600" />
                    Department Requirements
                  </h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {Object.entries(selectedEventDepartments.departmentRequirements).map(([dept, requirements]: [string, any], index) => {
                      // Parse the requirements if it's a string containing JSON-like data
                      let parsedRequirements = requirements;
                      
                      if (typeof requirements === 'string') {
                        // Check if it contains numbered JSON objects
                        const lines = requirements.split('\n').filter(line => line.trim());
                        if (lines.length > 0 && lines[0].match(/^\d+:/)) {
                          parsedRequirements = lines.map(line => {
                            const match = line.match(/^\d+:(.+)$/);
                            if (match) {
                              try {
                                return JSON.parse(match[1]);
                              } catch {
                                return { name: line };
                              }
                            }
                            return { name: line };
                          });
                        }
                      }
                      
                      return (
                        <div key={index} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Building2 className="w-4 h-4 text-orange-600" />
                            <h5 className="font-medium text-gray-900">{dept}</h5>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Array.isArray(parsedRequirements) ? (
                              parsedRequirements.map((req: any, reqIndex: number) => (
                                <div key={reqIndex} className="p-3 bg-white rounded-md border border-orange-100">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h6 className="text-sm font-medium text-gray-900 mb-1">
                                        {req.name || `Requirement ${reqIndex + 1}`}
                                      </h6>
                                      {req.type === 'physical' && req.quantity ? (
                                        <p className="text-xs text-gray-600 mb-2">
                                          <span className="font-medium">Quantity:</span> {req.quantity}
                                        </p>
                                      ) : req.notes ? (
                                        <p className="text-xs text-gray-600 mb-2">
                                          <span className="font-medium">Notes:</span> {req.notes}
                                        </p>
                                      ) : (
                                        <p className="text-xs text-gray-500 mb-2">No additional details</p>
                                      )}
                                    </div>
                                    <div className="ml-3">
                                      {req.selected !== undefined && (
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                          req.selected 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                          {req.selected ? 'Required' : 'Optional'}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : typeof parsedRequirements === 'object' && parsedRequirements !== null ? (
                              Object.entries(parsedRequirements).map(([key, value]: [string, any], reqIndex) => (
                                <div key={reqIndex} className="text-sm">
                                  <span className="font-medium text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                  <span className="ml-2 text-gray-600">
                                    {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-600">{String(parsedRequirements)}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes Section */}
              <div>
                <h4 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Notes & Additional Information
                </h4>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Event Coordination</p>
                        <p className="text-sm text-gray-600">All tagged departments will be notified and are expected to coordinate for this event.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Requirements Status</p>
                        <p className="text-sm text-gray-600">Department requirements are based on the event details and participant count.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Contact Information</p>
                        <p className="text-sm text-gray-600">For questions, contact the event requestor at {selectedEventDepartments.contactEmail}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* No Departments Message */}
              {selectedEventDepartments.taggedDepartments.length === 0 && (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Departments Tagged</h3>
                  <p className="text-gray-500">This event doesn't have any departments tagged yet.</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-center pt-4 mt-6">
            <Button 
              onClick={() => setShowDepartmentsModal(false)}
              variant="outline"
              className="px-6 py-2"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Files Modal */}
      <Dialog open={showFilesModal} onOpenChange={setShowFilesModal}>
        <DialogContent className="max-w-3xl w-[75vw] max-h-[80vh] overflow-y-auto p-5">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-medium text-gray-900">
              Event Files
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              All attachments and government files for this event
            </DialogDescription>
          </DialogHeader>
          
          {selectedEventFiles && (
            <div className="space-y-6">
              {/* Regular Attachments */}
              {selectedEventFiles.attachments && selectedEventFiles.attachments.length > 0 && (
                <div>
                  <h4 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Attachments ({selectedEventFiles.attachments.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedEventFiles.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900" title={attachment.originalName}>{formatFileName(attachment.originalName)}</p>
                            <p className="text-xs text-gray-500">
                              {formatMimeType(attachment.mimetype)} • {(attachment.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(`${API_BASE_URL}/events/attachment/${attachment.filename}`, '_blank');
                            }}
                            className="gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(`${API_BASE_URL}/events/attachment/${attachment.filename}?download=true`, '_blank');
                            }}
                            className="gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Government Files */}
              {selectedEventFiles.govFiles && (
                selectedEventFiles.govFiles.brieferTemplate || 
                selectedEventFiles.govFiles.availableForDL || 
                selectedEventFiles.govFiles.programme
              ) && (
                <div>
                  <h4 className="text-base font-medium text-gray-800 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Government Files
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Briefer Template */}
                    {selectedEventFiles.govFiles.brieferTemplate && (
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900" title={selectedEventFiles.govFiles.brieferTemplate.originalName}>{formatFileName(selectedEventFiles.govFiles.brieferTemplate.originalName)}</p>
                            <p className="text-xs text-gray-500">
                              {formatMimeType(selectedEventFiles.govFiles.brieferTemplate.mimetype)} • {(selectedEventFiles.govFiles.brieferTemplate.size / 1024).toFixed(1)} KB
                            </p>
                            <p className="text-xs text-green-600 font-medium">Briefer Template</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const url = `${API_BASE_URL}/events/govfile/${selectedEventFiles.govFiles!.brieferTemplate!.filename}`;
                                console.log('🔍 Attempting to open government file:', url);
                                
                                // Test if the file exists first
                                const response = await fetch(url, { method: 'HEAD' });
                                if (response.ok) {
                                  window.open(url, '_blank');
                                } else {
                                  console.error('❌ Government file not found:', response.status, response.statusText);
                                  console.error('📁 Expected file path: uploads/events/' + selectedEventFiles.govFiles!.brieferTemplate!.filename);
                                  console.error('📊 Database filename:', selectedEventFiles.govFiles!.brieferTemplate!.filename);
                                  
                                  // Try to check if backend is running
                                  try {
                                    const backendTest = await fetch(`${API_BASE_URL}/events/my`, { method: 'HEAD' });
                                    if (backendTest.ok) {
                                      toast.error(`File not found on server: ${selectedEventFiles.govFiles!.brieferTemplate!.originalName}`);
                                    } else {
                                      toast.error('Backend server not responding');
                                    }
                                  } catch {
                                    toast.error('Backend server is not running');
                                  }
                                }
                              } catch (error) {
                                console.error('❌ Error accessing government file:', error);
                                toast.error('Failed to access government file');
                              }
                            }}
                            className="gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              try {
                                const url = `${API_BASE_URL}/events/govfile/${selectedEventFiles.govFiles!.brieferTemplate!.filename}?download=true`;
                                console.log('📋 Attempting to download government file:', url);
                                
                                // Test if the file exists first
                                const response = await fetch(url.replace('?download=true', ''), { method: 'HEAD' });
                                if (response.ok) {
                                  window.open(url, '_blank');
                                } else {
                                  console.error('❌ Government file not found for download:', response.status, response.statusText);
                                  toast.error(`File not found: ${selectedEventFiles.govFiles!.brieferTemplate!.originalName}`);
                                }
                              } catch (error) {
                                console.error('❌ Error downloading government file:', error);
                                toast.error('Failed to download government file');
                              }
                            }}
                            className="gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Available for DL */}
                    {selectedEventFiles.govFiles.availableForDL && (
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900" title={selectedEventFiles.govFiles.availableForDL.originalName}>{formatFileName(selectedEventFiles.govFiles.availableForDL.originalName)}</p>
                            <p className="text-xs text-gray-500">
                              {formatMimeType(selectedEventFiles.govFiles.availableForDL.mimetype)} • {(selectedEventFiles.govFiles.availableForDL.size / 1024).toFixed(1)} KB
                            </p>
                            <p className="text-xs text-green-600 font-medium">Available for DL</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(`${API_BASE_URL}/events/govfile/${selectedEventFiles.govFiles!.availableForDL!.filename}`, '_blank');
                            }}
                            className="gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(`${API_BASE_URL}/events/govfile/${selectedEventFiles.govFiles!.availableForDL!.filename}?download=true`, '_blank');
                            }}
                            className="gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Programme */}
                    {selectedEventFiles.govFiles.programme && (
                      <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900" title={selectedEventFiles.govFiles.programme.originalName}>{formatFileName(selectedEventFiles.govFiles.programme.originalName)}</p>
                            <p className="text-xs text-gray-500">
                              {formatMimeType(selectedEventFiles.govFiles.programme.mimetype)} • {(selectedEventFiles.govFiles.programme.size / 1024).toFixed(1)} KB
                            </p>
                            <p className="text-xs text-green-600 font-medium">Programme</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(`${API_BASE_URL}/events/govfile/${selectedEventFiles.govFiles!.programme!.filename}`, '_blank');
                            }}
                            className="gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              window.open(`${API_BASE_URL}/events/govfile/${selectedEventFiles.govFiles!.programme!.filename}?download=true`, '_blank');
                            }}
                            className="gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No Files Message */}
              {(!selectedEventFiles.attachments || selectedEventFiles.attachments.length === 0) && 
               (!selectedEventFiles.govFiles || 
                (!selectedEventFiles.govFiles.brieferTemplate && 
                 !selectedEventFiles.govFiles.availableForDL && 
                 !selectedEventFiles.govFiles.programme)) && (
                <div className="text-center py-8">
                  <Paperclip className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Files Attached</h3>
                  <p className="text-gray-500">This event doesn't have any attachments or government files.</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-center pt-4 mt-6">
            <Button 
              onClick={() => setShowFilesModal(false)}
              variant="outline"
              className="px-6 py-2"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Event Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl w-[85vw] p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-medium text-gray-900">
              Edit Event
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600">
              Update location, dates, and times for this event
            </DialogDescription>
          </DialogHeader>
          
          {selectedEditEvent && (
            <div className="space-y-6">
              {/* Event Title (Read-only) */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Event Title</Label>
                <div className="mt-1 p-3 bg-gray-50 rounded-md border">
                  <p className="text-sm text-gray-900">{selectedEditEvent.eventTitle}</p>
                </div>
              </div>

              {/* Location Availability Info */}
              {editFormData.location && availableDates.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    Only dates when {editFormData.location} is available can be selected ({availableDates.length} available date{availableDates.length !== 1 ? 's' : ''})
                  </p>
                </div>
              )}

              {/* Conflict Warning */}
              {editFormData.startDate && conflictingEvents.length > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-orange-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {conflictingEvents.length} existing booking{conflictingEvents.length !== 1 ? 's' : ''} found for {editFormData.location} on {format(new Date(editFormData.startDate), "PPP")} - booked times are disabled
                  </p>
                </div>
              )}

              {/* Location Section */}
              <div>
                <Label className="text-sm font-medium text-gray-700">Location</Label>
                <div className="space-y-3 mt-1">
                  <Select 
                    value={editFormData.location || (showCustomLocationInput ? 'Add Custom Location' : '')} 
                    onValueChange={(value) => {
                      if (value === 'Add Custom Location') {
                        setShowCustomLocationInput(true);
                        setCustomLocation('');
                        setAvailableDates([]); // Clear available dates
                      } else {
                        setShowCustomLocationInput(false);
                        setEditFormData(prev => ({ ...prev, location: value }));
                        fetchAvailableDates(value); // Fetch available dates for selected location
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show custom location if it exists and is not in the predefined list */}
                      {editFormData.location && !locations.includes(editFormData.location) && (
                        <SelectItem key={editFormData.location} value={editFormData.location}>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-green-600" />
                            <span>{editFormData.location}</span>
                            <span className="text-xs text-gray-500">(Custom)</span>
                          </div>
                        </SelectItem>
                      )}
                      
                      {/* Predefined locations */}
                      {locations.map((location) => (
                        <SelectItem 
                          key={location} 
                          value={location}
                          className={location === 'Add Custom Location' ? 'text-blue-600 font-medium' : ''}
                        >
                          <div className="flex items-center gap-2">
                            {location === 'Add Custom Location' && (
                              <Plus className="w-4 h-4 text-blue-600" />
                            )}
                            <span className={location === 'Add Custom Location' ? 'text-blue-600' : ''}>
                              {location}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Custom Location Input */}
                  {showCustomLocationInput && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter custom location"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          if (customLocation.trim()) {
                            setEditFormData(prev => ({ ...prev, location: customLocation.trim() }));
                            setShowCustomLocationInput(false);
                            setCustomLocation('');
                            fetchAvailableDates(customLocation.trim()); // Fetch available dates for custom location
                          }
                        }}
                        className="px-3"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Date and Time Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date & Time */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">Start</h4>
                  
                  {/* Start Date */}
                  <div>
                    <Label className="text-xs text-gray-600">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal mt-1"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editFormData.startDate ? format(new Date(editFormData.startDate), 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={editFormData.startDate ? new Date(editFormData.startDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              // Format date as YYYY-MM-DD without timezone conversion
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const dateString = `${year}-${month}-${day}`;
                              setEditFormData(prev => ({ ...prev, startDate: dateString }));
                            }
                          }}
                          disabled={isDateDisabled}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Start Time */}
                  <div>
                    <Label className="text-xs text-gray-600">Time</Label>
                    <Select 
                      value={editFormData.startTime} 
                      onValueChange={(value) => {
                        setEditFormData(prev => ({ ...prev, startTime: value }));
                        // Clear end time if it's now invalid
                        if (editFormData.endTime) {
                          const timeToMinutes = (time: string) => {
                            const [hours, minutes] = time.split(':').map(Number);
                            return hours * 60 + minutes;
                          };
                          if (timeToMinutes(value) >= timeToMinutes(editFormData.endTime)) {
                            setEditFormData(prev => ({ ...prev, endTime: '' }));
                          }
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select start time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {generateTimeOptions().map((timeOption) => {
                          const isBooked = isTimeSlotBooked(timeOption.value);
                          return (
                            <SelectItem 
                              key={timeOption.value} 
                              value={timeOption.value}
                              disabled={isBooked}
                              className={isBooked ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={isBooked ? 'text-gray-400' : ''}>
                                  {timeOption.label}
                                </span>
                                {isBooked && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    BOOKED
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* End Date & Time */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700">End</h4>
                  
                  {/* End Date */}
                  <div>
                    <Label className="text-xs text-gray-600">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal mt-1"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {editFormData.endDate ? format(new Date(editFormData.endDate), 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={editFormData.endDate ? new Date(editFormData.endDate) : undefined}
                          onSelect={(date) => {
                            if (date) {
                              // Format date as YYYY-MM-DD without timezone conversion
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const dateString = `${year}-${month}-${day}`;
                              setEditFormData(prev => ({ ...prev, endDate: dateString }));
                            }
                          }}
                          disabled={isDateDisabled}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* End Time */}
                  <div>
                    <Label className="text-xs text-gray-600">Time</Label>
                    <Select 
                      value={editFormData.endTime} 
                      onValueChange={(value) => setEditFormData(prev => ({ ...prev, endTime: value }))}
                      disabled={!editFormData.startTime}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={editFormData.startTime ? "Select end time" : "Select start time first"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {getAvailableEndTimes().map((timeOption) => {
                          const isBooked = isTimeSlotBooked(timeOption.value);
                          return (
                            <SelectItem 
                              key={timeOption.value} 
                              value={timeOption.value}
                              disabled={isBooked}
                              className={isBooked ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={isBooked ? 'text-gray-400' : ''}>
                                  {timeOption.label}
                                </span>
                                {isBooked && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    BOOKED
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEditedEvent}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyEventsPage;
