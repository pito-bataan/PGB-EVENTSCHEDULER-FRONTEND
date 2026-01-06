import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { useSocket, getGlobalSocket } from '@/hooks/useSocket';
import { useAllEventsStore, type Event } from '@/stores/allEventsStore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Building2,
  Search,
  Filter,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Paperclip,
  AlertCircle,
  Clock3,
  RefreshCw,
  User,
  Mail,
  Phone,
  Star,
  Tag,
  Download,
  FileDown,
  Printer,
  CheckSquare,
  Square,
  ArrowUpDown,
  TrendingUp,
  Clock4,
  SortAsc,
  UserCheck,
  Trash2
} from 'lucide-react';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;
const ADMIN_ENABLE_EVENT_DELETION_KEY = 'admin_enable_event_deletion';

const AllEventsPage: React.FC = () => {
  // Socket.IO for real-time updates
  const { socket } = useSocket();
  
  // Zustand store
  const {
    events,
    departments,
    loading,
    searchQuery,
    statusFilter,
    departmentFilter,
    eventTypeFilter,
    sortBy,
    selectedEvent: storeSelectedEvent,
    fetchAllEvents,
    addNewEvent,
    updateEventStatus,
    setSearchQuery,
    setStatusFilter,
    setDepartmentFilter,
    setEventTypeFilter,
    setSortBy,
    setSelectedEvent: setStoreSelectedEvent,
    getFilteredEvents
  } = useAllEventsStore();

  // Local state for UI
  const [showDescription, setShowDescription] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [enableEventDeletion, setEnableEventDeletion] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusAction, setStatusAction] = useState<'approve' | 'disapprove' | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingCancelReason, setPendingCancelReason] = useState<string>('');
  
  // Track last submitted events count for notifications
  const [lastSubmittedCount, setLastSubmittedCount] = useState(0);
  
  // Use store's selected event or local state for status dialog
  const selectedEvent = storeSelectedEvent;

  useEffect(() => {
    const readFlag = () => {
      try {
        const raw = localStorage.getItem(ADMIN_ENABLE_EVENT_DELETION_KEY);
        const enabled = raw === 'true';
        setEnableEventDeletion(enabled);
        if (!enabled) setSelectedEvents([]);
      } catch {
        setEnableEventDeletion(false);
        setSelectedEvents([]);
      }
    };

    readFlag();

    const onSettingsChanged = () => readFlag();
    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_ENABLE_EVENT_DELETION_KEY) readFlag();
    };

    window.addEventListener('adminSettingsChanged', onSettingsChanged);
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('adminSettingsChanged', onSettingsChanged);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Get user role from localStorage
  const getUserRole = (): string => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return parsed.role?.toLowerCase() || 'admin';
      } catch {
        return 'admin';
      }
    }
    return 'admin';
  };
  
  const userRole = getUserRole();
  const isSuperAdmin = userRole === 'superadmin';

  // Note: Socket.IO listeners and notifications are now handled globally by AdminNotificationSystem
  // This component only needs to handle the table display and filtering

  // Check and auto-complete expired events (optimized - no API calls unless needed)
  const checkAndCompleteExpiredEvents = async () => {
    const now = new Date();
    
    // Find events that should be marked as completed (client-side check only)
    const expiredEvents = events.filter(event => {
      // Only check approved events
      if (event.status !== 'approved') return false;
      
      // Combine end date and end time
      const endDateTime = new Date(`${event.endDate}T${event.endTime}`);
      
      // Check if event has ended
      return endDateTime < now;
    });
    
    // ✅ NO API CALLS if no expired events found
    if (expiredEvents.length === 0) {
      return;
    }
    
    // ⚠️ ONLY MAKE API CALLS when there are actually expired events
    const token = localStorage.getItem('authToken');
    const updatePromises = expiredEvents.map(async (event) => {
      try {
        const response = await axios.patch(
          `${API_BASE_URL}/events/${event._id}/status`,
          { status: 'completed' },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data.success) {
          return { success: true, eventTitle: event.eventTitle };
        }
        return { success: false, eventTitle: event.eventTitle };
      } catch (error) {
        console.error(`❌ Failed to auto-complete: ${event.eventTitle}`, error);
        return { success: false, eventTitle: event.eventTitle };
      }
    });
    
    const results = await Promise.all(updatePromises);
    const successCount = results.filter(r => r.success).length;
    
    if (successCount > 0) {
      // Refresh the events list to show updated statuses
      fetchAllEvents();
      toast.success(`${successCount} event(s) automatically marked as completed`);
    }
  };

  // Use ref to track if we've done initial check
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    fetchAllEvents();
    
    // Set up interval for checking expired events every minute
    const intervalId = setInterval(() => {
      checkAndCompleteExpiredEvents();
    }, 60000); // Check every 60 seconds
    
    return () => clearInterval(intervalId);
  }, []); // ✅ Empty dependency array - only runs once on mount

  // Run initial check only once when events are first loaded
  useEffect(() => {
    if (events.length > 0 && !hasCheckedRef.current) {
      checkAndCompleteExpiredEvents();
      hasCheckedRef.current = true;
    }
  }, [events]);

  // Get filtered events from store (all filtering done in Zustand)
  const filteredEvents = getFilteredEvents();
  
  // Calculate counts for each status tab
  const statusCounts = {
    all: filteredEvents.length,
    submitted: filteredEvents.filter(e => e.status === 'submitted').length,
    approved: filteredEvents.filter(e => e.status === 'approved').length,
    rejected: filteredEvents.filter(e => e.status === 'rejected').length,
    completed: filteredEvents.filter(e => e.status === 'completed').length,
    cancelled: filteredEvents.filter(e => e.status === 'cancelled').length,
  };
  
  // Filter events by active tab (store already handles sorting)
  const tabFilteredEvents = activeTab === 'all' 
    ? filteredEvents 
    : filteredEvents.filter(e => e.status === activeTab);
  
  // Pagination calculations
  const totalPages = Math.ceil(tabFilteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = tabFilteredEvents.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, departmentFilter, eventTypeFilter, activeTab]);

  // Get status info
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return { 
          variant: 'secondary' as const, 
          icon: <FileText className="w-3 h-3" />, 
          label: 'Draft',
          className: 'bg-gray-100 text-gray-700'
        };
      case 'submitted':
        return { 
          variant: 'default' as const, 
          icon: <Clock3 className="w-3 h-3" />, 
          label: 'Submitted',
          className: 'bg-blue-100 text-blue-700'
        };
      case 'approved':
        return { 
          variant: 'default' as const, 
          icon: <CheckCircle className="w-3 h-3" />, 
          label: 'Approved',
          className: 'bg-green-100 text-green-700'
        };
      case 'rejected':
        return { 
          variant: 'destructive' as const, 
          icon: <XCircle className="w-3 h-3" />, 
          label: 'Rejected',
          className: 'bg-red-100 text-red-700'
        };
      case 'completed':
        return { 
          variant: 'default' as const, 
          icon: <CheckCircle className="w-3 h-3" />, 
          label: 'Completed',
          className: 'bg-purple-100 text-purple-700'
        };
      case 'cancelled':
        return { 
          variant: 'secondary' as const, 
          icon: <XCircle className="w-3 h-3" />, 
          label: 'Cancelled',
          className: 'bg-red-600 text-white'
        };
      default:
        return { 
          variant: 'secondary' as const, 
          icon: <AlertCircle className="w-3 h-3" />, 
          label: 'Unknown',
          className: 'bg-gray-100 text-gray-700'
        };
    }
  };

  // Format time
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Check if all requirements are confirmed
  const areAllRequirementsConfirmed = (event: Event): boolean => {
    if (!event.departmentRequirements) return true;
    
    const allRequirements: any[] = [];
    Object.values(event.departmentRequirements).forEach((deptReqs: any) => {
      if (Array.isArray(deptReqs)) {
        allRequirements.push(...deptReqs);
      }
    });
    
    if (allRequirements.length === 0) return true;
    
    return allRequirements.every(req => req.status === 'confirmed');
  };

  // Handle status change
  const handleStatusChange = async (newStatus: 'approved' | 'rejected' | 'cancelled', reason?: string) => {
    if (!selectedEvent) return;
    
    try {
      const token = localStorage.getItem('authToken');
      
      const payload: any = { status: newStatus };
      if (reason) {
        payload.reason = reason;
      }
      
      const response = await axios.patch(
        `${API_BASE_URL}/events/${selectedEvent._id}/status`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        const statusText = newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'cancelled';
        toast.success(`Event ${statusText} successfully!`);
        setShowStatusDialog(false);
        setShowRejectDialog(false);
        setStatusAction(null);
        setRejectReason('');
        fetchAllEvents(true); // Force refresh to get updated data
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to update event status`);
    }
  };

  // Open status dialog
  const openStatusDialog = (event: Event, action: 'approve' | 'disapprove') => {
    setStoreSelectedEvent(event);
    setStatusAction(action);
    setShowStatusDialog(true);
  };

  // Handle checkbox selection
  const handleSelectEvent = (eventId: string) => {
    if (!enableEventDeletion) return;
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (!enableEventDeletion) return;
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(filteredEvents.map(event => event._id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!enableEventDeletion) return;
    if (selectedEvents.length === 0) return;

    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      await Promise.all(
        selectedEvents.map((eventId) => axios.delete(`${API_BASE_URL}/events/${eventId}`, { headers }))
      );

      toast.success('Event(s) deleted successfully');
      setSelectedEvents([]);
      fetchAllEvents(true);
    } catch (error) {
      toast.error('Failed to delete event(s)');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  // Handle PDF generation
  const handleGeneratePdf = (generateAll: boolean) => {
    const eventsToGenerate = generateAll 
      ? filteredEvents 
      : filteredEvents.filter(event => selectedEvents.includes(event._id));
    
    setShowPdfOptions(false);
    generatePdfPreview(eventsToGenerate);
  };

  // Generate actual PDF preview
  const generatePdfPreview = async (events: Event[]) => {
    try {
      // Create new PDF document
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
        pdf.text('Event Management System', pageWidth / 2, yPos, { align: 'center' });
        
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
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        
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
        pdf.text(event.taggedDepartments?.length > 0 ? event.taggedDepartments.join(', ') : 'N/A', margin + 115, yPosition);
        yPosition += 7;

        // Event Type
        pdf.setFont('helvetica', 'bold');
        pdf.text('Event Type:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        const eventTypeText = event.eventType === 'simple-meeting' ? 'Meeting' : event.eventType === 'complex' ? 'Complex' : 'Simple';
        pdf.text(eventTypeText, margin + 25, yPosition);
        yPosition += 7;

        // Check if event has multiple date/time slots (multi-day event)
        const hasSlots = event.dateTimeSlots && Array.isArray(event.dateTimeSlots) && event.dateTimeSlots.length > 0;
        
        if (hasSlots) {
          // Multi-Day Event Schedule
          pdf.setFont('helvetica', 'bold');
          pdf.text('Multi-Day Event Schedule:', margin, yPosition);
          yPosition += 7;
          
          // Day 1 - Main date slot
          pdf.setFont('helvetica', 'bold');
          pdf.text('Day 1:', margin + 5, yPosition);
          pdf.setFont('helvetica', 'normal');
          pdf.text(
            `${format(new Date(event.startDate), 'MMM dd, yyyy')} at ${formatTime(event.startTime)} - ${formatTime(event.endTime)}`,
            margin + 20,
            yPosition
          );
          yPosition += 6;
          
          // Additional Days
          event.dateTimeSlots?.forEach((slot: any, idx: number) => {
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Day ${idx + 2}:`, margin + 5, yPosition);
            pdf.setFont('helvetica', 'normal');
            pdf.text(
              `${format(new Date(slot.startDate), 'MMM dd, yyyy')} at ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
              margin + 20,
              yPosition
            );
            yPosition += 6;
          });
          yPosition += 1;
        } else {
          // Single date/time
          pdf.setFont('helvetica', 'bold');
          pdf.text('Start Date:', margin, yPosition);
          pdf.setFont('helvetica', 'normal');
          pdf.text(format(new Date(event.startDate), 'MMMM dd, yyyy'), margin + 25, yPosition);
          
          pdf.setFont('helvetica', 'bold');
          pdf.text('Start Time:', margin + 90, yPosition);
          pdf.setFont('helvetica', 'normal');
          pdf.text(formatTime(event.startTime), margin + 115, yPosition);
          yPosition += 7;

          pdf.setFont('helvetica', 'bold');
          pdf.text('End Date:', margin, yPosition);
          pdf.setFont('helvetica', 'normal');
          pdf.text(format(new Date(event.endDate), 'MMMM dd, yyyy'), margin + 25, yPosition);
          
          pdf.setFont('helvetica', 'bold');
          pdf.text('End Time:', margin + 90, yPosition);
          pdf.setFont('helvetica', 'normal');
          pdf.text(formatTime(event.endTime), margin + 115, yPosition);
          yPosition += 7;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.text(event.locations && event.locations.length > 1 ? 'Locations:' : 'Location:', margin, yPosition);
        pdf.setFont('helvetica', 'normal');
        
        if (event.locations && event.locations.length > 1) {
          // Multiple locations - display each on a new line
          event.locations.forEach((loc, index) => {
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

        // Add new page for department requirements and notes
        if (event.taggedDepartments && event.taggedDepartments.length > 0) {
          pdf.addPage();
          yPosition = addHeader();

          // Page header for department requirements
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          const deptTitle = `Department Requirements - ${event.eventTitle}`;
          const wrappedDeptTitle = pdf.splitTextToSize(deptTitle, pageWidth - 2 * margin);
          pdf.text(wrappedDeptTitle, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += wrappedDeptTitle.length * 6 + 8;

          // Loop through each tagged department
          event.taggedDepartments.forEach((department, deptIndex) => {
            // Check if we need a new page
            if (yPosition > pageHeight - 80) {
              pdf.addPage();
              yPosition = addHeader();
            }

            // Department name header
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${deptIndex + 1}. ${department}`, margin, yPosition);
            yPosition += 10;

            // Department requirements
            if (event.departmentRequirements && event.departmentRequirements[department]) {
              const deptReqs = event.departmentRequirements[department];
              
              // Check if deptReqs is an array (your actual structure)
              if (Array.isArray(deptReqs) && deptReqs.length > 0) {
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Requirements:', margin + 5, yPosition);
                yPosition += 6;

                deptReqs.forEach((req: any, reqIndex: number) => {
                  // Only show selected requirements
                  if (req.selected) {
                    pdf.setFontSize(9);
                    pdf.setFont('helvetica', 'normal');
                    
                    // Include quantity information in the requirement text
                    let reqText = `${reqIndex + 1}. ${req.name}`;
                    if (req.quantity && req.quantity > 0) {
                      reqText += ` (Quantity: ${req.quantity})`;
                    }
                    
                    const splitReq = pdf.splitTextToSize(reqText, pageWidth - 2 * margin - 10);
                    pdf.text(splitReq, margin + 10, yPosition);
                    yPosition += splitReq.length * 4;

                    // Add notes for this requirement if they exist
                    if (req.notes && req.notes.trim()) {
                      pdf.setFontSize(8);
                      pdf.setFont('helvetica', 'italic');
                      const notesText = `   Notes: ${req.notes}`;
                      const splitNotes = pdf.splitTextToSize(notesText, pageWidth - 2 * margin - 15);
                      pdf.text(splitNotes, margin + 15, yPosition);
                      yPosition += splitNotes.length * 3 + 2;
                    } else {
                      yPosition += 2;
                    }
                  }
                });
                yPosition += 5;
              } else {
                // No specific requirements found
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'italic');
                pdf.text('No requirements assigned', margin + 10, yPosition);
                yPosition += 8;
              }
            } else {
              // No specific requirements found
              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'italic');
              pdf.text('No requirements assigned', margin + 10, yPosition);
              yPosition += 8;
            }

            yPosition += 10; // Space between departments
          });
        }

        // Add separator line between events (only if not the last event)
        if (i < events.length - 1) {
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
        pdf.text(`© ${new Date().getFullYear()} Provincial Government of Bataan - Event Management System`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text(`This report contains ${events.length} event request(s)`, pageWidth / 2, pageHeight - 5, { align: 'center' });
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
  const downloadPdf = async () => {
    try {
      if (!pdfPreviewUrl) {
        toast.error('No PDF preview available');
        return;
      }

      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = pdfPreviewUrl;
      link.download = `Events_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('PDF downloaded successfully!');
      
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  return (
    <div className="p-6 max-w-full mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                All Events
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage and view all event requests from users
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => fetchAllEvents(true)}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {enableEventDeletion && (
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={selectedEvents.length === 0}
                  variant="destructive"
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedEvents.length})
                </Button>
              )}
              <Button
                onClick={() => setShowPdfOptions(true)}
                variant="outline"
                className="gap-2"
              >
                <FileDown className="w-4 h-4" />
                Generate PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('all')}
              className="flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              All ({statusCounts.all})
            </Button>
            <Button
              variant={activeTab === 'submitted' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('submitted')}
              className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
            >
              <Clock3 className="w-4 h-4" />
              Submitted ({statusCounts.submitted})
            </Button>
            <Button
              variant={activeTab === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('approved')}
              className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
            >
              <CheckCircle className="w-4 h-4" />
              Approved ({statusCounts.approved})
            </Button>
            <Button
              variant={activeTab === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('rejected')}
              className="flex items-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
            >
              <XCircle className="w-4 h-4" />
              Rejected ({statusCounts.rejected})
            </Button>
            <Button
              variant={activeTab === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('cancelled')}
              className="flex items-center gap-2 bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200"
            >
              <AlertCircle className="w-4 h-4" />
              Cancelled ({statusCounts.cancelled})
            </Button>
            <Button
              variant={activeTab === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('completed')}
              className="flex items-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
            >
              <CheckSquare className="w-4 h-4" />
              Completed ({statusCounts.completed})
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="md:w-96">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search events, requestors, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-3">
              {/* Sort By Dropdown */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-60">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status-priority">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Priority (Submitted First)
                    </div>
                  </SelectItem>
                  <SelectItem value="no-requirements">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      No Requirements Only
                    </div>
                  </SelectItem>
                  <SelectItem value="upcoming-events">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Upcoming Events
                    </div>
                  </SelectItem>
                  <SelectItem value="recent-created">
                    <div className="flex items-center gap-2">
                      <Clock4 className="w-4 h-4" />
                      Most Recent Created
                    </div>
                  </SelectItem>
                  <SelectItem value="event-title">
                    <div className="flex items-center gap-2">
                      <SortAsc className="w-4 h-4" />
                      Event Title A-Z
                    </div>
                  </SelectItem>
                  <SelectItem value="requestor-name">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      Requestor Name A-Z
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="bg-gray-50 text-gray-700 font-medium">All Types</SelectItem>
                  <SelectItem value="simple-meeting" className="bg-green-50 text-green-700 font-medium">Meeting</SelectItem>
                  <SelectItem value="simple" className="bg-blue-50 text-blue-700 font-medium">Simple</SelectItem>
                  <SelectItem value="complex" className="bg-purple-50 text-purple-700 font-medium">Complex</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-48">
                  <Building2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Events Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading events...</span>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md border"
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    {enableEventDeletion && (
                      <TableHead className="w-12">
                        <button
                          onClick={handleSelectAll}
                          className="flex items-center justify-center w-5 h-5"
                        >
                          {selectedEvents.length === filteredEvents.length && filteredEvents.length > 0 ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableHead>
                    )}
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[200px]">Event</TableHead>
                    <TableHead>Requestor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={enableEventDeletion ? 9 : 8} className="text-center py-8 text-gray-500">
                        No events found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedEvents.map((event) => {
                      const statusInfo = getStatusInfo(event.status);
                      return (
                        <TableRow key={event._id} className="hover:bg-gray-50">
                          {enableEventDeletion && (
                            <TableCell className="text-center">
                              <button
                                onClick={() => handleSelectEvent(event._id)}
                                className="flex items-center justify-center w-5 h-5"
                              >
                                {selectedEvents.includes(event._id) ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge 
                              variant="outline"
                              className={`text-xs ${
                                event.eventType === 'simple-meeting'
                                  ? 'bg-green-50 text-green-700 border-green-200'
                                  : event.eventType === 'complex' 
                                  ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {event.eventType === 'simple-meeting' ? 'Meeting' : event.eventType === 'complex' ? 'Complex' : 'Simple'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>
                              <p className="font-semibold text-gray-900 truncate max-w-[180px]" title={event.eventTitle}>
                                {event.eventTitle}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900">{event.createdBy?.name || event.requestor}</p>
                              <p className="text-xs text-gray-500">{event.createdBy?.department || 'N/A'}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={statusInfo.variant}
                              className={`gap-1 ${statusInfo.className || ''}`}
                            >
                              {statusInfo.icon}
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(event.startDate), 'MMM dd, yyyy')}</span>
                                {/* Multi-Day Badge with Hover */}
                                {event.dateTimeSlots && event.dateTimeSlots.length > 0 && (
                                  <HoverCard openDelay={200}>
                                    <HoverCardTrigger asChild>
                                      <Badge 
                                        variant="secondary" 
                                        className="text-[9px] bg-blue-100 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-200 whitespace-nowrap px-1.5 py-0"
                                      >
                                        Multi-Day
                                      </Badge>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-72" side="right" align="start" sideOffset={5}>
                                      <div className="space-y-2">
                                        <h4 className="text-[12px] font-semibold text-slate-900">
                                          Multi-Day Event Schedule
                                        </h4>
                                        <div className="space-y-1.5">
                                          {/* Day 1 */}
                                          <div className="text-[11px] text-slate-700">
                                            <span className="font-medium">Day 1:</span> {format(new Date(event.startDate), 'MMM d, yyyy')} • {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                          </div>
                                          {/* Additional Days */}
                                          {event.dateTimeSlots.map((slot: any, idx: number) => (
                                            <div key={idx} className="text-[11px] text-slate-700">
                                              <span className="font-medium">Day {idx + 2}:</span> {format(new Date(slot.startDate), 'MMM d, yyyy')} • {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-gray-500 mt-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-gray-600">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate max-w-[120px]" title={event.location}>
                                {event.location}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-gray-600">
                              <Users className="w-3 h-3" />
                              <span>{event.participants}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              {/* Status Button - Show for submitted, approved, rejected, and cancelled (superadmin only) */}
                              {isSuperAdmin && (event.status === 'submitted' || event.status === 'approved' || event.status === 'rejected' || event.status === 'cancelled') && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => {
                                    setStoreSelectedEvent(event);
                                    setShowStatusDialog(true);
                                  }}
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Status
                                </Button>
                              )}
                              
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => setStoreSelectedEvent(event)}
                                  >
                                    <Eye className="w-3 h-3" />
                                    View
                                  </Button>
                                </DialogTrigger>
                              <DialogContent className="max-w-4xl w-[75vw] max-h-[80vh] overflow-y-auto sm:max-w-4xl">
                                <DialogHeader className="border-b pb-3 mb-3">
                                  <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between gap-3">
                                    <span>Event Details</span>
                                    {selectedEvent && (
                                      <Badge className={getStatusInfo(selectedEvent.status).className}>
                                        {getStatusInfo(selectedEvent.status).icon}
                                        <span className="ml-1">{getStatusInfo(selectedEvent.status).label}</span>
                                      </Badge>
                                    )}
                                  </DialogTitle>
                                  <DialogDescription className="text-xs text-gray-500">
                                    Complete information for this event request
                                  </DialogDescription>
                                </DialogHeader>

                                {selectedEvent && (
                                  <div className="space-y-5 text-sm text-gray-900">
                                    {/* Basic Info */}
                                    <div className="rounded-xl border border-gray-100 bg-gray-50/70 px-4 py-4 space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2 tracking-wide">
                                            <FileText className="w-3.5 h-3.5" />
                                            Event Title
                                          </label>
                                          <p className="mt-1 text-sm font-medium text-gray-900" title={selectedEvent.eventTitle}>
                                            {selectedEvent.eventTitle}
                                          </p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2 tracking-wide">
                                            <User className="w-3.5 h-3.5" />
                                            Requestor
                                          </label>
                                          <p className="mt-1 text-sm text-gray-900">{selectedEvent.requestor}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-semibold text-gray-500 uppercase flex items-start gap-2 tracking-wide">
                                            <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                            <span>Location{selectedEvent.locations && selectedEvent.locations.length > 1 ? 's' : ''}</span>
                                          </label>
                                          {selectedEvent.locations && selectedEvent.locations.length > 1 ? (
                                            <div className="mt-1 ml-6 flex flex-col gap-1">
                                              {selectedEvent.locations.map((loc, idx) => (
                                                <p key={idx} className="text-sm text-gray-900">
                                                  {loc}
                                                </p>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="mt-1 ml-6 text-sm text-gray-900">{selectedEvent.location}</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Date & Time & Status */}
                                    <div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
                                      {selectedEvent.dateTimeSlots && selectedEvent.dateTimeSlots.length > 0 ? (
                                        <>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-2 space-y-3">
                                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                Multi-Day Event Schedule
                                              </label>
                                              
                                              {/* Day 1 */}
                                              <div className="flex items-center gap-2 text-sm">
                                                <span className="font-medium text-gray-700">Day 1:</span>
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-gray-900">{format(new Date(selectedEvent.startDate), 'MMM d, yyyy')}</span>
                                                <span className="text-gray-400">•</span>
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-gray-900">{formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</span>
                                              </div>
                                              
                                              {/* Additional Days */}
                                              {selectedEvent.dateTimeSlots.map((slot: any, idx: number) => (
                                                <div key={idx} className="flex items-center gap-2 text-sm">
                                                  <span className="font-medium text-gray-700">Day {idx + 2}:</span>
                                                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                  <span className="text-gray-900">{format(new Date(slot.startDate), 'MMM d, yyyy')}</span>
                                                  <span className="text-gray-400">•</span>
                                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                  <span className="text-gray-900">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                                                </div>
                                              ))}
                                            </div>
                                            
                                            {/* Status in third column */}
                                            <div>
                                              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                                <Tag className="w-3.5 h-3.5" />
                                                Status
                                              </label>
                                              <div className="mt-2">
                                                <Badge className={getStatusInfo(selectedEvent.status).className}>
                                                  {getStatusInfo(selectedEvent.status).icon}
                                                  <span className="ml-1">{getStatusInfo(selectedEvent.status).label}</span>
                                                </Badge>
                                              </div>
                                            </div>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                              <Calendar className="w-3.5 h-3.5" />
                                              Event Date
                                            </label>
                                            <p className="mt-1 text-sm text-gray-900">
                                              {format(new Date(selectedEvent.startDate), 'MMM dd, yyyy')}
                                            </p>
                                          </div>
                                          <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                              <Clock className="w-3.5 h-3.5" />
                                              Time
                                            </label>
                                            <p className="mt-1 text-sm text-gray-900">
                                              {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                                            </p>
                                          </div>
                                          <div>
                                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                              <Tag className="w-3.5 h-3.5" />
                                              Status
                                            </label>
                                            <div className="mt-2">
                                              <Badge className={getStatusInfo(selectedEvent.status).className}>
                                                {getStatusInfo(selectedEvent.status).icon}
                                                <span className="ml-1">{getStatusInfo(selectedEvent.status).label}</span>
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    {/* Participants & VIP Info */}
                                    <div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5" />
                                            Participants
                                          </label>
                                          <p className="mt-1 text-sm text-gray-900">{selectedEvent.participants}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                            <Star className="w-3.5 h-3.5" />
                                            VIP
                                          </label>
                                          <p className="mt-1 text-sm text-gray-900">{selectedEvent.vip || 0}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                            <Star className="w-3.5 h-3.5" />
                                            VVIP
                                          </label>
                                          <p className="mt-1 text-sm text-gray-900">{selectedEvent.vvip || 0}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Department & Contact */}
                                    <div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5" />
                                            Department
                                          </label>
                                          <p className="mt-1 text-sm text-gray-900">{selectedEvent.createdBy?.department || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5" />
                                            Contact Number
                                          </label>
                                          <p className="mt-1 text-sm text-gray-900">{selectedEvent.contactNumber || 'N/A'}</p>
                                        </div>
                                        <div>
                                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                            <Mail className="w-3.5 h-3.5" />
                                            Contact Email
                                          </label>
                                          <p className="mt-1 text-sm text-gray-900">{selectedEvent.contactEmail || 'N/A'}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Tagged Departments */}
                                    {selectedEvent.taggedDepartments && selectedEvent.taggedDepartments.length > 0 && (
                                      <div className="rounded-xl border border-gray-100 bg-white px-4 py-4">
                                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                                          <Building2 className="w-3.5 h-3.5" />
                                          Tagged Departments
                                        </label>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {selectedEvent.taggedDepartments.map((dept, index) => (
                                            <Badge key={index} variant="secondary" className="text-xs bg-gray-50 text-gray-800 border-gray-200">{dept}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* View Description Button */}
                                    <div className="pt-4 border-t border-gray-100 mt-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => setShowDescription(!showDescription)}
                                        className="gap-2 text-sm"
                                      >
                                        <FileText className="w-4 h-4" />
                                        {showDescription ? 'Hide Description' : 'View Description'}
                                      </Button>
                                      
                                      {showDescription && selectedEvent.description && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Event Description</label>
                                          <p className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">
                                            {selectedEvent.description}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {showDescription && !selectedEvent.description && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                          <p className="text-sm text-gray-500">No description provided for this event.</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            
                            {/* Files Button */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => setStoreSelectedEvent(event)}
                                >
                                  <Paperclip className="w-3 h-3" />
                                  Files
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[600px]">
                                <DialogHeader>
                                  <DialogTitle>Event Files</DialogTitle>
                                  <DialogDescription>
                                    {selectedEvent?.eventTitle}
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {selectedEvent && (
                                  <div className="space-y-4 py-4">
                                    {/* Event Attachments */}
                                    {selectedEvent.attachments && selectedEvent.attachments.length > 0 && (
                                      <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-muted-foreground">Attachments</h4>
                                        <div className="space-y-2">
                                          {selectedEvent.attachments.map((attachment: any, index: number) => (
                                            <div key={index} className="group flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate max-w-[260px] sm:max-w-md" title={attachment.originalName}>
                                                  {attachment.originalName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {(attachment.size / 1024).toFixed(1)} KB
                                                </p>
                                              </div>
                                              <div className="flex gap-1 shrink-0">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={() => window.open(`${API_BASE_URL}/events/attachment/${attachment.filename}`, '_blank')}
                                                >
                                                  <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = `${API_BASE_URL}/events/attachment/${attachment.filename}?download=true`;
                                                    link.download = attachment.originalName;
                                                    link.click();
                                                  }}
                                                >
                                                  <Download className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Government Files */}
                                    {selectedEvent.govFiles && (selectedEvent.govFiles.brieferTemplate || selectedEvent.govFiles.programme) && (
                                      <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-muted-foreground">Government Files</h4>
                                        <div className="space-y-2">
                                          {selectedEvent.govFiles.brieferTemplate && (
                                            <div className="group flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">Event Briefer</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[260px] sm:max-w-md" title={selectedEvent.govFiles.brieferTemplate.originalName}>
                                                  {selectedEvent.govFiles.brieferTemplate.originalName}
                                                </p>
                                              </div>
                                              <div className="flex gap-1 shrink-0">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={() => window.open(`${API_BASE_URL}/events/govfile/${selectedEvent.govFiles.brieferTemplate?.filename}`, '_blank')}
                                                >
                                                  <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = `${API_BASE_URL}/events/govfile/${selectedEvent.govFiles.brieferTemplate?.filename}?download=true`;
                                                    link.download = selectedEvent.govFiles.brieferTemplate?.originalName || 'event-briefer';
                                                    link.click();
                                                  }}
                                                >
                                                  <Download className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}

                                          {selectedEvent.govFiles.programme && (
                                            <div className="group flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors">
                                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium">Program Flow</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[260px] sm:max-w-md" title={selectedEvent.govFiles.programme.originalName}>
                                                  {selectedEvent.govFiles.programme.originalName}
                                                </p>
                                              </div>
                                              <div className="flex gap-1 shrink-0">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={() => window.open(`${API_BASE_URL}/events/govfile/${selectedEvent.govFiles.programme?.filename}`, '_blank')}
                                                >
                                                  <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-8 w-8"
                                                  onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = `${API_BASE_URL}/events/govfile/${selectedEvent.govFiles.programme?.filename}?download=true`;
                                                    link.download = selectedEvent.govFiles.programme?.originalName || 'program-flow';
                                                    link.click();
                                                  }}
                                                >
                                                  <Download className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {/* Empty State */}
                                    {(!selectedEvent.attachments || selectedEvent.attachments.length === 0) && 
                                     (!selectedEvent.govFiles || (!selectedEvent.govFiles.brieferTemplate && !selectedEvent.govFiles.programme)) && (
                                      <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <FileText className="h-12 w-12 text-muted-foreground/50 mb-2" />
                                        <p className="text-sm text-muted-foreground">No files uploaded</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </motion.div>
          )}

          {/* Summary and Pagination */}
          <div className="pt-4 border-t space-y-4">
            {/* Summary Stats - Full Width */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-sm text-gray-600">
              <div className="font-medium">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs sm:text-sm">Submitted: {(events || []).filter(e => e.status === 'submitted').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs sm:text-sm">Approved: {(events || []).filter(e => e.status === 'approved').length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs sm:text-sm">Rejected: {(events || []).filter(e => e.status === 'rejected').length}</span>
                </div>
              </div>
            </div>
            
            {/* Pagination - Right Aligned */}
            {totalPages > 1 && (
              <div className="flex justify-end">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      // Show first page, last page, current page, and pages around current
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNumber)}
                              isActive={currentPage === pageNumber}
                              className="cursor-pointer"
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      } else if (
                        pageNumber === currentPage - 2 ||
                        pageNumber === currentPage + 2
                      ) {
                        return (
                          <PaginationItem key={pageNumber}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      return null;
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PDF Options Modal */}
      <Dialog open={showPdfOptions} onOpenChange={setShowPdfOptions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5" />
              Generate PDF Report
            </DialogTitle>
            <DialogDescription>
              Choose which events to include in your PDF report
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p>Selected Events: <span className="font-medium">{selectedEvents.length}</span></p>
              <p>Total Events: <span className="font-medium">{filteredEvents.length}</span></p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => handleGeneratePdf(false)}
                disabled={selectedEvents.length === 0}
                className="gap-2 justify-start"
                variant="outline"
              >
                <CheckSquare className="w-4 h-4" />
                Generate Selected Events ({selectedEvents.length})
              </Button>
              
              <Button
                onClick={() => handleGeneratePdf(true)}
                className="gap-2 justify-start"
              >
                <FileDown className="w-4 h-4" />
                Generate All Events ({filteredEvents.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected events?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected}>
              Delete ({selectedEvents.length})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              PDF Preview - Events Report
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
            <Button onClick={downloadPdf} className="gap-2">
              <FileDown className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Change Event Status</DialogTitle>
            <DialogDescription>
              {selectedEvent && (
                <span className="text-sm">
                  <span className="font-medium text-gray-900">{selectedEvent.eventTitle}</span>
                  <span className="mx-2">•</span>
                  <span>Current Status: </span>
                  <Badge className={getStatusInfo(selectedEvent.status).className}>
                    {getStatusInfo(selectedEvent.status).label}
                  </Badge>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              {/* Requirements List */}
              <div className="border rounded-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-muted/50">
                  <h4 className="text-sm font-semibold">Requirements Overview</h4>
                </div>
                <div className="p-4 max-h-[400px] overflow-y-auto">
                  {(() => {
                    const allRequirements: any[] = [];
                    if (selectedEvent.departmentRequirements) {
                      Object.entries(selectedEvent.departmentRequirements).forEach(([dept, reqs]: [string, any]) => {
                        if (Array.isArray(reqs)) {
                          reqs.forEach(req => {
                            allRequirements.push({ ...req, department: dept });
                          });
                        }
                      });
                    }
                    
                    if (allRequirements.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <p className="text-sm text-muted-foreground">No requirements for this event</p>
                        </div>
                      );
                    }
                    
                    const confirmedCount = allRequirements.filter(req => req.status === 'confirmed').length;
                    const pendingCount = allRequirements.filter(req => req.status === 'pending' || !req.status).length;
                    
                    return (
                      <div className="space-y-4">
                        {/* Summary */}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">Total: <strong>{allRequirements.length}</strong></span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Confirmed: {confirmedCount}
                          </Badge>
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            Pending: {pendingCount}
                          </Badge>
                        </div>
                        
                        {/* Requirements List - Grid layout for 3+ requirements */}
                        <div className={allRequirements.length >= 3 ? "grid grid-cols-3 gap-2" : "space-y-2"}>
                          {allRequirements.map((req, index) => (
                            <div key={index} className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col gap-1 mb-1">
                                    <Badge variant="secondary" className="text-xs w-fit">
                                      {req.department}
                                    </Badge>
                                    <Badge 
                                      variant={req.status === 'confirmed' ? 'default' : 'outline'}
                                      className={`text-xs w-fit ${
                                        req.status === 'confirmed' 
                                          ? 'bg-green-100 text-green-800 border-green-200' 
                                          : 'bg-orange-100 text-orange-800 border-orange-200'
                                      }`}
                                    >
                                      {req.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm font-medium break-words">{req.name}</p>
                                  {req.quantity && (
                                    <p className="text-xs text-muted-foreground mt-1">Qty: {req.quantity}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <Button
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={() => setShowApproveConfirm(true)}
                >
                  Approve Event
                </Button>
                <Button
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={() => setShowRejectDialog(true)}
                >
                  Reject Event
                </Button>
                
                {/* Cancel Dropdown with Reasons */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-yellow-500 text-white hover:bg-yellow-600">
                      Cancel Event
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => {
                      setPendingCancelReason('Conflict with other event');
                      setShowCancelConfirm(true);
                    }}>
                      Conflict with other event
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setPendingCancelReason('Venue unavailable');
                      setShowCancelConfirm(true);
                    }}>
                      Venue unavailable
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setPendingCancelReason('Requestor cancelled');
                      setShowCancelConfirm(true);
                    }}>
                      Requestor cancelled
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setPendingCancelReason('Insufficient resources');
                      setShowCancelConfirm(true);
                    }}>
                      Insufficient resources
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setPendingCancelReason('Weather/Emergency');
                      setShowCancelConfirm(true);
                    }}>
                      Weather/Emergency
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      setPendingCancelReason('Other reason');
                      setShowCancelConfirm(true);
                    }}>
                      Other reason
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Event Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Reject Event
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this event. This will be sent to the requestor.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason *</label>
              <textarea
                className="w-full min-h-[120px] px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter the reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => handleStatusChange('rejected', rejectReason)}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Alert Dialog */}
      <AlertDialog open={showApproveConfirm} onOpenChange={setShowApproveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the event <strong>"{selectedEvent?.eventTitle}"</strong>? 
              This action will notify the event creator and all tagged departments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                handleStatusChange('approved');
                setShowApproveConfirm(false);
              }}
            >
              Yes, Approve Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Alert Dialog */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the event <strong>"{selectedEvent?.eventTitle}"</strong>?
              <br /><br />
              <strong>Reason:</strong> {pendingCancelReason}
              <br /><br />
              This will reset all department requirements to pending and notify the event creator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-500 hover:bg-yellow-600"
              onClick={() => {
                setCancelReason(pendingCancelReason);
                handleStatusChange('cancelled', pendingCancelReason);
                setShowCancelConfirm(false);
              }}
            >
              Yes, Cancel Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AllEventsPage;
