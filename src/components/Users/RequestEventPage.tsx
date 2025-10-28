import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { format as formatDate } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import {
  FileText,
  Paperclip,
  Building2,
  CheckSquare,
  Calendar as CalendarIcon,
  ChevronRight,
  Send,
  StickyNote,
  X,
  Upload,
  Plus,
  Info,
  Check,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Package,
  Settings,
  Clock,
  Loader2,
  User
} from 'lucide-react';

interface DepartmentRequirement {
  id: string;
  name: string;
  selected: boolean;
  notes: string;
  quantity?: number;  // For physical requirements
  type?: 'physical' | 'service' | 'yesno';
  totalQuantity?: number;
  isAvailable?: boolean;
  responsiblePerson?: string;
  availabilityNotes?: string; // Notes from resource availability
  isCustom?: boolean; // Flag for custom requirements added by user
  yesNoAnswer?: 'yes' | 'no'; // For yesno type requirements
}

interface DepartmentRequirements {
  [department: string]: DepartmentRequirement[];
}

interface FormData {
  eventTitle: string;
  requestor: string;
  location: string;
  locations: string[]; // Array for multiple conference rooms
  participants: string;
  vip: string;
  vvip: string;
  withoutGov: boolean;
  multipleLocations: boolean;
  description: string;
  noAttachments: boolean;
  attachments: File[];
  taggedDepartments: string[];
  departmentRequirements: DepartmentRequirements;
  startDate: Date | undefined;
  startTime: string;
  endDate: Date | undefined;
  endTime: string;
  contactNumber: string;
  contactEmail: string;
  eventType: 'simple' | 'complex';
}

interface Department {
  _id: string;
  name: string;
  isVisible: boolean;
  requirements: Array<{
    _id: string;
    text: string;
    type: 'physical' | 'service';
    totalQuantity?: number;
    isActive: boolean;
    isAvailable?: boolean;
    responsiblePerson?: string;
    createdAt: string;
    updatedAt?: string;
  }>;
}

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

const RequestEventPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [requirementsRefreshKey, setRequirementsRefreshKey] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [customRequirement, setCustomRequirement] = useState<string>('');
  const [customRequirementType, setCustomRequirementType] = useState<'physical' | 'service'>('service');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showAvailableDatesModal, setShowAvailableDatesModal] = useState(false);
  const [departmentAvailableDates, setDepartmentAvailableDates] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [showGovModal, setShowGovModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateType, setTemplateType] = useState<'briefer' | 'program'>('briefer');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [brieferData, setBrieferData] = useState({
    eventTitle: '',
    proponentOffice: '',
    dateTime: '',
    venue: '',
    objectives: '',
    targetAudience: '',
    expectedParticipants: '',
    briefDescription: ''
  });
  const [programFlowRows, setProgramFlowRows] = useState([
    { time: '', activity: '', personResponsible: '', remarks: '' }
  ]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStep, setReviewStep] = useState(1);
  const [govFiles, setGovFiles] = useState<{
    [key: string]: File | null;
  }>({
    brieferTemplate: null,
    programme: null
  });
  const [conflictingEvents, setConflictingEvents] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dynamic data from database
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  // Remove unused state - we fetch availabilities directly when needed
  const [formData, setFormData] = useState<FormData>({
    eventTitle: '',
    requestor: '',
    location: '',
    locations: [], // Initialize empty array for multiple locations
    participants: '',
    vip: '',
    vvip: '',
    withoutGov: false,
    multipleLocations: false,
    description: '',
    noAttachments: false,
    attachments: [],
    taggedDepartments: [],
    departmentRequirements: {},
    startDate: undefined,
    startTime: '',
    endDate: undefined,
    endTime: '',
    contactNumber: '',
    contactEmail: '',
    eventType: 'simple'
  });

  const steps = [
    { id: 1, title: 'Event Details', icon: FileText, description: 'Basic event information' },
    { id: 2, title: 'Attachments', icon: Paperclip, description: 'Upload supporting documents' },
    { id: 3, title: 'Tag Departments', icon: Building2, description: 'Select relevant departments' },
    { id: 4, title: 'Requirements', icon: CheckSquare, description: 'Specify event requirements' },
    { id: 5, title: 'Schedule', icon: CalendarIcon, description: 'Set date and time' },
    { id: 6, title: 'Ready to Submit', icon: Send, description: 'Review and submit' }
  ];

  // Check if attachments step is completed - NOW REQUIRED!
  const isAttachmentsCompleted = formData.attachments.length > 0;

  const [locations, setLocations] = useState<string[]>(['Add Custom Location']);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);


  const defaultRequirements: DepartmentRequirements = {};

  // Fetch departments from API on component mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const response = await axios.get(`${API_BASE_URL}/departments/visible`, { headers });

        if (response.data.success) {
          setDepartments(response.data.data);
        }
      } catch (error) {
        // Fallback to empty array if fetch fails
        setDepartments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, []);

  // Fetch locations from locationAvailabilities API
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const response = await axios.get(`${API_BASE_URL}/location-availability`, { headers });

        if (response.data.success) {
          // Extract unique location names and clean them
          const uniqueLocations = [...new Set(response.data.data.map((item: any) => {
            // Remove "Bookings for " prefix if it exists
            let locationName = item.locationName;
            if (locationName.startsWith('Bookings for ')) {
              locationName = locationName.replace('Bookings for ', '');
            }
            return locationName;
          }))] as string[];
          // Add "Add Custom Location" at the beginning
          setLocations(['Add Custom Location', ...uniqueLocations]);
        }
      } catch (error) {
        // Keep default "Add Custom Location" if fetch fails
        setLocations(['Add Custom Location']);
      }
    };

    fetchLocations();
  }, []);

  // Fetch available dates for a specific location
  const fetchAvailableDatesForLocation = async (locationName: string) => {
    try {
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
        
        // Convert date strings to Date objects
        const dates = locationAvailabilities.map((item: any) => new Date(item.date));
        setAvailableDates(dates);
      }
    } catch (error) {
      setAvailableDates([]);
    }
  };

  // Check if a date should be disabled (not available for the selected location)
  const isDateDisabled = (date: Date) => {
    // First, check if date meets minimum lead time requirement (including weekends)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysRequired = formData.eventType === 'simple' ? 7 : 30;
    const days = calculateWorkingDays(today, date);
    
    // Disable if doesn't meet minimum lead time
    if (days < daysRequired) {
      return true;
    }
    
    // Then check location availability
    if (availableDates.length === 0) {
      return false; // If no available dates loaded yet, don't disable any dates
    }
    
    // Check if the date is in the available dates list
    return !availableDates.some(availableDate => 
      availableDate.toDateString() === date.toDateString()
    );
  };

  // Auto-check for venue conflicts when schedule changes in modal
  useEffect(() => {
    const checkConflicts = async () => {
      
      if (formData.startDate && formData.location && showScheduleModal) {
        
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
          
          
          // Filter events that are on the same date (ALL locations for requirement conflicts)
          const conflicts = events.filter((event: any) => {
            if (!event.startDate || !event.location || !formData.startDate) return false;
            
            // Only check approved or submitted events
            if (event.status !== 'approved' && event.status !== 'submitted') return false;
            
            // Must have time information for requirement conflict checking
            if (!event.startTime || !event.endTime) return false;
            
            const eventStartDate = new Date(event.startDate);
            const selectedDate = formData.startDate;
            
            // Check if dates match (same day) - include ALL locations for requirement checking
            return eventStartDate.toDateString() === selectedDate.toDateString();
          });
          
          setConflictingEvents(conflicts);
        }
      } else {
        if (!showScheduleModal) {
          // Clear conflicts when modal is closed
          setConflictingEvents([]);
        }
      }
    };

    // Debounce the conflict checking to avoid too many API calls
    const timeoutId = setTimeout(checkConflicts, 300);
    return () => clearTimeout(timeoutId);
  }, [formData.startDate, formData.location, showScheduleModal]);

  const handleInputChange = (field: keyof FormData, value: string | boolean | File[] | string[] | DepartmentRequirements | Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLocationChange = async (value: string) => {
    if (value === 'Add Custom Location') {
      setShowCustomLocation(true);
      handleInputChange('location', '');
      handleInputChange('locations', []);
      setAvailableDates([]); // Clear available dates
    } else {
      setShowCustomLocation(false);
      handleInputChange('location', value);
      // Initialize locations array with the selected location
      handleInputChange('locations', [value]);
      
      // Fetch available dates for the selected location
      await fetchAvailableDatesForLocation(value);
      
      // Open schedule modal when a location is selected
      setSelectedLocation(value);
      setShowScheduleModal(true);
    }
  };

  // Add additional conference room to locations array
  const handleAddConferenceRoom = async (roomNumber: 1 | 2 | 3) => {
    const roomName = `4th Flr. Conference Room ${roomNumber}`;
    if (!formData.locations.includes(roomName)) {
      // Fetch availability for the new conference room
      await fetchAvailableDatesForLocation(roomName);
      
      const updatedLocations = [...formData.locations, roomName];
      handleInputChange('locations', updatedLocations);
      handleInputChange('multipleLocations', true);
      toast.success(`${roomName} added to your booking`);
      
      // Note: All conference rooms share the same availability since they're in the same building
      console.log(`Added ${roomName} - using same availability as other conference rooms`);
    }
  };

  // Remove conference room from locations array
  const handleRemoveConferenceRoom = (roomName: string) => {
    const updatedLocations = formData.locations.filter(loc => loc !== roomName);
    handleInputChange('locations', updatedLocations);
    if (updatedLocations.length <= 1) {
      handleInputChange('multipleLocations', false);
    }
    toast.success(`${roomName} removed from your booking`);
  };

  const handleScheduleSave = async () => {
    console.log('🎯 === HANDLE SCHEDULE SAVE CALLED ===');
    console.log('📍 selectedDepartment:', selectedDepartment);
    console.log('📅 formData.startDate:', formData.startDate);
    console.log('🏷️ formData.taggedDepartments:', formData.taggedDepartments);
    
    // Check for venue conflicts before saving (location-specific)
    if (formData.startDate && formData.startTime && formData.endTime && formData.location) {
      const conflicts = await fetchVenueConflicts(
        formData.startDate, 
        formData.startTime, 
        formData.endTime, 
        formData.location
      );
      
      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map((event: any) => 
          `"${event.eventTitle}" (${new Date(event.startDate).toDateString()} ${formatTime(event.startTime)}-${formatTime(event.endTime)})`
        ).join(', ');
        
        toast.error(`Venue conflict detected! ${formData.location} is already booked during ${formData.startDate?.toDateString()} ${formatTime(formData.startTime)}-${formatTime(formData.endTime)}`, {
          description: `Conflicting events at this venue: ${conflictDetails}`,
          duration: 8000,
        });
        return; // Don't close modal if there are conflicts
      }
    }
    
    // Refresh resource availabilities for selected department or all tagged departments
    if (formData.startDate && (selectedDepartment || formData.taggedDepartments.length > 0)) {
      const updatedRequirements = { ...formData.departmentRequirements };
      
      // Determine which departments to refresh
      const depsToRefresh = selectedDepartment 
        ? [selectedDepartment] 
        : formData.taggedDepartments;
      
      console.log('🔄 Departments to refresh:', depsToRefresh);
      
      for (const deptName of depsToRefresh) {
        console.log(`📦 Fetching availabilities for ${deptName} on ${formData.startDate.toDateString()}`);
        const availabilities = await fetchResourceAvailabilities(deptName, formData.startDate);
        console.log(`✅ Got ${availabilities.length} availabilities for ${deptName}`);
        
        const department = departments.find(dept => dept.name === deptName);
        
        if (department && department.requirements) {
          // If requirements don't exist yet, create them from department requirements
          if (!updatedRequirements[deptName] || updatedRequirements[deptName].length === 0) {
            console.log(`📝 Creating new requirements array for ${deptName}`);
            updatedRequirements[deptName] = department.requirements
              .filter((req) => {
                const availability = availabilities.find((avail: any) => avail.requirementId === req._id);
                return availability !== undefined;
              })
              .map((req) => {
                const availability = availabilities.find((avail: any) => avail.requirementId === req._id);
                return {
                  id: req._id,
                  name: req.text,
                  selected: false,
                  notes: '',
                  type: req.type,
                  totalQuantity: availability?.quantity || req.totalQuantity || 1,
                  quantity: availability?.quantity || req.totalQuantity || 1,
                  isAvailable: availability?.isAvailable || false,
                  responsiblePerson: req.responsiblePerson || '',
                  availabilityNotes: availability?.notes || ''
                };
              });
          } else {
            // Update existing requirements
            updatedRequirements[deptName] = updatedRequirements[deptName].map(req => {
              const availability = availabilities.find((avail: any) => avail.requirementId === req.id);
              return {
                ...req,
                totalQuantity: availability ? availability.quantity : department.requirements.find(deptReq => deptReq._id === req.id)?.totalQuantity || req.totalQuantity,
                isAvailable: availability ? availability.isAvailable : department.requirements.find(deptReq => deptReq._id === req.id)?.isAvailable || req.isAvailable,
                availabilityNotes: availability ? availability.notes : ''
              };
            });
          }
          console.log(`✅ Updated requirements for ${deptName}:`, updatedRequirements[deptName]);
        }
      }
      
      // Save the selected department before any modal operations
      const deptToRefresh = selectedDepartment;
      
      console.log('💾 Selected department before refresh:', deptToRefresh);
      
      // Update form data with new requirements
      setFormData(prev => ({
        ...prev,
        departmentRequirements: updatedRequirements
      }));
      
      // If there's a selected department (from "Use This Date" flow), re-trigger department selection
      if (deptToRefresh) {
        console.log('🔄 Re-triggering department selection for:', deptToRefresh);
        
        // Close modal first
        setShowRequirementsModal(false);
        
        // Wait longer for state to fully update, then automatically "click" the department checkbox again
        setTimeout(async () => {
          console.log('🔄 Auto-clicking department checkbox for:', deptToRefresh);
          await handleDepartmentToggle(deptToRefresh);
          toast.success('Schedule saved! Requirements updated with conflicts.');
        }, 800);
      }
    }
    
    setShowScheduleModal(false);
    setSelectedLocation('');
  };

  const handleWithoutGovChange = (checked: boolean) => {
    handleInputChange('withoutGov', checked);
    if (checked) {
      setShowGovModal(true);
    }
  };

  const handleGovFileUpload = (fileType: 'brieferTemplate' | 'availableForDL' | 'programme', file: File | null) => {
    setGovFiles(prev => ({
      ...prev,
      [fileType]: file
    }));
  };

  // Fetch resource availabilities for a specific department and date
  const fetchResourceAvailabilities = async (departmentName: string, date: Date) => {
    if (!date) {
      return [];
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const department = departments.find(dept => dept.name === departmentName);
      
      if (!department) {
        return [];
      }
      
      // Fix timezone issue - use local date instead of UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const apiUrl = `${API_BASE_URL}/resource-availability/department/${department._id}/availability?startDate=${dateStr}&endDate=${dateStr}`;
      
      const response = await axios.get(apiUrl,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      
      return response.data || [];
    } catch (error) {
      return [];
    }
  };

  const handleDepartmentToggle = async (departmentName: string) => {
    try {
    
    // If department is being selected, open requirements modal
    if (!formData.taggedDepartments.includes(departmentName)) {
      setSelectedDepartment(departmentName);
      
      // Fetch conflicting events if date and time are set
      if (formData.startDate && formData.startTime && formData.endTime) {
        await fetchConflictingEvents(formData.startDate, formData.startTime, formData.endTime, formData.location);
      }
      
      // Fetch resource availabilities for the selected date
      let availabilities: any[] = [];
      if (formData.startDate) {
        availabilities = await fetchResourceAvailabilities(departmentName, formData.startDate);
      }
      
      setShowRequirementsModal(true);
      
      // Find the department and use its requirements
      const department = departments.find(dept => dept.name === departmentName);
      if (department && department.requirements && availabilities.length > 0) {
        // Only show requirements that have availability data for this specific date
        const dbRequirements = department.requirements
          .filter((req) => {
            // Only include requirements that have availability data for this date
            const availability = availabilities.find((avail: any) => 
              avail.requirementId === req._id
            );
            return availability !== undefined;
          })
          .map((req) => {
            // Find matching resource availability for this requirement and date
            const availability = availabilities.find((avail: any) => 
              avail.requirementId === req._id
            );
            
            
            return {
              id: req._id,
              name: req.text,
              selected: false,
              notes: '',
              type: req.type,
              totalQuantity: availability.quantity, // Use actual availability quantity
              isAvailable: availability.isAvailable,
              responsiblePerson: req.responsiblePerson,
              availabilityNotes: availability.notes || ''
            };
          });

        // Initialize requirements for this department
        const newRequirements = { ...formData.departmentRequirements };
        newRequirements[departmentName] = dbRequirements;
        handleInputChange('departmentRequirements', newRequirements);
        
      } else {
        // No requirements found or no availability data for this date
        const newRequirements = { ...formData.departmentRequirements };
        newRequirements[departmentName] = [];
        handleInputChange('departmentRequirements', newRequirements);
        
      }
    } else {
      // If unchecking, remove from tagged departments
      const updatedDepartments = formData.taggedDepartments.filter(d => d !== departmentName);
      handleInputChange('taggedDepartments', updatedDepartments);
    }
    } catch (error) {
      // Handle error silently
    }
  };

  // Fetch available dates for a department
  const fetchAvailableDates = async (departmentName: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const department = departments.find(dept => dept.name === departmentName);
      
      if (!department) {
        return [];
      }

      const response = await axios.get(
        `${API_BASE_URL}/resource-availability/department/${department._id}/all-dates`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data || [];
    } catch (error) {
      return [];
    }
  };

  const handleViewAvailableDates = async (departmentName: string) => {
    const dates = await fetchAvailableDates(departmentName);
    setDepartmentAvailableDates(dates);
    setShowAvailableDatesModal(true);
  };

  const handleRequirementToggle = (requirementId: string) => {
    const currentReqs = formData.departmentRequirements[selectedDepartment] || [];
    const updatedReqs = currentReqs.map(req => 
      req.id === requirementId ? { ...req, selected: !req.selected } : req
    );
    
    const newDeptReqs = { ...formData.departmentRequirements };
    newDeptReqs[selectedDepartment] = updatedReqs;
    handleInputChange('departmentRequirements', newDeptReqs);
  };

  const handleRequirementNotes = (requirementId: string, notes: string) => {
    const currentReqs = formData.departmentRequirements[selectedDepartment] || [];
    const updatedReqs = currentReqs.map(req => 
      req.id === requirementId ? { ...req, notes } : req
    );
    
    const newDeptReqs = { ...formData.departmentRequirements };
    newDeptReqs[selectedDepartment] = updatedReqs;
    handleInputChange('departmentRequirements', newDeptReqs);
  };

  const handleRequirementQuantity = (requirementId: string, quantity: number) => {
    const currentReqs = formData.departmentRequirements[selectedDepartment] || [];
    const updatedReqs = currentReqs.map(req => 
      req.id === requirementId ? { ...req, quantity } : req
    );
    
    const newDeptReqs = { ...formData.departmentRequirements };
    newDeptReqs[selectedDepartment] = updatedReqs;
    handleInputChange('departmentRequirements', newDeptReqs);
  };

  const handleAddCustomRequirement = () => {
    if (customRequirement.trim()) {
      const currentReqs = formData.departmentRequirements[selectedDepartment] || [];
      const newId = `${selectedDepartment.toLowerCase().replace(/\s+/g, '-')}-custom-${Date.now()}`;
      const newRequirement: DepartmentRequirement = {
        id: newId,
        name: customRequirement.trim(),
        selected: true,
        notes: '',
        type: customRequirementType, // Use selected type (physical or service)
        quantity: customRequirementType === 'physical' ? 1 : undefined, // Default quantity for physical items
        isCustom: true // Flag to identify custom requirements - status will default to 'For Validation'
      };
      
      const updatedReqs = [...currentReqs, newRequirement];
      const newDeptReqs = { ...formData.departmentRequirements };
      newDeptReqs[selectedDepartment] = updatedReqs;
      handleInputChange('departmentRequirements', newDeptReqs);
      
      setCustomRequirement('');
      setCustomRequirementType('service'); // Reset to default
      toast.success(`Custom ${customRequirementType === 'physical' ? 'quantity-based' : 'service'} requirement added - awaiting department validation`);
    }
  };

  const handleSaveRequirements = () => {
    // Check if at least one requirement is selected
    const selectedReqs = formData.departmentRequirements[selectedDepartment]?.filter(req => req.selected) || [];
    
    if (selectedReqs.length === 0) {
      toast.error('Please select at least one requirement for this department.');
      return;
    }

    // Check if physical requirements have quantity specified
    const physicalReqsWithoutQuantity = selectedReqs.filter(req => 
      req.type === 'physical' && (!req.quantity || req.quantity === 0)
    );
    
    if (physicalReqsWithoutQuantity.length > 0) {
      const reqNames = physicalReqsWithoutQuantity.map(req => req.name).join(', ');
      toast.error('Missing Quantity!', {
        description: `Please specify quantity for: ${reqNames}`,
        duration: 5000
      });
      return;
    }

    // Check for quantity over-requests (considering conflicts)
    const overRequests = selectedReqs.filter(req => {
      if (req.type !== 'physical' || !req.quantity) return false;
      
      // If there are conflicts and we have schedule info, check against available quantity
      if (conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
          hasRequirementConflict(req, selectedDepartment)) {
        const availableQty = getAvailableQuantity(req, selectedDepartment);
        return req.quantity > availableQty;
      }
      
      // Otherwise check against total quantity
      return req.totalQuantity && req.quantity > req.totalQuantity;
    });
    
    if (overRequests.length > 0) {
      const overRequestDetails = overRequests.map(req => {
        const availableQty = conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
                            hasRequirementConflict(req, selectedDepartment)
          ? getAvailableQuantity(req, selectedDepartment)
          : req.totalQuantity || 0;
        
        return `${req.name} (requested: ${req.quantity}, available: ${availableQty})`;
      });
      
      toast.error(`Cannot save! Requested quantities exceed available resources:`, {
        description: overRequestDetails.join(', '),
        duration: 8000
      });
      return; // Prevent saving when quantities exceed available
    }

    // Add department to tagged list if not already added
    if (!formData.taggedDepartments.includes(selectedDepartment)) {
      const updatedDepartments = [...formData.taggedDepartments, selectedDepartment];
      handleInputChange('taggedDepartments', updatedDepartments);
    }
    
    // Close modal
    setShowRequirementsModal(false);
    
    const requirementCount = selectedReqs.length;
    const physicalCount = selectedReqs.filter(req => req.type === 'physical' && req.quantity).length;
    const notesCount = selectedReqs.filter(req => req.type === 'service' && req.notes && req.notes.trim()).length;
    
    const details = [];
    if (physicalCount > 0) details.push(`${physicalCount} with quantities`);
    if (notesCount > 0) details.push(`${notesCount} with notes`);
    
    toast.success(`Requirements saved for ${selectedDepartment}!`, {
      description: `${requirementCount} requirement(s) selected${details.length > 0 ? ` (${details.join(', ')})` : ''}.`
    });
  };

  // Check if departments have requirements added
  const hasRequirementsForDepartments = () => {
    return formData.taggedDepartments.some(dept => {
      const deptReqs = formData.departmentRequirements[dept];
      return deptReqs && deptReqs.some(req => req.selected);
    });
  };

  // Check if any physical requirements exceed available quantity
  const hasQuantityOverRequests = () => {
    return formData.taggedDepartments.some(dept => {
      const deptReqs = formData.departmentRequirements[dept];
      return deptReqs && deptReqs.some(req => 
        req.selected && 
        req.type === 'physical' && 
        req.quantity && 
        req.totalQuantity && 
        req.quantity > req.totalQuantity
      );
    });
  };

  // Check if two time ranges overlap
  const hasTimeConflict = (start1: string, end1: string, start2: string, end2: string, date1: Date, date2: Date) => {
    // First check if dates are the same
    if (date1.toDateString() !== date2.toDateString()) {
      return false;
    }
    
    // Convert time strings to minutes for easier comparison
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const start1Minutes = timeToMinutes(start1);
    const end1Minutes = timeToMinutes(end1);
    const start2Minutes = timeToMinutes(start2);
    const end2Minutes = timeToMinutes(end2);
    
    // Check if time ranges overlap
    return start1Minutes < end2Minutes && start2Minutes < end1Minutes;
  };

  // Fetch conflicting events for venue booking (location-specific conflicts)
  const fetchVenueConflicts = async (date: Date, startTime: string, endTime: string, location: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const eventsData = await response.json();
      const events = eventsData.data || [];
      
      // Helper function to check if two locations conflict (Pavilion & Conference Room hierarchy)
      const locationsConflict = (loc1: string, loc2: string): boolean => {
        // Exact match
        if (loc1 === loc2) return true;
         
        // Check Pavilion hierarchy
        const isPavilion1 = loc1.includes('Pavilion');
        const isPavilion2 = loc2.includes('Pavilion');
        
        if (isPavilion1 && isPavilion2) {
          // Extract hall name (Kagitingan or Kalayaan)
          const getHall = (loc: string) => {
            if (loc.includes('Kagitingan')) return 'Kagitingan';
            if (loc.includes('Kalayaan')) return 'Kalayaan';
            return null;
          };
          
          const hall1 = getHall(loc1);
          const hall2 = getHall(loc2);
          
          // Different halls don't conflict
          if (hall1 !== hall2) return false;
          
          // Same hall - check if one is "Entire" or both are sections
          const isEntire1 = loc1.includes('(Entire)');
          const isEntire2 = loc2.includes('(Entire)');
          
          // If either is "Entire", they conflict
          if (isEntire1 || isEntire2) return true;
          
          // Both are sections - only conflict if same section
          return loc1 === loc2;
        }
        
        // Check Conference Room hierarchy (4th Conference Room 1, 2, 3)
        const isConferenceRoom1 = loc1.includes('Conference Room');
        const isConferenceRoom2 = loc2.includes('Conference Room');
        
        if (isConferenceRoom1 && isConferenceRoom2) {
          // Extract the base conference room name (e.g., "4th Conference Room")
          const getBaseRoom = (loc: string) => {
            // Match patterns like "4th Conference Room 1", "4th Conference Room 2", etc.
            const match = loc.match(/(.+Conference Room)\s*\d+/);
            if (match) return match[1].trim();
            // If no number, it might be the entire room
            return loc.trim();
          };
          
          const baseRoom1 = getBaseRoom(loc1);
          const baseRoom2 = getBaseRoom(loc2);
          
          // Different conference rooms don't conflict
          if (baseRoom1 !== baseRoom2) return false;
          
          // Same base room - they conflict (e.g., "4th Conference Room 1" conflicts with "4th Conference Room 2")
          return true;
        }
        
        return false;
      };
      
      // Filter events that conflict with the selected time AND location (for venue booking)
      const conflicts = events.filter((event: any) => {
        if (!event.startDate || !event.startTime || !event.endDate || !event.endTime) {
          return false;
        }
        
        // Check if locations conflict (handles Pavilion hierarchy)
        if (!locationsConflict(event.location, location)) {
          return false;
        }
        
        const eventStartDate = new Date(event.startDate);
        
        // Check if there's a time conflict at the same venue
        const hasConflict = hasTimeConflict(
          startTime, endTime,
          event.startTime, event.endTime,
          date, eventStartDate
        );
        
        
        return hasConflict;
      });
      
      return conflicts;
    } catch (error) {
      return [];
    }
  };

  // Fetch conflicting events for resource availability checking (across ALL locations)
  const fetchConflictingEvents = async (date: Date, startTime: string, endTime: string, location?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const eventsData = await response.json();
      const events = eventsData.data || [];
      
      // Filter events that conflict with the selected time
      const conflicts = events.filter((event: any) => {
        if (!event.startDate || !event.startTime || !event.endDate || !event.endTime) {
          return false;
        }
        
        const eventStartDate = new Date(event.startDate);
        
        // Check if there's a time conflict (regardless of location for resource conflicts)
        const hasConflict = hasTimeConflict(
          startTime, endTime,
          event.startTime, event.endTime,
          date, eventStartDate
        );
        
        
        return hasConflict;
      });
      
      setConflictingEvents(conflicts);
      return conflicts;
    } catch (error) {
      setConflictingEvents([]);
      return [];
    }
  };

  // Calculate available quantity after subtracting conflicting bookings from ALL departments
  const getAvailableQuantity = (requirement: any, departmentName: string) => {
    let usedQuantity = 0;
    
    
    conflictingEvents.forEach(event => {
      // Check ALL departments in the event, not just the current department
      if (event.taggedDepartments && event.departmentRequirements) {
        event.taggedDepartments.forEach((taggedDept: string) => {
          const eventReqs = event.departmentRequirements[taggedDept];
          if (Array.isArray(eventReqs)) {
            const matchingReq = eventReqs.find((req: any) => 
              req.name === requirement.name && req.selected && req.quantity
            );
            if (matchingReq) {
              usedQuantity += matchingReq.quantity || 0;
            }
          }
        });
      }
    });
    
    // Use the totalQuantity from the requirement object (which now contains the actual availability data)
    // This should be the updated quantity from resourceavailabilities collection (200) not the default (100)
    const totalAvailable = requirement.totalQuantity || 0;
    const availableQuantity = Math.max(0, totalAvailable - usedQuantity);
    
    
    return availableQuantity;
  };

  // Check if a specific requirement has conflicts (is actually booked by other events from ANY department)
  const hasRequirementConflict = (requirement: any, departmentName: string) => {
    return conflictingEvents.some(event => {
      // Check ALL departments in the event, not just the current department
      if (event.taggedDepartments && event.departmentRequirements) {
        return event.taggedDepartments.some((taggedDept: string) => {
          const eventReqs = event.departmentRequirements[taggedDept];
          if (Array.isArray(eventReqs)) {
            return eventReqs.some((req: any) => 
              req.name === requirement.name && req.selected && req.quantity
            );
          }
          return false;
        });
      }
      return false;
    });
  };

  // Check if form is ready to submit (all validation passes)
  const isFormReadyToSubmit = () => {
    return (
      formData.eventTitle &&
      formData.requestor &&
      formData.location &&
      formData.participants &&
      formData.startDate &&
      formData.startTime &&
      formData.endDate &&
      formData.endTime &&
      formData.contactNumber &&
      formData.contactEmail &&
      formData.contactNumber.length === 11 &&
      formData.contactEmail.includes('@') &&
      formData.taggedDepartments.length > 0 &&
      hasRequirementsForDepartments() &&
      !hasQuantityOverRequests()  // Prevent submission if quantities exceed available
    );
  };

  // Calculate completed steps count
  const getCompletedStepsCount = () => {
    let completedCount = 0;
    
    // Step 1: Event Details
    if (formData.eventTitle && formData.requestor && formData.location && formData.participants) {
      completedCount++;
    }
    
    // Step 2: Attachments
    if (isAttachmentsCompleted) {
      completedCount++;
    }
    
    // Step 3: Tag Departments
    if (formData.taggedDepartments.length > 0) {
      completedCount++;
    }
    
    // Step 4: Requirements
    if (hasRequirementsForDepartments()) {
      completedCount++;
    }
    
    // Step 5: Schedule
    if (formData.startDate && formData.startTime && formData.endDate && formData.endTime && 
        formData.contactNumber && formData.contactEmail && 
        formData.contactNumber.length === 11 && formData.contactEmail.includes('@')) {
      completedCount++;
    }
    
    // Step 6: Ready to Submit
    if (isFormReadyToSubmit()) {
      completedCount++;
    }
    
    return completedCount;
  };

  // Handle final form submission
  const handleSubmitEventRequest = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    let uploadToastId: string | undefined = undefined;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please login to submit an event request.');
        setIsSubmitting(false);
        return;
      }

      // Prepare form data for submission
      const formDataToSubmit = new FormData();
      
      // Basic event information
      formDataToSubmit.append('eventTitle', formData.eventTitle);
      formDataToSubmit.append('requestor', formData.requestor);
      
      // Location handling: single location uses 'location', multiple uses 'locations' array
      if (formData.locations.length > 1) {
        // Multiple conference rooms - send as locations array
        formDataToSubmit.append('locations', JSON.stringify(formData.locations));
        formDataToSubmit.append('location', formData.locations[0]);
        formDataToSubmit.append('multipleLocations', 'true');
      } else {
        // Single location - use default location field
        formDataToSubmit.append('location', formData.location);
        formDataToSubmit.append('multipleLocations', 'false');
      }
      
      formDataToSubmit.append('participants', formData.participants);
      formDataToSubmit.append('vip', formData.vip || '0');
      formDataToSubmit.append('vvip', formData.vvip || '0');
      formDataToSubmit.append('withoutGov', formData.withoutGov.toString());
      formDataToSubmit.append('description', formData.description || '');
      formDataToSubmit.append('eventType', formData.eventType);
      
      // Schedule information - Use date-only format to avoid timezone issues
      const formatDateOnly = (date: Date | null | undefined) => {
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      formDataToSubmit.append('startDate', formatDateOnly(formData.startDate));
      formDataToSubmit.append('startTime', formData.startTime);
      formDataToSubmit.append('endDate', formatDateOnly(formData.endDate));
      formDataToSubmit.append('endTime', formData.endTime);
      
      // Contact information
      formDataToSubmit.append('contactNumber', formData.contactNumber);
      formDataToSubmit.append('contactEmail', formData.contactEmail);
      
      // Add current user's department information
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const userDepartment = user.department || user.departmentName || 'Unknown';
          formDataToSubmit.append('requestorDepartment', userDepartment);
        } catch (error) {
          formDataToSubmit.append('requestorDepartment', 'Unknown');
        }
      } else {
        formDataToSubmit.append('requestorDepartment', 'Unknown');
      }
      
      // Department and requirements information
      formDataToSubmit.append('taggedDepartments', JSON.stringify(formData.taggedDepartments));
      
      // Filter to only include SELECTED requirements for each department
      // Add requirementsStatus: 'on-hold' to all requirements (will be released when admin approves)
      const selectedRequirementsOnly: DepartmentRequirements = {};
      Object.keys(formData.departmentRequirements).forEach(deptName => {
        const selectedReqs = formData.departmentRequirements[deptName]?.filter(req => req.selected) || [];
        if (selectedReqs.length > 0) {
          // Add 'on-hold' status to each requirement
          selectedRequirementsOnly[deptName] = selectedReqs.map(req => ({
            ...req,
            requirementsStatus: 'on-hold' // Requirements are on-hold until admin approves the event
          }));
        }
      });
      
      formDataToSubmit.append('departmentRequirements', JSON.stringify(selectedRequirementsOnly));
      
      // File attachments
      formDataToSubmit.append('noAttachments', formData.noAttachments.toString());
      formData.attachments.forEach((file) => {
        formDataToSubmit.append('attachments', file);
      });
      
      // Government files (if w/o gov is true)
      if (formData.withoutGov && govFiles.brieferTemplate) {
        formDataToSubmit.append('brieferTemplate', govFiles.brieferTemplate);
      }
      if (formData.withoutGov && govFiles.programme) {
        formDataToSubmit.append('programme', govFiles.programme);
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      };

      console.log('📤 [EVENT SUBMISSION] Submitting event request...');
      
      // Show initial loading toast with unique ID
      uploadToastId = `upload-${Date.now()}`;
      toast.loading('Submitting event request...', {
        id: uploadToastId,
        description: 'Preparing your submission... 0%',
        duration: Infinity, // Keep toast until we dismiss it
      });
      
      // Add timeout for large file uploads (5 minutes)
      const response = await axios.post(`${API_BASE_URL}/events`, formDataToSubmit, { 
        headers,
        timeout: 300000, // 5 minutes timeout
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📤 Upload progress: ${percentCompleted}%`);
            
            // Update the SAME toast with new progress
            toast.loading('Submitting event request...', {
              id: uploadToastId,
              description: `Upload progress: ${percentCompleted}%`,
              duration: Infinity,
            });
          }
        }
      });
      
      // Dismiss loading toast after upload completes
      toast.dismiss(uploadToastId);

      console.log('✅ [EVENT SUBMISSION] Response received:', response.data);

      if (response.data.success) {
        toast.success('Event request submitted successfully!', {
          description: 'Your event request has been sent for approval.'
        });
        
        // Navigate to My Events page after successful submission
        setTimeout(() => {
          navigate('/users/my-events');
        }, 1500); // Wait 1.5 seconds to show the success toast
      } else {
        throw new Error(response.data.message || 'Submission failed');
      }
    } catch (error: any) {
      console.error('❌ [EVENT SUBMISSION] Error:', error);
      
      // Dismiss loading toast if it exists
      if (uploadToastId) {
        toast.dismiss(uploadToastId);
      }
      
      let errorMessage = 'Please try again later.';
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Request timeout. Your files might be too large. Please try with smaller files or check your internet connection.';
      } else if (error.response?.status === 413) {
        errorMessage = 'Files are too large. Please reduce file sizes and try again.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error('Failed to submit event request', {
        description: errorMessage
      });
    } finally {
      // Always reset submitting state
      setIsSubmitting(false);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(departmentSearch.toLowerCase())
  );

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      return validTypes.includes(file.type) && file.size <= maxSize;
    });
    
    handleInputChange('attachments', [...formData.attachments, ...validFiles]);
  };

  const removeFile = (index: number) => {
    const newAttachments = formData.attachments.filter((_, i) => i !== index);
    handleInputChange('attachments', newAttachments);
  };


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

  // Helper function to check if two locations conflict (Pavilion & Conference Room hierarchy)
  const locationsConflict = (loc1: string, loc2: string): boolean => {
    // Exact match - always conflicts
    if (loc1 === loc2) return true;
    
    // Check if both are Conference Rooms
    const isConferenceRoom1 = loc1.includes('Conference Room');
    const isConferenceRoom2 = loc2.includes('Conference Room');
    
    // Conference Rooms only conflict if they're the exact same room
    if (isConferenceRoom1 && isConferenceRoom2) {
      return loc1 === loc2;
    }
    
    // Check Pavilion hierarchy
    const isPavilion1 = loc1.includes('Pavilion');
    const isPavilion2 = loc2.includes('Pavilion');
    
    if (isPavilion1 && isPavilion2) {
      // Extract hall name (Kagitingan or Kalayaan)
      const getHall = (loc: string) => {
        if (loc.includes('Kagitingan')) return 'Kagitingan';
        if (loc.includes('Kalayaan')) return 'Kalayaan';
        return null;
      };
      
      const hall1 = getHall(loc1);
      const hall2 = getHall(loc2);
      
      // Different halls don't conflict
      if (hall1 !== hall2) return false;
      
      // Same hall - check if one is "Entire" or both are sections
      const isEntire1 = loc1.includes('(Entire)');
      const isEntire2 = loc2.includes('(Entire)');
      
      // If either is "Entire", they conflict
      if (isEntire1 || isEntire2) return true;
      
      // Both are sections - only conflict if same section
      return loc1 === loc2;
    }
    
    // Different location types don't conflict
    return false;
  };

  // Check if a specific time slot is booked for the selected location and date
  const isTimeSlotBooked = (timeSlot: string) => {
    if (!formData.startDate || !formData.location || conflictingEvents.length === 0) {
      return false;
    }

    return conflictingEvents.some(event => {
      // Check if current user's location conflicts with ANY of the event's locations
      // Event might have multiple locations (locations array) or single location
      const eventLocations = event.locations && Array.isArray(event.locations) && event.locations.length > 0
        ? event.locations
        : [event.location];
      
      // Check if formData.location conflicts with ANY of the event's locations
      const hasLocationConflict = eventLocations.some((eventLoc: string) => 
        locationsConflict(eventLoc, formData.location)
      );
      
      if (!hasLocationConflict) return false;
      
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

  // Check if a specific time slot has requirement conflicts (any requirements used by existing events)
  const hasRequirementConflictAtTime = (timeSlot: string) => {
    // Only need startDate and conflictingEvents - location can be custom
    if (!formData.startDate || conflictingEvents.length === 0) {
      return { hasConflict: false, conflictedRequirements: [] };
    }

    const conflictedRequirements: string[] = [];

    // Check each conflicting event to see if it uses any requirements at this time slot
    conflictingEvents.forEach(event => {
      // Skip if event doesn't have time information
      if (!event.startTime || !event.endTime) {
        return;
      }
      
      // Convert times to minutes for easier comparison
      const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const slotMinutes = timeToMinutes(timeSlot);
      const eventStartMinutes = timeToMinutes(event.startTime);
      const eventEndMinutes = timeToMinutes(event.endTime);
      
      // Check if this time slot overlaps with the event
      const timeOverlaps = slotMinutes >= eventStartMinutes && slotMinutes <= eventEndMinutes;
      
      if (!timeOverlaps) {
        return;
      }

      // Check if this event uses ANY requirements
      if (event.taggedDepartments && Array.isArray(event.taggedDepartments) && event.departmentRequirements) {
        event.taggedDepartments.forEach((dept: string) => {
          const deptReqs = event.departmentRequirements[dept] || [];
          if (Array.isArray(deptReqs)) {
            deptReqs.forEach((eventReq: any) => {
              // Check if requirement is selected and has quantity
              const isSelected = eventReq.selected === true;
              // Check both quantity and totalQuantity fields
              const quantity = eventReq.quantity || eventReq.totalQuantity || 0;
              const hasQuantity = quantity > 0;
              
              if (isSelected && hasQuantity && eventReq.name) {
                const reqName = `${eventReq.name} (${dept})`;
                if (!conflictedRequirements.includes(reqName)) {
                  conflictedRequirements.push(reqName);
                }
              }
            });
          }
        });
      }
    });

    const result = { 
      hasConflict: conflictedRequirements.length > 0, 
      conflictedRequirements 
    };
    
    return result;
  };

  // Get available end times based on selected start time
  const getAvailableEndTimes = () => {
    if (!formData.startTime) return generateTimeOptions();
    
    const timeToMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = timeToMinutes(formData.startTime);
    
    return generateTimeOptions().filter(timeOption => {
      const optionMinutes = timeToMinutes(timeOption.value);
      // End time must be after start time
      return optionMinutes > startMinutes;
    });
  };

  const calculateDuration = (startDate: Date, startTime: string, endDate: Date, endTime: string): string => {
    if (!startDate || !startTime || !endDate || !endTime) return '';
    
    const start = new Date(startDate);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    start.setHours(startHours, startMinutes);
    
    const end = new Date(endDate);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    end.setHours(endHours, endMinutes);
    
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  // Calculate calendar days between two dates (including weekends)
  const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Validate minimum lead time based on event type
  const validateLeadTime = (selectedDate: Date): { isValid: boolean; message: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysRequired = formData.eventType === 'simple' ? 7 : 30;
    const days = calculateWorkingDays(today, selectedDate);
    
    if (days < daysRequired) {
      return {
        isValid: false,
        message: `${formData.eventType === 'simple' ? 'Simple' : 'Complex'} events require at least ${daysRequired} days lead time. You have ${days} days.`
      };
    }
    
    return { isValid: true, message: '' };
  };

  // Validate contact details
  const validateContactDetails = () => {
    const errors = [];
    
    if (!formData.contactNumber) {
      errors.push('Contact number is required');
    } else if (formData.contactNumber.length !== 11) {
      errors.push('Contact number must be 11 digits');
    } else if (!formData.contactNumber.startsWith('09')) {
      errors.push('Contact number must start with 09');
    }
    
    if (!formData.contactEmail) {
      errors.push('Email address is required');
    } else if (!formData.contactEmail.includes('@')) {
      errors.push('Please enter a valid email address');
    }
    
    return errors;
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Request Event</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Create a new event request</p>
        </div>
        <Badge variant="outline" className="text-xs whitespace-nowrap">
          Step {currentStep} of {steps.length}
        </Badge>
      </motion.div>

      {/* Modern Progress Stepper */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-3 md:p-4 overflow-x-auto">
          <div className="flex items-center justify-between min-w-max md:min-w-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep || 
                                (step.id === 2 && isAttachmentsCompleted) ||
                                (step.id === 5 && formData.startDate && formData.startTime && formData.endDate && formData.endTime && 
                                 formData.contactNumber && formData.contactEmail && 
                                 formData.contactNumber.length === 11 && formData.contactEmail.includes('@')) ||
                                (step.id === 6 && isFormReadyToSubmit());
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all flex-shrink-0 ${
                      isCompleted 
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : isActive 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-sm font-medium ${
                        isCompleted ? 'text-green-700' : isActive ? 'text-blue-700' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-2 md:mx-4 min-w-[20px] md:min-w-[40px]">
                      <div className="h-px bg-gray-200 relative">
                        <motion.div
                          className="h-full bg-green-400"
                          initial={{ width: '0%' }}
                          animate={{ width: step.id < currentStep ? '100%' : '0%' }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Step 1: Event Details */}
      {currentStep === 1 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6"
        >
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="p-4 md:p-6 pb-3 md:pb-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                    Event Information
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <span className="text-xs md:text-sm text-gray-600 whitespace-nowrap">Event Type:</span>
                    <div className="flex border rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, eventType: 'simple' }))}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          formData.eventType === 'simple'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Simple (7 days)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, eventType: 'complex' }))}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors border-l ${
                          formData.eventType === 'complex'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Complex (30 days)
                      </button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-3 md:space-y-4">
                {/* Row 1: Title */}
                <div>
                  <Label htmlFor="eventTitle" className="text-sm font-medium">Event Title <span className="text-red-500">*</span></Label>
                  <Input
                    id="eventTitle"
                    placeholder="Enter event title"
                    value={formData.eventTitle}
                    onChange={(e) => handleInputChange('eventTitle', e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Row 2: Requestor & Location */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="requestor" className="text-sm font-medium">Requestor <span className="text-red-500">*</span></Label>
                    <Input
                      id="requestor"
                      placeholder="Enter requestor name"
                      value={formData.requestor}
                      onChange={(e) => handleInputChange('requestor', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-sm font-medium">Location <span className="text-red-500">*</span></Label>
                    {!showCustomLocation ? (
                      <div className="flex gap-2">
                        <Select 
                          value={formData.location} 
                          onValueChange={handleLocationChange}
                        >
                          <SelectTrigger className="mt-1 h-9 flex-1 max-w-[calc(100%-3rem)]">
                            <div className="truncate w-full text-left">
                              <SelectValue placeholder="Select location" />
                            </div>
                          </SelectTrigger>
                          <SelectContent className="max-h-80">
                            {locations.map((location) => (
                              <SelectItem 
                                key={location} 
                                value={location}
                                className={location === 'Add Custom Location' ? 'text-blue-600 font-medium' : ''}
                              >
                                <div className="flex items-center gap-2">
                                  {location === 'Add Custom Location' && (
                                    <Plus className="w-3 h-3" />
                                  )}
                                  {location}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.location && formData.location !== 'Add Custom Location' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedLocation(formData.location);
                              setShowScheduleModal(true);
                            }}
                            className="mt-1 h-9 px-3"
                            title="Edit schedule"
                          >
                            <CalendarIcon className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          placeholder="Enter custom location"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          className="mt-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowCustomLocation(false);
                            handleInputChange('location', '');
                          }}
                          className="text-xs"
                        >
                          Choose from list instead
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3: Participants */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="participants" className="text-sm font-medium">Participants <span className="text-red-500">*</span></Label>
                    <Input
                      id="participants"
                      type="number"
                      placeholder="0"
                      min="0"
                      value={formData.participants}
                      onChange={(e) => handleInputChange('participants', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vip" className="text-sm font-medium">VIP (Local)</Label>
                    <Input
                      id="vip"
                      type="number"
                      placeholder="0"
                      min="0"
                      value={formData.vip}
                      onChange={(e) => handleInputChange('vip', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vvip" className="text-sm font-medium">VVIP (Foreign)</Label>
                    <Input
                      id="vvip"
                      type="number"
                      placeholder="0"
                      min="0"
                      value={formData.vvip}
                      onChange={(e) => handleInputChange('vvip', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="withoutGov" className="text-sm font-medium">
                      {formData.withoutGov ? 'w/ Governor' : 'w/o Governor'}
                    </Label>
                    <div className="mt-1 h-10 flex items-center border border-input rounded-md px-3 bg-background">
                      <Switch
                        id="withoutGov"
                        checked={formData.withoutGov}
                        onCheckedChange={handleWithoutGovChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description" className="text-sm font-medium">Description <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="description"
                    placeholder="Enter event description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="mt-1 h-20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Attachments Card */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-blue-600" />
                  Attachments <span className="text-red-500">*</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="mb-2">
                  <p className="text-sm text-gray-600">📎 <strong>Attachments are required</strong> - Please upload at least one file</p>
                </div>

                {
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-gray-300 transition-colors">
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 mb-2">Drop files or click to upload</p>
                      <p className="text-xs text-gray-400 mb-3">PDF, DOC, JPG, PNG (max 10MB)</p>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="fileUpload"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('fileUpload')?.click()}
                      >
                        Choose Files
                      </Button>
                    </div>

                    {formData.attachments.length > 0 && (
                      <div className="space-y-2">
                        {formData.attachments.map((file, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Paperclip className="w-3 h-3 text-gray-500 flex-shrink-0" />
                              <span className="font-medium truncate">{file.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="h-5 w-5 p-0 flex-shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                }
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="secondary" className="text-xs">Draft</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">{getCompletedStepsCount()}/{steps.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Step 3: Tag Departments */}
      {currentStep === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Tag Departments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Input */}
                <div>
                  <Label htmlFor="departmentSearch" className="text-sm font-medium">Search Departments</Label>
                  <Input
                    id="departmentSearch"
                    placeholder="Search for departments..."
                    value={departmentSearch}
                    onChange={(e) => setDepartmentSearch(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Departments List */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Select Departments to Tag</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2 border rounded-lg">
                    {loading ? (
                      <div className="col-span-2 flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-500">Loading departments...</span>
                      </div>
                    ) : filteredDepartments.map((department) => (
                      <motion.div
                        key={department._id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded transition-colors"
                      >
                        <Checkbox
                          id={department._id}
                          checked={formData.taggedDepartments.includes(department.name)}
                          onCheckedChange={() => handleDepartmentToggle(department.name)}
                        />
                        <Label 
                          htmlFor={department._id} 
                          className="text-sm cursor-pointer flex-1"
                        >
                          {department.name}
                        </Label>
                      </motion.div>
                    ))}
                  </div>
                  
                  {!loading && filteredDepartments.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No departments found matching your search.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Departments */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">Selected Departments</CardTitle>
              </CardHeader>
              <CardContent>
                {formData.taggedDepartments.length > 0 ? (
                  <div className={`space-y-2 ${formData.taggedDepartments.length >= 3 ? 'max-h-64 overflow-y-auto pr-2' : ''}`}>
                    {formData.taggedDepartments.map((dept) => {
                      const deptRequirements = formData.departmentRequirements[dept]?.filter(req => req.selected) || [];
                      const notesCount = deptRequirements.filter(req => req.notes && req.notes.trim()).length;
                      
                      return (
                        <motion.div
                          key={dept}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="p-2 bg-blue-50 rounded-md border border-blue-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-blue-900">{dept}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDepartmentToggle(dept)}
                                  className="h-4 w-4 p-0 text-blue-600 hover:text-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              
                              {deptRequirements.length > 0 && (
                                <div className="space-y-2">
                                  <div className="text-xs text-blue-600 flex items-center gap-1">
                                    <FileText className="w-2.5 h-2.5" />
                                    {deptRequirements.length} requirement(s)
                                    {notesCount > 0 && ` • ${notesCount} with notes`}
                                  </div>
                                  <div className="space-y-1">
                                    {deptRequirements.slice(0, 3).map((req) => (
                                      <div 
                                        key={req.id} 
                                        className="text-xs bg-blue-100 text-blue-700 p-2 rounded border border-blue-200"
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium">{req.name}</span>
                                          <div className="flex items-center gap-1">
                                            {req.type && (
                                              <span className="text-xs bg-blue-200 px-1 py-0.5 rounded flex items-center">
                                                {req.type === 'physical' ? (
                                                  <Package className="w-2.5 h-2.5" />
                                                ) : req.type === 'yesno' ? (
                                                  <CheckSquare className="w-2.5 h-2.5" />
                                                ) : (
                                                  <Settings className="w-2.5 h-2.5" />
                                                )}
                                              </span>
                                            )}
                                            {req.notes && req.notes.trim() && (
                                              <StickyNote className="w-2 h-2" />
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                          {req.isCustom ? (
                                            <>
                                              <span>
                                                {req.type === 'physical' && req.quantity 
                                                  ? `Quantity: ${req.quantity}` 
                                                  : req.notes && req.notes.trim()
                                                  ? `Notes: ${req.notes.substring(0, 20)}${req.notes.length > 20 ? '...' : ''}`
                                                  : 'Custom requirement'}
                                              </span>
                                              <span className="flex items-center gap-1 text-orange-700">
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                                Pending Validation
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <span>
                                                {req.type === 'physical' && req.quantity 
                                                  ? `Requested: ${req.quantity}${req.totalQuantity ? ` of ${req.totalQuantity}` : ''}` 
                                                  : req.type === 'yesno' && req.yesNoAnswer
                                                  ? `Answer: ${req.yesNoAnswer === 'yes' ? '✓ Yes' : '✗ No'}`
                                                  : `Available: ${req.totalQuantity || 'N/A'}`}
                                              </span>
                                              <span className={`flex items-center gap-1 ${
                                                req.isAvailable ? 'text-green-700' : 'text-red-700'
                                              }`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${
                                                  req.isAvailable ? 'bg-green-500' : 'bg-red-500'
                                                }`}></div>
                                                {req.isAvailable ? 'Available' : 'Unavailable'}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {req.responsiblePerson && (
                                          <div className="text-xs text-blue-600 mt-1">
                                            Contact: {req.responsiblePerson}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    {deptRequirements.length > 3 && (
                                      <div className="text-xs text-blue-500 text-center py-1">
                                        +{deptRequirements.length - 3} more requirements
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">No departments selected yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="secondary" className="text-xs">Draft</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">{getCompletedStepsCount()}/{steps.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Step 5: Schedule & Contact Details */}
      {currentStep === 5 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Schedule Card - Display Only */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-blue-600" />
                      Event Schedule
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowScheduleModal(true)}
                      className="text-xs flex items-center gap-1"
                    >
                      <CalendarIcon className="w-3 h-3" />
                      Edit Schedule
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Schedule Display */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="text-sm text-gray-600 mb-3">
                      Schedule based on your location preferences
                    </div>
                    
                    {formData.startDate && formData.startTime ? (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">Start</div>
                          <div className="text-sm text-gray-600">
                            {format(formData.startDate, "EEEE, MMMM dd, yyyy")} at {formatTime(formData.startTime)}
                          </div>
                          {formData.locations && formData.locations.length > 0 ? (
                            <div className="text-xs text-blue-600 mt-1 space-y-1">
                              {formData.locations.map((loc, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {loc}
                                </div>
                              ))}
                            </div>
                          ) : formData.location && (
                            <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {formData.location}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <div>
                          <div className="text-sm font-medium text-gray-500">Start Date & Time</div>
                          <div className="text-sm text-gray-400">Not selected yet</div>
                        </div>
                      </div>
                    )}

                    {formData.endDate && formData.endTime ? (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">End</div>
                          <div className="text-sm text-gray-600">
                            {format(formData.endDate, "EEEE, MMMM dd, yyyy")} at {formatTime(formData.endTime)}
                          </div>
                          {formData.locations && formData.locations.length > 0 ? (
                            <div className="text-xs text-blue-600 mt-1 space-y-1">
                              {formData.locations.map((loc, idx) => (
                                <div key={idx} className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {loc}
                                </div>
                              ))}
                            </div>
                          ) : formData.location && (
                            <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {formData.location}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <div>
                          <div className="text-sm font-medium text-gray-500">End Date & Time</div>
                          <div className="text-sm text-gray-400">Not selected yet</div>
                        </div>
                      </div>
                    )}

                    {formData.startDate && formData.endDate && formData.startTime && formData.endTime && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-gray-500">
                          Duration: {calculateDuration(formData.startDate, formData.startTime, formData.endDate, formData.endTime)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                    <Info className="w-3 h-3" />
                    Schedule is set from your location preferences
                  </div>
                </CardContent>
              </Card>

              {/* Contact Details Card */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <StickyNote className="w-5 h-5 text-blue-600" />
                    Contact Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="contactNumber" className="text-sm font-medium">Contact Number *</Label>
                      <Input
                        id="contactNumber"
                        type="tel"
                        placeholder="09XXXXXXXXX (11 digits)"
                        value={formData.contactNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, ''); // Only numbers
                          if (value.length <= 11) {
                            handleInputChange('contactNumber', value);
                          }
                        }}
                        className="mt-1"
                        maxLength={11}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter 11-digit mobile number (e.g., 09123456789)
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="contactEmail" className="text-sm font-medium">Email Address *</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        placeholder="your.email@example.com"
                        value={formData.contactEmail}
                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant="secondary" className="text-xs">Draft</Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium">{getCompletedStepsCount()}/{steps.length}</span>
                </div>
                <Separator />
                {formData.startDate && formData.startTime && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start:</span>
                      <span className="font-medium text-xs">
                        {format(formData.startDate, "MMM dd")} at {formatTime(formData.startTime)}
                      </span>
                    </div>
                    <Separator />
                  </>
                )}
                {formData.endDate && formData.endTime && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">End:</span>
                      <span className="font-medium text-xs">
                        {format(formData.endDate, "MMM dd")} at {formatTime(formData.endTime)}
                      </span>
                    </div>
                    <Separator />
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Departments:</span>
                  <span className="font-medium">{formData.taggedDepartments.length}</span>
                </div>
              </CardContent>
            </Card>

          </div>
        </motion.div>
      )}

      {/* Step 3 Navigation */}
      {currentStep === 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between pt-4"
        >
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(1)}
          >
            Previous
          </Button>
          <Button 
            onClick={() => setCurrentStep(5)} 
            disabled={!formData.taggedDepartments.length || !hasRequirementsForDepartments()}
            className="gap-2"
          >
            Continue to Schedule
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Step 5 Navigation */}
      {currentStep === 5 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between pt-4"
        >
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(3)}
          >
            Previous
          </Button>
          <Button 
            onClick={() => {
              setShowReviewModal(true);
              setReviewStep(1);
            }}
            disabled={!isFormReadyToSubmit() || isSubmitting}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            <Send className="w-4 h-4" />
            Review & Submit
          </Button>
        </motion.div>
      )}

      {/* Navigation for other steps */}
      {currentStep !== 3 && currentStep !== 5 && (
        <>
          {/* Missing Fields Alert - Only show if fields are missing */}
          {(!formData.eventTitle || !formData.requestor || !formData.location || !formData.participants || !formData.description || formData.attachments.length === 0 || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg"
            >
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-orange-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Missing Required Fields
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {!formData.eventTitle && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      <span>Event Title</span>
                    </div>
                  )}
                  {!formData.requestor && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      <span>Requestor</span>
                    </div>
                  )}
                  {!formData.location && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      <span>Location</span>
                    </div>
                  )}
                  {!formData.participants && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      <span>Participants</span>
                    </div>
                  )}
                  {!formData.description && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      <span>Description</span>
                    </div>
                  )}
                  {formData.attachments.length === 0 && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      <span>Attachments</span>
                    </div>
                  )}
                  {!formData.startDate && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      <span>Start Date</span>
                    </div>
                  )}
                  {!formData.startTime && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      <span>Start Time</span>
                    </div>
                  )}
                  {!formData.endDate && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      <span>End Date</span>
                    </div>
                  )}
                  {!formData.endTime && (
                    <div className="flex items-center gap-2 text-orange-700">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      <span>End Time</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-between pt-4"
          >
            <Button variant="outline" disabled>
              Previous
            </Button>
            <Button 
              onClick={() => setCurrentStep(3)} 
              disabled={!formData.eventTitle || !formData.requestor || !formData.location || !formData.participants || !formData.description || formData.attachments.length === 0 || !formData.startDate || !formData.startTime || !formData.endDate || !formData.endTime}
              className="gap-2"
            >
              Continue to Tag Departments
              <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </>
      )}

      {/* Requirements Modal */}
      <Dialog 
        key={`requirements-${selectedDepartment}-${requirementsRefreshKey}`} 
        open={showRequirementsModal} 
        onOpenChange={setShowRequirementsModal}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle className="text-lg font-medium">
                  Requirements - {selectedDepartment}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Select requirements for this department
                </DialogDescription>
                {!formData.startDate && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs">
                    ⚠️ No date selected - showing default quantities. Set schedule first for accurate availability.
                  </div>
                )}
                {formData.startDate && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs">
                    📅 Showing availability for {formData.startDate.toDateString()}
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  console.log(`\n🔄 === EDIT SCHEDULE BUTTON CLICKED ===`);
                  console.log(`📍 Current formData.location: ${formData.location}`);
                  console.log(`📍 Current selectedLocation: ${selectedLocation}`);
                  console.log(`🎯 Current showRequirementsModal: ${showRequirementsModal}`);
                  console.log(`🎯 Current showScheduleModal: ${showScheduleModal}`);
                  
                  setShowRequirementsModal(false);
                  setShowScheduleModal(true);
                  
                  console.log(`✅ Modals switched - Requirements: false, Schedule: true`);
                }}
                className="gap-2 ml-4"
              >
                <CalendarIcon className="w-4 h-4" />
                Edit Schedule
              </Button>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Available Requirements */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">Available Requirements</h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {formData.departmentRequirements[selectedDepartment]?.map((requirement) => (
                  <div
                    key={requirement.id}
                    className={`p-3 border rounded-lg transition-all ${
                      !requirement.isAvailable 
                        ? 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                        : requirement.selected 
                          ? 'bg-blue-50 border-blue-200 shadow-sm cursor-pointer' 
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50 cursor-pointer'
                    }`}
                    onClick={() => requirement.isAvailable && handleRequirementToggle(requirement.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            checked={requirement.selected}
                            disabled={!requirement.isAvailable}
                            onChange={() => requirement.isAvailable && handleRequirementToggle(requirement.id)}
                            className="mt-0.5"
                          />
                          <h5 className={`font-medium text-sm ${
                            requirement.isAvailable ? 'text-gray-900' : 'text-gray-500'
                          }`}>{requirement.name}</h5>
                          <Badge 
                            variant={requirement.type === 'physical' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            <div className="flex items-center gap-1">
                              {requirement.type === 'physical' ? (
                                <><Package className="w-3 h-3" /> Physical</>
                              ) : requirement.type === 'yesno' ? (
                                <><Settings className="w-3 h-3" /> Yes/No</>
                              ) : (
                                <><Settings className="w-3 h-3" /> Service</>
                              )}
                            </div>
                          </Badge>
                          {requirement.type === 'yesno' && requirement.yesNoAnswer && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${requirement.yesNoAnswer === 'yes' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}
                            >
                              {requirement.yesNoAnswer === 'yes' ? (
                                <><Check className="w-3 h-3 mr-1" /> Yes</>
                              ) : (
                                <><X className="w-3 h-3 mr-1" /> No</>
                              )}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Conflict Warning - Only show if THIS requirement has conflicts */}
                        {conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
                         hasRequirementConflict(requirement, selectedDepartment) && (
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                            <div className="flex items-center gap-2 text-orange-800 text-xs font-medium mb-1">
                              <AlertTriangle className="w-4 h-4" />
                              This Item is Already Booked
                            </div>
                            <div className="text-xs text-orange-700">
                              {requirement.name} is requested by {conflictingEvents.length} overlapping event(s) on {formData.startDate.toDateString()} ({formatTime(formData.startTime)}-{formatTime(formData.endTime)})
                            </div>
                            <div className="text-xs text-orange-600 mt-1">
                              Quantity shown is remaining after existing bookings
                            </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Available Quantity:</span>
                            {conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
                             hasRequirementConflict(requirement, selectedDepartment) ? (
                              <span className="text-blue-600 font-medium">
                                {getAvailableQuantity(requirement, selectedDepartment)}
                                <span className="text-gray-500 ml-1">(of {requirement.totalQuantity || 0})</span>
                              </span>
                            ) : (
                              <span className={requirement.totalQuantity ? 'text-gray-900' : 'text-gray-400'}>
                                {requirement.totalQuantity || 'N/A'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Status:</span>
                            {requirement.isCustom ? (
                              <span className="flex items-center gap-1 text-orange-600">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                Pending Validation
                              </span>
                            ) : (
                              <span className={`flex items-center gap-1 ${
                                requirement.isAvailable ? 'text-green-600' : 'text-red-600'
                              }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                  requirement.isAvailable ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                {requirement.isAvailable ? 'Available' : 'Unavailable'}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {requirement.responsiblePerson && (
                          <div className="mt-2 text-xs text-gray-600">
                            <span className="font-medium">Contact:</span> {requirement.responsiblePerson}
                          </div>
                        )}
                        
                        {requirement.availabilityNotes && (
                          <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                            <span className="font-medium">Availability Notes:</span> {requirement.availabilityNotes}
                          </div>
                        )}
                        
                        {/* Quantity/Notes Input - Show when selected */}
                        {requirement.selected && (
                          <div className="mt-3 pt-3 border-t border-blue-200 space-y-2 bg-blue-50 p-3 rounded-lg">
                            {requirement.type === 'physical' ? (
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-gray-900">Quantity Needed</Label>
                                <Input
                                  type="number"
                                  placeholder="Enter quantity..."
                                  value={requirement.quantity || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleRequirementQuantity(requirement.id, parseInt(e.target.value) || 0);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`text-sm ${
                                    !requirement.isCustom && requirement.quantity && (
                                      (conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
                                       hasRequirementConflict(requirement, selectedDepartment) &&
                                       requirement.quantity > getAvailableQuantity(requirement, selectedDepartment)) ||
                                      ((!conflictingEvents.length || !formData.startDate || !formData.startTime || 
                                        !hasRequirementConflict(requirement, selectedDepartment)) && 
                                       requirement.quantity > (requirement.totalQuantity || 0))
                                    ) ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''
                                  }`}
                                  min="1"
                                  max={requirement.isCustom ? undefined : (
                                    conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
                                    hasRequirementConflict(requirement, selectedDepartment)
                                      ? getAvailableQuantity(requirement, selectedDepartment)
                                      : (requirement.totalQuantity || undefined)
                                  )}
                                />
                                {requirement.isCustom ? (
                                  <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Custom requirement - quantity will be validated by {selectedDepartment}
                                  </p>
                                ) : requirement.quantity && (
                                  (conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
                                   hasRequirementConflict(requirement, selectedDepartment) &&
                                   requirement.quantity > getAvailableQuantity(requirement, selectedDepartment)) ||
                                  ((!conflictingEvents.length || !formData.startDate || !formData.startTime || 
                                    !hasRequirementConflict(requirement, selectedDepartment)) && 
                                   requirement.quantity > (requirement.totalQuantity || 0))
                                ) ? (
                                  <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 p-2 rounded">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span className="font-medium">Warning:</span>
                                    <span>
                                      Requested {requirement.quantity} but only {' '}
                                      {conflictingEvents.length > 0 && formData.startDate && formData.startTime
                                        ? getAvailableQuantity(requirement, selectedDepartment)
                                        : requirement.totalQuantity
                                      } available
                                      {conflictingEvents.length > 0 && formData.startDate && formData.startTime && ' (after conflicts)'}
                                    </span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-600">
                                    Available: {' '}
                                    {conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
                                     hasRequirementConflict(requirement, selectedDepartment)
                                      ? `${getAvailableQuantity(requirement, selectedDepartment)} (after conflicts)`
                                      : (requirement.totalQuantity || 'N/A')
                                    }
                                  </p>
                                )}
                              </div>
                            ) : requirement.type === 'yesno' ? (
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-gray-900">Select Answer</Label>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={requirement.yesNoAnswer === 'yes' ? 'default' : 'outline'}
                                    className={`flex-1 ${requirement.yesNoAnswer === 'yes' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentReqs = formData.departmentRequirements[selectedDepartment] || [];
                                      const updatedReqs = currentReqs.map(req => 
                                        req.id === requirement.id ? { ...req, yesNoAnswer: 'yes' as 'yes' | 'no' } : req
                                      );
                                      const newDeptReqs = { ...formData.departmentRequirements };
                                      newDeptReqs[selectedDepartment] = updatedReqs;
                                      handleInputChange('departmentRequirements', newDeptReqs);
                                    }}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Yes
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={requirement.yesNoAnswer === 'no' ? 'default' : 'outline'}
                                    className={`flex-1 ${requirement.yesNoAnswer === 'no' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const currentReqs = formData.departmentRequirements[selectedDepartment] || [];
                                      const updatedReqs = currentReqs.map(req => 
                                        req.id === requirement.id ? { ...req, yesNoAnswer: 'no' as 'yes' | 'no' } : req
                                      );
                                      const newDeptReqs = { ...formData.departmentRequirements };
                                      newDeptReqs[selectedDepartment] = updatedReqs;
                                      handleInputChange('departmentRequirements', newDeptReqs);
                                    }}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    No
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Label className="text-xs font-medium text-gray-900">Notes / Special Requirements</Label>
                                <Textarea
                                  placeholder="Add specific notes or requirements..."
                                  value={requirement.notes || ''}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleRequirementNotes(requirement.id, e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="min-h-20 text-sm"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Empty State Message */}
                {(!formData.departmentRequirements[selectedDepartment] || formData.departmentRequirements[selectedDepartment].length === 0) && (
                  <div className="text-center py-8 px-4">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="space-y-1 text-center">
                        <h5 className="font-medium text-gray-900 text-center">No Requirements Available</h5>
                        <p className="text-sm text-gray-600 max-w-md text-center mx-auto">
                          The <strong>{selectedDepartment}</strong> department hasn't set up resource availability for{' '}
                          {formData.startDate ? (
                            <strong>{formData.startDate.toDateString()}</strong>
                          ) : (
                            <strong>the selected date</strong>
                          )}.
                        </p>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          The department needs to configure their equipment and service availability in the Calendar page first.
                        </p>
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewAvailableDates(selectedDepartment)}
                            className="gap-2"
                          >
                            <CalendarIcon className="w-4 h-4" />
                            View Available Dates
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Add Custom Requirement Button */}
                <div 
                  className={`p-3 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    showCustomInput 
                      ? 'bg-blue-50 border-blue-300' 
                      : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                  onClick={() => setShowCustomInput(!showCustomInput)}
                >
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Plus className="w-4 h-4" />
                    Add Custom Requirement
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Requirement Input */}
          {showCustomInput && (
            <div className="mb-6 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter custom requirement name..."
                  value={customRequirement}
                  onChange={(e) => setCustomRequirement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomRequirement()}
                  className="flex-1"
                />
                <Select 
                  value={customRequirementType || 'service'} 
                  onValueChange={(value: 'physical' | 'service') => setCustomRequirementType(value)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">
                      <div className="flex items-center gap-2">
                        <Package className="w-3 h-3" />
                        Quantity
                      </div>
                    </SelectItem>
                    <SelectItem value="service">
                      <div className="flex items-center gap-2">
                        <StickyNote className="w-3 h-3" />
                        Notes
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleAddCustomRequirement}
                  disabled={!customRequirement.trim()}
                  variant="outline"
                  size="sm"
                >
                  Add
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Choose "Quantity" for physical items or "Notes" for services
              </p>
            </div>
          )}

          {/* Selected Requirements */}
          {formData.departmentRequirements[selectedDepartment]?.filter(req => req.selected).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Selected Requirements ({formData.departmentRequirements[selectedDepartment]?.filter(req => req.selected).length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {formData.departmentRequirements[selectedDepartment]
                  ?.filter(req => req.selected)
                  .map((requirement) => (
                  <div key={requirement.id} className={`flex items-center gap-1 rounded-full px-3 py-1 ${
                    requirement.isCustom ? 'bg-orange-100 border border-orange-300' : 'bg-gray-100'
                  }`}>
                    <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]" title={requirement.name}>
                      {requirement.name}
                    </span>
                    {requirement.isCustom && (
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                        Custom
                      </Badge>
                    )}
                    {requirement.type === 'physical' && requirement.quantity && (
                      <Badge variant="secondary" className="text-xs bg-blue-600 text-white">
                        Qty: {requirement.quantity}
                      </Badge>
                    )}
                    {requirement.type === 'service' && requirement.notes?.trim() && (
                      <Badge variant="secondary" className="text-xs bg-green-600 text-white flex items-center gap-1">
                        <StickyNote className="w-3 h-3" />
                        Notes
                      </Badge>
                    )}
                    {requirement.type === 'yesno' && requirement.yesNoAnswer && (
                      <Badge 
                        variant="secondary" 
                        className={`text-xs flex items-center gap-1 ${
                          requirement.yesNoAnswer === 'yes' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}
                      >
                        {requirement.yesNoAnswer === 'yes' ? (
                          <><Check className="w-3 h-3" /> Yes</>
                        ) : (
                          <><X className="w-3 h-3" /> No</>
                        )}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRequirementToggle(requirement.id)}
                      className="h-5 w-5 p-0 text-gray-500 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRequirementsModal(false);
                setSelectedDepartment('');
                setCustomRequirement('');
                setShowCustomInput(false);
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveRequirements}
              disabled={!formData.departmentRequirements[selectedDepartment]?.some(req => req.selected)}
              className="text-xs"
            >
              Save Requirements
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="!max-w-2xl !w-full">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Schedule Event at {formData.location || selectedLocation}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Select your preferred start and end date/time for the event.
              </p>
              
              {/* Multi-Conference Room Selection - Clean White Design */}
              {(formData.location === '4th Flr. Conference Room 1' || 
                formData.location === '4th Flr. Conference Room 2' || 
                formData.location === '4th Flr. Conference Room 3') && (
                <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900">Need Multiple Conference Rooms?</p>
                  </div>
                  
                  {/* Selected Rooms */}
                  {formData.locations.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {formData.locations.map((loc) => (
                        <Badge key={loc} variant="secondary" className="text-xs flex items-center gap-1.5 px-2.5 py-1">
                          {loc}
                          {formData.locations.length > 1 && (
                            <button
                              onClick={() => handleRemoveConferenceRoom(loc)}
                              className="hover:text-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Room Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {!formData.locations.includes('4th Flr. Conference Room 1') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddConferenceRoom(1)}
                        className="text-xs h-8 px-3 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        4th Flr. Conference Room 1
                      </Button>
                    )}
                    {!formData.locations.includes('4th Flr. Conference Room 2') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddConferenceRoom(2)}
                        className="text-xs h-8 px-3 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        4th Flr. Conference Room 2
                      </Button>
                    )}
                    {!formData.locations.includes('4th Flr. Conference Room 3') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddConferenceRoom(3)}
                        className="text-xs h-8 px-3 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        4th Flr. Conference Room 3
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Multi-Pavilion Section Selection - Kagitingan Hall */}
              {(formData.location === 'Pavilion - Kagitingan Hall - Section A' || 
                formData.location === 'Pavilion - Kagitingan Hall - Section B' || 
                formData.location === 'Pavilion - Kagitingan Hall - Section C') && (
                <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900">Need Multiple Kagitingan Hall Sections?</p>
                  </div>
                  
                  {/* Selected Sections */}
                  {formData.locations.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {formData.locations.map((loc) => (
                        <Badge key={loc} variant="secondary" className="text-xs flex items-center gap-1.5 px-2.5 py-1">
                          {loc}
                          {formData.locations.length > 1 && (
                            <button
                              onClick={() => handleRemoveConferenceRoom(loc)}
                              className="hover:text-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Section Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {!formData.locations.includes('Pavilion - Kagitingan Hall - Section A') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const sectionName = 'Pavilion - Kagitingan Hall - Section A';
                          if (!formData.locations.includes(sectionName)) {
                            await fetchAvailableDatesForLocation(sectionName);
                            handleInputChange('locations', [...formData.locations, sectionName]);
                          }
                        }}
                        className="text-xs h-8 px-3 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Section A
                      </Button>
                    )}
                    {!formData.locations.includes('Pavilion - Kagitingan Hall - Section B') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const sectionName = 'Pavilion - Kagitingan Hall - Section B';
                          if (!formData.locations.includes(sectionName)) {
                            await fetchAvailableDatesForLocation(sectionName);
                            handleInputChange('locations', [...formData.locations, sectionName]);
                          }
                        }}
                        className="text-xs h-8 px-3 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Section B
                      </Button>
                    )}
                    {!formData.locations.includes('Pavilion - Kagitingan Hall - Section C') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const sectionName = 'Pavilion - Kagitingan Hall - Section C';
                          if (!formData.locations.includes(sectionName)) {
                            await fetchAvailableDatesForLocation(sectionName);
                            handleInputChange('locations', [...formData.locations, sectionName]);
                          }
                        }}
                        className="text-xs h-8 px-3 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Section C
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Multi-Pavilion Section Selection - Kalayaan Ballroom */}
              {(formData.location === 'Pavilion - Kalayaan Ballroom - Section A' || 
                formData.location === 'Pavilion - Kalayaan Ballroom - Section B' || 
                formData.location === 'Pavilion - Kalayaan Ballroom - Section C') && (
                <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg shadow-sm">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900">Need Multiple Kalayaan Ballroom Sections?</p>
                  </div>
                  
                  {/* Selected Sections */}
                  {formData.locations.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {formData.locations.map((loc) => (
                        <Badge key={loc} variant="secondary" className="text-xs flex items-center gap-1.5 px-2.5 py-1">
                          {loc}
                          {formData.locations.length > 1 && (
                            <button
                              onClick={() => handleRemoveConferenceRoom(loc)}
                              className="hover:text-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {/* Add Section Buttons */}
                  <div className="flex flex-wrap gap-2">
                    {!formData.locations.includes('Pavilion - Kalayaan Ballroom - Section A') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const sectionName = 'Pavilion - Kalayaan Ballroom - Section A';
                          if (!formData.locations.includes(sectionName)) {
                            await fetchAvailableDatesForLocation(sectionName);
                            handleInputChange('locations', [...formData.locations, sectionName]);
                          }
                        }}
                        className="text-xs h-8 px-3 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Section A
                      </Button>
                    )}
                    {!formData.locations.includes('Pavilion - Kalayaan Ballroom - Section B') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const sectionName = 'Pavilion - Kalayaan Ballroom - Section B';
                          if (!formData.locations.includes(sectionName)) {
                            await fetchAvailableDatesForLocation(sectionName);
                            handleInputChange('locations', [...formData.locations, sectionName]);
                          }
                        }}
                        className="text-xs h-8 px-3 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Section B
                      </Button>
                    )}
                    {!formData.locations.includes('Pavilion - Kalayaan Ballroom - Section C') && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const sectionName = 'Pavilion - Kalayaan Ballroom - Section C';
                          if (!formData.locations.includes(sectionName)) {
                            await fetchAvailableDatesForLocation(sectionName);
                            handleInputChange('locations', [...formData.locations, sectionName]);
                          }
                        }}
                        className="text-xs h-8 px-3 hover:bg-gray-50"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1.5" />
                        Section C
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {availableDates.length > 0 && (
                <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  Only dates when {formData.location || selectedLocation} is available can be selected ({availableDates.length} available date{availableDates.length !== 1 ? 's' : ''})
                </p>
              )}
              {formData.startDate && conflictingEvents.length > 0 && (
                <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {conflictingEvents.length} existing booking{conflictingEvents.length !== 1 ? 's' : ''} found for {formData.location || selectedLocation} on {format(formData.startDate, "PPP")} - venue and requirement conflicts are shown
                </p>
              )}
              {formData.startDate && conflictingEvents.length > 0 && (
                <div className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>
                    <strong>VENUE</strong> = Venue booked, <strong>REQ</strong> = Requirements already booked by existing events
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Start Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.startDate ? format(formData.startDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.startDate}
                      onSelect={(date) => {
                        handleInputChange('startDate', date);
                        // Also update end date to same date by default
                        if (date) {
                          handleInputChange('endDate', date);
                        }
                      }}
                      disabled={isDateDisabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="startTime" className="text-sm font-medium text-gray-700 mb-2 block">
                  Start Time
                </Label>
                <Select 
                  value={formData.startTime} 
                  onValueChange={(value) => {
                    handleInputChange('startTime', value);
                    // Clear end time if it's now invalid
                    if (formData.endTime) {
                      const timeToMinutes = (time: string) => {
                        const [hours, minutes] = time.split(':').map(Number);
                        return hours * 60 + minutes;
                      };
                      if (timeToMinutes(value) >= timeToMinutes(formData.endTime)) {
                        handleInputChange('endTime', '');
                      }
                    }
                  }}
                  disabled={!formData.startDate}
                >
                  <SelectTrigger className="w-full" disabled={!formData.startDate}>
                    <SelectValue placeholder={!formData.startDate ? "Select start date first" : "Select start time"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {generateTimeOptions().map((timeOption) => {
                      const isBooked = isTimeSlotBooked(timeOption.value);
                      const requirementConflict = hasRequirementConflictAtTime(timeOption.value);
                      
                      // Only disable if VENUE is booked (physical conflict)
                      // REQ-only conflicts show warning but remain selectable
                      const isDisabled = isBooked;
                      
                      return (
                        <SelectItem 
                          key={timeOption.value} 
                          value={timeOption.value}
                          disabled={isDisabled}
                          className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={isDisabled ? 'text-gray-400' : ''}>
                              {timeOption.label}
                            </span>
                            <div className="flex items-center gap-1">
                              {isBooked && (
                                <Badge variant="destructive" className="text-xs">
                                  VENUE
                                </Badge>
                              )}
                              {requirementConflict.hasConflict && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                  REQ
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.endDate ? format(formData.endDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.endDate}
                      onSelect={(date) => handleInputChange('endDate', date)}
                      disabled={isDateDisabled}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="endTime" className="text-sm font-medium text-gray-700 mb-2 block">
                  End Time
                </Label>
                <Select 
                  value={formData.endTime} 
                  onValueChange={(value) => handleInputChange('endTime', value)}
                  disabled={!formData.startTime}
                >
                  <SelectTrigger className="w-full" disabled={!formData.startTime}>
                    <SelectValue placeholder={formData.startTime ? "Select end time" : "Select start time first"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {getAvailableEndTimes().map((timeOption) => {
                      const isBooked = isTimeSlotBooked(timeOption.value);
                      const requirementConflict = hasRequirementConflictAtTime(timeOption.value);
                      
                      // Only disable if VENUE is booked (physical conflict)
                      // REQ-only conflicts show warning but remain selectable
                      const isDisabled = isBooked;
                      
                      return (
                        <SelectItem 
                          key={timeOption.value} 
                          value={timeOption.value}
                          disabled={isDisabled}
                          className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={isDisabled ? 'text-gray-400' : ''}>
                              {timeOption.label}
                            </span>
                            <div className="flex items-center gap-1">
                              {isBooked && (
                                <Badge variant="destructive" className="text-xs">
                                  VENUE
                                </Badge>
                              )}
                              {requirementConflict.hasConflict && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                  REQ
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

            {/* Schedule Summary */}
            {(formData.startDate || formData.startTime || formData.endDate || formData.endTime) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Event Schedule Summary</h4>
                <div className="text-sm text-blue-800">
                  <p><strong>Location:</strong> {formData.location || selectedLocation}</p>
                  {formData.startDate && formData.startTime && (
                    <p><strong>Start:</strong> {format(formData.startDate, "PPP")} at {formatTime(formData.startTime)}</p>
                  )}
                  {formData.endDate && formData.endTime && (
                    <p><strong>End:</strong> {format(formData.endDate, "PPP")} at {formatTime(formData.endTime)}</p>
                  )}
                </div>
              </div>
            )}

          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setShowScheduleModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleScheduleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* W/O Gov Files Modal - Redesigned */}
      <Dialog open={showGovModal} onOpenChange={setShowGovModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Government Files</DialogTitle>
            <DialogDescription>
              Upload required files for events without government officials
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Event Briefer Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Event Briefer</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTemplateType('briefer');
                    
                    // Auto-populate briefer data from form
                    const userStr = localStorage.getItem('userData');
                    let currentUserDept = '';
                    
                    if (userStr) {
                      try {
                        const currentUser = JSON.parse(userStr);
                        currentUserDept = currentUser.department || currentUser.departmentName || '';
                      } catch (e) {
                        console.error('Error parsing user from localStorage:', e);
                      }
                    }
                    
                    // Format time to 12-hour format with AM/PM
                    const formatTime12Hour = (time24: string) => {
                      if (!time24) return '';
                      const [hours, minutes] = time24.split(':');
                      const hour = parseInt(hours);
                      const ampm = hour >= 12 ? 'PM' : 'AM';
                      const hour12 = hour % 12 || 12;
                      return `${hour12}:${minutes} ${ampm}`;
                    };
                    
                    const startDateTime = formData.startDate && formData.startTime 
                      ? `${format(formData.startDate, 'MMMM dd, yyyy')} ${formatTime12Hour(formData.startTime)}` 
                      : '';
                    const endDateTime = formData.endDate && formData.endTime 
                      ? `${format(formData.endDate, 'MMMM dd, yyyy')} ${formatTime12Hour(formData.endTime)}` 
                      : '';
                    const dateTimeRange = startDateTime && endDateTime 
                      ? `${startDateTime} - ${endDateTime}` 
                      : '';
                    
                    const totalParticipants = (
                      parseInt(formData.participants || '0') + 
                      parseInt(formData.vip || '0') + 
                      parseInt(formData.vvip || '0')
                    ).toString();
                    
                    setBrieferData({
                      eventTitle: formData.eventTitle || '',
                      proponentOffice: currentUserDept || '',
                      dateTime: dateTimeRange,
                      venue: formData.location || '',
                      objectives: formData.description || '',
                      targetAudience: '', // User fills this
                      expectedParticipants: totalParticipants !== '0' ? totalParticipants : '',
                      briefDescription: '' // User fills this
                    });
                    
                    setShowTemplateModal(true);
                  }}
                  className="h-8 text-xs gap-1"
                >
                  <FileText className="w-3 h-3" />
                  View Template
                </Button>
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                {govFiles.brieferTemplate ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-gray-900">{govFiles.brieferTemplate.name}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGovFileUpload('brieferTemplate', null)}
                      className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">Click to upload Event Briefer</p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGovFileUpload('brieferTemplate', file);
                      }}
                      className="hidden"
                      id="brieferTemplate"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('brieferTemplate')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Program Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Program</Label>
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                {govFiles.programme ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-green-600" />
                      <p className="text-sm font-medium text-gray-900">{govFiles.programme.name}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGovFileUpload('programme', null)}
                      className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-3">Click to upload Program</p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGovFileUpload('programme', file);
                      }}
                      className="hidden"
                      id="programme"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('programme')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowGovModal(false);
                if (!govFiles.brieferTemplate && !govFiles.programme) {
                  handleInputChange('withoutGov', false);
                }
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => setShowGovModal(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {templateType === 'briefer' ? 'Event Briefer Template' : 'Program Template'}
            </DialogTitle>
            <DialogDescription>
              {templateType === 'briefer' ? 'Fill out the event briefer form' : 'Fill out the program'}
            </DialogDescription>
          </DialogHeader>
          
          {templateType === 'briefer' ? (
            <div className="space-y-4 py-4">
              {/* Event Briefer Form - Table Style */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <tbody>
                    {/* Event Title */}
                    <tr className="border-b">
                      <td className="bg-gray-50 p-3 font-medium text-sm w-1/3 border-r">
                        Event Title:
                      </td>
                      <td className="p-2">
                        <Input
                          value={brieferData.eventTitle}
                          onChange={(e) => setBrieferData(prev => ({ ...prev, eventTitle: e.target.value }))}
                          placeholder="Enter event title"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </td>
                    </tr>
                    
                    {/* Proponent Office/Department */}
                    <tr className="border-b">
                      <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                        Proponent Office/Department:
                      </td>
                      <td className="p-2">
                        <Input
                          value={brieferData.proponentOffice}
                          onChange={(e) => setBrieferData(prev => ({ ...prev, proponentOffice: e.target.value }))}
                          placeholder="Enter office/department"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </td>
                    </tr>
                    
                    {/* Date and Time */}
                    <tr className="border-b">
                      <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                        Date and Time:
                      </td>
                      <td className="p-2">
                        <Input
                          value={brieferData.dateTime}
                          onChange={(e) => setBrieferData(prev => ({ ...prev, dateTime: e.target.value }))}
                          placeholder="Enter date and time"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </td>
                    </tr>
                    
                    {/* Venue */}
                    <tr className="border-b">
                      <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                        Venue:
                      </td>
                      <td className="p-2">
                        <Input
                          value={brieferData.venue}
                          onChange={(e) => setBrieferData(prev => ({ ...prev, venue: e.target.value }))}
                          placeholder="Enter venue"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </td>
                    </tr>
                    
                    {/* Objectives */}
                    <tr className="border-b">
                      <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                        Objectives:
                      </td>
                      <td className="p-2">
                        <Textarea
                          value={brieferData.objectives}
                          onChange={(e) => setBrieferData(prev => ({ ...prev, objectives: e.target.value }))}
                          placeholder="Enter objectives"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px]"
                        />
                      </td>
                    </tr>
                    
                    {/* Target Audience/Participants */}
                    <tr className="border-b">
                      <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                        Target Audience/Participants:
                      </td>
                      <td className="p-2">
                        <Input
                          value={brieferData.targetAudience}
                          onChange={(e) => setBrieferData(prev => ({ ...prev, targetAudience: e.target.value }))}
                          placeholder="Enter target audience"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </td>
                    </tr>
                    
                    {/* Expected Number of Participants */}
                    <tr className="border-b">
                      <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                        Expected Number of Participants:
                      </td>
                      <td className="p-2">
                        <Input
                          value={brieferData.expectedParticipants}
                          onChange={(e) => setBrieferData(prev => ({ ...prev, expectedParticipants: e.target.value }))}
                          placeholder="Enter expected number"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </td>
                    </tr>
                    
                    {/* Brief Description of the Activity */}
                    <tr>
                      <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                        Brief Description of the Activity:
                      </td>
                      <td className="p-2">
                        <Textarea
                          value={brieferData.briefDescription}
                          onChange={(e) => setBrieferData(prev => ({ ...prev, briefDescription: e.target.value }))}
                          placeholder="Enter brief description"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Program Flow Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-3 text-left text-sm font-medium border-r w-1/6">Time</th>
                      <th className="p-3 text-left text-sm font-medium border-r w-2/6">Activity/Segment</th>
                      <th className="p-3 text-left text-sm font-medium border-r w-1/6">Person Responsible</th>
                      <th className="p-3 text-left text-sm font-medium w-1/6">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programFlowRows.map((row, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 border-r">
                          <Input
                            value={row.time}
                            onChange={(e) => {
                              const newRows = [...programFlowRows];
                              newRows[index].time = e.target.value;
                              setProgramFlowRows(newRows);
                            }}
                            placeholder="e.g., 8:00 AM"
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </td>
                        <td className="p-2 border-r">
                          <Input
                            value={row.activity}
                            onChange={(e) => {
                              const newRows = [...programFlowRows];
                              newRows[index].activity = e.target.value;
                              setProgramFlowRows(newRows);
                            }}
                            placeholder="Enter activity"
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </td>
                        <td className="p-2 border-r">
                          <Input
                            value={row.personResponsible}
                            onChange={(e) => {
                              const newRows = [...programFlowRows];
                              newRows[index].personResponsible = e.target.value;
                              setProgramFlowRows(newRows);
                            }}
                            placeholder="Enter person"
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={row.remarks}
                            onChange={(e) => {
                              const newRows = [...programFlowRows];
                              newRows[index].remarks = e.target.value;
                              setProgramFlowRows(newRows);
                            }}
                            placeholder="Enter remarks"
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Add Row Button */}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setProgramFlowRows([...programFlowRows, { time: '', activity: '', personResponsible: '', remarks: '' }]);
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowTemplateModal(false)}
            >
              Close
            </Button>
            {(templateType === 'briefer' || templateType === 'program') && (
              <Button 
                onClick={async () => {
                  try {
                    // Create new PDF document
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    const margin = 20;
                    const bottomMargin = 20;
                    let yPos = 10;
                    let logoImg: HTMLImageElement | null = null;

                    // Load logo
                    try {
                      logoImg = new Image();
                      logoImg.crossOrigin = 'anonymous';
                      
                      await new Promise((resolve, reject) => {
                        logoImg!.onload = resolve;
                        logoImg!.onerror = reject;
                        logoImg!.src = '/images/bataanlogo.png';
                      });
                    } catch (error) {
                      console.warn('Could not load logo:', error);
                    }

                    // Function to add header with logo on each page
                    const addPageHeader = () => {
                      let headerY = 10;
                      
                      // Add logo if available
                      if (logoImg) {
                        const logoWidth = 15;
                        const logoHeight = 15;
                        const logoX = (pageWidth - logoWidth) / 2;
                        pdf.addImage(logoImg, 'PNG', logoX, headerY, logoWidth, logoHeight);
                        headerY += logoHeight + 5;
                      } else {
                        headerY += 2;
                      }

                      // Header text
                      pdf.setFontSize(14);
                      pdf.setFont('helvetica', 'bold');
                      pdf.text('PROVINCIAL GOVERNMENT OF BATAAN', pageWidth / 2, headerY, { align: 'center' });
                      
                      headerY += 5;
                      pdf.setFontSize(10);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text('Event Management System', pageWidth / 2, headerY, { align: 'center' });
                      
                      headerY += 6;
                      pdf.setFontSize(12);
                      pdf.setFont('helvetica', 'bold');
                      pdf.text(templateType === 'briefer' ? 'EVENT BRIEFER' : 'PROGRAM FLOW', pageWidth / 2, headerY, { align: 'center' });
                      
                      headerY += 8;
                      pdf.setFontSize(9);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(`Generated on ${formatDate(new Date(), 'MMMM dd, yyyy')} at ${formatDate(new Date(), 'h:mm a')}`, pageWidth / 2, headerY, { align: 'center' });
                      
                      headerY += 10;
                      return headerY;
                    };

                    // Function to check if we need a new page
                    const checkAndAddNewPage = (requiredHeight: number) => {
                      if (yPos + requiredHeight > pageHeight - bottomMargin) {
                        pdf.addPage();
                        yPos = addPageHeader();
                        return true;
                      }
                      return false;
                    };

                    // Add header to first page
                    yPos = addPageHeader();

                    if (templateType === 'briefer') {
                      // Event Briefer Table-style content with borders
                      const fields = [
                      { label: 'Event Title:', value: brieferData.eventTitle || 'N/A' },
                      { label: 'Proponent Office/Department:', value: brieferData.proponentOffice || 'N/A' },
                      { label: 'Date and Time:', value: brieferData.dateTime || 'N/A' },
                      { label: 'Venue:', value: brieferData.venue || 'N/A' },
                      { label: 'Objectives:', value: brieferData.objectives || 'N/A', multiline: true },
                      { label: 'Target Audience/Participants:', value: brieferData.targetAudience || 'N/A' },
                      { label: 'Expected Number of Participants:', value: brieferData.expectedParticipants || 'N/A' },
                      { label: 'Brief Description of the Activity:', value: brieferData.briefDescription || 'N/A', multiline: true }
                    ];

                    const tableStartY = yPos;
                    const labelColWidth = 60; // Width of label column
                    const valueColWidth = pageWidth - 2 * margin - labelColWidth; // Width of value column
                    const cellPadding = 3;

                    // Set border style once
                    pdf.setDrawColor(200, 200, 200); // Gray border
                    pdf.setLineWidth(0.1);

                    fields.forEach((field, index) => {
                      // Calculate row height based on content
                      pdf.setFontSize(9);
                      const wrappedValue = pdf.splitTextToSize(field.value, valueColWidth - 2 * cellPadding);
                      const rowHeight = Math.max(10, wrappedValue.length * 5 + 2 * cellPadding);
                      
                      // Check if we need a new page
                      checkAndAddNewPage(rowHeight);
                      
                      // Draw label cell (left column with gray background)
                      pdf.setFillColor(245, 245, 245); // Light gray background
                      pdf.rect(margin, yPos, labelColWidth, rowHeight, 'F'); // Fill only
                      
                      // Draw value cell (right column)
                      pdf.setFillColor(255, 255, 255); // White background
                      pdf.rect(margin + labelColWidth, yPos, valueColWidth, rowHeight, 'F'); // Fill only
                      
                      // Draw borders (stroke only, no fill)
                      pdf.rect(margin, yPos, labelColWidth, rowHeight, 'S'); // Label cell border
                      pdf.rect(margin + labelColWidth, yPos, valueColWidth, rowHeight, 'S'); // Value cell border
                      
                      // Add label text
                      pdf.setFontSize(9);
                      pdf.setFont('helvetica', 'bold');
                      pdf.setTextColor(0, 0, 0);
                      const labelLines = pdf.splitTextToSize(field.label, labelColWidth - 2 * cellPadding);
                      pdf.text(labelLines, margin + cellPadding, yPos + cellPadding + 3);
                      
                      // Add value text
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(wrappedValue, margin + labelColWidth + cellPadding, yPos + cellPadding + 3);
                      
                      yPos += rowHeight;
                    });
                    } else {
                      // Program Flow Table
                      const colWidths = [30, 60, 40, 40]; // Time, Activity, Person, Remarks
                      const cellPadding = 2;
                      const rowHeight = 10;
                      
                      // Set border style
                      pdf.setDrawColor(200, 200, 200);
                      pdf.setLineWidth(0.1);
                      
                      // Draw header row
                      const headers = ['Time', 'Activity/Segment', 'Person Responsible', 'Remarks'];
                      let xPos = margin;
                      
                      pdf.setFontSize(9);
                      pdf.setFont('helvetica', 'bold');
                      
                      headers.forEach((header, i) => {
                        // Fill with gray background
                        pdf.setFillColor(240, 240, 240);
                        pdf.rect(xPos, yPos, colWidths[i], rowHeight, 'F');
                        // Draw border
                        pdf.rect(xPos, yPos, colWidths[i], rowHeight, 'S');
                        // Add text
                        pdf.text(header, xPos + cellPadding, yPos + 6);
                        xPos += colWidths[i];
                      });
                      
                      yPos += rowHeight;
                      
                      // Draw data rows
                      pdf.setFont('helvetica', 'normal');
                      pdf.setFontSize(8);
                      
                      programFlowRows.forEach((row) => {
                        // Check if we need a new page
                        const wasNewPage = checkAndAddNewPage(rowHeight);
                        
                        // If new page was added, redraw the header row
                        if (wasNewPage) {
                          let headerXPos = margin;
                          pdf.setFontSize(9);
                          pdf.setFont('helvetica', 'bold');
                          
                          headers.forEach((header, i) => {
                            pdf.setFillColor(240, 240, 240);
                            pdf.rect(headerXPos, yPos, colWidths[i], rowHeight, 'F');
                            pdf.rect(headerXPos, yPos, colWidths[i], rowHeight, 'S');
                            pdf.text(header, headerXPos + cellPadding, yPos + 6);
                            headerXPos += colWidths[i];
                          });
                          
                          yPos += rowHeight;
                          pdf.setFont('helvetica', 'normal');
                          pdf.setFontSize(8);
                        }
                        
                        xPos = margin;
                        
                        // Time
                        pdf.setFillColor(255, 255, 255);
                        pdf.rect(xPos, yPos, colWidths[0], rowHeight, 'F');
                        pdf.rect(xPos, yPos, colWidths[0], rowHeight, 'S');
                        pdf.text(row.time || '', xPos + cellPadding, yPos + 6);
                        xPos += colWidths[0];
                        
                        // Activity
                        pdf.setFillColor(255, 255, 255);
                        pdf.rect(xPos, yPos, colWidths[1], rowHeight, 'F');
                        pdf.rect(xPos, yPos, colWidths[1], rowHeight, 'S');
                        const activityText = pdf.splitTextToSize(row.activity || '', colWidths[1] - 2 * cellPadding);
                        pdf.text(activityText[0] || '', xPos + cellPadding, yPos + 6);
                        xPos += colWidths[1];
                        
                        // Person Responsible
                        pdf.setFillColor(255, 255, 255);
                        pdf.rect(xPos, yPos, colWidths[2], rowHeight, 'F');
                        pdf.rect(xPos, yPos, colWidths[2], rowHeight, 'S');
                        const personText = pdf.splitTextToSize(row.personResponsible || '', colWidths[2] - 2 * cellPadding);
                        pdf.text(personText[0] || '', xPos + cellPadding, yPos + 6);
                        xPos += colWidths[2];
                        
                        // Remarks
                        pdf.setFillColor(255, 255, 255);
                        pdf.rect(xPos, yPos, colWidths[3], rowHeight, 'F');
                        pdf.rect(xPos, yPos, colWidths[3], rowHeight, 'S');
                        const remarksText = pdf.splitTextToSize(row.remarks || '', colWidths[3] - 2 * cellPadding);
                        pdf.text(remarksText[0] || '', xPos + cellPadding, yPos + 6);
                        
                        yPos += rowHeight;
                      });
                    }

                    // Create blob URL for PDF preview
                    const pdfBlob = pdf.output('blob');
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    setPdfPreviewUrl(pdfUrl);
                    setShowPdfPreview(true);
                    
                  } catch (error) {
                    console.error('Error generating PDF preview:', error);
                    toast.error('Failed to generate PDF preview');
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 gap-2"
              >
                <FileText className="w-4 h-4" />
                Preview PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              PDF Preview - Event Briefer
            </DialogTitle>
            <DialogDescription>
              This is exactly how your PDF will look when downloaded
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden bg-gray-100 rounded-lg">
            {pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                style={{ minHeight: '600px' }}
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Generating PDF preview...</p>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPdfPreview(false)}>
              Close Preview
            </Button>
            <Button 
              onClick={() => {
                if (!pdfPreviewUrl) {
                  toast.error('No PDF preview available');
                  return;
                }
                
                // Download the PDF
                const link = document.createElement('a');
                link.href = pdfPreviewUrl;
                const fileName = templateType === 'briefer' ? 'Event-Briefer' : 'Program-Flow';
                link.download = `${fileName}-${formatDate(new Date(), 'yyyy-MM-dd')}.pdf`;
                link.click();
                toast.success('PDF downloaded successfully!');
              }}
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Available Dates Modal */}
      <Dialog open={showAvailableDatesModal} onOpenChange={setShowAvailableDatesModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              Available Dates - {selectedDepartment}
            </DialogTitle>
            <DialogDescription>
              Dates when {selectedDepartment} has configured resource availability
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {departmentAvailableDates.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found {departmentAvailableDates.length} date{departmentAvailableDates.length !== 1 ? 's' : ''} with available resources:
                </p>
                
                <div className="grid gap-3 max-h-96 overflow-y-auto">
                  {departmentAvailableDates.map((dateEntry: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-foreground">
                          {format(new Date(dateEntry.date), 'EEEE, MMMM dd, yyyy')}
                        </h4>
                        <Badge variant="outline" className="text-xs">
                          {dateEntry.availableCount || 0} resources
                        </Badge>
                      </div>
                      
                      {dateEntry.timeRange && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <Clock className="w-3 h-3" />
                          <span>Time Range: {dateEntry.timeRange.start} - {dateEntry.timeRange.end}</span>
                        </div>
                      )}
                      
                      {dateEntry.resources && dateEntry.resources.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Available Resources:</p>
                          <div className="flex flex-wrap gap-1">
                            {dateEntry.resources.slice(0, 3).map((resource: any, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {resource.name}
                              </Badge>
                            ))}
                            {dateEntry.resources.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{dateEntry.resources.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            // Set the date first
                            const selectedDateObj = new Date(dateEntry.date);
                            handleInputChange('startDate', selectedDateObj);
                            handleInputChange('endDate', selectedDateObj);
                            
                            // Close ALL modals first
                            setShowAvailableDatesModal(false);
                            setShowRequirementsModal(false);
                            
                            // Open Edit Schedule modal to set start/end times
                            setShowScheduleModal(true);
                            
                            toast.info(`Date set to ${format(selectedDateObj, 'MMM dd, yyyy')} - Please set start and end times`);
                          }}
                          className="text-xs gap-1"
                        >
                          <CalendarIcon className="w-3 h-3" />
                          Use This Date
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <CalendarIcon className="w-8 h-8 text-gray-400" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-medium text-gray-900">No Available Dates</h5>
                    <p className="text-sm text-gray-600">
                      {selectedDepartment} hasn't configured any resource availability yet.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAvailableDatesModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review & Submit Modal */}
      <Dialog open={showReviewModal} onOpenChange={(open) => {
        setShowReviewModal(open);
        if (!open) setReviewStep(1);
      }}>
        <DialogContent className="!max-w-4xl !w-[95vw] max-h-[90vh] overflow-hidden p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-8 py-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-gray-900">Review Your Request</h2>
                  <p className="text-sm text-gray-500 mt-1.5">
                    Please verify all details before submitting
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`h-2 w-12 rounded-full transition-all ${
                        step === reviewStep
                          ? 'bg-blue-600'
                          : step < reviewStep
                          ? 'bg-blue-200'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Content with slide transitions */}
            <div className="flex-1 overflow-hidden relative min-h-[400px]">
              {/* Step 1: Event Details */}
              {reviewStep === 1 && (
              <motion.div
                key="review-step-1"
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-8 overflow-y-auto"
              >
                <div className="max-w-3xl mx-auto space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Event Details</h3>
                    <p className="text-sm text-gray-500">Basic information about your event</p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Event Title</Label>
                      <p className="text-base font-medium text-gray-900">{formData.eventTitle}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Requestor</Label>
                      <p className="text-base font-medium text-gray-900">{formData.requestor}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Location{formData.locations.length > 1 ? 's' : ''}
                      </Label>
                      {formData.locations.length > 1 ? (
                        <div className="space-y-1">
                          {formData.locations.map((loc, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-sm">
                                {loc}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-base font-medium text-gray-900">{formData.location}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Participants</Label>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-medium text-gray-900">{formData.participants} Regular</span>
                        {formData.vip && <span className="text-gray-600">{formData.vip} VIP</span>}
                        {formData.vvip && <span className="text-gray-600">{formData.vvip} VVIP</span>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</Label>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border">
                      {formData.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Attachments ({formData.attachments.length})
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formData.attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border text-sm">
                          <Paperclip className="w-4 h-4 text-gray-400" />
                          <span className="truncate font-medium text-gray-700">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
              )}

              {/* Step 2: Tagged Departments */}
              {reviewStep === 2 && (
              <motion.div
                key="review-step-2"
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-8 overflow-y-auto"
              >
                <div className="max-w-3xl mx-auto space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Tagged Departments</h3>
                    <p className="text-sm text-gray-500">Requirements for each department</p>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    {formData.taggedDepartments.map((dept) => {
                      const deptReqs = formData.departmentRequirements[dept]?.filter(req => req.selected) || [];
                      return (
                        <Card key={dept} className="overflow-hidden">
                          <CardHeader className="bg-gray-50 border-b py-4 px-6">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-blue-600" />
                              {dept}
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {deptReqs.length} {deptReqs.length === 1 ? 'Requirement' : 'Requirements'}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-6">
                            <div className="space-y-2">
                              {deptReqs.map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="flex-shrink-0">
                                      {req.type === 'physical' ? (
                                        <Package className="w-4 h-4 text-gray-400" />
                                      ) : req.type === 'yesno' ? (
                                        <CheckSquare className="w-4 h-4 text-gray-400" />
                                      ) : (
                                        <Settings className="w-4 h-4 text-gray-400" />
                                      )}
                                    </div>
                                    <span className="font-medium text-sm text-gray-900 truncate">{req.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {req.type === 'physical' && req.quantity && (
                                      <Badge variant="secondary" className="text-xs">
                                        Qty: {req.quantity}
                                      </Badge>
                                    )}
                                    {req.type === 'yesno' && req.yesNoAnswer && (
                                      <Badge 
                                        variant="secondary" 
                                        className={`text-xs flex items-center gap-1 ${
                                          req.yesNoAnswer === 'yes' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                                        }`}
                                      >
                                        {req.yesNoAnswer === 'yes' ? (
                                          <><Check className="w-3 h-3" /> Yes</>
                                        ) : (
                                          <><X className="w-3 h-3" /> No</>
                                        )}
                                      </Badge>
                                    )}
                                    {req.notes && req.notes.trim() && (
                                      <StickyNote className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
              )}

              {/* Step 3: Schedule & Contact */}
              {reviewStep === 3 && (
              <motion.div
                key="review-step-3"
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -300, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-8 overflow-y-auto"
              >
                <div className="max-w-3xl mx-auto space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Schedule & Contact</h3>
                    <p className="text-sm text-gray-500">Event timing and contact information</p>
                  </div>

                  <Separator />

                  <Card>
                    <CardHeader className="bg-gray-50 border-b py-4 px-6">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                        Event Schedule
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Date & Time</Label>
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {formData.startDate && format(formData.startDate, "PPP")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {formData.startTime && formatTime(formData.startTime)}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Date & Time</Label>
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {formData.endDate && format(formData.endDate, "PPP")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {formData.endTime && formatTime(formData.endTime)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="bg-gray-50 border-b py-4 px-6">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-600" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contact Number</Label>
                          <p className="text-base font-medium text-gray-900">{formData.contactNumber}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email Address</Label>
                          <p className="text-base font-medium text-gray-900">{formData.contactEmail}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  if (reviewStep > 1) {
                    setReviewStep(reviewStep - 1);
                  } else {
                    setShowReviewModal(false);
                    setReviewStep(1);
                  }
                }}
              >
                {reviewStep === 1 ? 'Cancel' : 'Previous'}
              </Button>

              {reviewStep < 3 ? (
                <Button
                  onClick={() => setReviewStep(reviewStep + 1)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewStep(1);
                    handleSubmitEventRequest();
                  }}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestEventPage;

