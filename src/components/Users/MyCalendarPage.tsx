import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import CustomCalendar, { type CalendarEvent } from '@/components/ui/custom-calendar';
import RequirementAvailabilityModal from './RequirementAvailabilityModal';
import { useEventCount } from '@/hooks/useEventCount';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar as CalendarIcon, 
  CheckCircle,
  XCircle,
  Package,
  Settings,
  Trash2,
  X,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface ResourceAvailabilityData {
  _id: string;
  departmentId: string;
  departmentName: string;
  requirementId: string;
  requirementText: string;
  date: string;
  isAvailable: boolean;
  notes: string;
  quantity: number;
  maxCapacity: number;
}

const MyCalendarPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [availabilityData, setAvailabilityData] = useState<ResourceAvailabilityData[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showAvailableDialog, setShowAvailableDialog] = useState(false);
  const [showUnavailableDialog, setShowUnavailableDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSelectiveDateDeleteDialog, setShowSelectiveDateDeleteDialog] = useState(false);
  const [selectedDatesForDeletion, setSelectedDatesForDeletion] = useState<string[]>([]);
  const [isSelectingDatesMode, setIsSelectingDatesMode] = useState(false);
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(new Date());
  
  // Progress Modal States
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [progressOperation, setProgressOperation] = useState<'available' | 'unavailable' | 'delete' | ''>('');

  // Use the event count hook for badge functionality
  const { getEventCountForDate } = useEventCount({
    userDepartment: currentUser?.department || currentUser?.departmentName,
    filterByDepartment: true,
    includeAllStatuses: false
  });

  // Get current user and department info
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('Current user data:', user);
        setCurrentUser(user);
        
        // If user has department data with requirements, use it directly
        if (user.departmentData && user.departmentData.requirements) {
          console.log('Using department data from user:', user.departmentData);
          setRequirements(user.departmentData.requirements);
          setLoading(false);
        } else {
          // Fallback to API call
          fetchDepartmentRequirements(user.department || 'PGSO');
        }
        
        // Fetch events for calendar display
        fetchEvents();
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch department requirements
  const fetchDepartmentRequirements = async (departmentName: string) => {
    try {
      console.log('Attempting to fetch requirements for department:', departmentName);
      
      // Try API call first
      const departmentsResponse = await fetch('http://localhost:5000/api/departments/visible');
      if (!departmentsResponse.ok) {
        throw new Error(`API returned ${departmentsResponse.status}: ${departmentsResponse.statusText}`);
      }
      
      const departmentsData = await departmentsResponse.json();
      const departments = departmentsData.data || [];
      
      const department = departments.find((dept: any) => dept.name === departmentName);
      if (!department) {
        throw new Error(`Department '${departmentName}' not found in API response`);
      }

      console.log('Department found via API:', department);
      const departmentRequirements: Requirement[] = department.requirements || [];
      
      setRequirements(departmentRequirements);
      await fetchAvailabilityData(department._id);
    } catch (error) {
      console.error('API call failed, using fallback data:', error);
      
      // Fallback to hardcoded department data when API fails
      const fallbackDepartments: Record<string, Requirement[]> = {
        'PGSO': [
          { _id: '1', text: 'Office Supplies', type: 'physical', totalQuantity: 50, isActive: true, createdAt: '2025-10-04T08:07:55.800Z' },
          { _id: '2', text: 'Meeting Room', type: 'physical', totalQuantity: 3, isActive: true, createdAt: '2025-10-04T08:08:00.360Z' },
          { _id: '3', text: 'Administrative Staff', type: 'service', isActive: true, isAvailable: true, responsiblePerson: 'Admin Team', createdAt: '2025-10-04T08:08:04.543Z' },
          { _id: '4', text: 'Document Processing', type: 'service', isActive: true, isAvailable: true, responsiblePerson: 'Records Office', createdAt: '2025-10-04T08:08:11.058Z' }
        ],
        'PDRRMO': [
          { _id: '1', text: 'Mannequins', type: 'physical', totalQuantity: 10, isActive: true, createdAt: '2025-10-04T08:07:55.800Z' },
          { _id: '2', text: 'AED Training', type: 'service', isActive: true, isAvailable: true, responsiblePerson: 'Safety Team', createdAt: '2025-10-04T08:08:00.360Z' },
          { _id: '3', text: 'Safety briefing', type: 'service', isActive: true, isAvailable: true, responsiblePerson: 'Safety Officer', createdAt: '2025-10-04T08:08:04.543Z' },
          { _id: '4', text: 'Security Personnel (CSIU)', type: 'service', isActive: true, isAvailable: true, responsiblePerson: 'Security Chief', createdAt: '2025-10-04T08:08:11.058Z' }
        ]
      };
      
      const fallbackRequirements = fallbackDepartments[departmentName] || [
        { _id: '1', text: 'General Resource 1', type: 'physical', totalQuantity: 5, isActive: true, createdAt: '2025-10-04T08:07:55.800Z' },
        { _id: '2', text: 'General Resource 2', type: 'service', isActive: true, isAvailable: true, createdAt: '2025-10-04T08:08:00.360Z' }
      ];
      
      console.log(`Using fallback requirements for ${departmentName}:`, fallbackRequirements);
      setRequirements(fallbackRequirements);
      
      // Set empty availability data for fallback
      setAvailabilityData([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch events for calendar display
  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch('http://localhost:5000/api/events', {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const eventsData = await response.json();
      setEvents(eventsData.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    }
  };

  // Fetch availability data
  const fetchAvailabilityData = async (departmentId: string) => {
    try {
      // Fetch actual availability data from API
      const response = await fetch(`http://localhost:5000/api/resource-availability/department/${departmentId}/availability`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch availability data: ${response.statusText}`);
      }

      const availabilityData = await response.json();
      setAvailabilityData(availabilityData || []);
    } catch (error) {
      console.error('Error fetching availability data:', error);
      // Fallback to empty array on error
      setAvailabilityData([]);
    }
  };

  // Convert events to calendar events with colored cells and event titles
  const calendarEvents: CalendarEvent[] = [];
  
  // Group events by date first to avoid duplicates
  const eventsByDate: { [date: string]: any[] } = {};
  
  events.forEach((event) => {
    // Parse dates using local timezone to avoid UTC conversion issues
    const eventStartDate = new Date(event.startDate);
    const eventEndDate = new Date(event.endDate);
    
    console.log(`Processing Event: ${event.eventTitle}`);
    console.log(`Original startDate: ${event.startDate}`);
    console.log(`Parsed startDate: ${eventStartDate.toDateString()}`);
    console.log(`Tagged departments: ${JSON.stringify(event.taggedDepartments)}`);
    console.log(`Current user department: ${currentUser?.department}`);
    
    // Check if this event has bookings for the current user's department
    const hasBookingsForDepartment = event.taggedDepartments && 
      event.taggedDepartments.includes(currentUser?.department);
    
    console.log(`Has bookings for department: ${hasBookingsForDepartment}`);
    
    if (hasBookingsForDepartment) {
      // Create calendar events for each day the event spans
      const currentStartDate = new Date(eventStartDate);
      const currentEndDate = new Date(eventEndDate);
      
      // Reset time to avoid timezone issues
      currentStartDate.setHours(0, 0, 0, 0);
      currentEndDate.setHours(0, 0, 0, 0);
      
      const currentDate = new Date(currentStartDate);
      while (currentDate <= currentEndDate) {
        const dateString = currentDate.getFullYear() + '-' + 
                          String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(currentDate.getDate()).padStart(2, '0');
        
        if (!eventsByDate[dateString]) {
          eventsByDate[dateString] = [];
        }
        
        // Only add if not already in the array for this date
        const alreadyExists = eventsByDate[dateString].some(e => e._id === event._id);
        if (!alreadyExists) {
          eventsByDate[dateString].push(event);
          console.log(`Added event "${event.eventTitle}" to date ${dateString}`);
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  });
  
  // Debug: Show what we have grouped
  console.log('=== EVENTS GROUPED BY DATE ===');
  Object.keys(eventsByDate).forEach(date => {
    console.log(`Date ${date}: ${eventsByDate[date].length} events`);
    eventsByDate[date].forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.eventTitle} (ID: ${event._id})`);
    });
  });
  console.log('=== END GROUPING ===');
  
  // Now create separate calendar events for each event (to show vertically)
  Object.keys(eventsByDate).forEach(dateString => {
    const eventsForDate = eventsByDate[dateString];
    
    console.log(`Creating ${eventsForDate.length} separate calendar events for ${dateString}:`);
    
    eventsForDate.forEach((event, index) => {
      console.log(`  Creating event ${index + 1}: "${event.eventTitle}"`);
      
      calendarEvents.push({
        id: `${event._id}-${dateString}`,
        date: dateString,
        title: event.eventTitle,
        type: 'booking',
        notes: `Event: ${event.eventTitle} | Requestor: ${event.requestor} | Location: ${event.location}`
      });
    });
  });
  
  // Add availability data as secondary events (if no bookings exist for that date)
  availabilityData.forEach((availability) => {
    const existingBooking = calendarEvents.find(e => e.date === availability.date);
    
    if (!existingBooking) {
      const existingAvailability = calendarEvents.find(e => e.date === availability.date && e.type !== 'booking');
      
      if (existingAvailability) {
        // Update existing availability event
        const dayAvailability = availabilityData.filter(a => a.date === availability.date);
        const availableCount = dayAvailability.filter(a => a.isAvailable).length;
        const totalCount = dayAvailability.length;
        
        existingAvailability.title = `${availableCount}/${totalCount} Available`;
        existingAvailability.type = availableCount === totalCount ? 'available' : 
                                   availableCount === 0 ? 'unavailable' : 'custom';
      } else {
        // Create new availability event
        const dayAvailability = availabilityData.filter(a => a.date === availability.date);
        const availableCount = dayAvailability.filter(a => a.isAvailable).length;
        const totalCount = dayAvailability.length;
        
        calendarEvents.push({
          id: availability.date,
          date: availability.date,
          title: `${availableCount}/${totalCount} Available`,
          type: availableCount === totalCount ? 'available' : 
                availableCount === 0 ? 'unavailable' : 'custom',
          notes: `${availableCount} of ${totalCount} resources available`
        });
      }
    }
  });

  // Handle date selection
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  // Handle save availability
  const handleSaveAvailability = async (date: Date, availabilities: RequirementAvailability[]) => {
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      
      // Debug: Check token
      const token = localStorage.getItem('authToken');
      console.log('🔍 Token exists:', !!token);
      console.log('🔍 Token preview:', token?.substring(0, 20) + '...');
      console.log('🔍 Current user:', currentUser);
      
      // Get department info
      const departmentsResponse = await fetch('http://localhost:5000/api/departments/visible');
      if (!departmentsResponse.ok) {
        throw new Error(`Failed to fetch departments: ${departmentsResponse.statusText}`);
      }
      const departmentsData = await departmentsResponse.json();
      const departments = departmentsData.data || [];
      const department = departments.find((dept: any) => dept.name === (currentUser?.department || 'PGSO'));
      
      if (!department) {
        throw new Error('Department not found');
      }

      // Make actual API call to save availability
      const response = await fetch('http://localhost:5000/api/resource-availability/availability/bulk', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          departmentId: department._id,
          departmentName: department.name,
          date: dateString,
          requirements: availabilities.map(availability => ({
            requirementId: availability.requirementId,
            requirementText: availability.requirementText,
            isAvailable: availability.isAvailable,
            notes: availability.notes,
            quantity: availability.quantity,
            maxCapacity: availability.maxCapacity
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.log('🚨 Backend error response:', errorData);
        throw new Error(`Failed to save availability: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Availability saved successfully:', result);
      
      // Refresh availability data
      await fetchAvailabilityData(department._id);
      
    } catch (error) {
      console.error('Error saving availability:', error);
      throw error;
    }
  };

  // Get existing availabilities for selected date
  const getExistingAvailabilities = (date: Date): RequirementAvailability[] => {
    const dateString = format(date, 'yyyy-MM-dd');
    return availabilityData
      .filter(item => item.date === dateString)
      .map(item => ({
        requirementId: item.requirementId,
        requirementText: item.requirementText,
        isAvailable: item.isAvailable,
        notes: item.notes,
        quantity: item.quantity,
        maxCapacity: item.maxCapacity
      }));
  };

  // Get current and future dates in the calendar month being viewed (no past dates)
  const getCurrentAndFutureDates = (): string[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Reset time to start of day
    
    // Use the calendar month being viewed, not the real current month
    const viewedYear = calendarCurrentMonth.getFullYear();
    const viewedMonth = calendarCurrentMonth.getMonth();
    const daysInMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate();
    
    const dates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewedYear, viewedMonth, day);
      // Only include current and future dates (no past dates)
      if (date >= today) {
        dates.push(format(date, 'yyyy-MM-dd'));
      }
    }
    return dates;
  };

  // Bulk set all requirements available for current and future dates
  const handleBulkSetAvailable = async () => {
    if (!currentUser?.department || requirements.length === 0) {
      toast.error('No requirements found for your department.');
      return;
    }

    setShowAvailableDialog(false);
    setBulkLoading(true);
    
    // Show progress modal
    setProgressOperation('available');
    setProgressValue(0);
    setProgressText('Initializing...');
    setShowProgressModal(true);
    
    try {
      // Get department info
      const departmentsResponse = await fetch('http://localhost:5000/api/departments/visible');
      if (!departmentsResponse.ok) {
        throw new Error('Failed to fetch departments');
      }
      const departmentsData = await departmentsResponse.json();
      const departments = departmentsData.data || [];
      const department = departments.find((dept: any) => dept.name === currentUser.department);
      
      if (!department) {
        throw new Error('Department not found');
      }

      const futureDates = getCurrentAndFutureDates();
      setProgressText(`Processing ${futureDates.length} dates with ${requirements.length} requirements...`);

      // Process dates in batches to avoid overwhelming the server
      const batchSize = 5;
      const totalBatches = Math.ceil(futureDates.length / batchSize);
      
      for (let i = 0; i < futureDates.length; i += batchSize) {
        const batch = futureDates.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        
        setProgressText(`Processing batch ${currentBatch}/${totalBatches}...`);
        setProgressValue((currentBatch - 1) / totalBatches * 90); // Reserve 10% for final steps
        
        const batchPromises = batch.map(async (dateString: string) => {
          const availabilities = requirements.map(req => ({
            requirementId: req._id,
            requirementText: req.text,
            isAvailable: true,
            quantity: req.totalQuantity || 1,
            maxCapacity: req.totalQuantity || 1
          }));

          const response = await fetch('http://localhost:5000/api/resource-availability/availability/bulk', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              departmentId: department._id,
              departmentName: department.name,
              date: dateString,
              requirements: availabilities
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to set availability for ${dateString}`);
          }
          return response.json();
        });

        await Promise.all(batchPromises);
        console.log(`✅ Processed batch ${currentBatch}/${totalBatches}`);
      }

      // Refresh availability data
      setProgressText('Refreshing data...');
      setProgressValue(95);
      await fetchAvailabilityData(department._id);
      
      setProgressText('Complete!');
      setProgressValue(100);
      
      // Close progress modal after a short delay
      setTimeout(() => {
        setShowProgressModal(false);
        setProgressOperation('');
        setProgressValue(0);
        setProgressText('');
      }, 1500);
      
      toast.success(`Successfully set all ${requirements.length} requirements as AVAILABLE for ${futureDates.length} current/future days in ${format(calendarCurrentMonth, 'MMMM yyyy')}!`);
      
    } catch (error) {
      console.error('Error setting bulk availability:', error);
      toast.error(`Error setting bulk availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Close progress modal on error
      setShowProgressModal(false);
      setProgressOperation('');
      setProgressValue(0);
      setProgressText('');
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk set all requirements unavailable for current and future dates
  const handleBulkSetUnavailable = async () => {
    if (!currentUser?.department || requirements.length === 0) {
      toast.error('No requirements found for your department.');
      return;
    }

    setShowUnavailableDialog(false);
    setBulkLoading(true);
    
    // Show progress modal
    setProgressOperation('unavailable');
    setProgressValue(0);
    setProgressText('Initializing...');
    setShowProgressModal(true);
    
    try {
      // Get department info
      const departmentsResponse = await fetch('http://localhost:5000/api/departments/visible');
      if (!departmentsResponse.ok) {
        throw new Error('Failed to fetch departments');
      }
      const departmentsData = await departmentsResponse.json();
      const departments = departmentsData.data || [];
      const department = departments.find((dept: any) => dept.name === currentUser.department);
      
      if (!department) {
        throw new Error('Department not found');
      }

      const futureDates = getCurrentAndFutureDates();
      setProgressText(`Processing ${futureDates.length} dates with ${requirements.length} requirements...`);

      // Process dates in batches
      const batchSize = 5;
      const totalBatches = Math.ceil(futureDates.length / batchSize);
      
      for (let i = 0; i < futureDates.length; i += batchSize) {
        const batch = futureDates.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        
        setProgressText(`Processing batch ${currentBatch}/${totalBatches}...`);
        setProgressValue((currentBatch - 1) / totalBatches * 90); // Reserve 10% for final steps
        
        const batchPromises = batch.map(async (dateString: string) => {
          const availabilities = requirements.map(req => ({
            requirementId: req._id,
            requirementText: req.text,
            isAvailable: false,
            quantity: 0,
            maxCapacity: req.totalQuantity || 1
          }));

          const response = await fetch('http://localhost:5000/api/resource-availability/availability/bulk', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              departmentId: department._id,
              departmentName: department.name,
              date: dateString,
              requirements: availabilities
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to set availability for ${dateString}`);
          }
          return response.json();
        });

        await Promise.all(batchPromises);
        console.log(`✅ Processed batch ${currentBatch}/${totalBatches}`);
      }

      // Refresh availability data
      setProgressText('Refreshing data...');
      setProgressValue(95);
      await fetchAvailabilityData(department._id);
      
      setProgressText('Complete!');
      setProgressValue(100);
      
      // Close progress modal after a short delay
      setTimeout(() => {
        setShowProgressModal(false);
        setProgressOperation('');
        setProgressValue(0);
        setProgressText('');
      }, 1500);
      
      toast.success(`Successfully set all ${requirements.length} requirements as UNAVAILABLE for ${futureDates.length} current/future days in ${format(calendarCurrentMonth, 'MMMM yyyy')}!`);
      
    } catch (error) {
      console.error('Error setting bulk unavailability:', error);
      toast.error(`Error setting bulk unavailability: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Close progress modal on error
      setShowProgressModal(false);
      setProgressOperation('');
      setProgressValue(0);
      setProgressText('');
    } finally {
      setBulkLoading(false);
    }
  };

  // Delete all availability data for the current month
  const handleDeleteAllAvailability = async () => {
    if (!currentUser?.department || requirements.length === 0) {
      toast.error('No requirements found for your department.');
      return;
    }

    setShowDeleteDialog(false);
    setBulkLoading(true);
    
    // Show progress modal
    setProgressOperation('delete');
    setProgressValue(0);
    setProgressText('Initializing deletion...');
    setShowProgressModal(true);
    
    try {
      // Get department info
      const departmentsResponse = await fetch('http://localhost:5000/api/departments/visible');
      if (!departmentsResponse.ok) {
        throw new Error('Failed to fetch departments');
      }
      const departmentsData = await departmentsResponse.json();
      const departments = departmentsData.data || [];
      const department = departments.find((dept: any) => dept.name === currentUser.department);
      
      if (!department) {
        throw new Error('Department not found');
      }

      // Get all dates in the calendar month being viewed (including past dates for deletion)
      const viewedYear = calendarCurrentMonth.getFullYear();
      const viewedMonth = calendarCurrentMonth.getMonth();
      const daysInMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate();
      
      const allDates: string[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(viewedYear, viewedMonth, day);
        allDates.push(format(date, 'yyyy-MM-dd'));
      }

      setProgressText(`Deleting availability data for ${allDates.length} dates...`);
      setProgressValue(25);

      // Use bulk delete endpoint for better performance
      const response = await fetch(`http://localhost:5000/api/resource-availability/department/${department._id}/bulk-dates`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dates: allDates
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to delete availability data: ${response.statusText}`);
      }

      setProgressText('Processing deletion results...');
      setProgressValue(70);

      const result = await response.json();
      console.log(`✅ Bulk delete completed: ${result.totalDeleted} records deleted, ${result.protectedDates} dates protected`);

      // Refresh availability data
      setProgressText('Refreshing data...');
      setProgressValue(90);
      await fetchAvailabilityData(department._id);
      
      // Show appropriate success message based on results
      if (result.protectedDates > 0) {
        toast.success(
          `Cleared ${result.totalDeleted} availability records! ${result.protectedDates} dates were protected due to active bookings.`,
          { duration: 6000 }
        );
        
        // Show additional info about protected dates
        if (result.protectedDatesList && result.protectedDatesList.length > 0) {
          setTimeout(() => {
            toast.info(
              `Protected dates: ${result.protectedDatesList.slice(0, 5).join(', ')}${result.protectedDatesList.length > 5 ? '...' : ''}`,
              { duration: 5000 }
            );
          }, 1000);
        }
      } else {
        toast.success(`Successfully deleted all availability data for ${format(calendarCurrentMonth, 'MMMM yyyy')}! Calendar has been cleared.`);
      }
      
      setProgressText('Complete!');
      setProgressValue(100);
      
      // Close progress modal after a short delay
      setTimeout(() => {
        setShowProgressModal(false);
        setProgressOperation('');
        setProgressValue(0);
        setProgressText('');
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting availability data:', error);
      toast.error(`Error deleting availability data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Close progress modal on error
      setShowProgressModal(false);
      setProgressOperation('');
      setProgressValue(0);
      setProgressText('');
    } finally {
      setBulkLoading(false);
    }
  };

  // Toggle date selection mode
  const toggleDateSelectionMode = () => {
    setIsSelectingDatesMode(!isSelectingDatesMode);
    if (!isSelectingDatesMode) {
      setSelectedDatesForDeletion([]);
      toast.info('Click on calendar dates to select them for deletion. Click "Select Dates" again to exit selection mode.');
    } else {
      setSelectedDatesForDeletion([]);
      toast.info('Selection mode cancelled.');
    }
  };

  // Handle date click for selection
  const handleDateClickForSelection = (date: Date) => {
    if (!isSelectingDatesMode) {
      // Normal date click - open modal
      handleDateClick(date);
      return;
    }

    // Date selection mode - toggle date selection
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if this date has availability data
    const hasData = availabilityData.some(item => item.date === dateStr);
    if (!hasData) {
      toast.error('No availability data found for this date.');
      return;
    }

    setSelectedDatesForDeletion(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr];
      }
    });
  };


  // Handle selective date deletion
  const handleSelectiveDateDeletion = async () => {
    if (selectedDatesForDeletion.length === 0) {
      toast.error('Please select at least one date to delete.');
      return;
    }

    if (!currentUser?.department || requirements.length === 0) {
      toast.error('No requirements found for your department.');
      return;
    }

    setShowSelectiveDateDeleteDialog(false);
    setBulkLoading(true);
    
    // Show progress modal
    setProgressOperation('delete');
    setProgressValue(0);
    setProgressText('Initializing selective deletion...');
    setShowProgressModal(true);
    
    try {
      // Get department info
      const departmentsResponse = await fetch('http://localhost:5000/api/departments/visible');
      if (!departmentsResponse.ok) {
        throw new Error('Failed to fetch departments');
      }
      const departmentsData = await departmentsResponse.json();
      const departments = departmentsData.data || [];
      const department = departments.find((dept: any) => dept.name === currentUser.department);
      
      if (!department) {
        throw new Error('Department not found');
      }

      setProgressText(`Deleting availability data for ${selectedDatesForDeletion.length} selected dates...`);
      setProgressValue(25);

      // Use bulk delete endpoint for selected dates
      const response = await fetch(`http://localhost:5000/api/resource-availability/department/${department._id}/bulk-dates`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          dates: selectedDatesForDeletion
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to delete availability data: ${response.statusText}`);
      }

      setProgressText('Processing deletion results...');
      setProgressValue(70);

      const result = await response.json();
      console.log(`✅ Selective delete completed: ${result.totalDeleted} records deleted, ${result.protectedDates} dates protected`);

      // Refresh availability data
      setProgressText('Refreshing data...');
      setProgressValue(90);
      await fetchAvailabilityData(department._id);
      
      setProgressText('Complete!');
      setProgressValue(100);
      
      // Close progress modal after a short delay
      setTimeout(() => {
        setShowProgressModal(false);
        setProgressOperation('');
        setProgressValue(0);
        setProgressText('');
      }, 1500);
      
      // Clear selected dates and exit selection mode
      setSelectedDatesForDeletion([]);
      setIsSelectingDatesMode(false);
      
      // Show appropriate success message
      if (result.protectedDates > 0) {
        toast.success(
          `Cleared ${result.totalDeleted} availability records from ${selectedDatesForDeletion.length} selected dates! ${result.protectedDates} dates were protected due to active bookings.`,
          { duration: 6000 }
        );
        
        // Show additional info about protected dates
        if (result.protectedDatesList && result.protectedDatesList.length > 0) {
          setTimeout(() => {
            toast.info(
              `Protected dates: ${result.protectedDatesList.slice(0, 5).join(', ')}${result.protectedDatesList.length > 5 ? '...' : ''}`,
              { duration: 5000 }
            );
          }, 1000);
        }
      } else {
        toast.success(`Successfully deleted availability data for ${selectedDatesForDeletion.length} selected dates!`);
      }
      
    } catch (error) {
      console.error('Error deleting selected dates:', error);
      toast.error(`Error deleting selected dates: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Close progress modal on error
      setShowProgressModal(false);
      setProgressOperation('');
      setProgressValue(0);
      setProgressText('');
    } finally {
      setBulkLoading(false);
    }
  };


  // Calculate summary stats for the viewed month
  const totalRequirements = requirements.length;
  const viewedMonthData = availabilityData.filter(item => {
    const itemDate = new Date(item.date + 'T00:00:00');
    return itemDate.getFullYear() === calendarCurrentMonth.getFullYear() && 
           itemDate.getMonth() === calendarCurrentMonth.getMonth();
  });
  const availableInMonth = viewedMonthData.filter(item => item.isAvailable).length;
  const unavailableInMonth = viewedMonthData.filter(item => !item.isAvailable).length;

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
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
                My Calendar
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your department's resource availability
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Package className="w-3 h-3 text-blue-600" />
                Total Resources: {totalRequirements}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                Available: {availableInMonth}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <XCircle className="w-3 h-3 text-red-600" />
                Unavailable: {unavailableInMonth}
              </Badge>
            </div>
          </motion.div>

          {/* Bulk Availability Management - Minimalist ShadCN Design */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border rounded-lg p-6 bg-card"
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">Bulk Management</h3>
                  <Badge variant="secondary" className="text-xs">
                    {format(calendarCurrentMonth, 'MMM yyyy')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Manage all {totalRequirements} requirements for current and future dates
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Clear All */}
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={bulkLoading || totalRequirements === 0}
                      className="h-8 text-xs"
                    >
                      {bulkLoading ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
                      ) : (
                        <Trash2 className="w-3 h-3 mr-2" />
                      )}
                      Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2 text-sm">
                        <p>This will permanently delete all availability data for {format(calendarCurrentMonth, 'MMMM yyyy')}.</p>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-green-800 text-xs">
                            <Shield className="w-3 h-3 inline mr-1" /> <strong>Smart Protection:</strong> Dates with active bookings will be automatically protected.
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAllAvailability}>
                        Clear All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Select Dates for Deletion */}
                <Button
                  variant={isSelectingDatesMode ? "default" : "outline"}
                  size="sm"
                  disabled={availabilityData.length === 0}
                  onClick={toggleDateSelectionMode}
                  className={`h-8 text-xs ${isSelectingDatesMode ? 'bg-orange-600 hover:bg-orange-700' : 'bg-orange-50 hover:bg-orange-100 border-orange-200'}`}
                >
                  {isSelectingDatesMode ? (
                    <>
                      <X className="w-3 h-3 mr-2" />
                      Exit Selection ({selectedDatesForDeletion.length})
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="w-3 h-3 mr-2" />
                      Select Dates
                    </>
                  )}
                </Button>

                {/* Delete Selected Dates */}
                {selectedDatesForDeletion.length > 0 && (
                  <AlertDialog open={showSelectiveDateDeleteDialog} onOpenChange={setShowSelectiveDateDeleteDialog}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-8 text-xs"
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Delete Selected ({selectedDatesForDeletion.length})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Dates</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 text-sm">
                          <p>This will permanently delete all availability data for the {selectedDatesForDeletion.length} selected date{selectedDatesForDeletion.length !== 1 ? 's' : ''}:</p>
                          <div className="p-3 bg-gray-50 border rounded-md max-h-32 overflow-y-auto">
                            <div className="flex flex-wrap gap-1">
                              {selectedDatesForDeletion.map(dateStr => (
                                <Badge key={dateStr} variant="secondary" className="text-xs">
                                  {format(new Date(dateStr + 'T00:00:00'), 'MMM dd')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-green-800 text-xs">
                              <Shield className="w-3 h-3 inline mr-1" /> <strong>Smart Protection:</strong> Dates with active bookings will be automatically protected.
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSelectiveDateDeletion}>
                          Delete Selected
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}


                {/* Set Available */}
                <AlertDialog open={showAvailableDialog} onOpenChange={setShowAvailableDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      disabled={bulkLoading || totalRequirements === 0}
                      className="h-8 text-xs bg-green-600 hover:bg-green-700"
                    >
                      {bulkLoading ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
                      ) : (
                        <CheckCircle className="w-3 h-3 mr-2" />
                      )}
                      Set Available
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Set All Available</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2 text-sm">
                        <p>Set all {totalRequirements} requirements as available for current and future dates in {format(calendarCurrentMonth, 'MMMM yyyy')}.</p>
                        <p className="text-xs text-muted-foreground">Past dates will not be affected.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleBulkSetAvailable}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Set Available
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Set Unavailable */}
                <AlertDialog open={showUnavailableDialog} onOpenChange={setShowUnavailableDialog}>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={bulkLoading || totalRequirements === 0}
                      className="h-8 text-xs"
                    >
                      {bulkLoading ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
                      ) : (
                        <XCircle className="w-3 h-3 mr-2" />
                      )}
                      Set Unavailable
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Set All Unavailable</AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2 text-sm">
                        <p>Set all {totalRequirements} requirements as unavailable for current and future dates in {format(calendarCurrentMonth, 'MMMM yyyy')}.</p>
                        <p className="text-xs text-muted-foreground">Past dates will not be affected.</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkSetUnavailable}>
                        Set Unavailable
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Loading State */}
              {bulkLoading && (
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md">
                  <div className="animate-spin rounded-full h-4 w-4 border-b border-current"></div>
                  <span className="text-xs text-muted-foreground">
                    Processing bulk update for {format(calendarCurrentMonth, 'MMMM yyyy')}...
                  </span>
                </div>
              )}
            </div>
          </motion.div>

          <Separator />

          {/* Selection Mode Status */}
          {isSelectingDatesMode && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <CalendarIcon className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-orange-800">
                <strong>Date Selection Mode:</strong> Click calendar dates to select them for deletion. {selectedDatesForDeletion.length} date{selectedDatesForDeletion.length !== 1 ? 's' : ''} selected.
              </span>
            </div>
          )}

          {/* Custom Calendar Component */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading resources...</span>
            </div>
          ) : (
            <CustomCalendar
              events={calendarEvents}
              onDateClick={handleDateClickForSelection}
              onMonthChange={setCalendarCurrentMonth}
              showNavigation={true}
              showLegend={true}
              cellHeight="min-h-[140px]"
              showEventCount={true}
              getEventCountForDate={getEventCountForDate}
              selectedDates={isSelectingDatesMode ? selectedDatesForDeletion : []}
              isSelectionMode={isSelectingDatesMode}
            />
          )}
        </CardContent>
      </Card>

      {/* Requirement Availability Modal */}
      <RequirementAvailabilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        departmentId={currentUser?.departmentId || 'pgso-dept-id'}
        departmentName={currentUser?.department || 'PGSO'}
        requirements={requirements}
        onSave={handleSaveAvailability}
        existingAvailabilities={selectedDate ? getExistingAvailabilities(selectedDate) : []}
      />

      {/* Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={setShowProgressModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {progressOperation === 'available' && 'Setting Requirements Available'}
              {progressOperation === 'unavailable' && 'Setting Requirements Unavailable'}
              {progressOperation === 'delete' && 'Clearing Availability Data'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progressValue)}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {progressText}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyCalendarPage;
