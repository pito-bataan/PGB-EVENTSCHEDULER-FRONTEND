import React, { useEffect, useState } from 'react';
import { useAllEventsStore } from '@/stores/allEventsStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  Users, 
  Phone, 
  Mail, 
  FileText,
  Search,
  Filter,
  X,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  FileDown,
  Printer,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const OverallEventsPage: React.FC = () => {
  const {
    events,
    selectedEvent,
    searchQuery,
    locationFilter,
    statusFilter,
    dateFilter,
    loading,
    fetchAllEvents,
    setSelectedEvent,
    setSearchQuery,
    setLocationFilter,
    setStatusFilter,
    setDateFilter,
    clearFilters,
    getFilteredEvents,
    getUniqueLocations
  } = useAllEventsStore();

  // PDF state
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  
  // Tab state for filtering by status
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch events on mount
  useEffect(() => {
    fetchAllEvents();
  }, [fetchAllEvents]);

  const filteredEvents = getFilteredEvents();
  const uniqueLocations = getUniqueLocations();

  // Calculate counts for each status
  const statusCounts = {
    all: filteredEvents.length,
    approved: filteredEvents.filter(e => e.status === 'approved').length,
    submitted: filteredEvents.filter(e => e.status === 'submitted').length,
    rejected: filteredEvents.filter(e => e.status === 'rejected').length,
    cancelled: filteredEvents.filter(e => e.status === 'cancelled').length,
    completed: filteredEvents.filter(e => e.status === 'completed').length,
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

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'submitted':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Submitted
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const hasActiveFilters = searchQuery || locationFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all';

  // Generate PDF for selected event
  const generateEventPdf = async () => {
    if (!selectedEvent) {
      toast.error('No event selected');
      return;
    }

    try {
      // Create new PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = 20;

      // Try to load logo
      let logoImg: HTMLImageElement | null = null;
      try {
        logoImg = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = '/images/bataanlogo.png';
        });
      } catch (error) {
        console.log('Logo not found, continuing without logo');
      }

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

      // Header
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

      // Event title
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const wrappedTitle = pdf.splitTextToSize(selectedEvent.eventTitle.toUpperCase(), pageWidth - 2 * margin);
      pdf.text(wrappedTitle, margin, yPos);
      yPos += wrappedTitle.length * 6 + 5;

      // Event details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Requestor:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedEvent.requestor, margin + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Department:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedEvent.requestorDepartment || 'N/A', margin + 115, yPos);
      yPos += 7;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Start Date:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(format(new Date(selectedEvent.startDate), 'MMMM dd, yyyy'), margin + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Start Time:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatTime(selectedEvent.startTime), margin + 115, yPos);
      yPos += 7;

      pdf.setFont('helvetica', 'bold');
      pdf.text('End Date:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(format(new Date(selectedEvent.endDate), 'MMMM dd, yyyy'), margin + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('End Time:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatTime(selectedEvent.endTime), margin + 115, yPos);
      yPos += 7;

      pdf.setFont('helvetica', 'bold');
      pdf.text('Location:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedEvent.location, margin + 25, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Participants:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${selectedEvent.participants} attendees`, margin + 115, yPos);
      yPos += 7;

      if ((selectedEvent.vip && selectedEvent.vip > 0) || (selectedEvent.vvip && selectedEvent.vvip > 0)) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('VIP:', margin, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${selectedEvent.vip || 0} VIPs`, margin + 25, yPos);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('VVIP:', margin + 90, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${selectedEvent.vvip || 0} VVIPs`, margin + 115, yPos);
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
      pdf.text(selectedEvent.contactEmail, margin + 15, yPos);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Phone:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(selectedEvent.contactNumber, margin + 105, yPos);
      yPos += 10;

      // Description if exists
      if (selectedEvent.description) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Event Description', margin, yPos);
        yPos += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        const splitDescription = pdf.splitTextToSize(selectedEvent.description, pageWidth - 2 * margin);
        pdf.text(splitDescription, margin, yPos);
        yPos += splitDescription.length * 4 + 5;
      }

      // Tagged Departments if exists
      if (selectedEvent.taggedDepartments && selectedEvent.taggedDepartments.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tagged Departments', margin, yPos);
        yPos += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(selectedEvent.taggedDepartments.join(', '), margin, yPos);
        yPos += 7;
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
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF preview');
    }
  };

  // Download PDF
  const downloadEventPdf = async () => {
    try {
      if (!pdfPreviewUrl) {
        toast.error('No PDF preview available');
        return;
      }

      // Create a temporary link to download the PDF
      const link = document.createElement('a');
      link.href = pdfPreviewUrl;
      link.download = `Event_Details_${selectedEvent?.eventTitle.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Overall Events</h1>
          <p className="text-sm text-muted-foreground mt-1">View all location bookings and event details across the system</p>
        </div>

        {/* Filters */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base font-medium">Filters</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Location Filter */}
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {uniqueLocations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="past">Past Events</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredEvents.filter(event => activeTab === 'all' || event.status === activeTab).length}</span> of{' '}
            <span className="font-medium text-foreground">{events.length}</span> events
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAllEvents(true)}
            disabled={loading}
            className="h-8 text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                Refreshing
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT COLUMN: Event List */}
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-base font-medium">Location Bookings</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Click on an event to view details
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-4 pt-4 pb-2">
                  <TabsList className="w-full grid grid-cols-6 h-auto">
                    <TabsTrigger value="all" className="text-xs gap-1.5 py-2">
                      All
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px] font-semibold">
                        {statusCounts.all}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="submitted" className="text-xs gap-1.5 py-2">
                      Submitted
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px] font-semibold bg-blue-100 text-blue-700">
                        {statusCounts.submitted}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="text-xs gap-1.5 py-2">
                      Approved
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px] font-semibold bg-green-100 text-green-700">
                        {statusCounts.approved}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="text-xs gap-1.5 py-2">
                      Rejected
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px] font-semibold bg-red-100 text-red-700">
                        {statusCounts.rejected}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="cancelled" className="text-xs gap-1.5 py-2">
                      Cancelled
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px] font-semibold bg-orange-100 text-orange-700">
                        {statusCounts.cancelled}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs gap-1.5 py-2">
                      Completed
                      <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-4 text-[10px] font-semibold bg-purple-100 text-purple-700">
                        {statusCounts.completed}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value={activeTab} className="mt-0">
                  <ScrollArea className="h-[calc(100vh-480px)]">
                {loading && filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-600">Loading events...</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Calendar className="w-12 h-12 text-gray-400 mb-4" />
                    <p className="text-gray-600 font-medium">No events found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredEvents.filter(event => activeTab === 'all' || event.status === activeTab).map((event) => (
                      <div
                        key={event._id}
                        onClick={() => setSelectedEvent(event)}
                        className={`p-4 cursor-pointer transition-all hover:bg-accent/50 ${
                          selectedEvent?._id === event._id ? 'bg-blue-50/80 border-l-2 border-l-blue-600' : ''
                        }`}
                      >
                        {/* Location & Status */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            {event.locations && event.locations.length > 1 ? (
                              <div className="flex flex-wrap gap-1 min-w-0">
                                {event.locations.map((loc, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium">
                                    {loc}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <span className="font-medium text-sm text-foreground truncate">{event.location}</span>
                            )}
                          </div>
                          {getStatusBadge(event.status)}
                        </div>

                        {/* Event Title */}
                        <h3 className="text-sm font-medium text-foreground mb-2 line-clamp-1">
                          {event.eventTitle}
                        </h3>

                        {/* Date & Time */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(event.startDate), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatTime(event.startTime)} - {formatTime(event.endTime)}
                            </span>
                          </div>
                        </div>

                        {/* Requestor */}
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate">{event.requestor}</span>
                          <span>•</span>
                          <span className="truncate">{event.requestorDepartment}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* RIGHT COLUMN: Event Details */}
          <Card className="lg:col-span-3 border-none shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-base font-medium">Event Details</CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {selectedEvent ? 'Detailed information about the selected event' : 'Select an event to view details'}
                  </CardDescription>
                </div>
                {selectedEvent && (
                  <Button 
                    onClick={generateEventPdf}
                    size="sm"
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <FileDown className="w-4 h-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedEvent ? (
                <ScrollArea className="h-[calc(100vh-420px)]">
                  <div className="space-y-5 pr-4">
                    {/* Event Title & Status */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-foreground tracking-tight">{selectedEvent.eventTitle}</h2>
                        {getStatusBadge(selectedEvent.status)}
                      </div>
                      {selectedEvent.description && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{selectedEvent.description}</p>
                      )}
                    </div>

                    <Separator className="my-4" />

                    {/* Location & Schedule */}
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-600" />
                        Location{selectedEvent.locations && selectedEvent.locations.length > 1 ? 's' : ''} & Schedule
                      </h3>
                      <div className="bg-accent/30 rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          {selectedEvent.locations && selectedEvent.locations.length > 1 ? (
                            <div className="flex flex-wrap gap-1">
                              {selectedEvent.locations.map((loc, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs font-medium">
                                  {loc}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="font-medium text-foreground">{selectedEvent.location}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{format(new Date(selectedEvent.startDate), 'PPP')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Requestor Information */}
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        Requestor Information
                      </h3>
                      <div className="bg-accent/30 rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-foreground">{selectedEvent.requestor}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{selectedEvent.requestorDepartment}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{selectedEvent.contactNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate">{selectedEvent.contactEmail}</span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Participants */}
                    <div className="space-y-2.5">
                      <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Expected Participants
                      </h3>
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-blue-50/80 rounded-lg p-3 text-center">
                          <p className="text-xl font-semibold text-blue-600">{selectedEvent.participants}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Regular</p>
                        </div>
                        <div className="bg-purple-50/80 rounded-lg p-3 text-center">
                          <p className="text-xl font-semibold text-purple-600">{selectedEvent.vip}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">VIP</p>
                        </div>
                        <div className="bg-pink-50/80 rounded-lg p-3 text-center">
                          <p className="text-xl font-semibold text-pink-600">{selectedEvent.vvip}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">VVIP</p>
                        </div>
                      </div>
                      <div className="bg-accent/30 rounded-lg p-2.5">
                        <p className="text-xs text-muted-foreground text-center">
                          <span className="font-medium text-foreground">Total:</span>{' '}
                          {selectedEvent.participants + (selectedEvent.vip || 0) + (selectedEvent.vvip || 0)} participants
                        </p>
                      </div>
                    </div>

                    {/* Tagged Departments */}
                    {selectedEvent.taggedDepartments && selectedEvent.taggedDepartments.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="space-y-2.5">
                          <h3 className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            Tagged Departments
                          </h3>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedEvent.taggedDepartments.map((dept, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50/80 text-blue-700 border-blue-200 text-xs font-medium">
                                {dept}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Submitted Date */}
                    {selectedEvent.submittedAt && (
                      <>
                        <Separator className="my-4" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Submitted:</span>
                          <span>{format(new Date(selectedEvent.submittedAt), 'PPp')}</span>
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-420px)] text-muted-foreground">
                  <FileText className="w-12 h-12 mb-3 opacity-40" />
                  <p className="text-sm font-medium">No Event Selected</p>
                  <p className="text-xs mt-1">Click on an event from the list to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              PDF Preview - Event Details Report
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
            <Button onClick={downloadEventPdf} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <FileDown className="w-4 h-4" />
              Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OverallEventsPage;
