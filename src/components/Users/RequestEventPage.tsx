import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
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
  Package,
  Settings,
  Clock
} from 'lucide-react';

interface DepartmentRequirement {
  id: string;
  name: string;
  selected: boolean;
  notes: string;
  quantity?: number;  // For physical requirements
  type?: 'physical' | 'service';
  totalQuantity?: number;
  isAvailable?: boolean;
  responsiblePerson?: string;
  availabilityNotes?: string; // Notes from resource availability
}

interface DepartmentRequirements {
  [department: string]: DepartmentRequirement[];
}

interface FormData {
  eventTitle: string;
  requestor: string;
  location: string;
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

const API_BASE_URL = 'http://localhost:5000/api';

const RequestEventPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [customRequirement, setCustomRequirement] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showAvailableDatesModal, setShowAvailableDatesModal] = useState(false);
  const [departmentAvailableDates, setDepartmentAvailableDates] = useState<any[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [showGovModal, setShowGovModal] = useState(false);
  const [govFiles, setGovFiles] = useState<{
    [key: string]: File | null;
  }>({
    brieferTemplate: null,
    availableForDL: null,
    programme: null
  });
  const [conflictingEvents, setConflictingEvents] = useState<any[]>([]);
  
  // Dynamic data from database
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  // Remove unused state - we fetch availabilities directly when needed
  const [formData, setFormData] = useState<FormData>({
    eventTitle: '',
    requestor: '',
    location: '',
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
    contactEmail: ''
  });

  const steps = [
    { id: 1, title: 'Event Details', icon: FileText, description: 'Basic event information' },
    { id: 2, title: 'Attachments', icon: Paperclip, description: 'Upload supporting documents' },
    { id: 3, title: 'Tag Departments', icon: Building2, description: 'Select relevant departments' },
    { id: 4, title: 'Requirements', icon: CheckSquare, description: 'Specify event requirements' },
    { id: 5, title: 'Schedule', icon: CalendarIcon, description: 'Set date and time' },
    { id: 6, title: 'Ready to Submit', icon: Send, description: 'Review and submit' }
  ];

  // Check if attachments step is completed
  const isAttachmentsCompleted = formData.noAttachments || formData.attachments.length > 0;

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
          console.log('✅ Departments loaded:', response.data.data);
        }
      } catch (error) {
        console.error('Error fetching departments:', error);
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
          // Extract unique location names
          const uniqueLocations = [...new Set(response.data.data.map((item: any) => item.locationName))] as string[];
          // Add "Add Custom Location" at the beginning
          setLocations(['Add Custom Location', ...uniqueLocations]);
          console.log('✅ Locations loaded:', uniqueLocations);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
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
        
        console.log('✅ Available dates for', locationName, ':', dates);
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
    
    // Check if the date is in the available dates list
    return !availableDates.some(availableDate => 
      availableDate.toDateString() === date.toDateString()
    );
  };

  // Auto-check for venue conflicts when schedule changes in modal
  useEffect(() => {
    const checkConflicts = async () => {
      console.log(`\n🔄 === CONFLICT CHECK USEEFFECT TRIGGERED ===`);
      console.log(`📅 startDate: ${formData.startDate}`);
      console.log(`📍 location: ${formData.location}`);
      console.log(`🎯 showScheduleModal: ${showScheduleModal}`);
      console.log(`🎯 showRequirementsModal: ${showRequirementsModal}`);
      
      if (formData.startDate && formData.location && showScheduleModal) {
        console.log(`✅ All conditions met, fetching conflicts...`);
        
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
          
          console.log(`📊 Total events from API: ${events.length}`);
          
          // Filter events that are on the same date (ALL locations for requirement conflicts)
          const conflicts = events.filter((event: any) => {
            if (!event.startDate || !event.location || !formData.startDate) return false;
            
            const eventStartDate = new Date(event.startDate);
            const selectedDate = formData.startDate;
            
            // Check if dates match (same day) - include ALL locations for requirement checking
            return eventStartDate.toDateString() === selectedDate.toDateString();
          });
          
          setConflictingEvents(conflicts);
          console.log(`🔍 Found ${conflicts.length} existing bookings across all locations on ${formData.startDate.toDateString()}`);
          conflicts.forEach((event: any) => {
            console.log(`   📅 "${event.eventTitle}" - ${event.startTime} to ${event.endTime}`);
          });
        } else {
          console.log(`❌ API response not ok:`, response.status);
        }
      } else {
        console.log(`❌ Conditions not met:`);
        console.log(`   startDate: ${!!formData.startDate}`);
        console.log(`   location: ${!!formData.location}`);
        console.log(`   showScheduleModal: ${showScheduleModal}`);
        
        if (!showScheduleModal) {
          // Clear conflicts when modal is closed
          setConflictingEvents([]);
          console.log(`🧹 Cleared conflicting events (modal closed)`);
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
      setAvailableDates([]); // Clear available dates
    } else {
      setShowCustomLocation(false);
      handleInputChange('location', value);
      
      // Fetch available dates for the selected location
      await fetchAvailableDatesForLocation(value);
      
      // Open schedule modal when a location is selected
      setSelectedLocation(value);
      setShowScheduleModal(true);
    }
  };

  const handleScheduleSave = async () => {
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
    
    // Refresh resource availabilities for all tagged departments when schedule changes
    if (formData.startDate && formData.taggedDepartments.length > 0) {
      const updatedRequirements = { ...formData.departmentRequirements };
      
      for (const deptName of formData.taggedDepartments) {
        const availabilities = await fetchResourceAvailabilities(deptName, formData.startDate);
        const department = departments.find(dept => dept.name === deptName);
        
        if (department && department.requirements && updatedRequirements[deptName]) {
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
      }
      
      handleInputChange('departmentRequirements', updatedRequirements);
      console.log('✅ Refreshed resource availabilities for all departments after schedule change');
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
    console.log(`\n🔍 === FETCH RESOURCE AVAILABILITIES ===`);
    console.log(`📋 Department: ${departmentName}`);
    console.log(`📅 Date: ${date}`);
    
    if (!date) {
      console.log(`❌ No date provided`);
      return [];
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const department = departments.find(dept => dept.name === departmentName);
      
      console.log(`🏢 Department found:`, department);
      console.log(`🔑 Token exists: ${!!token}`);
      
      if (!department) {
        console.log(`❌ Department not found in departments list`);
        return [];
      }
      
      // Fix timezone issue - use local date instead of UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log(`📅 Original date: ${date}`);
      console.log(`📅 Date string (timezone-safe): ${dateStr}`);
      
      const apiUrl = `${API_BASE_URL}/resource-availability/department/${department._id}/availability?startDate=${dateStr}&endDate=${dateStr}`;
      console.log(`🌐 API URL: ${apiUrl}`);
      
      // Log API request details
      console.log(`🔍 API Request: ${apiUrl}`);
      
      const response = await axios.get(apiUrl,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`🔍 Resource availabilities for ${departmentName} on ${dateStr}:`, response.data);
      console.log(`📊 Number of availability records found: ${response.data?.length || 0}`);
      
      // Log each availability record for debugging
      if (response.data && response.data.length > 0) {
        response.data.forEach((avail: any, index: number) => {
          console.log(`   📦 Record ${index + 1}: ${avail.requirementText} - Quantity: ${avail.quantity}, ID: ${avail.requirementId}`);
        });
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching resource availabilities:', error);
      return [];
    }
  };

  const handleDepartmentToggle = async (departmentName: string) => {
    try {
      console.log(`🏢 Department selected: ${departmentName}`);
      console.log(`📅 Schedule: ${formData.startDate} ${formData.startTime}-${formData.endTime} at ${formData.location}`);
    
    // If department is being selected, open requirements modal
    if (!formData.taggedDepartments.includes(departmentName)) {
      setSelectedDepartment(departmentName);
      
      // Fetch conflicting events if date and time are set
      if (formData.startDate && formData.startTime && formData.endTime) {
        console.log('🔍 Checking conflicts for:', formData.startDate, formData.startTime, '-', formData.endTime, 'at', formData.location);
        await fetchConflictingEvents(formData.startDate, formData.startTime, formData.endTime, formData.location);
      }
      
      // Fetch resource availabilities for the selected date
      let availabilities: any[] = [];
      if (formData.startDate) {
        console.log(`🚀 Fetching resource availabilities for ${departmentName} on ${formData.startDate}`);
        availabilities = await fetchResourceAvailabilities(departmentName, formData.startDate);
        console.log(`📦 Availabilities fetched:`, availabilities);
      } else {
        console.log(`❌ No startDate set - skipping availability fetch`);
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
            
            console.log(`📦 Processing requirement: ${req.text}`);
            console.log(`   🔍 Availability found:`, availability);
            console.log(`   📊 Availability quantity: ${availability?.quantity}`);
            console.log(`   📊 Availability status: ${availability?.isAvailable}`);
            
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
        
        console.log('✅ Department requirements loaded with availability data:', dbRequirements);
        console.log(`📊 Total requirements with availability: ${dbRequirements.length}`);
      } else {
        // No requirements found or no availability data for this date
        const newRequirements = { ...formData.departmentRequirements };
        newRequirements[departmentName] = [];
        handleInputChange('departmentRequirements', newRequirements);
        
        console.log(`❌ No availability data found for ${departmentName} on ${formData.startDate?.toDateString()}`);
      }
    } else {
      // If unchecking, remove from tagged departments
      const updatedDepartments = formData.taggedDepartments.filter(d => d !== departmentName);
      handleInputChange('taggedDepartments', updatedDepartments);
    }
    } catch (error) {
      console.error('🚨 ERROR in handleDepartmentToggle:', error);
    }
  };

  // Fetch available dates for a department
  const fetchAvailableDates = async (departmentName: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const department = departments.find(dept => dept.name === departmentName);
      
      if (!department) {
        console.log(`❌ Department not found: ${departmentName}`);
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

      console.log(`📅 Available dates for ${departmentName}:`, response.data);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching available dates:', error);
      return [];
    }
  };

  const handleViewAvailableDates = async (departmentName: string) => {
    console.log(`🔍 Fetching available dates for ${departmentName}`);
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
        notes: ''
      };
      
      const updatedReqs = [...currentReqs, newRequirement];
      const newDeptReqs = { ...formData.departmentRequirements };
      newDeptReqs[selectedDepartment] = updatedReqs;
      handleInputChange('departmentRequirements', newDeptReqs);
      
      setCustomRequirement('');
    }
  };

  const handleSaveRequirements = () => {
    // Check if at least one requirement is selected
    const selectedReqs = formData.departmentRequirements[selectedDepartment]?.filter(req => req.selected) || [];
    
    if (selectedReqs.length === 0) {
      toast.error('Please select at least one requirement for this department.');
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
    console.log(`Requirements saved for ${selectedDepartment}:`, selectedReqs);
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
      
      // Filter events that conflict with the selected time AND location (for venue booking)
      const conflicts = events.filter((event: any) => {
        if (!event.startDate || !event.startTime || !event.endDate || !event.endTime) {
          return false;
        }
        
        // Only check conflicts for the SAME location (venue booking)
        if (event.location !== location) {
          return false;
        }
        
        const eventStartDate = new Date(event.startDate);
        
        // Check if there's a time conflict at the same venue
        const hasConflict = hasTimeConflict(
          startTime, endTime,
          event.startTime, event.endTime,
          date, eventStartDate
        );
        
        if (hasConflict) {
          console.log(`🏢 Venue conflict detected with event: "${event.eventTitle}" at ${event.location}`);
          console.log(`   📅 Event Date: ${new Date(event.startDate).toDateString()}`);
          console.log(`   ⏰ Event Time: ${event.startTime} - ${event.endTime}`);
          console.log(`   🆚 Requested Date: ${date.toDateString()}`);
          console.log(`   ⏰ Requested Time: ${startTime} - ${endTime}`);
        }
        
        return hasConflict;
      });
      
      return conflicts;
    } catch (error) {
      console.error('Error fetching venue conflicts:', error);
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
        
        if (hasConflict) {
          console.log(`⚠️ Time conflict detected with event: "${event.eventTitle}" at ${event.location}`);
          console.log(`   📅 Event Date: ${new Date(event.startDate).toDateString()}`);
          console.log(`   ⏰ Event Time: ${event.startTime} - ${event.endTime}`);
          console.log(`   🆚 Requested Date: ${date.toDateString()}`);
          console.log(`   ⏰ Requested Time: ${startTime} - ${endTime}`);
        }
        
        return hasConflict;
      });
      
      setConflictingEvents(conflicts);
      return conflicts;
    } catch (error) {
      console.error('Error fetching conflicting events:', error);
      setConflictingEvents([]);
      return [];
    }
  };

  // Calculate available quantity after subtracting conflicting bookings from ALL departments
  const getAvailableQuantity = (requirement: any, departmentName: string) => {
    let usedQuantity = 0;
    
    console.log(`🔍 Checking availability for "${requirement.name}" (Department: ${departmentName})`);
    console.log(`📅 Conflicting events found: ${conflictingEvents.length}`);
    
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
              console.log(`🔍 Found resource conflict: ${taggedDept} booked ${matchingReq.quantity} ${requirement.name}`);
              console.log(`   📋 Event: "${event.eventTitle}" at ${event.location}`);
              console.log(`   📅 Date: ${new Date(event.startDate).toDateString()}`);
              console.log(`   ⏰ Time: ${event.startTime} - ${event.endTime}`);
            }
          }
        });
      }
    });
    
    // Use the totalQuantity from the requirement object (which now contains the actual availability data)
    // This should be the updated quantity from resourceavailabilities collection (200) not the default (100)
    const totalAvailable = requirement.totalQuantity || 0;
    const availableQuantity = Math.max(0, totalAvailable - usedQuantity);
    
    console.log(`📊 ${requirement.name}: Total=${totalAvailable}, Used=${usedQuantity}, Available=${availableQuantity}`);
    console.log(`🔍 Requirement object totalQuantity: ${requirement.totalQuantity}`);
    
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
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please login to submit an event request.');
        return;
      }

      // Prepare form data for submission
      const formDataToSubmit = new FormData();
      
      // Basic event information
      formDataToSubmit.append('eventTitle', formData.eventTitle);
      formDataToSubmit.append('requestor', formData.requestor);
      formDataToSubmit.append('location', formData.location);
      formDataToSubmit.append('participants', formData.participants);
      formDataToSubmit.append('vip', formData.vip || '0');
      formDataToSubmit.append('vvip', formData.vvip || '0');
      formDataToSubmit.append('withoutGov', formData.withoutGov.toString());
      formDataToSubmit.append('multipleLocations', formData.multipleLocations.toString());
      formDataToSubmit.append('description', formData.description || '');
      
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
          console.log('Adding requestor department:', userDepartment);
        } catch (error) {
          console.error('Error parsing user data:', error);
          formDataToSubmit.append('requestorDepartment', 'Unknown');
        }
      } else {
        formDataToSubmit.append('requestorDepartment', 'Unknown');
      }
      
      // Department and requirements information
      formDataToSubmit.append('taggedDepartments', JSON.stringify(formData.taggedDepartments));
      
      // Filter to only include SELECTED requirements for each department
      const selectedRequirementsOnly: DepartmentRequirements = {};
      Object.keys(formData.departmentRequirements).forEach(deptName => {
        const selectedReqs = formData.departmentRequirements[deptName]?.filter(req => req.selected) || [];
        if (selectedReqs.length > 0) {
          selectedRequirementsOnly[deptName] = selectedReqs;
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
      if (formData.withoutGov && govFiles.availableForDL) {
        formDataToSubmit.append('availableForDL', govFiles.availableForDL);
      }
      if (formData.withoutGov && govFiles.programme) {
        formDataToSubmit.append('programme', govFiles.programme);
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type for FormData, let browser set it with boundary
      };

      console.log('📤 Submitting event request...');
      console.log('🔍 Selected requirements only:', selectedRequirementsOnly);
      console.log('🔍 Tagged departments:', formData.taggedDepartments);
      console.log('🔍 Form data keys:', Array.from(formDataToSubmit.keys()));
      console.log('📅 Date formatting debug:', {
        originalStartDate: formData.startDate,
        formattedStartDate: formatDateOnly(formData.startDate),
        originalEndDate: formData.endDate,
        formattedEndDate: formatDateOnly(formData.endDate),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      const response = await axios.post(`${API_BASE_URL}/events`, formDataToSubmit, { headers });

      if (response.data.success) {
        toast.success('Event request submitted successfully!', {
          description: 'Your event request has been sent for approval.'
        });
        console.log('Event created:', response.data.data);
        
        // Navigate to My Events page after successful submission
        setTimeout(() => {
          navigate('/users/my-events');
        }, 1500); // Wait 1.5 seconds to show the success toast
      }
    } catch (error: any) {
      console.error('Error submitting event request:', error);
      toast.error('Failed to submit event request', {
        description: error.response?.data?.message || 'Please try again later.'
      });
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

  // Check if a specific time slot is booked for the selected location and date
  const isTimeSlotBooked = (timeSlot: string) => {
    if (!formData.startDate || !formData.location || conflictingEvents.length === 0) {
      return false;
    }

    return conflictingEvents.some(event => {
      // For venue conflicts, only check the SAME location
      if (event.location !== formData.location) return false;
      
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
    console.log(`\n🚀 === REQUIREMENT CONFLICT CHECK START ===`);
    console.log(`🕐 Time slot: ${timeSlot}`);
    console.log(`📍 Location: ${formData.location}`);
    console.log(`📅 Date: ${formData.startDate}`);
    console.log(`🔍 Conflicting events count: ${conflictingEvents.length}`);
    console.log(`🎯 Show Schedule Modal: ${showScheduleModal}`);
    console.log(`🎯 Show Requirements Modal: ${showRequirementsModal}`);
    console.log(`🎯 Selected Department: ${selectedDepartment}`);
    
    if (!formData.startDate || !formData.location || conflictingEvents.length === 0) {
      console.log(`❌ Early exit - missing data or no conflicts`);
      console.log(`   startDate: ${formData.startDate}`);
      console.log(`   location: ${formData.location}`);
      console.log(`   conflictingEvents: ${conflictingEvents.length}`);
      return { hasConflict: false, conflictedRequirements: [] };
    }

    const conflictedRequirements: string[] = [];

    // Check each conflicting event to see if it uses any requirements at this time slot
    conflictingEvents.forEach(event => {
      console.log(`\n📋 Checking event: "${event.eventTitle}" at ${event.location}`);
      
      // For requirement conflicts, check ALL locations on the same date
      // (Requirements are shared resources that can't be used simultaneously)
      console.log(`  ✅ Checking requirements across all locations (shared resources)`);
      console.log(`  📍 Event location: ${event.location}, Current location: ${formData.location}`);
      
      // Convert times to minutes for easier comparison
      const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      };
      
      const slotMinutes = timeToMinutes(timeSlot);
      const eventStartMinutes = timeToMinutes(event.startTime);
      const eventEndMinutes = timeToMinutes(event.endTime);
      
      console.log(`  ⏰ Time check: ${timeSlot} (${slotMinutes}min) vs ${event.startTime}-${event.endTime} (${eventStartMinutes}-${eventEndMinutes}min)`);
      
      // Check if this time slot overlaps with the event
      const timeOverlaps = slotMinutes >= eventStartMinutes && slotMinutes <= eventEndMinutes;
      
      if (!timeOverlaps) {
        console.log(`  ❌ No time overlap`);
        return;
      }

      console.log(`  ✅ Time overlaps! Checking if event has any requirements...`);
      console.log(`  📋 Event tagged departments:`, event.taggedDepartments);
      console.log(`  📋 Event department requirements:`, event.departmentRequirements);

      // Check if this event uses ANY requirements
      if (event.taggedDepartments && event.departmentRequirements) {
        event.taggedDepartments.forEach((dept: string) => {
          const deptReqs = event.departmentRequirements[dept] || [];
          console.log(`    🏢 Checking dept ${dept} requirements:`, deptReqs);
          
          deptReqs.forEach((eventReq: any) => {
            const isSelected = eventReq.selected;
            const hasQuantity = eventReq.quantity > 0;
            
            console.log(`      📦 ${eventReq.name}: selected=${isSelected}, quantity=${eventReq.quantity}`);
            
            if (isSelected && hasQuantity) {
              const reqName = `${eventReq.name} (${dept})`;
              if (!conflictedRequirements.includes(reqName)) {
                conflictedRequirements.push(reqName);
                console.log(`      ✅ REQUIREMENT CONFLICT: ${reqName}`);
              }
            }
          });
        });
      } else {
        console.log(`  ❌ No department requirements found`);
      }
    });

    const result = { 
      hasConflict: conflictedRequirements.length > 0, 
      conflictedRequirements 
    };
    
    console.log(`🎯 Final result for ${timeSlot}:`, result);
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold">Request Event</h1>
          <p className="text-sm text-muted-foreground">Create a new event request</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Step {currentStep} of {steps.length}
        </Badge>
      </motion.div>

      {/* Modern Progress Stepper */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep || 
                                (step.id === 2 && isAttachmentsCompleted) ||
                                (step.id === 6 && isFormReadyToSubmit());
              
              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
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
                        isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-4">
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
                  <FileText className="w-5 h-5 text-blue-600" />
                  Event Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Row 1: Title */}
                <div>
                  <Label htmlFor="eventTitle" className="text-sm font-medium">Event Title *</Label>
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
                    <Label htmlFor="requestor" className="text-sm font-medium">Requestor *</Label>
                    <Input
                      id="requestor"
                      placeholder="Enter requestor name"
                      value={formData.requestor}
                      onChange={(e) => handleInputChange('requestor', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-sm font-medium">Location *</Label>
                    {!showCustomLocation ? (
                      <Select onValueChange={handleLocationChange}>
                        <SelectTrigger className="mt-1 h-9">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
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
                    <Label htmlFor="participants" className="text-sm font-medium">Participants *</Label>
                    <Input
                      id="participants"
                      type="number"
                      placeholder="0"
                      value={formData.participants}
                      onChange={(e) => handleInputChange('participants', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vip" className="text-sm font-medium">VIP</Label>
                    <Input
                      id="vip"
                      type="number"
                      placeholder="0"
                      value={formData.vip}
                      onChange={(e) => handleInputChange('vip', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vvip" className="text-sm font-medium">VVIP</Label>
                    <Input
                      id="vvip"
                      type="number"
                      placeholder="0"
                      value={formData.vvip}
                      onChange={(e) => handleInputChange('vvip', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="withoutGov" className="text-sm font-medium">w/o gov</Label>
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
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
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
                  Attachments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="noAttachments"
                    checked={formData.noAttachments}
                    onCheckedChange={(checked) => handleInputChange('noAttachments', checked as boolean)}
                  />
                  <Label htmlFor="noAttachments" className="text-sm">No attachments needed</Label>
                </div>

                {!formData.noAttachments && (
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
                                              <span className="text-xs bg-blue-200 px-1 py-0.5 rounded">
                                                {req.type === 'physical' ? '📦' : '🔧'}
                                              </span>
                                            )}
                                            {req.notes && req.notes.trim() && (
                                              <StickyNote className="w-2 h-2" />
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                          <span>Available: {req.totalQuantity || 'N/A'}</span>
                                          <span className={`flex items-center gap-1 ${
                                            req.isAvailable ? 'text-green-700' : 'text-red-700'
                                          }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${
                                              req.isAvailable ? 'bg-green-500' : 'bg-red-500'
                                            }`}></div>
                                            {req.isAvailable ? 'Available' : 'Unavailable'}
                                          </span>
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
                          {formData.location && (
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
                          {formData.location && (
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
            onClick={handleSubmitEventRequest}
            disabled={!isFormReadyToSubmit()}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            <Send className="w-4 h-4" />
            Submit Request
          </Button>
        </motion.div>
      )}

      {/* Navigation for other steps */}
      {currentStep !== 3 && currentStep !== 5 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between pt-4"
        >
          <Button variant="outline" disabled>
            Previous
          </Button>
          <Button onClick={() => setCurrentStep(3)} className="gap-2">
            Continue to Tag Departments
            <ChevronRight className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Requirements Modal */}
      <Dialog open={showRequirementsModal} onOpenChange={setShowRequirementsModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <DialogTitle className="text-lg font-medium">
                  Requirements - {selectedDepartment}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Select requirements for this department
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
                </DialogDescription>
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
                              ) : (
                                <><Settings className="w-3 h-3" /> Service</>
                              )}
                            </div>
                          </Badge>
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
                            <span className={`flex items-center gap-1 ${
                              requirement.isAvailable ? 'text-green-600' : 'text-red-600'
                            }`}>
                              <div className={`w-2 h-2 rounded-full ${
                                requirement.isAvailable ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              {requirement.isAvailable ? 'Available' : 'Unavailable'}
                            </span>
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
            <div className="mb-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter custom requirement..."
                  value={customRequirement}
                  onChange={(e) => setCustomRequirement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomRequirement()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddCustomRequirement}
                  disabled={!customRequirement.trim()}
                  variant="outline"
                  size="sm"
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Selected Requirements */}
          {formData.departmentRequirements[selectedDepartment]?.filter(req => req.selected).length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Selected Requirements</h3>
              <div className="flex flex-wrap gap-2">
                {formData.departmentRequirements[selectedDepartment]
                  ?.filter(req => req.selected)
                  .map((requirement) => (
                  <div key={requirement.id} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1">
                    <span className="text-sm text-gray-700">
                      {requirement.name}
                      {requirement.type === 'physical' && requirement.quantity && (
                        <span className={`font-medium ml-1 ${
                          requirement.totalQuantity && requirement.quantity > requirement.totalQuantity
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}>
                          ({requirement.quantity}
                          {requirement.totalQuantity && requirement.quantity > requirement.totalQuantity && (
                            <AlertTriangle className="w-3 h-3 text-red-500 inline ml-1" />
                          )})
                        </span>
                      )}
                    </span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-5 w-5 p-0 hover:text-blue-600 ${
                            (requirement.type === 'physical' && requirement.quantity) || 
                            (requirement.type === 'service' && requirement.notes?.trim())
                              ? 'text-blue-600 bg-blue-50' 
                              : 'text-gray-500'
                          }`}
                          title={
                            requirement.type === 'physical' 
                              ? (requirement.quantity ? `Quantity: ${requirement.quantity}` : 'Set Quantity')
                              : (requirement.notes?.trim() ? 'Edit Notes' : 'Add Notes')
                          }
                        >
                          {requirement.type === 'physical' ? (
                            <span className="text-xs font-bold">#</span>
                          ) : (
                            <StickyNote className="w-3 h-3" />
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-2">
                          {requirement.type === 'physical' ? (
                            <>
                              <h4 className="font-medium text-sm">Quantity for {requirement.name}</h4>
                              <Input
                                type="number"
                                placeholder="Enter quantity needed..."
                                value={requirement.quantity || ''}
                                onChange={(e) => handleRequirementQuantity(requirement.id, parseInt(e.target.value) || 0)}
                                className={`text-sm ${
                                  requirement.quantity && (
                                    (conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
                                     hasRequirementConflict(requirement, selectedDepartment) &&
                                     requirement.quantity > getAvailableQuantity(requirement, selectedDepartment)) ||
                                    ((!conflictingEvents.length || !formData.startDate || !formData.startTime || 
                                      !hasRequirementConflict(requirement, selectedDepartment)) && 
                                     requirement.quantity > (requirement.totalQuantity || 0))
                                  ) ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''
                                }`}
                                min="1"
                                max={
                                  conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
                                  hasRequirementConflict(requirement, selectedDepartment)
                                    ? getAvailableQuantity(requirement, selectedDepartment)
                                    : (requirement.totalQuantity || undefined)
                                }
                              />
                              {requirement.quantity && (
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
                                <p className="text-xs text-gray-500">
                                  Enter the number of {requirement.name.toLowerCase()} you need
                                  {' (Available: '}
                                  {conflictingEvents.length > 0 && formData.startDate && formData.startTime && 
                                   hasRequirementConflict(requirement, selectedDepartment)
                                    ? `${getAvailableQuantity(requirement, selectedDepartment)} after conflicts`
                                    : (requirement.totalQuantity || 'N/A')
                                  })
                                </p>
                              )}
                            </>
                          ) : (
                            <>
                              <h4 className="font-medium text-sm">Notes for {requirement.name}</h4>
                              <Textarea
                                placeholder="Add specific notes or requirements..."
                                value={requirement.notes}
                                onChange={(e) => handleRequirementNotes(requirement.id, e.target.value)}
                                className="min-h-20 text-sm"
                              />
                            </>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
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
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select start time" />
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
                  <SelectTrigger className="w-full">
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

      {/* W/O Gov Files Modal */}
      <Dialog open={showGovModal} onOpenChange={setShowGovModal}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Government Files</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Upload required files for events without government officials
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {/* Briefer Template */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Briefer Template</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center hover:border-gray-300 transition-colors min-h-[120px] flex flex-col justify-center">
                {govFiles.brieferTemplate ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <Paperclip className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-900 truncate">{govFiles.brieferTemplate.name}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGovFileUpload('brieferTemplate', null)}
                      className="h-6 w-6 p-0 mx-auto"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 mb-2">Click to upload</p>
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
                      className="text-xs h-7"
                    >
                      Choose File
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Available for DL Briefer */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Available for DL</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center hover:border-gray-300 transition-colors min-h-[120px] flex flex-col justify-center">
                {govFiles.availableForDL ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <Paperclip className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-900 truncate">{govFiles.availableForDL.name}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGovFileUpload('availableForDL', null)}
                      className="h-6 w-6 p-0 mx-auto"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 mb-2">Click to upload</p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleGovFileUpload('availableForDL', file);
                      }}
                      className="hidden"
                      id="availableForDL"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('availableForDL')?.click()}
                      className="text-xs h-7"
                    >
                      Choose File
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Programme */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-700">Programme</Label>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-3 text-center hover:border-gray-300 transition-colors min-h-[120px] flex flex-col justify-center">
                {govFiles.programme ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <Paperclip className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-900 truncate">{govFiles.programme.name}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGovFileUpload('programme', null)}
                      className="h-6 w-6 p-0 mx-auto"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 mb-2">Click to upload</p>
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
                      className="text-xs h-7"
                    >
                      Choose File
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowGovModal(false);
                if (!govFiles.brieferTemplate && !govFiles.availableForDL && !govFiles.programme) {
                  handleInputChange('withoutGov', false);
                }
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => setShowGovModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-xs"
            >
              Done
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
                            // Set the date and close modal
                            const selectedDateObj = new Date(dateEntry.date);
                            handleInputChange('startDate', selectedDateObj);
                            handleInputChange('endDate', selectedDateObj);
                            setShowAvailableDatesModal(false);
                            
                            // Refresh requirements modal data with new date
                            if (selectedDepartment && formData.startDate) {
                              console.log(`🔄 Refreshing requirements data for ${selectedDepartment} on new date:`, selectedDateObj);
                              
                              // Fetch resource availabilities for the new date
                              const availabilities = await fetchResourceAvailabilities(selectedDepartment, selectedDateObj);
                              console.log(`📦 New availabilities fetched:`, availabilities);
                              
                              // Update the requirements modal with new availability data
                              const department = departments.find(dept => dept.name === selectedDepartment);
                              if (department && department.requirements && availabilities.length > 0) {
                                const dbRequirements = department.requirements
                                  .filter((req) => {
                                    const availability = availabilities.find((avail: any) => 
                                      avail.requirementId === req._id
                                    );
                                    return availability !== undefined;
                                  })
                                  .map((req) => {
                                    const availability = availabilities.find((avail: any) => 
                                      avail.requirementId === req._id
                                    );
                                    
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
                                
                                // Update the form data with refreshed requirements
                                const updatedRequirements = { ...formData.departmentRequirements };
                                updatedRequirements[selectedDepartment] = dbRequirements;
                                
                                setFormData(prev => ({
                                  ...prev,
                                  departmentRequirements: updatedRequirements
                                }));
                                
                                console.log(`✅ Requirements modal refreshed with ${dbRequirements.length} available requirements`);
                              }
                            }
                            
                            toast.success(`Date set to ${format(selectedDateObj, 'MMM dd, yyyy')} - Requirements updated!`);
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
    </div>
  );
};

export default RequestEventPage;

