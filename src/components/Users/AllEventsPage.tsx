import React, { useEffect, useState } from 'react';
import { useAllEventsStore } from '@/stores/allEventsStore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Calendar, Clock, Search, X, Loader2, FileDown, RefreshCw, Eye, ChevronLeft, ChevronRight, FileText, MapPin, Printer } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

const AllEventsPage: React.FC = () => {
  const { 
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

  const [activeTab, setActiveTab] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [detailsEvent, setDetailsEvent] = useState<any>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [pdfEvent, setPdfEvent] = useState<any>(null);

  useEffect(() => { fetchAllEvents(); }, [fetchAllEvents]);

  const filteredEvents = getFilteredEvents();
  const uniqueLocations = getUniqueLocations();
  const statusCounts = { 
    all: filteredEvents.length, 
    approved: filteredEvents.filter(e => e.status === 'approved').length, 
    submitted: filteredEvents.filter(e => e.status === 'submitted').length, 
    cancelled: filteredEvents.filter(e => e.status === 'cancelled').length, 
    completed: filteredEvents.filter(e => e.status === 'completed').length 
  };
  const hasActiveFilters = searchQuery !== '' || locationFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all';

  const formatTime = (time: string) => { 
    if (!time) return ''; 
    const [hours, minutes] = time.split(':'); 
    const hour = parseInt(hours); 
    const ampm = hour >= 12 ? 'PM' : 'AM'; 
    const displayHour = hour % 12 || 12; 
    return `${displayHour}:${minutes} ${ampm}`; 
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': 
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium px-2 py-0">Approved</Badge>;
      case 'submitted': 
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[11px] font-medium px-2 py-0">Submitted</Badge>;
      case 'cancelled': 
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[11px] font-medium px-2 py-0">Cancelled</Badge>;
      case 'completed': 
        return <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-[11px] font-medium px-2 py-0">Completed</Badge>;
      default: 
        return <Badge variant="outline" className="text-[11px] font-medium px-2 py-0">{status}</Badge>;
    }
  };

  const paginatedEvents = filteredEvents
    .filter(event => activeTab === 'all' || event.status === activeTab)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  const totalFilteredEvents = filteredEvents.filter(event => activeTab === 'all' || event.status === activeTab).length;
  const totalPages = Math.ceil(totalFilteredEvents / itemsPerPage);

  // Generate PDF for selected event
  const generateEventPdf = async (event: any) => {
    if (!event) {
      toast.error('No event selected');
      return;
    }

    try {
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
      pdf.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')} at ${format(new Date(), 'h:mm a')}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Event title
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const wrappedTitle = pdf.splitTextToSize(event.eventTitle.toUpperCase(), pageWidth - 2 * margin);
      pdf.text(wrappedTitle, margin, yPos);
      yPos += wrappedTitle.length * 6 + 5;

      // Event details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Requestor:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(event.requestor, margin + 25, yPos);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Department:', margin + 90, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(event.requestorDepartment || 'N/A', margin + 115, yPos);
      yPos += 7;

      // Check if event has multiple date/time slots (multi-day event)
      const hasSlots = event.dateTimeSlots && Array.isArray(event.dateTimeSlots) && event.dateTimeSlots.length > 0;
      
      if (hasSlots) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Multi-Day Event Schedule:', margin, yPos);
        yPos += 7;
        pdf.setFont('helvetica', 'bold');
        pdf.text('Day 1:', margin + 5, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${format(new Date(event.startDate), 'MMM dd, yyyy')} at ${formatTime(event.startTime)} - ${formatTime(event.endTime)}`, margin + 20, yPos);
        yPos += 6;
        event.dateTimeSlots?.forEach((slot: any, idx: number) => {
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Day ${idx + 2}:`, margin + 5, yPos);
          pdf.setFont('helvetica', 'normal');
          pdf.text(`${format(new Date(slot.startDate), 'MMM dd, yyyy')} at ${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`, margin + 20, yPos);
          yPos += 6;
        });
        yPos += 1;
      } else {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Start Date:', margin, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(format(new Date(event.startDate), 'MMMM dd, yyyy'), margin + 25, yPos);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Start Time:', margin + 90, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(formatTime(event.startTime), margin + 115, yPos);
        yPos += 7;
        pdf.setFont('helvetica', 'bold');
        pdf.text('End Date:', margin, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(format(new Date(event.endDate), 'MMMM dd, yyyy'), margin + 25, yPos);
        pdf.setFont('helvetica', 'bold');
        pdf.text('End Time:', margin + 90, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(formatTime(event.endTime), margin + 115, yPos);
        yPos += 7;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.text(event.locations && event.locations.length > 1 ? 'Locations:' : 'Location:', margin, yPos);
      pdf.setFont('helvetica', 'normal');
      if (event.locations && event.locations.length > 1) {
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

      // Add new page for Tagged Departments & Requirements
      if (event.taggedDepartments && event.taggedDepartments.length > 0) {
        pdf.addPage();
        yPos = margin;

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
        pdf.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')} at ${format(new Date(), 'h:mm a')}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Tagged Departments & Requirements', margin, yPos);
        yPos += 10;

        event.taggedDepartments.forEach((dept: string) => {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setFillColor(59, 130, 246);
          pdf.rect(margin, yPos - 4, pageWidth - 2 * margin, 6, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.text(`${dept}`, margin + 2, yPos);
          pdf.setTextColor(0, 0, 0);
          yPos += 8;

          const deptReqs = event.departmentRequirements?.[dept] || [];
          if (deptReqs.length > 0) {
            pdf.setFont('helvetica', 'normal');
            deptReqs.forEach((req: any) => {
              const reqText = req.requirementText || req.text || req.requirement || req.name || 'Requirement';
              const status = req.status || 'Pending';
              const notes = req.notes || '';
              const quantity = req.quantity !== undefined ? req.quantity : '';

              pdf.setFontSize(9);
              pdf.setFont('helvetica', 'bold');
              pdf.text(`• ${reqText}`, margin + 3, yPos);
              yPos += 5;
              pdf.setFontSize(8);
              pdf.setFont('helvetica', 'normal');
              let detailsLine = `  Status: ${status}`;
              if (quantity !== '') {
                detailsLine += ` | Quantity: ${quantity}`;
              }
              pdf.text(detailsLine, margin + 5, yPos);
              yPos += 4;

              if (notes) {
                pdf.setFontSize(7);
                pdf.setTextColor(100, 100, 100);
                const notesLines = pdf.splitTextToSize(`  Notes: ${notes}`, pageWidth - margin * 2 - 10);
                pdf.text(notesLines, margin + 5, yPos);
                yPos += notesLines.length * 3;
                pdf.setTextColor(0, 0, 0);
              }
              yPos += 2;
            });
          } else {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'italic');
            pdf.text('No requirements', margin + 5, yPos);
            yPos += 4;
          }
          yPos += 5;
        });
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

      const link = document.createElement('a');
      link.href = pdfPreviewUrl;
      link.download = `Event_Details_${pdfEvent?.eventTitle.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5">
      <div className="max-w-[1600px] mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">All Events</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">{totalFilteredEvents} total events</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchAllEvents(true)} 
            disabled={loading} 
            className="gap-1.5 h-8 text-xs"
          >
            {loading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Refreshing</>
            ) : (
              <><RefreshCw className="w-3.5 h-3.5" />Refresh</>
            )}
          </Button>
        </div>

        {/* Main Card */}
        <Card className="border-slate-200 shadow-sm">
          
          {/* Filters Bar */}
          <div className="p-3 border-b border-slate-100 bg-white">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input 
                  placeholder="Search events..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-8 h-8 text-[13px] border-slate-200 focus-visible:ring-1" 
                />
              </div>
              
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[140px] h-8 text-[12px] border-slate-200">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[12px]">All Locations</SelectItem>
                  {uniqueLocations.map(location => (
                    <SelectItem key={location} value={location} className="text-[12px]">{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={activeTab} onValueChange={(value) => { setActiveTab(value); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px] h-8 text-[12px] border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[12px]">All ({statusCounts.all})</SelectItem>
                  <SelectItem value="approved" className="text-[12px]">Approved ({statusCounts.approved})</SelectItem>
                  <SelectItem value="submitted" className="text-[12px]">Submitted ({statusCounts.submitted})</SelectItem>
                  <SelectItem value="cancelled" className="text-[12px]">Cancelled ({statusCounts.cancelled})</SelectItem>
                  <SelectItem value="completed" className="text-[12px]">Completed ({statusCounts.completed})</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[120px] h-8 text-[12px] border-slate-200">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[12px]">All Dates</SelectItem>
                  <SelectItem value="today" className="text-[12px]">Today</SelectItem>
                  <SelectItem value="week" className="text-[12px]">This Week</SelectItem>
                  <SelectItem value="month" className="text-[12px]">This Month</SelectItem>
                  <SelectItem value="past" className="text-[12px]">Past Events</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters} 
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 text-[12px] px-2"
                >
                  <X className="w-3.5 h-3.5 mr-1" />Clear
                </Button>
              )}
            </div>
          </div>

          {/* Table Content */}
          <CardContent className="p-0">
            {loading && filteredEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-7 h-7 text-slate-400 animate-spin mb-3" />
                <p className="text-[13px] text-slate-500">Loading events...</p>
              </div>
            ) : totalFilteredEvents === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Calendar className="w-10 h-10 text-slate-300 mb-3" />
                <p className="text-[13px] text-slate-600 font-medium">No events found</p>
                <p className="text-[12px] text-slate-400 mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-200">
                        <TableHead className="font-medium text-slate-700 text-[11px] uppercase tracking-wide py-2.5 px-3 h-9">Event</TableHead>
                        <TableHead className="font-medium text-slate-700 text-[11px] uppercase tracking-wide py-2.5 px-3 h-9">Location</TableHead>
                        <TableHead className="font-medium text-slate-700 text-[11px] uppercase tracking-wide py-2.5 px-3 h-9">Schedule</TableHead>
                        <TableHead className="font-medium text-slate-700 text-[11px] uppercase tracking-wide py-2.5 px-3 h-9">Requestor</TableHead>
                        <TableHead className="font-medium text-slate-700 text-[11px] uppercase tracking-wide py-2.5 px-3 h-9 text-center">Status</TableHead>
                        <TableHead className="font-medium text-slate-700 text-[11px] uppercase tracking-wide py-2.5 px-3 h-9 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedEvents.map((event) => (
                        <TableRow 
                          key={event._id} 
                          className="hover:bg-slate-50/40 border-b border-slate-100 transition-colors"
                        >
                          <TableCell className="py-2.5 px-3">
                            <div className="font-medium text-slate-900 text-[13px] leading-tight truncate max-w-[280px]" title={event.eventTitle}>{event.eventTitle}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[280px]">{event.requestorDepartment}</div>
                          </TableCell>
                          
                          <TableCell className="py-2.5 px-3">
                            {event.locations && event.locations.length > 1 ? (
                              <div className="flex flex-col gap-0.5">
                                {event.locations.slice(0, 2).map((loc, idx) => (
                                  <span key={idx} className="text-[12px] text-slate-600">{loc}</span>
                                ))}
                                {event.locations.length > 2 && (
                                  <HoverCard openDelay={200}>
                                    <HoverCardTrigger asChild>
                                      <span className="text-[11px] text-blue-600 cursor-pointer hover:text-blue-700 hover:underline">
                                        +{event.locations.length - 2} more
                                      </span>
                                    </HoverCardTrigger>
                                    <HoverCardContent className="w-72" side="top" align="start" sideOffset={5}>
                                      <div className="space-y-2">
                                        <h4 className="text-[12px] font-semibold text-slate-900 flex items-center gap-1.5">
                                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                          All Locations ({event.locations.length})
                                        </h4>
                                        <div className="space-y-1">
                                          {event.locations.map((loc: string, idx: number) => (
                                            <div key={idx} className="flex items-start gap-2 text-[12px] text-slate-600 py-0.5">
                                              <span className="text-slate-400 font-medium">{idx + 1}.</span>
                                              <span>{loc}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </HoverCardContent>
                                  </HoverCard>
                                )}
                              </div>
                            ) : (
                              <span className="text-[12px] text-slate-600">{event.location}</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 text-[12px] text-slate-700">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{format(new Date(event.startDate), 'MMM d, yyyy')}</span>
                              {/* Multi-Day Badge with Hover - inline with date */}
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
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell className="py-2.5 px-3">
                            <div className="text-[12px] font-medium text-slate-900">{event.requestor}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[180px]">{event.contactEmail}</div>
                          </TableCell>
                          
                          <TableCell className="text-center py-2.5 px-3">
                            {getStatusBadge(event.status)}
                          </TableCell>
                          
                          <TableCell className="text-right py-2.5 px-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button 
                                size="sm" 
                                onClick={() => { setDetailsEvent(event); setShowEventDetails(true); }} 
                                className="h-7 px-2.5 text-[11px] bg-blue-500 hover:bg-blue-600 text-white gap-1.5"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => { setPdfEvent(event); generateEventPdf(event); }} 
                                className="h-7 px-2.5 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalFilteredEvents > itemsPerPage && (
                  <div className="flex items-center justify-between px-3 py-3 border-t border-slate-100 bg-slate-50/30">
                    <p className="text-[12px] text-slate-500">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalFilteredEvents)} of {totalFilteredEvents}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} 
                        disabled={currentPage === 1}
                        className="h-7 px-2.5 text-[11px]"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button 
                              key={pageNum} 
                              variant={currentPage === pageNum ? "default" : "outline"} 
                              size="sm" 
                              onClick={() => setCurrentPage(pageNum)} 
                              className={`h-7 w-7 p-0 text-[11px] ${currentPage === pageNum ? "bg-slate-900 hover:bg-slate-800" : ""}`}
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} 
                        disabled={currentPage === totalPages}
                        className="h-7 px-2.5 text-[11px]"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Event Details
            </DialogTitle>
            <DialogDescription className="text-[12px] text-slate-500">
              Complete information about this event
            </DialogDescription>
          </DialogHeader>
          
          {detailsEvent && (
            <div className="space-y-5 py-4">
              {/* Header Section */}
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Event Title</p>
                  <p className="text-[15px] font-semibold text-slate-900 leading-snug">{detailsEvent.eventTitle}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</p>
                    {getStatusBadge(detailsEvent.status)}
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Event Type</p>
                    <Badge variant="outline" className="text-[11px] bg-white">{detailsEvent.eventType || 'simple'}</Badge>
                  </div>
                  {detailsEvent.multipleLocations !== undefined && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Multiple Locations</p>
                      <Badge variant="outline" className="text-[11px] bg-white">{detailsEvent.multipleLocations ? 'Yes' : 'No'}</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule & Location */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Schedule</p>
                  <div className="space-y-1.5">
                    {/* Check if multi-day event with dateTimeSlots */}
                    {detailsEvent.dateTimeSlots && detailsEvent.dateTimeSlots.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-slate-600 mb-1.5">Multi-Day Event Schedule:</p>
                        {/* Day 1 - Main schedule */}
                        <div className="flex items-center gap-2 text-[12px]">
                          <span className="font-medium text-slate-700 min-w-[35px]">Day 1:</span>
                          <span className="text-slate-600">{format(new Date(detailsEvent.startDate), 'MMM d, yyyy')}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-600">{formatTime(detailsEvent.startTime)} - {formatTime(detailsEvent.endTime)}</span>
                        </div>
                        {/* Additional days from dateTimeSlots */}
                        {detailsEvent.dateTimeSlots.map((slot: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-[12px]">
                            <span className="font-medium text-slate-700 min-w-[35px]">Day {idx + 2}:</span>
                            <span className="text-slate-600">{format(new Date(slot.startDate), 'MMM d, yyyy')}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600">{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[13px] text-slate-700">{format(new Date(detailsEvent.startDate), 'MMMM d, yyyy')}</span>
                        </div>
                        {detailsEvent.endDate && detailsEvent.startDate !== detailsEvent.endDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[13px] text-slate-700">to {format(new Date(detailsEvent.endDate), 'MMMM d, yyyy')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-[13px] text-slate-600">{formatTime(detailsEvent.startTime)} - {formatTime(detailsEvent.endTime)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Location(s)</p>
                  {detailsEvent.locations && detailsEvent.locations.length > 0 ? (
                    <div className="space-y-1">
                      {detailsEvent.locations.map((loc: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                          <span className="text-[13px] text-slate-700">{loc}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                      <span className="text-[13px] text-slate-700">{detailsEvent.location}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Requestor & Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Requestor</p>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{detailsEvent.requestor}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5">{detailsEvent.requestorDepartment}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Contact Information</p>
                  <div className="space-y-1">
                    <p className="text-[13px] text-slate-700">{detailsEvent.contactEmail}</p>
                    <p className="text-[13px] text-slate-700">{detailsEvent.contactNumber}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Participants */}
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Expected Participants</p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wide">Total</p>
                    <p className="text-[18px] font-bold text-blue-700 mt-1">{detailsEvent.participants || 0}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-[10px] text-purple-600 font-medium uppercase tracking-wide">VIP</p>
                    <p className="text-[18px] font-bold text-purple-700 mt-1">{detailsEvent.vip || 0}</p>
                  </div>
                  <div className="bg-pink-50 rounded-lg p-3">
                    <p className="text-[10px] text-pink-600 font-medium uppercase tracking-wide">VVIP</p>
                    <p className="text-[18px] font-bold text-pink-700 mt-1">{detailsEvent.vvip || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] text-slate-600 font-medium uppercase tracking-wide">Without Gov</p>
                    <p className="text-[18px] font-bold text-slate-700 mt-1">{detailsEvent.withoutGov ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Tagged Departments */}
              {detailsEvent.taggedDepartments && detailsEvent.taggedDepartments.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Tagged Departments</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailsEvent.taggedDepartments.map((dept: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-[11px] bg-slate-50">{dept}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Description */}
              {detailsEvent.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</p>
                    <p className="text-[13px] text-slate-700 leading-relaxed">{detailsEvent.description}</p>
                  </div>
                </>
              )}

              {/* Submitted Timestamp */}
              {detailsEvent.submittedAt && (
                <>
                  <Separator />
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1">Submitted</p>
                    <p className="text-[13px] text-slate-700">{format(new Date(detailsEvent.submittedAt), 'MMMM d, yyyy h:mm a')}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="border-b pb-3 px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Printer className="w-5 h-5 text-blue-600" />
              PDF Preview - Event Details Report
            </DialogTitle>
            <DialogDescription className="text-[12px] text-slate-500">
              This is exactly how your PDF will look when downloaded
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden bg-slate-100 px-6">
            {pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0 rounded-lg"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-slate-400" />
                  <p className="text-[13px] text-slate-600">Generating PDF preview...</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 px-6 py-4 border-t bg-white">
            <Button variant="outline" onClick={() => setShowPdfPreview(false)} className="text-[13px] h-9">
              Close Preview
            </Button>
            <Button onClick={downloadEventPdf} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-[13px] h-9">
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
