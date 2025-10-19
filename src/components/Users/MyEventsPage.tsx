import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  ChevronRight,
  AlertTriangle,
  HelpCircle,
  Loader2
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
  reason?: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

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
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
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
  const [requirementConflicts, setRequirementConflicts] = useState<any[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [allEventsOnDate, setAllEventsOnDate] = useState<any[]>([]); // All events on selected date for REQ checking
  
  // Edit Requirement Modal State
  const [showEditRequirementModal, setShowEditRequirementModal] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);
  const [editRequirementData, setEditRequirementData] = useState({
    quantity: 0,
    notes: ''
  });
  
  // Change Department Modal State
  const [showChangeDepartmentModal, setShowChangeDepartmentModal] = useState(false);
  const [changingRequirement, setChangingRequirement] = useState<any>(null);
  const [allDepartments, setAllDepartments] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [departmentSearchQuery, setDepartmentSearchQuery] = useState('');
  
  // Add More Departments Modal State
  const [showAddDepartmentsModal, setShowAddDepartmentsModal] = useState(false);
  const [addingToEvent, setAddingToEvent] = useState<any>(null);
  const [showDepartmentRequirementsModal, setShowDepartmentRequirementsModal] = useState(false);
  const [selectedDepartmentData, setSelectedDepartmentData] = useState<any>(null);
  const [departmentRequirements, setDepartmentRequirements] = useState<any[]>([]);
  const [addDepartmentSearchQuery, setAddDepartmentSearchQuery] = useState('');

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
          
          // Store ALL events on this date (for REQ label checking)
          const eventsOnDate = events.filter((event: any) => {
            if (!event.startDate || !editFormData.startDate) return false;
            if (selectedEditEvent && event._id === selectedEditEvent._id) return false;
            if (event.status !== 'submitted' && event.status !== 'approved') return false;
            
            const eventStartDate = new Date(event.startDate);
            const selectedDate = new Date(editFormData.startDate);
            
            return eventStartDate.toDateString() === selectedDate.toDateString();
          });
          setAllEventsOnDate(eventsOnDate);
          
          // Filter events that are on the same date and location, excluding the current event being edited
          const conflicts = eventsOnDate.filter((event: any) => {
            if (!event.location) return false;
            // Only check conflicts for the SAME location
            return event.location === editFormData.location;
          });
          
          setConflictingEvents(conflicts);
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

  // Auto-check for requirement availability when rescheduling
  useEffect(() => {
    const checkRequirementAvailability = async () => {
      if (editFormData.startDate && editFormData.startTime && editFormData.endDate && editFormData.endTime && showEditModal && selectedEditEvent) {
        try {
          // Get all events to check requirement conflicts
          const response = await fetch(`${API_BASE_URL}/events`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const eventsData = await response.json();
            const events = eventsData.data || [];
            
            // Find the current event in the database to get fresh requirement data
            const currentEventInDB = events.find((e: any) => e._id === selectedEditEvent._id);
            
            if (!currentEventInDB || !currentEventInDB.taggedDepartments || !currentEventInDB.departmentRequirements) {
              setRequirementConflicts([]);
              return;
            }
            
            // Get the new time range - create dates in local timezone to avoid UTC conversion issues
            const [startHours, startMinutes] = editFormData.startTime.split(':').map(Number);
            const [endHours, endMinutes] = editFormData.endTime.split(':').map(Number);
            
            // Extract just the date part if it's an ISO string
            const startDateStr = editFormData.startDate.includes('T') 
              ? editFormData.startDate.split('T')[0] 
              : editFormData.startDate;
            const endDateStr = editFormData.endDate.includes('T') 
              ? editFormData.endDate.split('T')[0] 
              : editFormData.endDate;
            
            const newStartDateTime = new Date(startDateStr);
            newStartDateTime.setHours(startHours, startMinutes, 0, 0);
            
            const newEndDateTime = new Date(endDateStr);
            newEndDateTime.setHours(endHours, endMinutes, 0, 0);
            
            // Find events that overlap with the new time range (excluding current event)
            const overlappingEvents = events.filter((event: any) => {
              if (!event.startDate || !event.startTime || !event.endDate || !event.endTime) return false;
              if (event._id === selectedEditEvent._id) return false; // Exclude current event
              if (event.status !== 'submitted' && event.status !== 'approved') return false; // Only check active events
              
              // Parse event dates - create in local timezone
              const eventStartDate = event.startDate.includes('T') ? event.startDate.split('T')[0] : event.startDate;
              const eventEndDate = event.endDate.includes('T') ? event.endDate.split('T')[0] : event.endDate;
              
              const [eventStartHours, eventStartMinutes] = event.startTime.split(':').map(Number);
              const [eventEndHours, eventEndMinutes] = event.endTime.split(':').map(Number);
              
              const eventStart = new Date(eventStartDate);
              eventStart.setHours(eventStartHours, eventStartMinutes, 0, 0);
              
              const eventEnd = new Date(eventEndDate);
              eventEnd.setHours(eventEndHours, eventEndMinutes, 0, 0);
              
              // Check if time ranges overlap
              const overlaps = (newStartDateTime < eventEnd && newEndDateTime > eventStart);
              
              
              return overlaps;
            });
            
            
            // Fetch resource availability for the NEW date by checking other events on that date
            // Since we can't access /api/departments as a regular user, we'll look at other events
            // on the new date to find the most recent totalQuantity values
            const newDateStr = startDateStr; // Use the new start date
            const availabilityMap = new Map();
            
            // Find events on the new date to get the latest totalQuantity values
            const eventsOnNewDate = events.filter((event: any) => {
              if (!event.startDate) return false;
              const eventDateStr = event.startDate.includes('T') ? event.startDate.split('T')[0] : event.startDate;
              return eventDateStr === newDateStr;
            });
            
            // Build a map of requirement ID -> highest totalQuantity found on the new date
            eventsOnNewDate.forEach((event: any) => {
              if (event.departmentRequirements) {
                Object.entries(event.departmentRequirements).forEach(([dept, reqs]: [string, any]) => {
                  if (Array.isArray(reqs)) {
                    reqs.forEach((req: any) => {
                      if (req.id && req.totalQuantity) {
                        const key = `${dept}-${req.id}`;
                        const currentMax = availabilityMap.get(key) || 0;
                        // Use the highest totalQuantity we find (most recent/accurate)
                        if (req.totalQuantity > currentMax) {
                          availabilityMap.set(key, req.totalQuantity);
                        }
                      }
                    });
                  }
                });
              }
            });
            
            
            // Check each tagged department's requirements
            const conflicts: any[] = [];
            
            currentEventInDB.taggedDepartments.forEach((dept: string) => {
              const deptReqs = currentEventInDB.departmentRequirements[dept] || [];
              
              deptReqs.forEach((req: any) => {
                // Skip custom requirements - they will be handled by the tagged department
                if (req.isCustom) {
                  return;
                }
                
                if (req.type === 'physical' && req.quantity) {
                  // Get the total quantity for the NEW date from ResourceAvailability
                  const availKey = `${dept}-${req.id}`;
                  const totalQuantityForNewDate = availabilityMap.get(availKey) || req.totalQuantity || 0;
                  
                  // Calculate how much is already booked during the new time slot
                  let bookedQuantity = 0;
                  
                  overlappingEvents.forEach((event: any) => {
                    if (event.departmentRequirements && event.departmentRequirements[dept]) {
                      const eventReqs = event.departmentRequirements[dept];
                      const matchingReq = eventReqs.find((r: any) => 
                        r.id === req.id || r.name === req.name
                      );
                      if (matchingReq && matchingReq.quantity) {
                        bookedQuantity += matchingReq.quantity;
                      }
                    }
                  });
                  
                  const availableQuantity = totalQuantityForNewDate - bookedQuantity;
                  
                  
                  // If requested quantity exceeds available, add to conflicts
                  if (req.quantity > availableQuantity) {
                    conflicts.push({
                      department: dept,
                      requirement: req.name,
                      requested: req.quantity,
                      available: availableQuantity,
                      total: totalQuantityForNewDate,
                      booked: bookedQuantity
                    });
                  }
                }
              });
            });
            
            setRequirementConflicts(conflicts);
            
            // Show conflict modal if there are conflicts
            if (conflicts.length > 0) {
              setShowConflictModal(true);
            }
          }
        } catch (error) {
          console.error('Error checking requirement availability:', error);
        }
      } else if (!showEditModal) {
        setRequirementConflicts([]);
        setShowConflictModal(false);
      }
    };

    const timeoutId = setTimeout(checkRequirementAvailability, 300);
    return () => clearTimeout(timeoutId);
  }, [editFormData.startDate, editFormData.startTime, editFormData.endDate, editFormData.endTime, showEditModal, selectedEditEvent]);

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
      }
    } catch (error) {
      toast.error('Failed to load events', {
        description: 'Please try again later.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch all departments
  const fetchAllDepartments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      // Fetch visible departments from the public endpoint
      const response = await axios.get(`${API_BASE_URL}/departments/visible`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success && Array.isArray(response.data.data)) {
        // Extract department names
        const deptNames = response.data.data
          .map((dept: any) => dept.name)
          .filter(Boolean)
          .sort(); // Sort alphabetically
        
        
        if (deptNames.length > 0) {
          setAllDepartments(deptNames as string[]);
          return;
        }
      }
    } catch (error) {
    }
    
    // Fallback to hardcoded departments
    setAllDepartments([
      'PGSO', 'ODH', 'PTO', 'PACCO', 'PESO', 'PSWDO', 
      'DILG', 'HRMO', 'ACCOUNTING', 'BUDGET', 'TREASURY',
      'ENGINEERING', 'PLANNING', 'LEGAL', 'INFORMATION'
    ]);
  };

  useEffect(() => {
    fetchMyEvents();
    fetchAllDepartments();
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
      
      // Match by either dynamic status OR actual status
      const matchesStatus = statusFilter === 'all' || 
                           event.dynamicStatus === statusFilter || 
                           event.status === statusFilter;
      
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

  // Get requirement status icon (similar to Tagged Department page)
  const getRequirementStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'declined': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'partially_fulfill': return <HelpCircle className="w-4 h-4 text-blue-500" />;
      case 'in_preparation': return <Loader2 className="w-4 h-4 text-purple-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Get requirement status badge
  const getRequirementStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || 'pending';
    switch (statusLower) {
      case 'confirmed':
        return { className: 'bg-green-100 text-green-800 border-green-200', label: 'Confirmed' };
      case 'pending':
        return { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' };
      case 'declined':
        return { className: 'bg-red-100 text-red-800 border-red-200', label: 'Declined' };
      case 'partially_fulfill':
        return { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Partially Fulfilled' };
      case 'in_preparation':
        return { className: 'bg-purple-100 text-purple-800 border-purple-200', label: 'In Preparation' };
      default:
        return { className: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Pending' };
    }
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
    setSelectedStatusFilter('all'); // Reset filter when opening modal
    setShowDepartmentsModal(true);
  };

  // Check if a time slot has requirement conflicts
  const hasRequirementConflictsAtTime = (time: string): boolean => {
    if (!editFormData.startDate || !selectedEditEvent || allEventsOnDate.length === 0) return false;
    
    // Parse the time to check
    const [hours, minutes] = time.split(':').map(Number);
    const checkTime = new Date(editFormData.startDate);
    checkTime.setHours(hours, minutes, 0, 0);
    
    // Check if this time falls within any event that has shared departments
    return allEventsOnDate.some((event: any) => {
      if (!event.startTime || !event.endTime || !event.taggedDepartments) return false;
      
      // Check if events share any departments
      const hasSharedDepts = event.taggedDepartments.some((dept: string) => 
        selectedEditEvent.taggedDepartments?.includes(dept)
      );
      if (!hasSharedDepts) return false;
      
      // Parse event times
      const eventStartDate = event.startDate.includes('T') ? event.startDate.split('T')[0] : event.startDate;
      const [eventStartHours, eventStartMinutes] = event.startTime.split(':').map(Number);
      const [eventEndHours, eventEndMinutes] = event.endTime.split(':').map(Number);
      
      const eventStart = new Date(eventStartDate);
      eventStart.setHours(eventStartHours, eventStartMinutes, 0, 0);
      
      const eventEnd = new Date(eventStartDate);
      eventEnd.setHours(eventEndHours, eventEndMinutes, 0, 0);
      
      // Check if this time falls within the event's time range
      return checkTime >= eventStart && checkTime < eventEnd;
    });
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

  // Handle edit requirement
  const handleEditRequirement = (requirement: any, eventId: string, department: string) => {
    setEditingRequirement({ ...requirement, eventId, department });
    setEditRequirementData({
      quantity: requirement.quantity || 0,
      notes: requirement.notes || ''
    });
    setShowEditRequirementModal(true);
  };

  // Handle save edited requirement
  const handleSaveEditedRequirement = async () => {
    if (!editingRequirement) return;

    // Validate based on requirement type
    if (editingRequirement.type === 'physical') {
      // Validate quantity for physical requirements
      if (editRequirementData.quantity > editingRequirement.totalQuantity) {
        toast.error(`Quantity cannot exceed ${editingRequirement.totalQuantity} (available in database)`);
        return;
      }

      if (editRequirementData.quantity < 1) {
        toast.error('Quantity must be at least 1');
        return;
      }
    } else {
      // Validate notes for service requirements
      if (!editRequirementData.notes.trim()) {
        toast.error('Notes are required for service requirements');
        return;
      }
    }

    try {
      const token = localStorage.getItem('authToken');
      
      // First, get the current event data
      const eventResponse = await axios.get(`${API_BASE_URL}/events/${editingRequirement.eventId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!eventResponse.data.success) {
        toast.error('Failed to fetch event data');
        return;
      }
      
      const event = eventResponse.data.data;
      const updatedDepartmentRequirements = { ...event.departmentRequirements };
      
      // Find and update the specific requirement
      if (updatedDepartmentRequirements[editingRequirement.department]) {
        const deptReqs = updatedDepartmentRequirements[editingRequirement.department];
        const reqIndex = deptReqs.findIndex((r: any) => r.id === editingRequirement.id);
        
        if (reqIndex !== -1) {
          deptReqs[reqIndex] = {
            ...deptReqs[reqIndex],
            quantity: editRequirementData.quantity,
            // DON'T update totalQuantity - that's the system's total availability!
            notes: editRequirementData.notes
          };
        }
      }
      
      // Update the event with the modified departmentRequirements
      const response = await axios.put(
        `${API_BASE_URL}/events/${editingRequirement.eventId}`,
        {
          departmentRequirements: updatedDepartmentRequirements
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success('Requirement updated successfully');
        setShowEditRequirementModal(false);
        setEditingRequirement(null);
        
        // Refresh events to show updated data
        fetchMyEvents();
        
        // If the departments modal is open, refresh that event too
        if (selectedEventDepartments) {
          const updatedEvent = await axios.get(`${API_BASE_URL}/events/${selectedEventDepartments._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (updatedEvent.data.success) {
            setSelectedEventDepartments(updatedEvent.data.data);
          }
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update requirement');
    }
  };

  // Handle change department
  const handleChangeDepartment = (requirement: any, eventId: string, currentDepartment: string) => {
    setChangingRequirement({ ...requirement, eventId, currentDepartment });
    setSelectedDepartments([]); // Start with NO selection - user must choose
    setDepartmentSearchQuery(''); // Reset search query
    setShowChangeDepartmentModal(true);
  };

  // Handle save department change
  const handleSaveDepartmentChange = async () => {
    if (!changingRequirement || selectedDepartments.length === 0) {
      toast.error('Please select at least one department');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.patch(
        `${API_BASE_URL}/events/${changingRequirement.eventId}/requirements/${changingRequirement.id}/departments`,
        {
          departments: selectedDepartments
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success('Department tags updated successfully');
        setShowChangeDepartmentModal(false);
        setChangingRequirement(null);
        setSelectedDepartments([]);
        
        // Refresh events
        fetchMyEvents();
        
        // Refresh departments modal if open
        if (selectedEventDepartments) {
          const updatedEvent = await axios.get(`${API_BASE_URL}/events/${selectedEventDepartments._id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (updatedEvent.data.success) {
            setSelectedEventDepartments(updatedEvent.data.data);
          }
        }
      }
    } catch (error: any) {
      console.error('Error updating departments:', error);
      toast.error(error.response?.data?.message || 'Failed to update departments');
    }
  };

  // Toggle department selection
  const toggleDepartmentSelection = (department: string) => {
    setSelectedDepartments(prev => {
      if (prev.includes(department)) {
        return prev.filter(d => d !== department);
      } else {
        return [...prev, department];
      }
    });
  };

  // Open add departments modal
  const handleOpenAddDepartments = (event: any) => {
    const availableDepts = allDepartments.filter(dept => !event.taggedDepartments?.includes(dept));
    
    setAddingToEvent(event);
    setAddDepartmentSearchQuery(''); // Reset search
    setShowAddDepartmentsModal(true);
  };

  // Handle department selection for adding
  const handleSelectDepartmentToAdd = async (deptName: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/departments/visible`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data.success) {
        const dept = response.data.data.find((d: any) => d.name === deptName);
        if (dept && addingToEvent) {
          setSelectedDepartmentData(dept);
          
          // Fetch availability for the event date
          const eventDate = new Date(addingToEvent.startDate);
          const year = eventDate.getFullYear();
          const month = String(eventDate.getMonth() + 1).padStart(2, '0');
          const day = String(eventDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          
          // Fetch resource availability for this department and date
          const availResponse = await axios.get(
            `${API_BASE_URL}/resource-availability/department/${dept._id}/availability?startDate=${dateStr}&endDate=${dateStr}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          const availabilities = availResponse.data || [];
          
          // Fetch conflicting events to calculate actual available quantity
          const eventsResponse = await axios.get(`${API_BASE_URL}/events`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const allEvents = eventsResponse.data.data || [];
          
          
          const conflictingEvents = allEvents.filter((event: any) => {
            if (event._id === addingToEvent._id) return false; // Exclude current event
            if (!event.startDate || !event.startTime || !event.endTime) return false;
            
            const eventStartDate = new Date(event.startDate);
            const isSameDate = eventStartDate.toDateString() === eventDate.toDateString();
            
            
            if (!isSameDate) return false;
            
            // Check time overlap
            const hasTimeOverlap = (
              (addingToEvent.startTime >= event.startTime && addingToEvent.startTime < event.endTime) ||
              (addingToEvent.endTime > event.startTime && addingToEvent.endTime <= event.endTime) ||
              (addingToEvent.startTime <= event.startTime && addingToEvent.endTime >= event.endTime)
            );
            
            
            return hasTimeOverlap;
          });
          
          
          // Map requirements with availability data and calculate actual available quantity
          const reqs = dept.requirements
            .filter((req: any) => {
              // Only show requirements that have availability for this date
              const avail = availabilities.find((a: any) => a.requirementId === req._id);
              return avail !== undefined;
            })
            .map((req: any) => {
              const avail = availabilities.find((a: any) => a.requirementId === req._id);
              const baseQuantity = avail?.quantity || req.totalQuantity || 0;
              
              // Calculate how much is already booked by conflicting events AND current event
              let bookedQuantity = 0;
              
              // First, check what THIS event has already booked
              if (addingToEvent.departmentRequirements && addingToEvent.departmentRequirements[deptName]) {
                const currentEventReqs = addingToEvent.departmentRequirements[deptName];
                const alreadyBooked = currentEventReqs.find((r: any) => r.name === req.text);
                if (alreadyBooked && alreadyBooked.quantity) {
                  bookedQuantity += alreadyBooked.quantity;
                }
              }
              
              // Then add what other conflicting events have booked
              conflictingEvents.forEach((event: any) => {
                if (event.departmentRequirements && event.departmentRequirements[deptName]) {
                  const deptReqs = event.departmentRequirements[deptName];
                  const matchingReq = deptReqs.find((r: any) => r.name === req.text);
                  if (matchingReq && matchingReq.quantity) {
                    bookedQuantity += matchingReq.quantity;
                  }
                }
              });
              
              const actualAvailable = Math.max(0, baseQuantity - bookedQuantity);
              
              
              return {
                id: req._id,
                name: req.text,
                type: req.type,
                selected: false,
                quantity: req.type === 'physical' ? 1 : undefined,
                notes: '',
                totalQuantity: actualAvailable, // Use actual available quantity
                baseQuantity: baseQuantity, // Keep base for reference
                bookedQuantity: bookedQuantity,
                isAvailable: avail?.isAvailable && actualAvailable > 0,
                availabilityNotes: avail?.notes || ''
              };
            });
          
          setDepartmentRequirements(reqs);
          setShowDepartmentRequirementsModal(true);
        }
      }
    } catch (error) {
      console.error('Error fetching department:', error);
      toast.error('Failed to load department requirements');
    }
  };

  // Toggle requirement selection
  const toggleRequirementSelection = (reqId: string) => {
    setDepartmentRequirements(prev => 
      prev.map(req => req.id === reqId ? { ...req, selected: !req.selected } : req)
    );
  };

  // Update requirement quantity
  const updateRequirementQuantity = (reqId: string, quantity: number) => {
    setDepartmentRequirements(prev =>
      prev.map(req => req.id === reqId ? { ...req, quantity } : req)
    );
  };

  // Update requirement notes
  const updateRequirementNotes = (reqId: string, notes: string) => {
    setDepartmentRequirements(prev =>
      prev.map(req => req.id === reqId ? { ...req, notes } : req)
    );
  };

  // Save department with requirements
  const handleSaveDepartmentRequirements = async () => {
    const selectedReqs = departmentRequirements.filter(r => r.selected);
    
    if (selectedReqs.length === 0) {
      toast.error('Please select at least one requirement');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/events/${addingToEvent._id}/add-department`,
        {
          departmentName: selectedDepartmentData.name,
          requirements: selectedReqs
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast.success(`Added ${selectedDepartmentData.name} with ${selectedReqs.length} requirement(s)`);
        setShowDepartmentRequirementsModal(false);
        setShowAddDepartmentsModal(false);
        setSelectedDepartmentData(null);
        setDepartmentRequirements([]);
        setAddingToEvent(null);
        fetchMyEvents();
      }
    } catch (error: any) {
      console.error('Error adding department:', error);
      toast.error(error.response?.data?.message || 'Failed to add department');
    }
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
        endTime: editFormData.endTime,
        previousLocation: selectedEditEvent.location, // Store previous location for reschedule log
        previousStartDate: selectedEditEvent.startDate,
        previousStartTime: selectedEditEvent.startTime,
        previousEndDate: selectedEditEvent.endDate,
        previousEndTime: selectedEditEvent.endTime
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
    <div className="w-full min-h-screen bg-gray-50 p-6">
      <div className="w-full max-w-[1800px] mx-auto">
        <Card className="shadow-lg bg-white">
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
                      <SelectItem value="all">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>All Status</span>
                          <Badge variant="secondary" className="ml-auto">{events.length}</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="draft">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>Draft</span>
                          <Badge variant="secondary" className="ml-auto">{events.filter(e => e.status === 'draft').length}</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="submitted">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>Submitted</span>
                          <Badge variant="secondary" className="ml-auto">{events.filter(e => e.status === 'submitted').length}</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="approved">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>Approved</span>
                          <Badge variant="secondary" className="ml-auto">{events.filter(e => e.status === 'approved').length}</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="incoming">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>Incoming</span>
                          <Badge variant="secondary" className="ml-auto">{events.filter(e => getDynamicStatus(e) === 'incoming').length}</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="ongoing">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>Ongoing</span>
                          <Badge variant="secondary" className="ml-auto">{events.filter(e => getDynamicStatus(e) === 'ongoing').length}</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="completed">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>Completed</span>
                          <Badge variant="secondary" className="ml-auto">{events.filter(e => getDynamicStatus(e) === 'completed').length}</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>Rejected</span>
                          <Badge variant="secondary" className="ml-auto">{events.filter(e => e.status === 'rejected').length}</Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="cancelled">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span>Cancelled</span>
                          <Badge variant="secondary" className="ml-auto">{events.filter(e => e.status === 'cancelled').length}</Badge>
                        </div>
                      </SelectItem>
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
                            {event.status === 'rejected' ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge 
                                      variant={statusInfo.variant}
                                      className={`gap-1 ${statusInfo.className || ''} cursor-help`}
                                    >
                                      {statusInfo.icon}
                                      {statusInfo.label}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs bg-white border shadow-lg p-3">
                                    <p className="font-semibold mb-1 text-gray-900">Rejection Reason:</p>
                                    <p className="text-sm text-gray-700">
                                      {event.reason || 'No reason provided.'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Badge 
                                variant={statusInfo.variant}
                                className={`gap-1 ${statusInfo.className || ''}`}
                              >
                                {statusInfo.icon}
                                {statusInfo.label}
                              </Badge>
                            )}
                            {/* Show actual status if different from dynamic status */}
                            {event.dynamicStatus !== event.status && event.status !== 'rejected' && (
                              <Badge 
                                variant="outline"
                                className="gap-1 bg-green-100 text-green-800 border-green-200"
                              >
                                <CheckCircle className="w-3 h-3" />
                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                              </Badge>
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
                              Edit Schedule
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
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenAddDepartments(event)}
                            className="gap-1 h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                          >
                            <Plus className="w-3 h-3" />
                            Tag More Departments
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
        <DialogContent className="!max-w-6xl !w-[90vw] !h-[85vh] overflow-hidden p-0">
          <div className="flex flex-col h-full max-h-[85vh]">
            {/* Modern Header */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                Tagged Departments & Requirements
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-2">
                Real-time status and coordination details for all involved departments
              </DialogDescription>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {selectedEventDepartments && (
                <div className="p-6 space-y-8">
                  {/* Quick Status Overview */}
                  <div className="bg-white rounded-xl border shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      Requirements Overview
                    </h3>
                    {(() => {
                      const allRequirements = Object.values(selectedEventDepartments.departmentRequirements || {}).flat();
                      const statusCounts = {
                        confirmed: 0,
                        pending: 0,
                        declined: 0,
                        partially_fulfill: 0,
                        in_preparation: 0
                      };
                      
                      allRequirements.forEach((req: any) => {
                        const status = req.status?.toLowerCase() || 'pending';
                        if (statusCounts.hasOwnProperty(status)) {
                          statusCounts[status as keyof typeof statusCounts]++;
                        }
                      });

                      return (
                        <div className="grid grid-cols-4 gap-4">
                          <button
                            onClick={() => setSelectedStatusFilter('all')}
                            className={`text-center p-4 rounded-lg border transition-all hover:shadow-md ${
                              selectedStatusFilter === 'all' 
                                ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-300' 
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            <div className="text-2xl font-bold text-gray-600">{statusCounts.confirmed + statusCounts.pending + statusCounts.declined + statusCounts.partially_fulfill + statusCounts.in_preparation}</div>
                            <div className="text-sm text-gray-700 font-medium">All</div>
                          </button>
                          <button
                            onClick={() => setSelectedStatusFilter('confirmed')}
                            className={`text-center p-4 rounded-lg border transition-all hover:shadow-md ${
                              selectedStatusFilter === 'confirmed' 
                                ? 'bg-green-100 border-green-400 ring-2 ring-green-300' 
                                : 'bg-green-50 border-green-200 hover:bg-green-100'
                            }`}
                          >
                            <div className="text-2xl font-bold text-green-600">{statusCounts.confirmed}</div>
                            <div className="text-sm text-green-700 font-medium">Confirmed</div>
                          </button>
                          <button
                            onClick={() => setSelectedStatusFilter('pending')}
                            className={`text-center p-4 rounded-lg border transition-all hover:shadow-md ${
                              selectedStatusFilter === 'pending' 
                                ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-300' 
                                : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
                            }`}
                          >
                            <div className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</div>
                            <div className="text-sm text-yellow-700 font-medium">Pending</div>
                          </button>
                          <button
                            onClick={() => setSelectedStatusFilter('declined')}
                            className={`text-center p-4 rounded-lg border transition-all hover:shadow-md ${
                              selectedStatusFilter === 'declined' 
                                ? 'bg-red-100 border-red-400 ring-2 ring-red-300' 
                                : 'bg-red-50 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            <div className="text-2xl font-bold text-red-600">{statusCounts.declined}</div>
                            <div className="text-sm text-red-700 font-medium">Declined</div>
                          </button>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Department Requirements by Department */}
                  {selectedEventDepartments.departmentRequirements && Object.keys(selectedEventDepartments.departmentRequirements).length > 0 && (
                    <div className="space-y-6">
                      {Object.entries(selectedEventDepartments.departmentRequirements).map(([dept, requirements]: [string, any], index) => {
                        // Parse requirements
                        let parsedRequirements = requirements;
                        if (typeof requirements === 'string') {
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
                          <div key={index} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            {/* Department Header */}
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="text-lg font-semibold text-gray-900">{dept}</h4>
                                    <p className="text-sm text-gray-600">
                                      {Array.isArray(parsedRequirements) ? parsedRequirements.length : 0} Requirements
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  Department
                                </Badge>
                              </div>
                            </div>

                            {/* Requirements Grid */}
                            <div className="p-6">
                              {Array.isArray(parsedRequirements) ? (
                                (() => {
                                  const filteredRequirements = parsedRequirements.filter((req: any) => {
                                    if (selectedStatusFilter === 'all') return true;
                                    const reqStatus = req.status?.toLowerCase() || 'pending';
                                    return reqStatus === selectedStatusFilter;
                                  });

                                  return filteredRequirements.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      {filteredRequirements.map((req: any, reqIndex: number) => {
                                    const statusBadge = getRequirementStatusBadge(req.status);
                                    return (
                                      <div key={reqIndex} className="bg-gray-50 rounded-lg border p-4 hover:shadow-md transition-all">
                                        {/* Requirement Header */}
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex-1">
                                            <h5 className="font-medium text-gray-900 mb-1">
                                              {req.name || `Requirement ${reqIndex + 1}`}
                                            </h5>
                                            <div className="flex items-center gap-2">
                                              {req.type && (
                                                <Badge variant="outline" className="text-xs">
                                                  {req.type}
                                                </Badge>
                                              )}
                                              <Badge variant="secondary" className="text-xs">
                                                {dept}
                                              </Badge>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 ml-3">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleChangeDepartment(req, selectedEventDepartments._id, dept)}
                                              className="h-7 px-2 gap-1 bg-white text-black border-gray-300 hover:bg-gray-100 hover:border-gray-400"
                                              title="Change Department"
                                            >
                                              <Building2 className="w-3.5 h-3.5" />
                                              <span className="text-xs">Change Dept</span>
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handleEditRequirement(req, selectedEventDepartments._id, dept)}
                                              className="h-7 px-2 gap-1 bg-black text-white border-gray-700 hover:bg-gray-800 hover:border-gray-600 hover:text-white"
                                              title="Edit Quantity/Notes"
                                            >
                                              <Edit className="w-3.5 h-3.5 text-white" />
                                              <span className="text-xs text-white">Quantity/Notes</span>
                                            </Button>
                                            {getRequirementStatusIcon(req.status)}
                                            <Badge className={`text-xs ${statusBadge.className}`}>
                                              {statusBadge.label}
                                            </Badge>
                                          </div>
                                        </div>

                                        {/* Requirement Details */}
                                        <div className="space-y-3">
                                          {/* Quantity/Notes */}
                                          {req.type === 'physical' && req.quantity ? (
                                            <div className="text-sm text-gray-600 bg-white rounded p-2">
                                              <span className="font-medium">Requested:</span> {req.quantity}
                                              {req.totalQuantity && <span className="text-gray-500"> of {req.totalQuantity} available</span>}
                                            </div>
                                          ) : req.notes ? (
                                            <div className="text-sm text-gray-600 bg-white rounded p-2">
                                              <span className="font-medium">Notes:</span> {req.notes}
                                            </div>
                                          ) : null}

                                          {/* Department Notes */}
                                          {req.departmentNotes && (
                                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                              <div className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                Department Notes:
                                              </div>
                                              <div className="text-sm text-blue-700">{req.departmentNotes}</div>
                                            </div>
                                          )}

                                          {/* Decline Reason */}
                                          {req.status?.toLowerCase() === 'declined' && req.declineReason && (
                                            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                              <div className="flex items-start gap-2">
                                                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                                <div className="flex-1">
                                                  <p className="text-xs font-medium text-red-900 mb-1">Decline Reason:</p>
                                                  <p className="text-sm text-red-800">{req.declineReason}</p>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          {/* Availability & Updates */}
                                          <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
                                            {req.isAvailable !== undefined && (
                                              <div className="flex items-center gap-1">
                                                {req.isAvailable ? (
                                                  <>
                                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                                    <span className="text-green-600">Available</span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <XCircle className="w-3 h-3 text-red-500" />
                                                    <span className="text-red-600">Not Available</span>
                                                  </>
                                                )}
                                              </div>
                                            )}
                                            {req.lastUpdated && (
                                              <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>Updated: {new Date(req.lastUpdated).toLocaleDateString()}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-gray-500">
                                      <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                      <p>No requirements found for "{selectedStatusFilter === 'all' ? 'all statuses' : selectedStatusFilter}" status</p>
                                      <button 
                                        onClick={() => setSelectedStatusFilter('all')}
                                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
                                      >
                                        Show all requirements
                                      </button>
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                                  <p>No detailed requirements available</p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* No Departments Message */}
                  {selectedEventDepartments.taggedDepartments.length === 0 && (
                    <div className="text-center py-12">
                      <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-medium text-gray-900 mb-2">No Departments Tagged</h3>
                      <p className="text-gray-500">This event doesn't have any departments tagged yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 px-6 py-4">
              <div className="flex justify-end">
                <Button 
                  onClick={() => setShowDepartmentsModal(false)}
                  className="px-6"
                >
                  Close
                </Button>
              </div>
            </div>
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
                                const response = await fetch(url, { method: 'HEAD' });
                                if (response.ok) {
                                  window.open(url, '_blank');
                                } else {
                                  toast.error('File not available', {
                                    description: 'This file may not exist in your local environment. It works in production.'
                                  });
                                }
                              } catch (error) {
                                toast.error('Cannot access file', {
                                  description: 'File may not exist in localhost. Check production or upload files to test.'
                                });
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
                                const url = `${API_BASE_URL}/events/govfile/${selectedEventFiles.govFiles!.brieferTemplate!.filename}`;
                                const response = await fetch(url, { method: 'HEAD' });
                                if (response.ok) {
                                  window.open(`${url}?download=true`, '_blank');
                                } else {
                                  toast.error('File not available', {
                                    description: 'This file may not exist in your local environment. It works in production.'
                                  });
                                }
                              } catch (error) {
                                toast.error('Cannot download file', {
                                  description: 'File may not exist in localhost. Check production or upload files to test.'
                                });
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
        <DialogContent className="!max-w-[900px] w-[90vw] max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Edit Event Schedule
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 mt-1">
              Update location, dates, and times for this event
            </DialogDescription>
          </DialogHeader>
          
          {selectedEditEvent && (
            <div className="flex flex-col h-full">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {/* Event Title (Read-only) */}
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event Title</Label>
                  <p className="text-base font-semibold text-gray-900 mt-1">{selectedEditEvent.eventTitle}</p>
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

              {/* Requirement Conflict Indicator */}
              {requirementConflicts.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-medium text-red-900">
                        {requirementConflicts.length} Requirement{requirementConflicts.length > 1 ? 's' : ''} Unavailable
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowConflictModal(true)}
                      className="text-red-700 border-red-300 hover:bg-red-100"
                    >
                      View Details
                    </Button>
                  </div>
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
                          const hasReqConflicts = hasRequirementConflictsAtTime(timeOption.value);
                          return (
                            <SelectItem 
                              key={timeOption.value} 
                              value={timeOption.value}
                              disabled={isBooked}
                              className={isBooked ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <div className="flex items-center justify-between w-full gap-2">
                                <span className={isBooked ? 'text-gray-400' : ''}>
                                  {timeOption.label}
                                </span>
                                <div className="flex items-center gap-1">
                                  {hasReqConflicts && !isBooked && (
                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                      REQ
                                    </Badge>
                                  )}
                                  {isBooked && (
                                    <Badge variant="destructive" className="text-xs">
                                      BOOKED
                                    </Badge>
                                  )}
                                </div>
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
                          const hasReqConflicts = hasRequirementConflictsAtTime(timeOption.value);
                          return (
                            <SelectItem 
                              key={timeOption.value} 
                              value={timeOption.value}
                              disabled={isBooked}
                              className={isBooked ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <div className="flex items-center justify-between w-full gap-2">
                                <span className={isBooked ? 'text-gray-400' : ''}>
                                  {timeOption.label}
                                </span>
                                <div className="flex items-center gap-1">
                                  {hasReqConflicts && !isBooked && (
                                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                      REQ
                                    </Badge>
                                  )}
                                  {isBooked && (
                                    <Badge variant="destructive" className="text-xs">
                                      BOOKED
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              </div>

              {/* Footer Action Buttons */}
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEditedEvent}
                  disabled={requirementConflicts.length > 0}
                  className={requirementConflicts.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  {requirementConflicts.length > 0 ? 'Cannot Save - Resolve Conflicts' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Requirement Modal */}
      <Dialog open={showEditRequirementModal} onOpenChange={setShowEditRequirementModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Requirement
            </DialogTitle>
            <DialogDescription>
              Update the quantity and notes for this requirement
            </DialogDescription>
          </DialogHeader>

          {editingRequirement && (
            <div className="space-y-4 py-4">
              {/* Requirement Info */}
              <div className="bg-gray-50 rounded-lg p-3 border">
                <p className="text-sm font-medium text-gray-900">{editingRequirement.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Department: {editingRequirement.department}
                </p>
                {editingRequirement.type && (
                  <Badge variant="outline" className="text-xs mt-2">
                    {editingRequirement.type}
                  </Badge>
                )}
              </div>

              {/* Conditional: Quantity for Physical, Notes for Service */}
              {editingRequirement.type === 'physical' ? (
                <>
                  {/* Quantity Input - Physical Requirements */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-quantity">
                      Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-quantity"
                      type="number"
                      min="1"
                      max={editingRequirement.totalQuantity}
                      value={editRequirementData.quantity}
                      onChange={(e) => setEditRequirementData(prev => ({ 
                        ...prev, 
                        quantity: parseInt(e.target.value) || 0 
                      }))}
                      placeholder="Enter quantity"
                    />
                    <p className="text-xs text-gray-500">
                      Current Available: <span className="font-medium text-gray-700">{editingRequirement.totalQuantity}</span>
                    </p>
                    {editRequirementData.quantity > editingRequirement.totalQuantity && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Quantity cannot exceed available amount
                      </p>
                    )}
                  </div>

                  {/* Notes Input (Optional for Physical) */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes (Optional)</Label>
                    <Textarea
                      id="edit-notes"
                      value={editRequirementData.notes}
                      onChange={(e) => setEditRequirementData(prev => ({ 
                        ...prev, 
                        notes: e.target.value 
                      }))}
                      placeholder="Add any additional notes..."
                      rows={4}
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-500">
                      {editRequirementData.notes.length}/500 characters
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Notes Input - Service Requirements */}
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">
                      Notes <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="edit-notes"
                      value={editRequirementData.notes}
                      onChange={(e) => setEditRequirementData(prev => ({ 
                        ...prev, 
                        notes: e.target.value 
                      }))}
                      placeholder="Enter service details and requirements..."
                      rows={6}
                      className="resize-none"
                    />
                    <p className="text-xs text-gray-500">
                      {editRequirementData.notes.length}/500 characters
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowEditRequirementModal(false);
                setEditingRequirement(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEditedRequirement}
              disabled={
                editingRequirement?.type === 'physical' 
                  ? (!editRequirementData.quantity || 
                     editRequirementData.quantity < 1 ||
                     editRequirementData.quantity > editingRequirement?.totalQuantity)
                  : !editRequirementData.notes.trim()
              }
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Department Modal */}
      <Dialog open={showChangeDepartmentModal} onOpenChange={setShowChangeDepartmentModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Change Department Tags
            </DialogTitle>
            <DialogDescription>
              Select the correct department(s) for this requirement
            </DialogDescription>
          </DialogHeader>

          {changingRequirement && (
            <div className="space-y-4 py-4">
              {/* Requirement Info */}
              <div className="bg-gray-50 rounded-lg p-3 border">
                <p className="text-sm font-medium text-gray-900">{changingRequirement.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Current Department: <span className="font-medium">{changingRequirement.currentDepartment}</span>
                </p>
              </div>

              {/* Department Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Department(s)</Label>
                
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search departments..."
                    value={departmentSearchQuery}
                    onChange={(e) => setDepartmentSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Department List */}
                <div className="max-h-[300px] overflow-y-auto border rounded-lg p-3 space-y-2">
                  {allDepartments
                    .filter((dept) => 
                      dept.toLowerCase().includes(departmentSearchQuery.toLowerCase())
                    )
                    .sort((a, b) => {
                      // Sort current department first
                      if (a === changingRequirement.currentDepartment) return -1;
                      if (b === changingRequirement.currentDepartment) return 1;
                      // Then alphabetically
                      return a.localeCompare(b);
                    })
                    .map((dept) => (
                      <div
                        key={dept}
                        className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50"
                      >
                        <Checkbox
                          id={`dept-${dept}`}
                          checked={selectedDepartments.includes(dept)}
                          onCheckedChange={() => toggleDepartmentSelection(dept)}
                          className="cursor-pointer"
                        />
                        <label
                          htmlFor={`dept-${dept}`}
                          className="text-sm flex-1 cursor-pointer"
                          onClick={() => toggleDepartmentSelection(dept)}
                        >
                          {dept}
                        </label>
                      </div>
                    ))}
                  
                  {/* No Results Message */}
                  {allDepartments.filter((dept) => 
                    dept.toLowerCase().includes(departmentSearchQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No departments found</p>
                      <p className="text-xs mt-1">Try a different search term</p>
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-500">
                  {selectedDepartments.length} department(s) selected
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowChangeDepartmentModal(false);
                setChangingRequirement(null);
                setSelectedDepartments([]);
                setDepartmentSearchQuery('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveDepartmentChange}
              disabled={selectedDepartments.length === 0}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Departments Modal - Select Department */}
      <Dialog open={showAddDepartmentsModal} onOpenChange={setShowAddDepartmentsModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Add Department to Event
            </DialogTitle>
            <DialogDescription>
              Select a department to tag to this event
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Event Info */}
            {addingToEvent && (
              <div className="bg-gray-50 rounded-lg p-3 border">
                <p className="text-sm font-medium text-gray-900">{addingToEvent.eventTitle}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(addingToEvent.startDate).toLocaleDateString()} • {addingToEvent.location}
                </p>
              </div>
            )}

            {/* Department List */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select Department</Label>
              
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search departments..."
                  value={addDepartmentSearchQuery}
                  onChange={(e) => setAddDepartmentSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="max-h-[400px] overflow-y-auto border rounded-lg p-3 space-y-2">
                {allDepartments
                  .filter(dept => dept.toLowerCase().includes(addDepartmentSearchQuery.toLowerCase()))
                  .map((dept) => {
                    const isAlreadyTagged = addingToEvent?.taggedDepartments?.includes(dept);
                    return (
                      <div
                        key={dept}
                        onClick={() => handleSelectDepartmentToAdd(dept)}
                        className="flex items-center justify-between p-3 rounded hover:bg-gray-50 cursor-pointer border border-transparent hover:border-blue-200 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{dept}</span>
                          {isAlreadyTagged && (
                            <Badge variant="secondary" className="text-xs">
                              Already Tagged
                            </Badge>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    );
                  })}
                
                {allDepartments
                  .filter(dept => dept.toLowerCase().includes(addDepartmentSearchQuery.toLowerCase()))
                  .length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No departments found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowAddDepartmentsModal(false);
                setAddingToEvent(null);
                setAddDepartmentSearchQuery('');
              }}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Department Requirements Modal */}
      <Dialog open={showDepartmentRequirementsModal} onOpenChange={setShowDepartmentRequirementsModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {selectedDepartmentData?.name} - Requirements
            </DialogTitle>
            <DialogDescription>
              Select requirements for this department
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {departmentRequirements.length > 0 ? (
              <div className="space-y-3">
                {departmentRequirements.map((req) => (
                  <div key={req.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={req.selected}
                        onCheckedChange={() => toggleRequirementSelection(req.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium text-sm">{req.name}</p>
                          <Badge variant="outline" className="text-xs">
                            {req.type === 'physical' ? '📦 Physical' : '🔧 Service'}
                          </Badge>
                          {req.isAvailable !== undefined && (
                            <Badge 
                              variant={req.isAvailable ? "default" : "destructive"} 
                              className="text-xs"
                            >
                              {req.isAvailable ? '✓ Available' : '✗ Unavailable'}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Show availability info ALWAYS */}
                        {req.type === 'physical' && req.totalQuantity !== undefined && (
                          <p className="text-xs text-gray-600 mb-2">
                            Available: <span className="font-medium">{req.totalQuantity}</span>
                          </p>
                        )}
                        {req.availabilityNotes && (
                          <p className="text-xs text-gray-600 mb-2">
                            Note: {req.availabilityNotes}
                          </p>
                        )}

                        {req.selected && (
                          <div className="space-y-2 mt-3">
                            {req.type === 'physical' ? (
                              <div>
                                <Label className="text-xs">Quantity Needed</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max={req.totalQuantity}
                                  value={req.quantity || ''}
                                  onChange={(e) => updateRequirementQuantity(req.id, parseInt(e.target.value) || 0)}
                                  className="mt-1"
                                  placeholder="Enter quantity"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Available: {req.totalQuantity || 'N/A'}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <Label className="text-xs">Notes</Label>
                                <Textarea
                                  value={req.notes}
                                  onChange={(e) => updateRequirementNotes(req.id, e.target.value)}
                                  className="mt-1"
                                  placeholder="Add specific notes or requirements..."
                                  rows={3}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No requirements found for this department</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDepartmentRequirementsModal(false);
                setSelectedDepartmentData(null);
                setDepartmentRequirements([]);
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveDepartmentRequirements}
              disabled={departmentRequirements.filter(r => r.selected).length === 0}
            >
              Add Department
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Requirement Conflicts Modal */}
      <Dialog open={showConflictModal} onOpenChange={setShowConflictModal}>
        <DialogContent className="!max-w-[700px] w-[85vw] !max-h-[75vh]">
          <DialogHeader className="pb-3">
            <DialogTitle className="text-lg font-semibold text-red-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Requirement Availability Issues
            </DialogTitle>
            <DialogDescription className="text-xs text-red-700 mt-1">
              The following requirements are not available. Please choose a different time or reduce requirements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[300px] overflow-y-auto py-1">
            {requirementConflicts.map((conflict, idx) => (
              <Card key={idx} className="border-red-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{conflict.requirement}</h4>
                      <p className="text-xs text-gray-500">{conflict.department}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs px-2 py-0.5">Insufficient</Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded p-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Requested</p>
                      <p className="text-base font-bold text-gray-900">{conflict.requested}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Available</p>
                      <p className="text-base font-bold text-red-600">{conflict.available}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-base font-bold text-gray-900">{conflict.total}</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-orange-700 text-center mt-2">
                    {conflict.booked} already booked
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-red-50 border border-red-300 rounded p-2 mt-3">
            <p className="text-xs text-red-900 font-medium text-center flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Cannot reschedule to this date/time
            </p>
          </div>

          <div className="flex justify-end mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConflictModal(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyEventsPage;