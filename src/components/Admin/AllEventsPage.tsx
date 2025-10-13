import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
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
  Square
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
  endDate: string;
  startTime: string;
  endTime: string;
  contactNumber: string;
  contactEmail: string;
  attachments: any[];
  govFiles: {
    brieferTemplate?: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
      uploadedAt: Date;
    };
    availableForDL?: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
      uploadedAt: Date;
    };
    programme?: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
      uploadedAt: Date;
    };
  };
  taggedDepartments: string[];
  departmentRequirements: any;
  requestorDepartment?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed';
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
    department: string;
  };
}

const API_BASE_URL = 'http://localhost:5000/api';

const AllEventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDescription, setShowDescription] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');

  // Fetch all events
  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(`${API_BASE_URL}/events`, { headers });
      
      console.log('📊 API Response:', response.data);
      
      if (response.data.success) {
        console.log('✅ Events fetched:', response.data.data.length, 'events');
        const eventsData = response.data.data;
        setEvents(eventsData);
        
        // Extract unique departments from events
        const uniqueDepartments = new Set<string>();
        eventsData.forEach((event: Event) => {
          // From tagged departments
          if (event.taggedDepartments && event.taggedDepartments.length > 0) {
            event.taggedDepartments.forEach(dept => {
              if (dept && dept.trim()) uniqueDepartments.add(dept.trim());
            });
          }
          // From requestor department
          if (event.requestorDepartment && event.requestorDepartment.trim()) {
            uniqueDepartments.add(event.requestorDepartment.trim());
          }
          // From created by department (fallback)
          if (event.createdBy?.department && event.createdBy.department.trim()) {
            uniqueDepartments.add(event.createdBy.department.trim());
          }
        });
        
        const departmentsList = Array.from(uniqueDepartments).sort();
        setDepartments(departmentsList);
        console.log('✅ Departments extracted:', departmentsList);
      } else {
        console.error('❌ API returned error:', response.data);
        toast.error('Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllEvents();
  }, []);

  // Filter events based on search and filters
  const filteredEvents = (events || []).filter(event => {
    const matchesSearch = 
      event.eventTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.requestor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.createdBy?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || 
      (event.taggedDepartments && event.taggedDepartments.includes(departmentFilter)) ||
      (event.requestorDepartment && event.requestorDepartment === departmentFilter) ||
      (event.createdBy?.department && event.createdBy.department === departmentFilter);

    return matchesSearch && matchesStatus && matchesDepartment;
  });

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

  // Handle checkbox selection
  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(filteredEvents.map(event => event._id));
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
                onClick={fetchAllEvents}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search events, requestors, locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-40">
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
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        No events found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEvents.map((event) => {
                      const statusInfo = getStatusInfo(event.status);
                      return (
                        <TableRow key={event._id} className="hover:bg-gray-50">
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
                              <div className="flex items-center gap-1 text-gray-600">
                                <Calendar className="w-3 h-3" />
                                <span>{format(new Date(event.startDate), 'MMM dd, yyyy')}</span>
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
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1"
                                    onClick={() => setSelectedEvent(event)}
                                  >
                                    <Eye className="w-3 h-3" />
                                    View
                                  </Button>
                                </DialogTrigger>
                              <DialogContent className="max-w-4xl w-[75vw] max-h-[80vh] overflow-y-auto sm:max-w-4xl">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-bold">
                                    Event Details
                                  </DialogTitle>
                                  <DialogDescription>
                                    Complete information for this event request
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {selectedEvent && (
                                  <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <FileText className="w-4 h-4" />
                                          Event Title
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900 truncate" title={selectedEvent.eventTitle}>
                                          {selectedEvent.eventTitle}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <User className="w-4 h-4" />
                                          Requestor
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedEvent.requestor}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <MapPin className="w-4 h-4" />
                                          Location
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedEvent.location}</p>
                                      </div>
                                    </div>

                                    {/* Date & Time & Status */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <Calendar className="w-4 h-4" />
                                          Start Date & Time
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                          {format(new Date(selectedEvent.startDate), 'MMM dd, yyyy')} at {formatTime(selectedEvent.startTime)}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <Clock className="w-4 h-4" />
                                          End Date & Time
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">
                                          {format(new Date(selectedEvent.endDate), 'MMM dd, yyyy')} at {formatTime(selectedEvent.endTime)}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <Tag className="w-4 h-4" />
                                          Status
                                        </label>
                                        <div className="mt-1">
                                          <Badge className={getStatusInfo(selectedEvent.status).className}>
                                            {getStatusInfo(selectedEvent.status).icon}
                                            {getStatusInfo(selectedEvent.status).label}
                                          </Badge>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Participants & Creator Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <Users className="w-4 h-4" />
                                          Participants
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedEvent.participants}</p>
                                      </div>
                                      {selectedEvent.vip && selectedEvent.vip > 0 && (
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            <Star className="w-4 h-4" />
                                            VIP
                                          </label>
                                          <p className="mt-1 text-sm text-gray-900">{selectedEvent.vip}</p>
                                        </div>
                                      )}
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <Star className="w-4 h-4" />
                                          VVIP
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedEvent.vvip || 0}</p>
                                      </div>
                                    </div>

                                    {/* Department & Contact */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <Building2 className="w-4 h-4" />
                                          Department
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedEvent.createdBy?.department || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <Phone className="w-4 h-4" />
                                          Contact Number
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedEvent.contactNumber || 'N/A'}</p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <Mail className="w-4 h-4" />
                                          Contact Email
                                        </label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedEvent.contactEmail || 'N/A'}</p>
                                      </div>
                                    </div>

                                    {/* Tagged Departments */}
                                    {selectedEvent.taggedDepartments && selectedEvent.taggedDepartments.length > 0 && (
                                      <div>
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                          <Building2 className="w-4 h-4" />
                                          Tagged Departments
                                        </label>
                                        <div className="mt-1 flex flex-wrap gap-2">
                                          {selectedEvent.taggedDepartments.map((dept, index) => (
                                            <Badge key={index} variant="secondary">{dept}</Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* View Description Button */}
                                    <div className="pt-4 border-t">
                                      <Button
                                        variant="outline"
                                        onClick={() => setShowDescription(!showDescription)}
                                        className="gap-2"
                                      >
                                        <FileText className="w-4 h-4" />
                                        {showDescription ? 'Hide Description' : 'View Description'}
                                      </Button>
                                      
                                      {showDescription && selectedEvent.description && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                          <label className="text-sm font-medium text-gray-700">Event Description</label>
                                          <p className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">
                                            {selectedEvent.description}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {showDescription && !selectedEvent.description && (
                                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                          <p className="text-sm text-gray-500 italic">No description provided for this event.</p>
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
                                  onClick={() => setSelectedEvent(event)}
                                >
                                  <Paperclip className="w-3 h-3" />
                                  Files
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl w-[75vw] max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-bold">
                                    Event Files - {selectedEvent?.eventTitle}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Attachments and government files for this event
                                  </DialogDescription>
                                </DialogHeader>
                                
                                {selectedEvent && (
                                  <div className="space-y-6">
                                    {/* Event Attachments */}
                                    <div>
                                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Paperclip className="w-5 h-5" />
                                        Event Attachments
                                      </h3>
                                      {selectedEvent.attachments && selectedEvent.attachments.length > 0 ? (
                                        <div className="space-y-2">
                                          {selectedEvent.attachments.map((attachment: any, index: number) => (
                                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                              <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-muted-foreground" />
                                                <div>
                                                  <p className="text-sm font-medium">{attachment.originalName}</p>
                                                  <p className="text-xs text-muted-foreground">
                                                    {attachment.mimetype} • {(attachment.size / 1024).toFixed(1)} KB
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex gap-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => window.open(`${API_BASE_URL}/events/attachment/${attachment.filename}`, '_blank')}
                                                >
                                                  <Eye className="w-4 h-4 mr-1" />
                                                  View
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = `${API_BASE_URL}/events/attachment/${attachment.filename}`;
                                                    link.download = attachment.originalName;
                                                    link.click();
                                                  }}
                                                >
                                                  <Download className="w-4 h-4 mr-1" />
                                                  Download
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-gray-500 italic">No attachments uploaded</p>
                                      )}
                                    </div>

                                    {/* Government Files */}
                                    <div>
                                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Government Files
                                      </h3>
                                      {selectedEvent.govFiles && Object.keys(selectedEvent.govFiles).length > 0 ? (
                                        <div className="space-y-2">
                                          {/* Briefer Template */}
                                          {selectedEvent.govFiles.brieferTemplate && (
                                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                              <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-muted-foreground" />
                                                <div>
                                                  <p className="text-sm font-medium">Briefer Template</p>
                                                  <p className="text-xs text-muted-foreground">
                                                    {selectedEvent.govFiles.brieferTemplate.originalName}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex gap-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => window.open(`${API_BASE_URL}/events/govfile/${selectedEvent.govFiles.brieferTemplate?.filename}`, '_blank')}
                                                >
                                                  <Eye className="w-4 h-4 mr-1" />
                                                  View
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = `${API_BASE_URL}/events/govfile/${selectedEvent.govFiles.brieferTemplate?.filename}`;
                                                    link.download = selectedEvent.govFiles.brieferTemplate?.originalName || 'briefer-template';
                                                    link.click();
                                                  }}
                                                >
                                                  <Download className="w-4 h-4 mr-1" />
                                                  Download
                                                </Button>
                                              </div>
                                            </div>
                                          )}

                                          {/* Available for DL */}
                                          {selectedEvent.govFiles.availableForDL && (
                                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                              <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-muted-foreground" />
                                                <div>
                                                  <p className="text-sm font-medium">Available for DL</p>
                                                  <p className="text-xs text-muted-foreground">
                                                    {selectedEvent.govFiles.availableForDL.originalName}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex gap-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => window.open(`${API_BASE_URL}/events/govfile/${selectedEvent.govFiles.availableForDL?.filename}`, '_blank')}
                                                >
                                                  <Eye className="w-4 h-4 mr-1" />
                                                  View
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = `${API_BASE_URL}/events/govfile/${selectedEvent.govFiles.availableForDL?.filename}`;
                                                    link.download = selectedEvent.govFiles.availableForDL?.originalName || 'available-for-dl';
                                                    link.click();
                                                  }}
                                                >
                                                  <Download className="w-4 h-4 mr-1" />
                                                  Download
                                                </Button>
                                              </div>
                                            </div>
                                          )}

                                          {/* Programme */}
                                          {selectedEvent.govFiles.programme && (
                                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                              <div className="flex items-center gap-3">
                                                <FileText className="w-4 h-4 text-muted-foreground" />
                                                <div>
                                                  <p className="text-sm font-medium">Programme</p>
                                                  <p className="text-xs text-muted-foreground">
                                                    {selectedEvent.govFiles.programme.originalName}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex gap-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => window.open(`${API_BASE_URL}/events/govfile/${selectedEvent.govFiles.programme?.filename}`, '_blank')}
                                                >
                                                  <Eye className="w-4 h-4 mr-1" />
                                                  View
                                                </Button>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    const link = document.createElement('a');
                                                    link.href = `${API_BASE_URL}/events/govfile/${selectedEvent.govFiles.programme?.filename}`;
                                                    link.download = selectedEvent.govFiles.programme?.originalName || 'programme';
                                                    link.click();
                                                  }}
                                                >
                                                  <Download className="w-4 h-4 mr-1" />
                                                  Download
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-gray-500 italic">No government files uploaded</p>
                                      )}
                                    </div>
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

          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600 pt-4 border-t">
            <div>
              Showing {filteredEvents.length} of {(events || []).length} events
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Submitted: {(events || []).filter(e => e.status === 'submitted').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Approved: {(events || []).filter(e => e.status === 'approved').length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Rejected: {(events || []).filter(e => e.status === 'rejected').length}</span>
              </div>
            </div>
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
    </div>
  );
};

export default AllEventsPage;
