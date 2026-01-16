import React, { useState, useEffect } from 'react';
import { useManageLocationStore } from '@/stores/manageLocationStore';
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
  MapPinIcon,
  Package
} from 'lucide-react';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

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
  // Zustand store - replaces all useState calls above!
  const {
    currentUser,
    locationAvailabilities,
    calendarEvents,
    allEvents,
    eventCounts,
    locationBookings,
    loading,
    bulkLoading,
    loadingBookings,
    loadingEventDetails,
    showProgressModal,
    progressValue,
    progressText,
    progressOperation,
    initializeUser,
    loadLocationData,
    loadAllEventsAndCounts,
    fetchLocationBookings,
    saveLocationAvailability,
    deleteLocationAvailability,
    bulkAddAllLocations,
    bulkDeleteAllLocations,
    setProgressModal,
    getLocationEventCount,
    getCurrentAndFutureDates,
  } = useManageLocationStore();

  // Local UI state that doesn't need caching
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [formData, setFormData] = useState({
    locationName: '',
    capacity: '',
    description: '',
    status: 'available' as 'available' | 'unavailable',
    requirements: [] as Array<{ name: string; quantity: number }>
  });
  const [isAutoPopulated, setIsAutoPopulated] = useState(false);
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');
  const [locationsForDate, setLocationsForDate] = useState<Array<{
    locationName: string;
    capacity: string;
    description: string;
    status: 'available' | 'unavailable';
    requirements?: Array<{ name: string; quantity: number }>;
  }>>([]);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showBulkAvailableDialog, setShowBulkAvailableDialog] = useState(false);
  const [showSelectiveDateDeleteDialog, setShowSelectiveDateDeleteDialog] = useState(false);
  const [selectedDatesForDeletion, setSelectedDatesForDeletion] = useState<string[]>([]);
  const [isSelectingDatesMode, setIsSelectingDatesMode] = useState(false);
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(new Date());
  const [requirementName, setRequirementName] = useState('');
  const [requirementQuantity, setRequirementQuantity] = useState('');
  
  // Global Requirements Management State
  const [showGlobalRequirementsModal, setShowGlobalRequirementsModal] = useState(false);
  const [selectedLocationForRequirements, setSelectedLocationForRequirements] = useState('');
  const [selectedLocationsForRequirements, setSelectedLocationsForRequirements] = useState<string[]>([]);
  const [globalRequirements, setGlobalRequirements] = useState<Array<{ name: string; quantity: number }>>([]);
  const [globalReqName, setGlobalReqName] = useState('');
  const [globalReqQuantity, setGlobalReqQuantity] = useState('');
  const [requirementsTab, setRequirementsTab] = useState<'add' | 'view'>('add');
  const [allLocationRequirements, setAllLocationRequirements] = useState<Array<{ locationNames?: string[]; locationName?: string; requirements: Array<{ name: string; quantity: number }> }>>([]);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [editingRequirements, setEditingRequirements] = useState<Array<{ name: string; quantity: number }>>([]);
  
  // Default location names with hierarchy groups
  const hierarchyGroups = [
    {
      name: 'Pavilion (Overall)',
      type: 'hierarchy',
      description: 'Applies to ALL Pavilion locations (Entire and Sections)',
      children: [
        'Pavilion - Kagitingan Hall (Entire)',
        'Pavilion - Kagitingan Hall - Section A',
        'Pavilion - Kagitingan Hall - Section B',
        'Pavilion - Kagitingan Hall - Section C',
        'Pavilion - Kalayaan Ballroom (Entire)',
        'Pavilion - Kalayaan Ballroom - Section A',
        'Pavilion - Kalayaan Ballroom - Section B',
        'Pavilion - Kalayaan Ballroom - Section C'
      ]
    },
    {
      name: 'Conference Rooms (Overall)',
      type: 'hierarchy',
      description: 'Applies to ALL Conference Rooms',
      children: [
        '4th Flr. Conference Room 1',
        '4th Flr. Conference Room 2',
        '4th Flr. Conference Room 3',
        '6th Flr. Meeting Room 7'
      ]
    }
  ];

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
    'Pavilion - Kagitingan Hall (Entire)',
    'Pavilion - Kagitingan Hall - Section A',
    'Pavilion - Kagitingan Hall - Section B',
    'Pavilion - Kagitingan Hall - Section C',
    'Pavilion - Kalayaan Ballroom (Entire)',
    'Pavilion - Kalayaan Ballroom - Section A',
    'Pavilion - Kalayaan Ballroom - Section B',
    'Pavilion - Kalayaan Ballroom - Section C'
  ];

  // Initialize user and fetch data using Zustand store
  // Empty deps array = only runs once on mount, respects Zustand cache
  useEffect(() => {
    initializeUser();
  }, []);

  // Load all location requirements when modal opens
  useEffect(() => {
    if (showGlobalRequirementsModal) {
      console.log('🔄 Modal opened via useEffect, loading all location requirements...');
      loadAllLocationRequirements();
    }
  }, [showGlobalRequirementsModal]);

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

  const deleteLocationRequirement = async (locationKey: string, requirementName: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please login to delete requirements');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/location-requirements/${encodeURIComponent(locationKey)}/requirements/${encodeURIComponent(requirementName)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        toast.success(`Deleted "${requirementName}"`);
        await loadAllLocationRequirements();
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.message || 'Failed to delete requirement');
      }
    } catch (error) {
      toast.error('Failed to delete requirement');
    }
  };


  // Generate PDF preview for specific event (instead of showing modal)
  const generateEventPdfPreview = async (eventId: string) => {
    // Note: loadingEventDetails is managed by the store but no setter is exposed
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
      // Note: loadingEventDetails state is managed by the store
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
      pdf.text(event.locations && event.locations.length > 1 ? 'Locations:' : 'Location:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      
      if (event.locations && event.locations.length > 1) {
        // Multiple locations - display each on a new line
        event.locations.forEach((loc: string, index: number) => {
          if (index === 0) {
            pdf.text(loc, margin + 25, yPos);
          } else {
            yPos += 5;
            pdf.text(loc, margin + 25, yPos);
          }
        });
        yPos += 7;
      } else {
        // Single location
        pdf.text(event.location, margin + 25, yPos);
        yPos += 7;
      }
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Participants:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${event.participants} attendees`, margin + 25, yPos);
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
        
        // Check single location
        let locationMatch = defaultLocationNames.some(locationName => 
          eventLocation.includes(locationName.toLowerCase()) || 
          locationName.toLowerCase().includes(eventLocation)
        );
        
        // Also check locations array for multiple locations
        if (!locationMatch && event.locations && Array.isArray(event.locations)) {
          locationMatch = event.locations.some((loc: string) => {
            const locLower = loc.toLowerCase().trim();
            return defaultLocationNames.some(locationName =>
              locLower.includes(locationName.toLowerCase()) ||
              locationName.toLowerCase().includes(locLower)
            );
          });
        }
        
        // CRITICAL: Only show APPROVED events (hide submitted/on-hold)
        return locationMatch && event.status === 'approved';
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
        pdf.text(event.locations && event.locations.length > 1 ? 'Locations:' : 'Location:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        
        if (event.locations && event.locations.length > 1) {
          // Multiple locations - display each on a new line
          event.locations.forEach((loc: string, index: number) => {
            if (index === 0) {
              pdf.text(loc, margin + 25, yPosition);
            } else {
              yPosition += 5;
              pdf.text(loc, margin + 25, yPosition);
            }
          });
          yPosition += 7;
        } else {
          // Single location
          pdf.text(event.location, margin + 25, yPosition);
          yPosition += 7;
        }
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Participants:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${event.participants} attendees`, margin + 25, yPosition);
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

  // loadLocationData is now handled by the Zustand store

  // Load global requirements for a specific location
  const loadLocationRequirements = async (locationName: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/location-requirements/${encodeURIComponent(locationName)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGlobalRequirements(data.requirements || []);
      }
    } catch (error) {
      console.error('Error loading location requirements:', error);
    }
  };

  // Load all location requirements
  const loadAllLocationRequirements = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('❌ No auth token found');
        return;
      }

      console.log('🔄 Fetching all location requirements...');
      const response = await fetch(`${API_BASE_URL}/location-requirements`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded location requirements:', data);
        console.log('📊 Number of locations:', data.length);
        setAllLocationRequirements(data);
      } else {
        console.log('❌ Response not OK:', response.statusText);
      }
    } catch (error) {
      console.error('❌ Error loading all location requirements:', error);
    }
  };

  // Expand hierarchy groups to individual locations
  const expandHierarchyGroups = (selectedLocations: string[]): string[] => {
    const expandedLocations: string[] = [];
    
    selectedLocations.forEach(location => {
      // Check if this is a hierarchy group
      const hierarchyGroup = hierarchyGroups.find(group => group.name === location);
      
      if (hierarchyGroup) {
        // Add all children of this hierarchy group
        expandedLocations.push(...hierarchyGroup.children);
      } else {
        // Add individual location as-is
        expandedLocations.push(location);
      }
    });
    
    // Remove duplicates
    return [...new Set(expandedLocations)];
  };

  // Save global requirements for multiple locations as ONE entry
  const saveLocationRequirements = async () => {
    try {
      if (selectedLocationsForRequirements.length === 0) {
        toast.error('Please select at least one location');
        return;
      }

      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please login to save requirements');
        return;
      }

      // Expand hierarchy groups to individual locations
      const expandedLocations = expandHierarchyGroups(selectedLocationsForRequirements);
      
      console.log('🏢 Selected locations:', selectedLocationsForRequirements);
      console.log('📍 Expanded locations:', expandedLocations);

      // Save as ONE entry with multiple locationNames (expanded)
      const response = await fetch(`${API_BASE_URL}/location-requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          locationNames: expandedLocations,
          requirements: globalRequirements,
          hierarchyInfo: {
            originalSelection: selectedLocationsForRequirements,
            expandedLocations: expandedLocations
          }
        })
      });

      if (response.ok) {
        const selectedHierarchyGroups = selectedLocationsForRequirements.filter(loc => 
          hierarchyGroups.some(group => group.name === loc)
        );
        
        if (selectedHierarchyGroups.length > 0) {
          toast.success(`Requirements saved for ${selectedHierarchyGroups.join(', ')} affecting ${expandedLocations.length} locations`);
        } else {
          toast.success(`Requirements saved for ${expandedLocations.length} location(s)`);
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save requirements');
      }

      // Reload all location requirements to update the view tab
      await loadAllLocationRequirements();
      setSelectedLocationsForRequirements([]);
      setGlobalRequirements([]);
      setGlobalReqName('');
      setGlobalReqQuantity('');
    } catch (error) {
      console.error('Error saving location requirements:', error);
      toast.error('Failed to save requirements');
    }
  };

  // Save inline edited requirements
  const saveInlineEdit = async (locationName: string, requirements: Array<{ name: string; quantity: number }>) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('Please login to save requirements');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/location-requirements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          locationName,
          requirements
        })
      });

      if (response.ok) {
        toast.success(`Requirements updated for ${locationName}`);
        // Reload all location requirements to update the view
        await loadAllLocationRequirements();
        setEditingLocation(null);
        setEditingRequirements([]);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save requirements');
      }
    } catch (error) {
      console.error('Error saving requirements:', error);
      toast.error('Failed to save requirements');
    }
  };

  const handleDateClick = async (date: Date) => {
    setSelectedDate(date);
    setShowLocationModal(true);
    
    // Reload fresh data first to ensure we have the latest
    await loadLocationData(true);
    
    // Load existing locations for this date
    const dateStr = format(date, 'yyyy-MM-dd');
    const existingLocations = locationAvailabilities.filter(loc => loc.date === dateStr);
    setLocationsForDate(existingLocations.map(loc => ({
      locationName: loc.locationName,
      capacity: loc.capacity.toString(),
      description: loc.description,
      status: loc.status,
      requirements: (loc as any).requirements || []
    })));
    
    // Reset form data
    setFormData({
      locationName: '',
      capacity: '',
      description: '',
      status: 'available',
      requirements: []
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
        status: 'available',
        requirements: []
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
        status: 'available' as 'available' | 'unavailable',
        requirements: (existingLocationData as any).requirements || []
      };
      
      // Automatically add to list since it's auto-populated
      setLocationsForDate(prev => [...prev, autoPopulatedLocation]);
      
      // Reset form for next entry
      setFormData({
        locationName: '',
        capacity: '',
        description: '',
        status: 'available',
        requirements: []
      });
      setIsAutoPopulated(false);
      
      toast.success(`${selectedLocationName} auto-added to list with standardized data`);
    } else {
      console.log('ℹ️ No existing data found, using defaults');
      
      // Set default capacity based on location type
      let defaultCapacity = '';
      if (selectedLocationName.includes('Pavilion')) {
        if (selectedLocationName.includes('(Entire)')) {
          defaultCapacity = '300'; // Entire hall capacity
        } else if (selectedLocationName.includes('Section')) {
          defaultCapacity = '100'; // Each section capacity
        }
      }
      
      // If we have a default capacity (Pavilion locations), auto-add to list
      if (defaultCapacity) {
        const autoPopulatedLocation = {
          locationName: selectedLocationName,
          capacity: defaultCapacity,
          description: '',
          status: 'available' as 'available' | 'unavailable',
          requirements: []
        };
        
        setLocationsForDate(prev => [...prev, autoPopulatedLocation]);
        
        // Reset form for next entry
        setFormData({
          locationName: '',
          capacity: '',
          description: '',
          status: 'available',
          requirements: []
        });
        
        toast.success(`${selectedLocationName} auto-added to list with default capacity`);
      } else {
        // No default capacity, let user fill it in manually
        setFormData({
          locationName: selectedLocationName,
          capacity: defaultCapacity,
          description: '',
          status: 'available',
          requirements: []
        });
      }
      
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
      status: 'available',
      requirements: []
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
      requirements?: Array<{ name: string; quantity: number }>;
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
          status: 'available' as 'available' | 'unavailable',
          requirements: (existingLocationData as any).requirements || []
        });
      } else {
        // Set default capacity based on location type
        let defaultCapacity = '';
        if (locationName.includes('Pavilion')) {
          if (locationName.includes('(Entire)')) {
            defaultCapacity = '300'; // Entire hall capacity
          } else if (locationName.includes('Section')) {
            defaultCapacity = '100'; // Each section capacity
          }
        }
        
        // Use default values
        newLocations.push({
          locationName: locationName,
          capacity: defaultCapacity,
          description: '',
          status: 'available' as 'available' | 'unavailable',
          requirements: []
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
      status: 'available',
      requirements: []
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
      status: 'available',
      requirements: []
    });
  };

  // Check if location has active events
  const locationHasEvents = (locationName: string, date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    return allEvents.some((event: any) => {
      const searchLocation = locationName.toLowerCase().trim();
      
      // Check both single location and locations array
      let locationMatch = false;
      
      // Check single location field
      const eventLocation = (event.location || '').toLowerCase().trim();
      locationMatch = eventLocation.includes(searchLocation) ||
                     searchLocation.includes(eventLocation) ||
                     eventLocation === searchLocation;
      
      // Also check locations array for multiple locations
      if (!locationMatch && event.locations && Array.isArray(event.locations)) {
        locationMatch = event.locations.some((loc: string) => {
          const locLower = loc.toLowerCase().trim();
          return locLower.includes(searchLocation) || 
                 searchLocation.includes(locLower) ||
                 locLower === searchLocation;
        });
      }

      // Check if event date matches
      const eventStartDate = new Date(event.startDate);
      const eventEndDate = new Date(event.endDate);
      const eventStartLocalDate = eventStartDate.toLocaleDateString('en-CA');
      const eventEndLocalDate = eventEndDate.toLocaleDateString('en-CA');
      const dateMatch = dateStr >= eventStartLocalDate && dateStr <= eventEndLocalDate;

      // CRITICAL: Only show APPROVED events (hide submitted/on-hold)
      const statusMatch = event.status === 'approved';

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
        // Delete from database using store method
        const success = await deleteLocationAvailability(existingLocation._id);

        if (success) {
          toast.success(`${locationToRemove.locationName} deleted successfully`);
          
          // Immediately remove from UI first for instant feedback
          setLocationsForDate(prev => prev.filter((_, i) => i !== index));
        } else {
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
        status: 'available',
        requirements: []
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
      
      // Validate all locations have capacity before saving
      for (const location of allNewLocations) {
        if (!location.capacity || location.capacity.trim() === '') {
          toast.error(`Please enter a capacity for "${location.locationName}"`);
          return;
        }
        const capacityNum = parseInt(location.capacity, 10);
        if (isNaN(capacityNum) || capacityNum < 1) {
          toast.error(`Invalid capacity for "${location.locationName}". Please enter a valid number.`);
          return;
        }
      }
      
      // Save all NEW locations for this date using the store method
      const savePromises = allNewLocations.map(async (location) => {
        const capacityNum = parseInt(location.capacity, 10);
        
        console.log(`Saving location ${location.locationName} with capacity: ${location.capacity} -> ${capacityNum}`);
        
        const locationData = {
          date: dateStr,
          locationName: location.locationName.trim(),
          capacity: capacityNum,
          description: location.description.trim(),
          status: location.status,
          requirements: location.requirements || []
        };

        return await saveLocationAvailability(locationData);
      });

      const results = await Promise.all(savePromises);
      const failedSaves = results.filter(result => !result);
      
      if (failedSaves.length === 0) {
        console.log('All locations saved successfully, closing modal...');
        toast.success(`All ${allNewLocations.length} locations saved successfully!`);
      } else {
        toast.error(`${failedSaves.length} out of ${allNewLocations.length} locations failed to save`);
      }
    } catch (error) {
      console.error('Error saving locations:', error);
      toast.error('Failed to save location availability');
    }
  };

  // getCurrentAndFutureDates is now handled by the Zustand store

  // Progress Modal Helper Functions (using Zustand store)
  const startProgressModal = (operation: 'add' | 'delete', initialText: string) => {
    setProgressModal(true, operation, 0, initialText);
  };

  const updateProgress = (value: number, text: string) => {
    setProgressModal(true, progressOperation, value, text);
  };

  const closeProgressModal = () => {
    setProgressModal(false);
  };

  // Bulk add all locations using Zustand store
  const handleBulkAddAllLocations = async () => {
    setShowBulkAvailableDialog(false);
    
    try {
      await bulkAddAllLocations(calendarCurrentMonth);
    } catch (error) {
      console.error('Error in bulk add operation:', error);
      toast.error(`Error adding locations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Bulk delete all locations using Zustand store
  const handleBulkDeleteAllLocations = async () => {
    setShowBulkDeleteDialog(false);
    
    try {
      await bulkDeleteAllLocations(calendarCurrentMonth);
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      toast.error(`Error deleting locations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle date selection for deletion
  const toggleDateSelectionMode = () => {
    setIsSelectingDatesMode(!isSelectingDatesMode);
    if (!isSelectingDatesMode) {
      setSelectedDatesForDeletion([]);
    }
  };

  // Handle selective date deletion
  const handleSelectiveDateDelete = async () => {
    setShowSelectiveDateDeleteDialog(false);
    
    if (selectedDatesForDeletion.length === 0) {
      toast.error('No dates selected for deletion');
      return;
    }

    try {
      startProgressModal('delete', 'Preparing to delete selected dates...');
      
      // Get all locations for the selected dates
      const locationsToDelete = locationAvailabilities.filter(loc => 
        selectedDatesForDeletion.includes(loc.date)
      );

      if (locationsToDelete.length === 0) {
        closeProgressModal();
        toast.info('No location data found for selected dates');
        return;
      }

      updateProgress(20, 'Checking for active bookings...');

      // Check for active bookings on selected dates
      const activeEventsLookup = new Map();
      allEvents
        .filter(event => event.status === 'submitted' || event.status === 'approved')
        .forEach(event => {
          if (event.startDate) {
            const eventDateStr = event.startDate.includes('T') 
              ? event.startDate.split('T')[0] 
              : event.startDate;
            
            if (selectedDatesForDeletion.includes(eventDateStr)) {
              if (!activeEventsLookup.has(eventDateStr)) {
                activeEventsLookup.set(eventDateStr, []);
              }
              activeEventsLookup.get(eventDateStr).push({
                location: event.location,
                title: event.eventTitle
              });
            }
          }
        });

      updateProgress(40, 'Separating protected locations...');

      // Separate deletable and protected locations
      const deletable: any[] = [];
      const protected_: any[] = [];

      for (const location of locationsToDelete) {
        const dateEvents = activeEventsLookup.get(location.date) || [];
        const hasActiveEvents = dateEvents.some((event: any) => event.location === location.locationName);
        
        if (hasActiveEvents) {
          protected_.push(location);
        } else {
          deletable.push(location);
        }
      }

      if (deletable.length === 0) {
        closeProgressModal();
        toast.info(`All ${protected_.length} location entries are protected due to active bookings!`);
        setSelectedDatesForDeletion([]);
        setIsSelectingDatesMode(false);
        return;
      }

      updateProgress(60, `Deleting ${deletable.length} location entries...`);

      // Bulk delete locations using optimized backend endpoint
      let deleted = 0;
      try {
        const token = localStorage.getItem('authToken');
        const idsToDelete = deletable.map(loc => loc._id).filter(Boolean);
        
        const response = await fetch(`${API_BASE_URL}/location-availability/bulk-delete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids: idsToDelete })
        });

        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Bulk delete failed');
        }

        deleted = result.deletedCount || 0;
        const failed = idsToDelete.length - deleted;
        
        console.log(`Bulk delete completed: ${deleted} deleted, ${failed} failed`);
      } catch (error) {
        console.error('Bulk delete error:', error);
        throw error;
      }

      updateProgress(90, 'Refreshing location data...');
      await loadLocationData(true);
      
      updateProgress(100, 'Operation completed!');

      if (protected_.length > 0) {
        toast.success(
          `Deleted ${deleted} location entries! ${protected_.length} entries were protected due to active bookings.`,
          { duration: 6000 }
        );
      } else {
        toast.success(`Successfully deleted all ${deleted} location entries!`);
      }

      setTimeout(() => {
        closeProgressModal();
        setSelectedDatesForDeletion([]);
        setIsSelectingDatesMode(false);
      }, 1500);

    } catch (error) {
      console.error('Error in selective date deletion:', error);
      toast.error(`Error deleting locations: ${error instanceof Error ? error.message : 'Unknown error'}`);
      closeProgressModal();
    }
  };

  // Handle date click for selection
  const handleDateClickForSelection = (date: Date) => {
    if (!isSelectingDatesMode) {
      handleDateClick(date);
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check if date has any location data
    const hasLocationData = locationAvailabilities.some(loc => loc.date === dateStr);
    
    if (!hasLocationData) {
      toast.error(`No location data found for ${format(date, 'MMM dd, yyyy')}`);
      return;
    }

    setSelectedDatesForDeletion(prev => 
      prev.includes(dateStr) 
        ? prev.filter(d => d !== dateStr)
        : [...prev, dateStr]
    );
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
              onClick={() => setShowGlobalRequirementsModal(true)}
              variant="outline"
              className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              <Package className="w-4 h-4" />
              Manage Default Requirements
            </Button>
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
                          {location.requirements && location.requirements.length > 0 && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                              <Package className="w-3 h-3 mr-1" />
                              {location.requirements.length} Requirements
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600">
                          Capacity: {location.capacity} | {location.description || 'No description'}
                        </div>
                        {location.requirements && location.requirements.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {location.requirements.map((req, reqIndex) => (
                              <div key={reqIndex} className="flex items-center gap-1 text-xs text-purple-700">
                                <Package className="w-3 h-3" />
                                <span>{req.name}</span>
                                <span className="text-purple-500">× {req.quantity}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Bookings Button with Popover */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => fetchLocationBookings(location.locationName, selectedDate!)}
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

              {/* Location Requirements Section */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-600" />
                  <Label className="text-sm font-medium">Location Requirements (Optional)</Label>
                </div>
                <p className="text-xs text-gray-500">Add default materials/equipment for this location (e.g., Chairs, Tables, Projector)</p>
                
                {/* Current Requirements List */}
                {formData.requirements.length > 0 && (
                  <div className="space-y-2">
                    {formData.requirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                        <Package className="w-3 h-3 text-purple-600" />
                        <span className="text-sm flex-1">{req.name}</span>
                        <Badge variant="outline" className="text-xs bg-white">Qty: {req.quantity}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              requirements: formData.requirements.filter((_, i) => i !== index)
                            });
                          }}
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add Requirement Form */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <Input
                    placeholder="Requirement name (e.g., Chairs)"
                    value={requirementName}
                    onChange={(e) => setRequirementName(e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={requirementQuantity}
                    onChange={(e) => setRequirementQuantity(e.target.value)}
                    className="w-20 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (requirementName.trim() && requirementQuantity && parseInt(requirementQuantity) > 0) {
                        setFormData({
                          ...formData,
                          requirements: [...formData.requirements, {
                            name: requirementName.trim(),
                            quantity: parseInt(requirementQuantity)
                          }]
                        });
                        setRequirementName('');
                        setRequirementQuantity('');
                        toast.success('Requirement added');
                      } else {
                        toast.error('Please enter requirement name and quantity');
                      }
                    }}
                    disabled={!requirementName.trim() || !requirementQuantity || parseInt(requirementQuantity) <= 0}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
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
                      status: 'available',
                      requirements: []
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

      {/* Global Requirements Management Modal */}
      <Dialog open={showGlobalRequirementsModal} onOpenChange={setShowGlobalRequirementsModal}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-600" />
              Manage Default Location Requirements
            </DialogTitle>
            <DialogDescription>
              Set default materials and equipment for each location. These will be shown when users book events.
            </DialogDescription>
          </DialogHeader>
          
          {/* Tab Navigation */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setRequirementsTab('add')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                requirementsTab === 'add'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Add/Edit Requirements
            </button>
            <button
              onClick={() => setRequirementsTab('view')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                requirementsTab === 'view'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              View All Locations ({allLocationRequirements.length})
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4">
            {/* Add/Edit Tab Content */}
            {requirementsTab === 'add' && (
              <div className="space-y-6">
                {/* Location Selection - Multi-select */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Select Locations * (Can select multiple)</Label>
                    {selectedLocationsForRequirements.length > 0 && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        {selectedLocationsForRequirements.length} selected
                      </Badge>
                    )}
                  </div>
                  <div className="border rounded-lg p-3 max-h-[300px] overflow-y-auto bg-white">
                    <div className="space-y-3">
                      {/* Hierarchy Groups Section */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-purple-600 uppercase tracking-wide border-b border-purple-100 pb-1">
                          Overall Groups (Affects Multiple Locations)
                        </div>
                        {hierarchyGroups.map((group) => (
                          <label
                            key={group.name}
                            className="flex items-start gap-2 p-3 hover:bg-purple-50 rounded-lg cursor-pointer transition-colors border border-purple-200 bg-purple-25"
                          >
                            <input
                              type="checkbox"
                              checked={selectedLocationsForRequirements.includes(group.name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Add the hierarchy group name
                                  setSelectedLocationsForRequirements([...selectedLocationsForRequirements, group.name]);
                                } else {
                                  // Remove the hierarchy group name
                                  setSelectedLocationsForRequirements(selectedLocationsForRequirements.filter(loc => loc !== group.name));
                                }
                              }}
                              className="w-4 h-4 text-purple-600 rounded mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-700">{group.name}</span>
                                <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                                  {group.children.length} locations
                                </Badge>
                              </div>
                              <p className="text-xs text-purple-600 mt-1">{group.description}</p>
                            </div>
                          </label>
                        ))}
                      </div>

                      {/* Individual Locations Section */}
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide border-b border-gray-100 pb-1">
                          Individual Locations
                        </div>
                        {defaultLocationNames.map((locationName) => (
                          <label
                            key={locationName}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedLocationsForRequirements.includes(locationName)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLocationsForRequirements([...selectedLocationsForRequirements, locationName]);
                                } else {
                                  setSelectedLocationsForRequirements(selectedLocationsForRequirements.filter(loc => loc !== locationName));
                                }
                              }}
                              className="w-4 h-4 text-purple-600 rounded"
                            />
                            <MapPinIcon className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{locationName}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requirements Management - Only show when locations are selected */}
                {selectedLocationsForRequirements.length > 0 && (
              <div className="space-y-4 p-4 border rounded-lg bg-purple-50/30">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Requirements for: {selectedLocationsForRequirements.join(', ')}
                  </Label>
                  <Badge variant="outline" className="bg-white">
                    {globalRequirements.length} items
                  </Badge>
                </div>

                {/* Current Requirements List */}
                {globalRequirements.length > 0 && (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {globalRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-white border border-purple-200 rounded-lg">
                        <Package className="w-4 h-4 text-purple-600" />
                        <span className="text-sm flex-1 font-medium">{req.name}</span>
                        <Badge variant="outline" className="text-xs">Qty: {req.quantity}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setGlobalRequirements(globalRequirements.filter((_, i) => i !== index));
                          }}
                          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Requirement */}
                <div className="space-y-2">
                  <Label className="text-xs text-gray-600">Add New Requirement</Label>
                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <Input
                      placeholder="e.g., Chairs, Tables, Projector"
                      value={globalReqName}
                      onChange={(e) => setGlobalReqName(e.target.value)}
                      className="text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && globalReqName.trim() && globalReqQuantity && parseInt(globalReqQuantity) > 0) {
                          setGlobalRequirements([...globalRequirements, {
                            name: globalReqName.trim(),
                            quantity: parseInt(globalReqQuantity)
                          }]);
                          setGlobalReqName('');
                          setGlobalReqQuantity('');
                          toast.success('Requirement added');
                        }
                      }}
                    />
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={globalReqQuantity}
                      onChange={(e) => setGlobalReqQuantity(e.target.value)}
                      className="w-24 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && globalReqName.trim() && globalReqQuantity && parseInt(globalReqQuantity) > 0) {
                          setGlobalRequirements([...globalRequirements, {
                            name: globalReqName.trim(),
                            quantity: parseInt(globalReqQuantity)
                          }]);
                          setGlobalReqName('');
                          setGlobalReqQuantity('');
                          toast.success('Requirement added');
                        }
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (globalReqName.trim() && globalReqQuantity && parseInt(globalReqQuantity) > 0) {
                          setGlobalRequirements([...globalRequirements, {
                            name: globalReqName.trim(),
                            quantity: parseInt(globalReqQuantity)
                          }]);
                          setGlobalReqName('');
                          setGlobalReqQuantity('');
                          toast.success('Requirement added');
                        } else {
                          toast.error('Please enter requirement name and quantity');
                        }
                      }}
                      disabled={!globalReqName.trim() || !globalReqQuantity || parseInt(globalReqQuantity) <= 0}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Press Enter or click + to add</p>
                </div>
              </div>
            )}
              </div>
            )}

            {/* View All Tab Content */}
            {requirementsTab === 'view' && (
              <div className="space-y-4">
                {allLocationRequirements.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No locations with requirements yet</p>
                    <p className="text-gray-400 text-xs mt-1">Switch to "Add/Edit Requirements" tab to add requirements</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allLocationRequirements.map((location, idx) => {
                      // Handle both old (locationName) and new (locationNames) format
                      const locationNamesArray = location.locationNames || (location.locationName ? [location.locationName] : []);
                      const locationKey = locationNamesArray.join(',');
                      const isEditing = editingLocation === locationKey;
                      const displayRequirements = isEditing ? editingRequirements : location.requirements;
                      
                      return (
                        <div key={idx} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-5 h-5 text-purple-600 mt-0.5" />
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {locationNamesArray.join(' + ')}
                                </h3>
                                {locationNamesArray.length > 1 && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {locationNamesArray.length} locations grouped
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!isEditing && (
                                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                  {location.requirements.length} items
                                </Badge>
                              )}
                              {isEditing ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingLocation(null);
                                      setEditingRequirements([]);
                                    }}
                                    className="h-8 text-xs"
                                  >
                                    Cancel
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => saveInlineEdit(locationKey, editingRequirements)}
                                    className="h-8 text-xs bg-purple-600 hover:bg-purple-700"
                                  >
                                    <Save className="w-3 h-3 mr-1" />
                                    Save
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingLocation(locationKey);
                                    setEditingRequirements([...location.requirements]);
                                  }}
                                  className="h-8 text-xs"
                                >
                                  Edit
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {displayRequirements.map((req, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                                <Package className="w-4 h-4 text-purple-600" />
                                <span className="flex-1 text-sm text-gray-700">{req.name}</span>
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    min="1"
                                    value={req.quantity}
                                    onChange={(e) => {
                                      const newQty = parseInt(e.target.value) || 1;
                                      const updated = [...editingRequirements];
                                      updated[idx] = { ...updated[idx], quantity: newQty };
                                      setEditingRequirements(updated);
                                    }}
                                    className="w-20 h-8 text-sm"
                                  />
                                ) : (
                                  <span className="text-sm text-gray-500">×{req.quantity}</span>
                                )}

                                {!isEditing && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete requirement?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will remove "{req.name}" from "{locationNamesArray.join(' + ')}".
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteLocationRequirement(locationKey, req.name)}
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {requirementsTab === 'add' ? (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowGlobalRequirementsModal(false);
                  setSelectedLocationsForRequirements([]);
                  setGlobalRequirements([]);
                  setGlobalReqName('');
                  setGlobalReqQuantity('');
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveLocationRequirements}
                disabled={selectedLocationsForRequirements.length === 0}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Save className="w-4 h-4" />
                Save for {selectedLocationsForRequirements.length} Location{selectedLocationsForRequirements.length !== 1 ? 's' : ''}
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowGlobalRequirementsModal(false);
                  setSelectedLocationForRequirements('');
                  setGlobalRequirements([]);
                }}
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageLocationPage;
