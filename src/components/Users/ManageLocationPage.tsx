import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import CustomCalendar, { type CalendarEvent } from '@/components/ui/custom-calendar';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { 
  MapPin, 
  Calendar as CalendarIcon, 
  Plus,
  Building2,
  Save,
  Trash2,
  Lock,
  X,
  Filter,
  ChevronDown,
  Clock,
  Users,
  Eye,
  FileDown,
  Printer,
  RefreshCw,
  Settings,
  Shield,
  MapPinIcon
} from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';

// Import Swiper styles
import 'swiper/swiper-bundle.css';
import '../../styles/swiper-custom.css';

const API_BASE_URL = 'http://localhost:5000/api';

interface LocationAvailability {
  _id?: string;
  date: string;
  locationName: string;
  capacity: number;
  description: string;
  status: 'available' | 'unavailable';
  departmentName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface LocationBooking {
  eventId: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment: string;
  startTime: string;
  endTime: string;
  participants: number;
  vip?: number;
  vvip?: number;
  status: string;
}


const ManageLocationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [locationAvailabilities, setLocationAvailabilities] = useState<LocationAvailability[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [formData, setFormData] = useState({
    locationName: '',
    capacity: '',
    description: '',
    status: 'available' as 'available' | 'unavailable'
  });
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');
  // Date filtering states
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [selectedFilterDates, setSelectedFilterDates] = useState<string[]>([]);
  const [filteredLocationData, setFilteredLocationData] = useState<LocationAvailability[]>([]);
  
  const [locationsForDate, setLocationsForDate] = useState<Array<{
    locationName: string;
    capacity: string;
    description: string;
    status: 'available' | 'unavailable';
  }>>([]);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [locationBookings, setLocationBookings] = useState<{[key: string]: LocationBooking[]}>({});
  const [loadingBookings, setLoadingBookings] = useState<{[key: string]: boolean}>({});
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [eventCounts, setEventCounts] = useState<{[key: string]: number}>({});
  const [loadingEventDetails, setLoadingEventDetails] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkAvailableDialog, setShowBulkAvailableDialog] = useState(false);
  const [showSelectiveDateDeleteDialog, setShowSelectiveDateDeleteDialog] = useState(false);
  const [selectedDatesForDeletion, setSelectedDatesForDeletion] = useState<string[]>([]);
  const [isSelectingDatesMode, setIsSelectingDatesMode] = useState(false);

  // Progress Modal States
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [progressOperation, setProgressOperation] = useState<'add' | 'delete' | ''>('');

  // Calendar Month State - tracks which month user is currently viewing
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(new Date());
  
  // Default location names
  const defaultLocationNames = [
    'Atrium',
    'Grand Lobby Entrance',
    'Main Entrance Lobby',
    'Main Entrance Leasable Area',
    '4th Flr. Conference Room 1',
    '4th Flr. Conference Room 2',
    '4th Flr. Conference Room 3',
    '5th Flr. Training Room 1 (BAC)',
    '5th Flr. Training Room 2',
    '6th Flr. Meeting Room 7',
    '6th Flr. DPOD',
    'Bataan People\'s Center',
    '1BOSSCO',
    'Emiliana Hall',
    'Pavillion'
  ];

  // Get current user
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        loadLocationData();
        loadAllEventsAndCounts();
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Filter location data based on selected dates
  useEffect(() => {
    if (selectedFilterDates.length === 0) {
      // No filter applied, show all data
      setFilteredLocationData(locationAvailabilities);
    } else {
      // Filter by selected dates
      const filtered = locationAvailabilities.filter(location => 
        selectedFilterDates.includes(location.date)
      );
      setFilteredLocationData(filtered);
    }
  }, [locationAvailabilities, selectedFilterDates]);

  // Get unique dates from location data for filter options
  const getAvailableDates = () => {
    const dates = [...new Set(locationAvailabilities.map(loc => loc.date))];
    return dates.sort();
  };


  // Clear all date filters
  const clearDateFilters = () => {
    setSelectedFilterDates([]);
  };

  // Function to load all events and calculate event counts for calendar badges
  const loadAllEventsAndCounts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const events = data.data || [];
        setAllEvents(events);

        // Calculate event counts per date
        const counts: {[key: string]: number} = {};
        
        events.forEach((event: any) => {
          if (event.status === 'submitted' || event.status === 'approved') {
            // Convert UTC dates to local timezone
            const eventStartDate = new Date(event.startDate);
            const eventEndDate = new Date(event.endDate);
            
            // Get the local date in YYYY-MM-DD format
            const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA');
            const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');
            
            // Count events for each date in the range
            const startDate = new Date(eventStartLocalDate);
            const endDate = new Date(eventEndLocalDate);
            
            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
              const dateKey = d.toLocaleDateString('en-CA');
              counts[dateKey] = (counts[dateKey] || 0) + 1;
            }
          }
        });

        setEventCounts(counts);
      }
    } catch (error) {
      console.error('Error loading events for counts:', error);
    }
  };

  // Function to get event count for a specific location and date
  const getLocationEventCount = (locationName: string, dateStr: string): number => {
    return allEvents.filter((event: any) => {
      // Check location match
      const eventLocation = (event.location || '').toLowerCase().trim();
      const searchLocation = locationName.toLowerCase().trim();
      const locationMatch = eventLocation.includes(searchLocation) || 
                           searchLocation.includes(eventLocation) ||
                           eventLocation === searchLocation;
      
      // Check date match
      const eventStartDate = new Date(event.startDate);
      const eventEndDate = new Date(event.endDate);
      const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA');
      const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');
      const dateMatch = dateStr >= eventStartLocalDate && dateStr <= eventEndLocalDate;
      
      // Check status
      const statusMatch = event.status === 'submitted' || event.status === 'approved';
      
      return locationMatch && dateMatch && statusMatch;
    }).length;
  };

  // Function to fetch bookings for a specific location on the selected date
  const fetchLocationBookings = async (locationName: string) => {
    if (!selectedDate) return;
    
    const locationKey = `${locationName}-${format(selectedDate, 'yyyy-MM-dd')}`;
    
    // Don't fetch if already loading or already have data
    if (loadingBookings[locationKey] || locationBookings[locationKey]) {
      return;
    }
    
    setLoadingBookings(prev => ({ ...prev, [locationKey]: true }));
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoadingBookings(prev => ({ ...prev, [locationKey]: false }));
        return;
      }

      const response = await fetch(`${API_BASE_URL}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const events = data.data || [];
        
        // Filter events for this specific location and date
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        console.log(`🔍 Fetching bookings for location: "${locationName}" on date: ${dateStr}`);
        console.log(`📊 Total events found: ${events.length}`);
        
        // Debug: Show all events for this date regardless of location
        const allEventsForDate = events.filter((event: any) => {
          // Convert UTC dates to local timezone for proper comparison
          const eventStartDate = new Date(event.startDate);
          const eventEndDate = new Date(event.endDate);
          
          // Get the local date in Asia/Manila timezone
          const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
          const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');
          
          return dateStr >= eventStartLocalDate && dateStr <= eventEndLocalDate;
        });
        
        console.log(`📅 ALL events for ${dateStr} (${allEventsForDate.length} total):`);
        allEventsForDate.forEach((event: any, index: number) => {
          console.log(`   ${index + 1}. "${event.eventTitle}" at "${event.location}" (Status: ${event.status})`);
        });
        
        const locationEvents = events.filter((event: any) => {
          // Check if event location matches (case-insensitive and flexible matching)
          const eventLocation = (event.location || '').toLowerCase().trim();
          const searchLocation = locationName.toLowerCase().trim();
          
          const eventLocationMatch = eventLocation.includes(searchLocation) || 
                                    searchLocation.includes(eventLocation) ||
                                    eventLocation === searchLocation;
          
          // Check if event date range includes the selected date (handle timezone properly)
          const eventStartDate = new Date(event.startDate);
          const eventEndDate = new Date(event.endDate);
          
          // Get the local date in Asia/Manila timezone
          const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
          const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');
          
          const isInDateRange = dateStr >= eventStartLocalDate && dateStr <= eventEndLocalDate;
          
          console.log(`🎯 Event: "${event.eventTitle}"`);
          console.log(`   Location: "${event.location}" | Match: ${eventLocationMatch}`);
          console.log(`   Date Range: ${eventStartDate} to ${eventEndDate} | In Range: ${isInDateRange}`);
          console.log(`   Status: ${event.status} | Valid Status: ${event.status === 'submitted' || event.status === 'approved'}`);
          
          const matches = eventLocationMatch && isInDateRange && 
                         (event.status === 'submitted' || event.status === 'approved');
          console.log(`   ✅ Final Match: ${matches}`);
          
          return matches;
        });
        
        console.log(`📋 Filtered events for ${locationName}: ${locationEvents.length} events`);
        locationEvents.forEach((event: any, index: number) => {
          console.log(`   ${index + 1}. ${event.eventTitle} at ${event.location}`);
        });

        // Map to booking format
        const bookings: LocationBooking[] = locationEvents.map((event: any) => ({
          eventId: event._id,
          eventTitle: event.eventTitle,
          requestor: event.requestor,
          requestorDepartment: event.requestorDepartment,
          startTime: event.startTime,
          endTime: event.endTime,
          participants: event.participants,
          vip: event.vip,
          vvip: event.vvip,
          status: event.status
        }));

        setLocationBookings(prev => ({ ...prev, [locationKey]: bookings }));
      }
    } catch (error) {
      console.error('Error fetching location bookings:', error);
    } finally {
      setLoadingBookings(prev => ({ ...prev, [locationKey]: false }));
    }
  };

  // Format time to 12-hour AM/PM format
  const formatTime12Hour = (time: string): string => {
    if (!time) return '';
    
    const [hours, minutes] = time.split(':');
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


  // Generate PDF preview for specific event (instead of showing modal)
  const generateEventPdfPreview = async (eventId: string) => {
    setLoadingEventDetails(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please login to view event details');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const event = data.data;
        
        // Generate PDF for this single event
        await generateSingleEventPdf(event);
      } else {
        toast.error('Failed to fetch event details');
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      toast.error('Failed to fetch event details');
    } finally {
      setLoadingEventDetails(false);
    }
  };

  // Generate PDF for a single event
  const generateSingleEventPdf = async (event: any) => {
    try {
      // Create new PDF document (same as admin)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let logoImg: HTMLImageElement | null = null;

      // Load logo once
      try {
        logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          logoImg!.onload = resolve;
          logoImg!.onerror = reject;
          logoImg!.src = '/images/bataanlogo.png';
        });
      } catch (error) {
        console.warn('Could not load logo, continuing without it:', error);
      }

      // Add header
      let yPos = margin;
      
      // Add logo if available
      if (logoImg) {
        const logoWidth = 15;
        const logoHeight = 15;
        const logoX = (pageWidth - logoWidth) / 2;
        pdf.addImage(logoImg, 'PNG', logoX, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 5;
      } else {
        yPos += 3;
      }

      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PROVINCIAL GOVERNMENT OF BATAAN', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 6;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Event Details Report', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 8;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')} at ${format(new Date(), 'h:mm a')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Event title (with text wrapping)
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const wrappedTitle = pdf.splitTextToSize(event.eventTitle.toUpperCase(), pageWidth - 2 * margin);
      pdf.text(wrappedTitle, margin, yPos);
      yPos += wrappedTitle.length * 6 + 5;

      // Event details in structured format
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Requestor:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(event.requestor, margin + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Department:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(event.taggedDepartments?.length > 0 ? event.taggedDepartments.join(', ') : event.requestorDepartment || 'N/A', margin + 115, yPos);
      yPos += 7;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Start Date:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(format(new Date(event.startDate), 'MMMM dd, yyyy'), margin + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Start Time:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatTime12Hour(event.startTime), margin + 115, yPos);
      yPos += 7;

      pdf.setFont('helvetica', 'bold');
      pdf.text('End Date:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(format(new Date(event.endDate), 'MMMM dd, yyyy'), margin + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('End Time:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatTime12Hour(event.endTime), margin + 115, yPos);
      yPos += 7;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Location:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(event.location, margin + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Participants:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${event.participants} attendees`, margin + 115, yPos);
      yPos += 7;

      if ((event.vip && event.vip > 0) || (event.vvip && event.vvip > 0)) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('VIP:', margin, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${event.vip || 0} VIPs`, margin + 25, yPos);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('VVIP:', margin + 90, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${event.vvip || 0} VVIPs`, margin + 115, yPos);
        yPos += 7;
      }

      yPos += 5;

      // Contact Information
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Contact Information', margin, yPos);
      yPos += 6;

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Email:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(event.contactEmail, margin + 15, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Phone:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(event.contactNumber, margin + 105, yPos);
      yPos += 10;

      // Description if exists
      if (event.description) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Event Description', margin, yPos);
        yPos += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const splitDescription = pdf.splitTextToSize(event.description, pageWidth - 2 * margin);
        pdf.text(splitDescription, margin, yPos);
        yPos += splitDescription.length * 4 + 5;
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`© ${new Date().getFullYear()} Provincial Government of Bataan - Event Management System`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      pdf.text(`Event Details Report`, pageWidth / 2, pageHeight - 5, { align: 'center' });

      // Create blob URL for PDF preview
      const pdfBlob = pdf.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      setPdfPreviewUrl(pdfUrl);
      setShowPdfPreview(true);
      
    } catch (error) {
      console.error('Error generating single event PDF preview:', error);
      toast.error('Failed to generate PDF preview');
    }
  };

  // Generate PDF preview for location bookings (same design as admin)
  const generateLocationBookingsPdf = async () => {
    try {
      // Get all events for locations managed by current user
      const locationBookingEvents = allEvents.filter((event: any) => {
        // Check if event location matches any of the default location names
        const eventLocation = (event.location || '').toLowerCase().trim();
        return defaultLocationNames.some(locationName => 
          eventLocation.includes(locationName.toLowerCase()) || 
          locationName.toLowerCase().includes(eventLocation)
        ) && (event.status === 'submitted' || event.status === 'approved');
      });

      if (locationBookingEvents.length === 0) {
        toast.error('No location bookings found to generate PDF');
        return;
      }

      // Create new PDF document (same as admin)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let logoImg: HTMLImageElement | null = null;

      // Load logo once
      try {
        logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          logoImg!.onload = resolve;
          logoImg!.onerror = reject;
          logoImg!.src = '/images/bataanlogo.png';
        });
      } catch (error) {
        console.warn('Could not load logo, continuing without it:', error);
      }

      // Function to add header to any page
      const addHeader = (isFirstPage = false) => {
        let yPos = margin;
        
        // Add logo if available
        if (logoImg) {
          const logoWidth = 15;
          const logoHeight = 15;
          const logoX = (pageWidth - logoWidth) / 2;
          pdf.addImage(logoImg, 'PNG', logoX, yPos, logoWidth, logoHeight);
          yPos += logoHeight + 5;
        } else {
          yPos += 3;
        }

        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('PROVINCIAL GOVERNMENT OF BATAAN', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 6;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Location Bookings Report', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 8;
        
        // Only add generation date on first page
        if (isFirstPage) {
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')} at ${format(new Date(), 'h:mm a')}`, pageWidth / 2, yPos, { align: 'center' });
          yPos += 15;
        } else {
          yPos += 8;
        }
        
        return yPos;
      };

      // Add header to first page
      let yPosition = addHeader(true);

      // Process each event
      for (let i = 0; i < locationBookingEvents.length; i++) {
        const event = locationBookingEvents[i];
        
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = addHeader();
        }

        // Event title (with text wrapping)
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        const wrappedTitle = pdf.splitTextToSize(event.eventTitle.toUpperCase(), pageWidth - 2 * margin);
        pdf.text(wrappedTitle, margin, yPosition);
        yPosition += wrappedTitle.length * 6 + 5;

        // Event details in structured format
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Requestor:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(event.requestor, margin + 25, yPosition);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Department:', margin + 90, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(event.taggedDepartments?.length > 0 ? event.taggedDepartments.join(', ') : event.requestorDepartment || 'N/A', margin + 115, yPosition);
        yPosition += 7;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Start Date:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(format(new Date(event.startDate), 'MMMM dd, yyyy'), margin + 25, yPosition);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Start Time:', margin + 90, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(formatTime12Hour(event.startTime), margin + 115, yPosition);
        yPosition += 7;

        pdf.setFont('helvetica', 'bold');
        pdf.text('End Date:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(format(new Date(event.endDate), 'MMMM dd, yyyy'), margin + 25, yPosition);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('End Time:', margin + 90, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(formatTime12Hour(event.endTime), margin + 115, yPosition);
        yPosition += 7;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Location:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(event.location, margin + 25, yPosition);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Participants:', margin + 90, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${event.participants} attendees`, margin + 115, yPosition);
        yPosition += 7;

        if ((event.vip && event.vip > 0) || (event.vvip && event.vvip > 0)) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('VIP:', margin, yPosition);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${event.vip || 0} VIPs`, margin + 25, yPosition);
          
          pdf.setFont('helvetica', 'bold');
          pdf.text('VVIP:', margin + 90, yPosition);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${event.vvip || 0} VVIPs`, margin + 115, yPosition);
          yPosition += 7;
        }

        yPosition += 5;

        // Contact Information
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Contact Information', margin, yPosition);
        yPosition += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Email:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(event.contactEmail, margin + 15, yPosition);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Phone:', margin + 90, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(event.contactNumber, margin + 105, yPosition);
        yPosition += 10;

        // Description if exists
        if (event.description) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Event Description', margin, yPosition);
          yPosition += 6;

          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          const splitDescription = pdf.splitTextToSize(event.description, pageWidth - 2 * margin);
          pdf.text(splitDescription, margin, yPosition);
          yPosition += splitDescription.length * 4 + 5;
        }

        yPosition += 15;

        // Add separator line between events (only if not the last event)
        if (i < locationBookingEvents.length - 1) {
          // Add a new page for the next event
          pdf.addPage();
          yPosition = addHeader();
        }
      }

      // Footer
      const totalPages = pdf.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`© ${new Date().getFullYear()} Provincial Government of Bataan - Location Management System`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text(`This report contains ${locationBookingEvents.length} location booking(s)`, pageWidth / 2, pageHeight - 5, { align: 'center' });
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
  };

  // Download actual PDF
  const downloadLocationBookingsPdf = async () => {
    try {
      if (!pdfPreviewUrl) {
        toast.error('No PDF preview available');
        return;
      }

      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = pdfPreviewUrl;
      link.download = `Location_Bookings_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const loadLocationData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/location-availability`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const locations = data.data || [];
        setLocationAvailabilities(locations);

        // Convert to calendar events
        const events: CalendarEvent[] = locations.map((location: LocationAvailability) => ({
          id: location._id!,
          date: location.date,
          title: `${location.locationName} (${location.status})`,
          type: location.status === 'available' ? 'available' : 'unavailable',
          notes: `Capacity: ${location.capacity} | ${location.description}`
        }));

        setCalendarEvents(events);
      } else {
        console.error('Failed to fetch location data');
      }
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    setShowLocationModal(true);
    
    // Reload fresh data first to ensure we have the latest
    await loadLocationData();
    
    // Load existing locations for this date
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingLocations = locationAvailabilities.filter(loc => loc.date === dateStr);
    setLocationsForDate(existingLocations.map(loc => ({
      locationName: loc.locationName,
      capacity: loc.capacity.toString(),
      description: loc.description,
      status: loc.status
    })));
    
    // Reset form data
    setFormData({
      locationName: '',
      capacity: '',
      description: '',
      status: 'available'
    });
    setShowCustomLocationInput(false);
    setCustomLocationName('');
  };

  // Handle location name selection with auto-population
  const handleLocationNameSelect = (selectedLocationName: string) => {
    console.log('🏢 Location selected:', selectedLocationName);
    
    // Check if user selected "Add Custom Location"
    if (selectedLocationName === 'Add Custom Location') {
      setShowCustomLocationInput(true);
      setFormData({
        locationName: '',
        capacity: '',
        description: '',
        status: 'available'
      });
      setIsAutoPopulated(false);
      return;
    }
    
    // Hide custom input if a predefined location is selected
    setShowCustomLocationInput(false);
    setCustomLocationName('');
    
    // Find the most recent data for this location from existing records
    const existingLocationData = locationAvailabilities
      .filter(loc => loc.locationName === selectedLocationName)
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .find(loc => loc.capacity && loc.description);

    if (existingLocationData) {
      console.log('✅ Auto-populating from existing data:', existingLocationData);
      
      // Create the auto-populated location data
      const autoPopulatedLocation = {
        locationName: selectedLocationName,
        capacity: existingLocationData.capacity.toString(),
        description: existingLocationData.description,
        status: 'available' as 'available' | 'unavailable'
      };
      
      // Automatically add to list since it's auto-populated
      setLocationsForDate(prev => [...prev, autoPopulatedLocation]);
      
      // Reset form for next entry
      setFormData({
        locationName: '',
        capacity: '',
        description: '',
        status: 'available'
      });
      setIsAutoPopulated(false);
      
      toast.success(`${selectedLocationName} auto-added to list with standardized data`);
    } else {
      console.log('ℹ️ No existing data found, using defaults');
      setFormData({
        locationName: selectedLocationName,
        capacity: '',
        description: '',
        status: 'available'
      });
      setIsAutoPopulated(false); // Mark as manual input (editable)
    }
  };

  // Handle custom location name confirmation
  const handleCustomLocationConfirm = () => {
    if (!customLocationName.trim()) {
      toast.error('Please enter a location name');
      return;
    }

    // Check if custom location already exists for this date
    const exists = locationsForDate.some(loc => 
      loc.locationName.toLowerCase() === customLocationName.trim().toLowerCase()
    );

    if (exists) {
      toast.error('Location already exists for this date');
      return;
    }

    // Set the custom location name in form data
    setFormData({
      locationName: customLocationName.trim(),
      capacity: '',
      description: '',
      status: 'available'
    });
    
    // Hide custom input and clear it
    setShowCustomLocationInput(false);
    setCustomLocationName('');
    
    toast.success(`Custom location "${customLocationName.trim()}" ready to configure`);
  };

  // Handle selecting all available locations at once
  const handleSelectAllLocations = async () => {
    // Get all available locations (not already in the list)
    const availableLocations = defaultLocationNames.filter(locationName => {
      const isAlreadyInList = locationsForDate.some(loc => 
        loc.locationName.toLowerCase() === locationName.toLowerCase()
      );
      return !isAlreadyInList;
    });

    if (availableLocations.length === 0) {
      toast.info('All locations are already added for this date');
      return;
    }

    // Create location objects with auto-populated data
    const newLocations: Array<{
      locationName: string;
      capacity: string;
      description: string;
      status: 'available' | 'unavailable';
    }> = [];
    
    for (const locationName of availableLocations) {
      // Find the most recent data for this location from existing records
      const existingLocationData = locationAvailabilities
        .filter(loc => loc.locationName === locationName)
        .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
        .find(loc => loc.capacity && loc.description);

      if (existingLocationData) {
        // Use existing data
        newLocations.push({
          locationName: locationName,
          capacity: existingLocationData.capacity.toString(),
          description: existingLocationData.description,
          status: 'available' as 'available' | 'unavailable'
        });
      } else {
        // Use default values - will need manual input
        newLocations.push({
          locationName: locationName,
          capacity: '',
          description: '',
          status: 'available' as 'available' | 'unavailable'
        });
      }
    }

    // Add all locations to the list
    setLocationsForDate(prev => [...prev, ...newLocations]);
    
    // Clear form data
    setFormData({
      locationName: '',
      capacity: '',
      description: '',
      status: 'available'
    });
    setShowCustomLocationInput(false);
    setCustomLocationName('');

    // Show success message
    const autoPopulatedCount = newLocations.filter(loc => loc.capacity && loc.description).length;
    const manualCount = newLocations.length - autoPopulatedCount;
    
    let message = `Added ${newLocations.length} location(s) to list`;
    if (autoPopulatedCount > 0 && manualCount > 0) {
      message += ` (${autoPopulatedCount} auto-filled, ${manualCount} need manual input)`;
    } else if (autoPopulatedCount > 0) {
      message += ` (all auto-filled with existing data)`;
    } else {
      message += ` (all need manual capacity/description input)`;
    }
    
    toast.success(message);
  };

  const handleAddLocation = () => {
    if (!formData.locationName || !formData.capacity) {
      toast.error('Please fill in location name and capacity');
      return;
    }

    // Check if location already exists for this date
    const exists = locationsForDate.some(loc => 
      loc.locationName.toLowerCase() === formData.locationName.toLowerCase()
    );

    if (exists) {
      toast.error('Location already exists for this date');
      return;
    }

    // Add to locations list with immediate UI update
    setLocationsForDate(prev => [...prev, { ...formData }]);
    
    // Show immediate feedback
    toast.success(`${formData.locationName} added to list`);
    
    // Reset form
    setFormData({
      locationName: '',
      capacity: '',
      description: '',
      status: 'available'
    });
  };

  // Check if location has active events
  const locationHasEvents = (locationName: string, date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    return allEvents.some((event: any) => {
      // Check if event location matches
      const eventLocation = (event.location || '').toLowerCase().trim();
      const searchLocation = locationName.toLowerCase().trim();
      const locationMatch = eventLocation.includes(searchLocation) ||
                             searchLocation.includes(eventLocation) ||
                             eventLocation === searchLocation;

      // Check if event date matches
      const eventStartDate = new Date(event.startDate);
      const eventEndDate = new Date(event.endDate);
      const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA');
      const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');
      const dateMatch = dateStr >= eventStartLocalDate && dateStr <= eventEndLocalDate;

      // Check if event is active (submitted or approved)
      const statusMatch = event.status === 'submitted' || event.status === 'approved';

      return locationMatch && dateMatch && statusMatch;
    });
  };

  const handleRemoveLocation = async (index: number) => {
    const locationToRemove = locationsForDate[index];
    
    // Check if location has active events before allowing deletion
    if (locationHasEvents(locationToRemove.locationName, selectedDate!)) {
      toast.error(`Cannot delete "${locationToRemove.locationName}" - this location has active event bookings on this date`);
      return;
    }
    
    setDeletingIndex(index); // Set loading state
    
    try {
      // Check if this location exists in the database (has been saved before)
      const dateStr = format(selectedDate!, 'yyyy-MM-dd');
      const existingLocation = locationAvailabilities.find(
        loc => loc.date === dateStr && 
               loc.locationName.toLowerCase() === locationToRemove.locationName.toLowerCase()
      );

      if (existingLocation && existingLocation._id) {
        // Delete from database
        const token = localStorage.getItem('authToken');
        if (!token) {
          toast.error('Please login to delete location');
          setDeletingIndex(null);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/location-availability/${existingLocation._id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          toast.success(`${locationToRemove.locationName} deleted successfully`);
          
          // Immediately remove from UI first for instant feedback
          setLocationsForDate(prev => prev.filter((_, i) => i !== index));
          
          // Then reload data to sync with database and update all components
          await loadLocationData();
        } else {
          const result = await response.json();
          toast.error(result.message || 'Failed to delete location');
          setDeletingIndex(null);
          return; // Don't remove from UI if database deletion failed
        }
      } else {
        // Just remove from temporary list (location not saved to database yet)
        setLocationsForDate(prev => prev.filter((_, i) => i !== index));
        toast.success(`${locationToRemove.locationName} removed from list`);
      }
      
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location');
    } finally {
      setDeletingIndex(null); // Clear loading state
    }
  };

  const handleSaveAllLocations = async () => {
    if (!selectedDate) {
      toast.error('No date selected');
      return;
    }

    // Add current form data if it's filled
    let newLocationsToSave = [];
    if (formData.locationName && formData.capacity) {
      const exists = locationsForDate.some(loc => 
        loc.locationName.toLowerCase() === formData.locationName.toLowerCase()
      );
      if (!exists) {
        newLocationsToSave.push({ ...formData });
      }
    }

    // Only save NEW locations that don't exist in database yet
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const existingLocationNames = locationAvailabilities
      .filter(loc => loc.date === dateStr)
      .map(loc => loc.locationName.toLowerCase());

    // Filter out locations that already exist in database
    const locationsFromList = locationsForDate.filter(loc => 
      !existingLocationNames.includes(loc.locationName.toLowerCase())
    );

    const allNewLocations = [...locationsFromList, ...newLocationsToSave];

    if (allNewLocations.length === 0) {
      toast.success('No new locations to save');
      // Close modal since there's nothing to save
      setShowLocationModal(false);
      setSelectedDate(null);
      setLocationsForDate([]);
      setFormData({
        locationName: '',
        capacity: '',
        description: '',
        status: 'available'
      });
      setShowCustomLocationInput(false);
      setCustomLocationName('');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please login to save location availability');
        return;
      }

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Save all NEW locations for this date
      const savePromises = allNewLocations.map(location => {
        const capacityNum = parseInt(location.capacity, 10);
        
        // Validate capacity parsing
        if (isNaN(capacityNum) || capacityNum < 1) {
          throw new Error(`Invalid capacity for ${location.locationName}: ${location.capacity}`);
        }
        
        console.log(`Saving location ${location.locationName} with capacity: ${location.capacity} -> ${capacityNum}`);
        
        const locationData = {
          date: dateStr,
          locationName: location.locationName.trim(),
          capacity: capacityNum,
          description: location.description.trim(),
          status: location.status
        };

        return fetch(`${API_BASE_URL}/location-availability`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(locationData)
        });
      });

      const responses = await Promise.all(savePromises);
      const results = await Promise.all(responses.map(r => r.json()));

      const failedSaves = responses.filter(r => !r.ok);
      
      if (failedSaves.length === 0) {
        console.log('All locations saved successfully, closing modal...');
        toast.success(`${allNewLocations.length} location(s) saved successfully!`);
        
        // Reload data to get the latest from server and update all UI components
        await loadLocationData();
        
        // Close modal and reset
        console.log('Closing modal and resetting state...');
        setShowLocationModal(false);
        setSelectedDate(null);
        setLocationsForDate([]);
        setFormData({
          locationName: '',
          capacity: '',
          description: '',
          status: 'available'
        });
        setShowCustomLocationInput(false);
        setCustomLocationName('');
        console.log('Modal should be closed now');
      } else {
        const errorMessages = results
          .filter((_, index) => !responses[index].ok)
          .map(result => result.message)
          .join(', ');
        toast.error(`Some locations failed to save: ${errorMessages}`);
      }
    } catch (error) {
      console.error('Error saving locations:', error);
      toast.error('Failed to save location availability');
    }
  };

  // Get current and future dates in currently viewed month (no past dates)
  const getCurrentAndFutureDates = (): string[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Reset time to start of day
    
    // Use the calendar's currently viewed month instead of system month
    const viewedYear = calendarCurrentMonth.getFullYear();
    const viewedMonth = calendarCurrentMonth.getMonth();
    
    const dates: string[] = [];
    const daysInMonth = new Date(viewedYear, viewedMonth + 1, 0).getDate();
    
    // Only get dates for the currently viewed month in calendar
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewedYear, viewedMonth, day);
      // Only include current and future dates (no past dates)
      if (date >= today) {
        dates.push(format(date, 'yyyy-MM-dd'));
      }
    }
    
    return dates;
  };

  // Progress Modal Helper Functions
  const startProgressModal = (operation: 'add' | 'delete', initialText: string) => {
    setProgressOperation(operation);
    setProgressValue(0);
    setProgressText(initialText);
    setShowProgressModal(true);
  };

  const updateProgress = (value: number, text: string) => {
    setProgressValue(value);
    setProgressText(text);
  };

  const closeProgressModal = () => {
    setShowProgressModal(false);
    setProgressValue(0);
    setProgressText('');
    setProgressOperation('');
  };

  // Bulk add all locations as available for current and future dates (OPTIMIZED)
  const handleBulkAddAllLocations = async () => {
    setShowBulkAvailableDialog(false);
    
    try {
      const futureDates = getCurrentAndFutureDates();
      console.log(`🚀 OPTIMIZED: Bulk adding all ${defaultLocationNames.length} locations for ${futureDates.length} current/future days`);

      // Start progress modal
      startProgressModal('add', 'Preparing location data...');

      // Pre-filter existing locations to avoid duplicates
      const existingLocationKeys = new Set(
        locationAvailabilities.map(loc => `${loc.date}-${loc.locationName.toLowerCase()}`)
      );

      updateProgress(10, 'Building location data...');

      // Pre-build location data lookup for auto-population
      const locationDataLookup = new Map();
      defaultLocationNames.forEach(locationName => {
        const existingLocationData = locationAvailabilities
          .filter(loc => loc.locationName === locationName)
          .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
          .find(loc => loc.capacity && loc.description);
        
        locationDataLookup.set(locationName, existingLocationData);
      });

      // Build all location entries to create
      const locationsToCreate: any[] = [];
      
      for (const dateString of futureDates) {
        for (const locationName of defaultLocationNames) {
          const locationKey = `${dateString}-${locationName.toLowerCase()}`;
          
          // Skip if already exists
          if (existingLocationKeys.has(locationKey)) {
            console.log(`⏭️ Skipping ${locationName} on ${dateString} - already exists`);
            continue;
          }

          // Get auto-populated data
          const existingLocationData = locationDataLookup.get(locationName);

          // Prepare location data
          const locationData = {
            date: dateString,
            locationName: locationName,
            capacity: existingLocationData?.capacity || 50, // Default capacity
            description: existingLocationData?.description || `${locationName} - Available for events`,
            status: 'available' as 'available' | 'unavailable',
            departmentName: currentUser?.department || 'PMO'
          };

          locationsToCreate.push(locationData);
        }
      }

      if (locationsToCreate.length === 0) {
        closeProgressModal();
        toast.info('All locations are already added for current and future dates!');
        return;
      }

      updateProgress(20, `Prepared ${locationsToCreate.length} location entries...`);
      console.log(`📦 Prepared ${locationsToCreate.length} location entries for batch creation`);

      // BATCH PROCESSING: Process in chunks of 20 for optimal performance
      const BATCH_SIZE = 20;
      const batches = [];
      for (let i = 0; i < locationsToCreate.length; i += BATCH_SIZE) {
        batches.push(locationsToCreate.slice(i, i + BATCH_SIZE));
      }

      console.log(`⚡ Processing ${batches.length} batches of ${BATCH_SIZE} locations each`);

      let totalAdded = 0;
      let totalFailed = 0;

      // Process batches sequentially for progress tracking
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const progressPercent = 20 + ((batchIndex / batches.length) * 70);
        
        updateProgress(progressPercent, `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} locations)...`);
        console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} locations)`);
        
        // Process all locations in this batch concurrently
        const batchPromises = batch.map(async (locationData) => {
          try {
            const response = await fetch(`${API_BASE_URL}/location-availability`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(locationData)
            });

            if (response.ok) {
              return { success: true, location: locationData.locationName, date: locationData.date };
            } else {
              console.error(`Failed to add ${locationData.locationName} on ${locationData.date}`);
              return { success: false, location: locationData.locationName, date: locationData.date };
            }
          } catch (error) {
            console.error(`Error adding ${locationData.locationName} on ${locationData.date}:`, error);
            return { success: false, location: locationData.locationName, date: locationData.date, error };
          }
        });

        // Wait for all locations in this batch to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Count results
        const batchSuccessCount = batchResults.filter(r => r.success).length;
        const batchFailCount = batchResults.filter(r => !r.success).length;
        
        totalAdded += batchSuccessCount;
        totalFailed += batchFailCount;
        
        console.log(`✅ Batch ${batchIndex + 1} completed: ${batchSuccessCount} success, ${batchFailCount} failed`);
      }

      updateProgress(90, 'Refreshing location data...');
      console.log(`🎯 BULK OPERATION COMPLETED: ${totalAdded} added, ${totalFailed} failed`);

      // Refresh data
      await loadLocationData();
      
      updateProgress(100, 'Operation completed!');
      
      // Show results
      if (totalFailed > 0) {
        toast.success(`Added ${totalAdded} locations! ${totalFailed} failed to add.`, { duration: 6000 });
      } else {
        toast.success(`Successfully added all ${totalAdded} location entries for ${futureDates.length} current/future days in ${format(new Date(), 'MMMM yyyy')}!`);
      }

      // Close progress modal after a brief delay
      setTimeout(closeProgressModal, 1500);
      
    } catch (error) {
      console.error('Error in bulk add operation:', error);
      toast.error(`Error adding locations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk delete all location data for current month (with booking protection) - OPTIMIZED
  const handleBulkDeleteAllLocations = async () => {
    setShowBulkDeleteDialog(false);
    
    try {
      console.log(`🚀 OPTIMIZED: Bulk deleting location data for ${format(calendarCurrentMonth, 'MMMM yyyy')}`);

      // Start progress modal
      startProgressModal('delete', 'Analyzing location data...');

      // Filter locations to only include the currently viewed month
      const viewedYear = calendarCurrentMonth.getFullYear();
      const viewedMonth = calendarCurrentMonth.getMonth();
      
      const locationsInViewedMonth = locationAvailabilities.filter(location => {
        const locationDate = new Date(location.date + 'T00:00:00');
        return locationDate.getFullYear() === viewedYear && 
               locationDate.getMonth() === viewedMonth;
      });

      if (locationsInViewedMonth.length === 0) {
        closeProgressModal();
        toast.info(`No location data to delete for ${format(calendarCurrentMonth, 'MMMM yyyy')}!`);
        return;
      }

      updateProgress(10, 'Checking for active bookings...');

      // Pre-build active events lookup for faster checking
      const activeEventsLookup = new Map();
      allEvents
        .filter(event => event.status === 'submitted' || event.status === 'approved')
        .forEach(event => {
          const eventLocation = (event.location || '').toLowerCase().trim();
          const eventStartDate = new Date(event.startDate);
          const eventEndDate = new Date(event.endDate);
          const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA');
          const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');

          if (!activeEventsLookup.has(eventLocation)) {
            activeEventsLookup.set(eventLocation, []);
          }
          activeEventsLookup.get(eventLocation).push({
            startDate: eventStartLocalDate,
            endDate: eventEndLocalDate,
            title: event.eventTitle
          });
        });

      updateProgress(20, 'Separating protected locations...');

      // Separate locations into protected and deletable (only for viewed month)
      const locationsToDelete: any[] = [];
      const protectedLocations: any[] = [];

      for (const location of locationsInViewedMonth) {
        const searchLocation = location.locationName.toLowerCase().trim();
        let hasActiveEvents = false;

        // Check against all possible event location matches
        for (const [eventLocation, events] of activeEventsLookup.entries()) {
          const locationMatch = eventLocation.includes(searchLocation) ||
                                 searchLocation.includes(eventLocation) ||
                                 eventLocation === searchLocation;

          if (locationMatch) {
            // Check if any event overlaps with this location's date
            const hasOverlap = events.some((event: any) => 
              location.date >= event.startDate && location.date <= event.endDate
            );

            if (hasOverlap) {
              hasActiveEvents = true;
              break;
            }
          }
        }

        if (hasActiveEvents) {
          protectedLocations.push(location);
          console.log(`🛡️ Protected ${location.locationName} on ${location.date} - has active bookings`);
        } else {
          locationsToDelete.push(location);
        }
      }

      console.log(`📊 Analysis: ${locationsToDelete.length} to delete, ${protectedLocations.length} protected`);

      if (locationsToDelete.length === 0) {
        closeProgressModal();
        toast.info(`All ${protectedLocations.length} location entries are protected due to active bookings!`);
        return;
      }

      updateProgress(30, `Found ${locationsToDelete.length} locations to delete...`);

      // BATCH PROCESSING: Delete in chunks for optimal performance
      const BATCH_SIZE = 15;
      const batches = [];
      for (let i = 0; i < locationsToDelete.length; i += BATCH_SIZE) {
        batches.push(locationsToDelete.slice(i, i + BATCH_SIZE));
      }

      console.log(`⚡ Processing ${batches.length} deletion batches of ${BATCH_SIZE} locations each`);

      let totalDeleted = 0;
      let totalFailed = 0;

      // Process batches sequentially for progress tracking
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const progressPercent = 30 + ((batchIndex / batches.length) * 60);
        
        updateProgress(progressPercent, `Deleting batch ${batchIndex + 1}/${batches.length} (${batch.length} locations)...`);
        console.log(`🗑️ Processing deletion batch ${batchIndex + 1}/${batches.length} (${batch.length} locations)`);
        
        // Process all deletions in this batch concurrently
        const deletionPromises = batch.map(async (location) => {
          try {
            const response = await fetch(`${API_BASE_URL}/location-availability/${location._id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              return { success: true, location: location.locationName, date: location.date };
            } else {
              console.error(`Failed to delete ${location.locationName} on ${location.date}`);
              return { success: false, location: location.locationName, date: location.date };
            }
          } catch (error) {
            console.error(`Error deleting ${location.locationName} on ${location.date}:`, error);
            return { success: false, location: location.locationName, date: location.date, error };
          }
        });

        // Wait for all deletions in this batch to complete
        const batchResults = await Promise.all(deletionPromises);
        
        // Count results
        const batchSuccessCount = batchResults.filter(r => r.success).length;
        const batchFailCount = batchResults.filter(r => !r.success).length;
        
        totalDeleted += batchSuccessCount;
        totalFailed += batchFailCount;
        
        console.log(`✅ Deletion batch ${batchIndex + 1} completed: ${batchSuccessCount} deleted, ${batchFailCount} failed`);
      }

      updateProgress(90, 'Refreshing location data...');
      console.log(`🎯 BULK DELETE COMPLETED: ${totalDeleted} deleted, ${totalFailed} failed, ${protectedLocations.length} protected`);

      // Refresh data
      await loadLocationData();
      
      updateProgress(100, 'Operation completed!');
      
      // Show results
      if (protectedLocations.length > 0) {
        if (totalFailed > 0) {
          toast.success(
            `Deleted ${totalDeleted} entries! ${protectedLocations.length} protected due to bookings. ${totalFailed} failed.`,
            { duration: 8000 }
          );
        } else {
          toast.success(
            `Deleted ${totalDeleted} location entries! ${protectedLocations.length} entries were protected due to active bookings.`,
            { duration: 6000 }
          );
        }
      } else {
        if (totalFailed > 0) {
          toast.success(`Deleted ${totalDeleted} entries! ${totalFailed} failed to delete.`, { duration: 6000 });
        } else {
          toast.success(`Successfully deleted all ${totalDeleted} location entries for ${format(calendarCurrentMonth, 'MMMM yyyy')}!`);
        }
      }

      // Close progress modal after a brief delay
      setTimeout(closeProgressModal, 1500);
      
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      closeProgressModal();
      toast.error(`Error deleting locations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBulkLoading(false);
    }
  };

  // Handle selective date deletion
  const handleSelectiveDateDelete = async () => {
    setShowSelectiveDateDeleteDialog(false);
    
    try {
      if (selectedDatesForDeletion.length === 0) {
        toast.error('No dates selected for deletion!');
        return;
      }

      console.log(`🎯 SELECTIVE DELETE: Processing ${selectedDatesForDeletion.length} selected dates`);

      // Start progress modal
      startProgressModal('delete', 'Analyzing selected dates...');

      // Get locations for selected dates
      const locationsToProcess = locationAvailabilities.filter(location => 
        selectedDatesForDeletion.includes(location.date)
      );

      if (locationsToProcess.length === 0) {
        closeProgressModal();
        toast.info('No location data found for selected dates!');
        return;
      }

      updateProgress(15, 'Checking for active bookings...');

      // Pre-build active events lookup for faster checking
      const activeEventsLookup = new Map();
      allEvents
        .filter(event => event.status === 'submitted' || event.status === 'approved')
        .forEach(event => {
          const eventLocation = (event.location || '').toLowerCase().trim();
          const eventStartDate = new Date(event.startDate);
          const eventEndDate = new Date(event.endDate);
          const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA');
          const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');

          if (!activeEventsLookup.has(eventLocation)) {
            activeEventsLookup.set(eventLocation, []);
          }
          activeEventsLookup.get(eventLocation).push({
            startDate: eventStartLocalDate,
            endDate: eventEndLocalDate,
            title: event.eventTitle
          });
        });

      updateProgress(25, 'Separating protected locations...');

      // Separate locations into protected and deletable
      const locationsToDelete: any[] = [];
      const protectedLocations: any[] = [];

      for (const location of locationsToProcess) {
        const searchLocation = location.locationName.toLowerCase().trim();
        let hasActiveEvents = false;

        // Check against all possible event location matches
        for (const [eventLocation, events] of activeEventsLookup.entries()) {
          const locationMatch = eventLocation.includes(searchLocation) ||
                                 searchLocation.includes(eventLocation) ||
                                 eventLocation === searchLocation;

          if (locationMatch) {
            // Check if any event overlaps with this location's date
            const hasOverlap = events.some((event: any) => 
              location.date >= event.startDate && location.date <= event.endDate
            );

            if (hasOverlap) {
              hasActiveEvents = true;
              break;
            }
          }
        }

        if (hasActiveEvents) {
          protectedLocations.push(location);
          console.log(`🛡️ Protected ${location.locationName} on ${location.date} - has active bookings`);
        } else {
          locationsToDelete.push(location);
        }
      }

      console.log(`📊 Selective Analysis: ${locationsToDelete.length} to delete, ${protectedLocations.length} protected`);

      if (locationsToDelete.length === 0) {
        closeProgressModal();
        toast.info(`All ${protectedLocations.length} location entries for selected dates are protected due to active bookings!`);
        return;
      }

      updateProgress(35, `Found ${locationsToDelete.length} locations to delete...`);

      // BATCH PROCESSING: Delete in chunks for optimal performance
      const BATCH_SIZE = 15;
      const batches = [];
      for (let i = 0; i < locationsToDelete.length; i += BATCH_SIZE) {
        batches.push(locationsToDelete.slice(i, i + BATCH_SIZE));
      }

      console.log(`⚡ Processing ${batches.length} selective deletion batches`);

      let totalDeleted = 0;
      let totalFailed = 0;

      // Process batches sequentially for progress tracking
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const progressPercent = 35 + ((batchIndex / batches.length) * 55);
        
        updateProgress(progressPercent, `Deleting batch ${batchIndex + 1}/${batches.length} (${batch.length} locations)...`);
        console.log(`🗑️ Processing selective batch ${batchIndex + 1}/${batches.length} (${batch.length} locations)`);
        
        // Process all deletions in this batch concurrently
        const deletionPromises = batch.map(async (location) => {
          try {
            const response = await fetch(`${API_BASE_URL}/location-availability/${location._id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              return { success: true, location: location.locationName, date: location.date };
            } else {
              console.error(`Failed to delete ${location.locationName} on ${location.date}`);
              return { success: false, location: location.locationName, date: location.date };
            }
          } catch (error) {
            console.error(`Error deleting ${location.locationName} on ${location.date}:`, error);
            return { success: false, location: location.locationName, date: location.date, error };
          }
        });

        // Wait for all deletions in this batch to complete
        const batchResults = await Promise.all(deletionPromises);
        
        // Count results
        const batchSuccessCount = batchResults.filter(r => r.success).length;
        const batchFailCount = batchResults.filter(r => !r.success).length;
        
        totalDeleted += batchSuccessCount;
        totalFailed += batchFailCount;
        
        console.log(`✅ Selective batch ${batchIndex + 1} completed: ${batchSuccessCount} deleted, ${batchFailCount} failed`);
      }

      updateProgress(90, 'Refreshing location data...');
      console.log(`🎯 SELECTIVE DELETE COMPLETED: ${totalDeleted} deleted, ${totalFailed} failed, ${protectedLocations.length} protected`);

      // Clear selection and exit selection mode
      setSelectedDatesForDeletion([]);
      setIsSelectingDatesMode(false);

      // Refresh data
      await loadLocationData();
      
      updateProgress(100, 'Operation completed!');
      
      // Show results
      const selectedDatesList = selectedDatesForDeletion.slice(0, 3).join(', ') + (selectedDatesForDeletion.length > 3 ? '...' : '');
      
      if (protectedLocations.length > 0) {
        if (totalFailed > 0) {
          toast.success(
            `Deleted ${totalDeleted} entries from selected dates (${selectedDatesList})! ${protectedLocations.length} protected. ${totalFailed} failed.`,
            { duration: 8000 }
          );
        } else {
          toast.success(
            `Deleted ${totalDeleted} entries from selected dates (${selectedDatesList})! ${protectedLocations.length} entries were protected due to active bookings.`,
            { duration: 6000 }
          );
        }
      } else {
        if (totalFailed > 0) {
          toast.success(`Deleted ${totalDeleted} entries from selected dates! ${totalFailed} failed to delete.`, { duration: 6000 });
        } else {
          toast.success(`Successfully deleted all ${totalDeleted} location entries from selected dates (${selectedDatesList})!`);
        }
      }

      // Close progress modal after a brief delay
      setTimeout(closeProgressModal, 1500);
      
    } catch (error) {
      console.error('Error in selective date deletion:', error);
      closeProgressModal();
      toast.error(`Error deleting selected dates: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      toast.info('Date selection mode disabled.');
    }
  };

  // Handle date click for selection
  const handleDateClickForSelection = (date: Date) => {
    if (!isSelectingDatesMode) {
      // Normal date click - open location modal
      handleDateClick(date);
      return;
    }

    // Selection mode - toggle date selection
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if this date has any location data
    const hasLocationData = locationAvailabilities.some(loc => loc.date === dateStr);
    
    if (!hasLocationData) {
      toast.warning(`No location data found for ${format(date, 'MMM dd, yyyy')}`);
      return;
    }

    setSelectedDatesForDeletion(prev => {
      if (prev.includes(dateStr)) {
        // Remove from selection
        const newSelection = prev.filter(d => d !== dateStr);
        toast.info(`Removed ${format(date, 'MMM dd')} from selection (${newSelection.length} dates selected)`);
        return newSelection;
      } else {
        // Add to selection
        const newSelection = [...prev, dateStr];
        toast.info(`Added ${format(date, 'MMM dd')} to selection (${newSelection.length} dates selected)`);
        return newSelection;
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading location data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manage Location</h1>
              <p className="text-gray-600">Click on any date to set location availability</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={generateLocationBookingsPdf}
              variant="outline"
              className="gap-2"
              disabled={allEvents.length === 0}
            >
              <FileDown className="w-4 h-4" />
              Generate PDF Report
            </Button>
            <Badge variant="outline" className="gap-2">
              <Building2 className="w-4 h-4" />
              {currentUser?.department || 'PMO'}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Location Summary - Horizontal at top */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Available Locations
              </CardTitle>
              <div className="flex items-center gap-2">
                {selectedFilterDates.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {selectedFilterDates.length} date{selectedFilterDates.length !== 1 ? 's' : ''} filtered
                  </Badge>
                )}
                <Popover open={showDateFilter} onOpenChange={setShowDateFilter}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Filter className="w-4 h-4" />
                      Filter by Date
                      <ChevronDown className={`w-4 h-4 transition-transform ${showDateFilter ? 'rotate-180' : ''}`} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2" align="end">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-medium text-gray-700">Filter dates</h4>
                        {selectedFilterDates.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearDateFilters}
                            className="text-xs text-gray-500 hover:text-gray-700 h-5 px-1"
                          >
                            Clear ({selectedFilterDates.length})
                          </Button>
                        )}
                      </div>
                      <Calendar
                        mode="multiple"
                        selected={selectedFilterDates.map(dateStr => new Date(dateStr))}
                        onSelect={(dates) => {
                          if (dates) {
                            const dateStrings = Array.from(dates).map(date => format(date, 'yyyy-MM-dd'));
                            setSelectedFilterDates(dateStrings);
                          } else {
                            setSelectedFilterDates([]);
                          }
                        }}
                        disabled={(date) => {
                          const dateString = format(date, 'yyyy-MM-dd');
                          const availableDates = getAvailableDates();
                          return !availableDates.includes(dateString);
                        }}
                        className="rounded-md border text-xs scale-90"
                      />
                      {getAvailableDates().length === 0 && (
                        <p className="text-xs text-gray-500 text-center">No dates available</p>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredLocationData.length === 0 ? (
              <div className="text-center py-6">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-2">No locations configured yet</p>
                <p className="text-xs text-gray-500">Click on calendar dates to add location availability</p>
              </div>
            ) : (
              <div className="relative">
                <Swiper
                  key={filteredLocationData.length}
                  modules={[Autoplay, Pagination]}
                  spaceBetween={16}
                  slidesPerView={1}
                  loop={true}
                  speed={800}
                  effect="slide"
                  autoplay={{
                    delay: 3000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true,
                    waitForTransition: false,
                    stopOnLastSlide: false
                  }}
                  navigation={false}
                  pagination={false}
                  breakpoints={{
                    640: {
                      slidesPerView: 2,
                    },
                    768: {
                      slidesPerView: 3,
                    },
                    1024: {
                      slidesPerView: 4,
                    },
                  }}
                  className="location-swiper"
                >
                  {filteredLocationData.map((location) => (
                    <SwiperSlide key={location._id}>
                      <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors h-full">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {location.locationName}
                          </h4>
                          <Badge 
                            variant={location.status === 'available' ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {location.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <CalendarIcon className="w-3 h-3" />
                            {location.date}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Building2 className="w-3 h-3" />
                            Capacity: {location.capacity}
                          </div>
                          {location.description && (
                            <div className="text-xs text-gray-500 line-clamp-2">
                              {location.description}
                            </div>
                          )}
                          <div className="text-xs text-gray-400">
                            {location.departmentName}
                          </div>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Bulk Location Management - Minimalist ShadCN Design */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border rounded-lg p-6 bg-card mb-6"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Bulk Location Management</h3>
              <Badge variant="secondary" className="text-xs">
                {format(calendarCurrentMonth, 'MMM yyyy')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Add all {defaultLocationNames.length} locations or clear all data for current and future dates
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Clear All */}
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={locationAvailabilities.length === 0 || bulkLoading}
                  className="h-8 text-xs"
                >
                  {bulkLoading ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b border-current mr-2"></div>
                  ) : (
                    <Trash2 className="w-3 h-3 mr-2" />
                  )}
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Location Data</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2 text-sm">
                    <p>This will permanently delete all location availability data for {format(calendarCurrentMonth, 'MMMM yyyy')}.</p>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-800 text-xs">
                        <Shield className="w-3 h-3 inline mr-1" /> <strong>Smart Protection:</strong> Locations with active bookings will be automatically protected.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleBulkDeleteAllLocations}>
                    Clear All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Add All Locations */}
            <AlertDialog open={showBulkAvailableDialog} onOpenChange={setShowBulkAvailableDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Add All Locations
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Add All Locations</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-2 text-sm">
                    <p>This will add all {defaultLocationNames.length} default locations as available for current and future dates in {format(calendarCurrentMonth, 'MMMM yyyy')}.</p>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-blue-800 text-xs">
                        <MapPinIcon className="w-3 h-3 inline mr-1" /> <strong>Auto-Population:</strong> Existing location data (capacity, description) will be used when available.
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Past dates will not be affected. Existing entries will be skipped.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleBulkAddAllLocations}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Add All Locations
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Select Dates for Deletion */}
            <Button
              variant={isSelectingDatesMode ? "default" : "outline"}
              size="sm"
              disabled={locationAvailabilities.length === 0}
              onClick={toggleDateSelectionMode}
              className={`h-8 text-xs ${isSelectingDatesMode ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
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
                      <p>This will permanently delete all location availability data for the {selectedDatesForDeletion.length} selected date{selectedDatesForDeletion.length !== 1 ? 's' : ''}:</p>
                      <div className="p-3 bg-gray-50 border rounded-md max-h-32 overflow-y-auto">
                        <div className="flex flex-wrap gap-1">
                          {selectedDatesForDeletion.map(dateStr => (
                            <Badge key={dateStr} variant="secondary" className="text-xs">
                              {format(new Date(dateStr), 'MMM dd')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-green-800 text-xs">
                          <Shield className="w-3 h-3 inline mr-1" /> <strong>Smart Protection:</strong> Locations with active bookings will be automatically protected.
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSelectiveDateDelete}>
                      Delete Selected Dates
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          {/* Selection Mode Status */}
          {isSelectingDatesMode && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
              <CalendarIcon className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-orange-800">
                <strong>Date Selection Mode:</strong> Click calendar dates to select them for deletion. {selectedDatesForDeletion.length} date{selectedDatesForDeletion.length !== 1 ? 's' : ''} selected.
              </span>
            </div>
          )}

        </div>
      </motion.div>

      {/* Calendar - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="h-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Location Calendar
              </CardTitle>
              <div className="flex items-center gap-4">
                {/* Legend */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-200 rounded"></div>
                    <span className="text-sm text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-200 rounded"></div>
                    <span className="text-sm text-gray-600">Unavailable</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar */}
            <div className="border rounded-lg overflow-hidden">
              <CustomCalendar
                events={calendarEvents}
                onDateClick={handleDateClickForSelection}
                onMonthChange={setCalendarCurrentMonth}
                showNavigation={true}
                showLegend={false}
                cellHeight="min-h-[120px]"
                showEventCount={true}
                getEventCountForDate={(date: Date) => {
                  const dateStr = date.toLocaleDateString('en-CA');
                  return eventCounts[dateStr] || 0;
                }}
                selectedDates={isSelectingDatesMode ? selectedDatesForDeletion : []}
                isSelectionMode={isSelectingDatesMode}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Multi-Location Modal */}
      <Dialog open={showLocationModal} onOpenChange={setShowLocationModal}>
        <DialogContent className="sm:max-w-6xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Manage Locations for {selectedDate && format(selectedDate, 'MMMM dd, yyyy')}
            </DialogTitle>
          </DialogHeader>
          
          {/* 2 Column Layout */}
          <div className="grid grid-cols-2 gap-6 py-4 h-full overflow-hidden">
            {/* LEFT COLUMN - Existing Locations */}
            <div className="space-y-4 border-r pr-6">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-medium text-gray-900">
                  Locations for this Date ({locationsForDate.length})
                </h4>
              </div>
              
              {locationsForDate.length > 0 ? (
                <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-2">
                  {locationsForDate.map((location, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{location.locationName}</span>
                          <Badge variant={location.status === 'available' ? "default" : "destructive"} className="text-xs">
                            {location.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          Capacity: {location.capacity} | {location.description || 'No description'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Bookings Button with Popover */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchLocationBookings(location.locationName)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1 relative"
                            >
                              <Eye className="w-3 h-3" />
                              Bookings
                              {(() => {
                                const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
                                const count = getLocationEventCount(location.locationName, dateStr);
                                return count > 0 ? (
                                  <Badge 
                                    variant="default" 
                                    className="absolute -top-2 -right-2 h-5 min-w-5 text-xs bg-blue-600 hover:bg-blue-700 px-1.5"
                                  >
                                    {count}
                                  </Badge>
                                ) : null;
                              })()}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-96 p-0 max-h-[500px] overflow-hidden" align="end">
                            <div className="p-4 flex flex-col max-h-[500px]">
                              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                <CalendarIcon className="w-4 h-4 text-blue-600" />
                                <h4 className="font-medium text-sm">
                                  Bookings for {location.locationName}
                                </h4>
                              </div>
                              <div className="text-xs text-gray-600 mb-3 flex-shrink-0">
                                {selectedDate && format(selectedDate, 'MMMM dd, yyyy')}
                              </div>
                              
                              {(() => {
                                const locationKey = `${location.locationName}-${selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}`;
                                const isLoading = loadingBookings[locationKey];
                                const bookings = locationBookings[locationKey] || [];
                                
                                if (isLoading) {
                                  return (
                                    <div className="flex items-center justify-center py-4">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                      <span className="ml-2 text-xs text-gray-600">Loading bookings...</span>
                                    </div>
                                  );
                                }
                                
                                if (bookings.length === 0) {
                                  return (
                                    <div className="text-center py-4">
                                      <CalendarIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                      <p className="text-xs text-gray-500">No bookings for this date</p>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div className="flex-1 overflow-y-auto min-h-0">
                                    <div className="space-y-2 pr-2">
                                      {bookings.map((booking) => (
                                      <div key={booking.eventId} className="p-3 border rounded-lg bg-white">
                                        <div className="flex items-start justify-between mb-2">
                                          <h5 className="font-medium text-sm text-gray-900 line-clamp-1">
                                            {booking.eventTitle}
                                          </h5>
                                          <Badge 
                                            variant={booking.status === 'approved' ? 'default' : 'secondary'}
                                            className="text-xs ml-2"
                                          >
                                            {booking.status}
                                          </Badge>
                                        </div>
                                        
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Clock className="w-3 h-3" />
                                            {formatTime12Hour(booking.startTime)} - {formatTime12Hour(booking.endTime)}
                                          </div>
                                          
                                          <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Users className="w-3 h-3" />
                                            {booking.participants} participants
                                            {(booking.vip && booking.vip > 0) && (
                                              <Badge variant="outline" className="text-xs ml-1 bg-yellow-50 text-yellow-700 border-yellow-200">
                                                VIP: {booking.vip}
                                              </Badge>
                                            )}
                                            {(booking.vvip && booking.vvip > 0) && (
                                              <Badge variant="outline" className="text-xs ml-1 bg-purple-50 text-purple-700 border-purple-200">
                                                VVIP: {booking.vvip}
                                              </Badge>
                                            )}
                                          </div>
                                          
                                          <div className="text-xs text-gray-500">
                                            <span className="font-medium">Requestor:</span> {booking.requestor}
                                          </div>
                                          
                                          <div className="text-xs text-gray-500">
                                            <span className="font-medium">Department:</span> {booking.requestorDepartment}
                                          </div>
                                          
                                          {/* Full Details Button */}
                                          <div className="mt-3 pt-2 border-t border-gray-100">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => generateEventPdfPreview(booking.eventId)}
                                              disabled={loadingEventDetails}
                                              className="w-full gap-2 text-xs"
                                            >
                                              <Eye className="w-3 h-3" />
                                              {loadingEventDetails ? 'Loading...' : 'PDF Preview'}
                                            </Button>
                                          </div>
                                        </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </PopoverContent>
                        </Popover>
                        
                        {/* Delete Button */}
                        {(() => {
                          const hasEvents = locationHasEvents(location.locationName, selectedDate!);
                          return (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveLocation(index)}
                              disabled={deletingIndex === index || hasEvents}
                              className={`${
                                hasEvents 
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                              } disabled:opacity-50`}
                              title={hasEvents ? 'Cannot delete - location has active event bookings' : 'Delete location'}
                            >
                              {deletingIndex === index ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          );
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No locations set for this date</p>
                  <p className="text-xs">Add locations using the form on the right</p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN - Add New Location Form */}
            <div className="space-y-4 pl-6">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-600" />
                <h4 className="text-sm font-medium text-gray-900">Add New Location</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="locationName">Location Name *</Label>
                  <Select 
                    value={showCustomLocationInput ? "Add Custom Location" : (defaultLocationNames.includes(formData.locationName) ? formData.locationName : "")} 
                    onValueChange={handleLocationNameSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        defaultLocationNames.filter(locationName => {
                          const isAlreadyInList = locationsForDate.some(loc => 
                            loc.locationName.toLowerCase() === locationName.toLowerCase()
                          );
                          return !isAlreadyInList;
                        }).length === 0 
                          ? "All locations added" 
                          : "Select available location"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Add Custom Location Option */}
                      <SelectItem value="Add Custom Location" className="text-blue-600 font-medium">
                        <div className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Add Custom Location
                        </div>
                      </SelectItem>
                      
                      {/* Separator if there are available locations */}
                      {defaultLocationNames.filter(locationName => {
                        const isAlreadyInList = locationsForDate.some(loc => 
                          loc.locationName.toLowerCase() === locationName.toLowerCase()
                        );
                        return !isAlreadyInList;
                      }).length > 0 && (
                        <div className="border-t my-1"></div>
                      )}
                      
                      {/* Default Location Options */}
                      {defaultLocationNames
                        .filter(locationName => {
                          // Hide locations that are already in the current list
                          const isAlreadyInList = locationsForDate.some(loc => 
                            loc.locationName.toLowerCase() === locationName.toLowerCase()
                          );
                          return !isAlreadyInList;
                        })
                        .map((locationName) => (
                          <SelectItem key={locationName} value={locationName}>
                            {locationName}
                          </SelectItem>
                        ))}
                      
                      {/* Show message if all default locations are added */}
                      {defaultLocationNames.filter(locationName => {
                        const isAlreadyInList = locationsForDate.some(loc => 
                          loc.locationName.toLowerCase() === locationName.toLowerCase()
                        );
                        return !isAlreadyInList;
                      }).length === 0 && (
                        <div className="px-2 py-1 text-sm text-gray-500 italic border-t pt-2">
                          All default locations have been added for this date
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  
                  {/* Select All Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllLocations}
                    disabled={defaultLocationNames.filter(locationName => {
                      const isAlreadyInList = locationsForDate.some(loc => 
                        loc.locationName.toLowerCase() === locationName.toLowerCase()
                      );
                      return !isAlreadyInList;
                    }).length === 0}
                    className="text-xs gap-1 h-8 mt-2"
                    title={`Add all ${defaultLocationNames.filter(locationName => {
                      const isAlreadyInList = locationsForDate.some(loc => 
                        loc.locationName.toLowerCase() === locationName.toLowerCase()
                      );
                      return !isAlreadyInList;
                    }).length} available locations`}
                  >
                    <Plus className="w-3 h-3" />
                    Select All Available Locations ({defaultLocationNames.filter(locationName => {
                      const isAlreadyInList = locationsForDate.some(loc => 
                        loc.locationName.toLowerCase() === locationName.toLowerCase()
                      );
                      return !isAlreadyInList;
                    }).length})
                  </Button>
                  
                  {/* Show selected custom location */}
                  {formData.locationName && !defaultLocationNames.includes(formData.locationName) && !showCustomLocationInput && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <Plus className="w-4 h-4" />
                        <span className="text-sm font-medium">Custom Location Selected:</span>
                        <span className="text-sm">{formData.locationName}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Custom Location Input */}
                  {showCustomLocationInput && (
                    <div className="mt-3 p-3 border rounded-lg bg-blue-50">
                      <Label htmlFor="customLocationName" className="text-sm font-medium text-blue-900">
                        Enter Custom Location Name *
                      </Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="customLocationName"
                          value={customLocationName}
                          onChange={(e) => setCustomLocationName(e.target.value)}
                          placeholder="e.g., New Conference Room, Outdoor Pavilion"
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCustomLocationConfirm();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          onClick={handleCustomLocationConfirm}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={!customLocationName.trim()}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowCustomLocationInput(false);
                            setCustomLocationName('');
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Press Enter or click + to confirm the custom location name
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">
                    Capacity *
                    {isAutoPopulated && (
                      <span className="text-xs text-blue-600 ml-1">(Auto-filled)</span>
                    )}
                  </Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    max="999999"
                    value={formData.capacity}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow positive integers
                      if (value === '' || (/^\d+$/.test(value) && parseInt(value, 10) > 0)) {
                        setFormData({...formData, capacity: value});
                      }
                    }}
                    placeholder="e.g., 50, 200, 500"
                    readOnly={isAutoPopulated}
                    className={isAutoPopulated ? "bg-blue-50 border-blue-200 text-blue-800" : ""}
                  />
                  {isAutoPopulated && (
                    <p className="text-xs text-blue-600 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Using standardized capacity from previous records
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description
                  {isAutoPopulated && (
                    <span className="text-xs text-blue-600 ml-1">(Auto-filled)</span>
                  )}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Brief description of the location"
                  rows={2}
                  readOnly={isAutoPopulated}
                  className={isAutoPopulated ? "bg-blue-50 border-blue-200 text-blue-800" : ""}
                />
                {isAutoPopulated && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Using standardized description from previous records
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Availability Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'available' | 'unavailable') => 
                    setFormData({...formData, status: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAddLocation} 
                variant="outline" 
                className="w-full gap-2"
                disabled={!formData.locationName || !formData.capacity}
              >
                <Plus className="w-4 h-4" />
                Add New Location Data
              </Button>

              {/* Action Buttons - Bottom Right */}
              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowLocationModal(false);
                    setLocationsForDate([]);
                    setFormData({
                      locationName: '',
                      capacity: '',
                      description: '',
                      status: 'available'
                    });
                    setShowCustomLocationInput(false);
                    setCustomLocationName('');
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveAllLocations} 
                  className="gap-2"
                  disabled={locationsForDate.length === 0 && (!formData.locationName || !formData.capacity)}
                >
                  <Save className="w-4 h-4" />
                  Save All Locations ({locationsForDate.length + (formData.locationName && formData.capacity ? 1 : 0)})
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* PDF Preview Modal (Same as Admin) */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              PDF Preview - Location Bookings Report
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
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                  <p>Generating PDF preview...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPdfPreview(false)}>
              Close Preview
            </Button>
            <Button onClick={downloadLocationBookingsPdf} className="gap-2">
              <FileDown className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Modal */}
      <Dialog open={showProgressModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {progressOperation === 'add' ? (
                <>
                  <Plus className="w-5 h-5 text-blue-600" />
                  Adding Locations
                </>
              ) : (
                <>
                  <Trash2 className="w-5 h-5 text-red-600" />
                  Deleting Locations
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {progressOperation === 'add' 
                ? 'Adding location availability data to the system...'
                : 'Removing location availability data from the system...'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{progressText}</span>
                <span className="font-medium">{progressValue}%</span>
              </div>
              <Progress value={progressValue} className="w-full" />
            </div>
            
            {/* Status Message */}
            <div className="text-center text-sm text-gray-500">
              Please wait while the operation completes...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageLocationPage;
