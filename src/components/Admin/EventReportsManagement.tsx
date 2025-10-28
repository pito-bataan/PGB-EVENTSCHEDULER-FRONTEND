import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  FileText,
  ClipboardCheck,
  BarChart3,
  MessageSquare,
  Calendar,
  Building2,
  CheckCircle2,
  Eye,
  Download,
  Search,
  TrendingUp,
  FileCheck,
  FileClock,
  ExternalLink,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { format } from 'date-fns';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

interface Event {
  _id: string;
  eventTitle: string;
  location: string;
  locations?: string[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: string;
  submittedAt: string;
  requestorDepartment: string;
  requestor: string;
  participants: number;
  vip?: number;
  vvip?: number;
  eventReports?: {
    completionReport?: { uploaded: boolean; uploadedAt?: string; fileUrl?: string; filename?: string };
    postActivityReport?: { uploaded: boolean; uploadedAt?: string; fileUrl?: string; filename?: string };
    assessmentReport?: { uploaded: boolean; uploadedAt?: string; fileUrl?: string; filename?: string };
    feedbackForm?: { uploaded: boolean; uploadedAt?: string; fileUrl?: string; filename?: string };
  };
  reportsStatus?: 'pending' | 'completed';
}

const EventReportsManagement: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('');
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  useEffect(() => {
    fetchCompletedEvents();
  }, []);

  const fetchCompletedEvents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Filter only completed events
      const completed = response.data.data.filter(
        (event: Event) => event.status?.toLowerCase() === 'completed'
      );

      setEvents(completed);
    } catch (error) {
      console.error('Error fetching completed events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const getCompletionStats = (event: Event) => {
    if (!event.eventReports) return { completed: 0, total: 4, percentage: 0 };
    const reports = event.eventReports;
    const completed = [
      reports.completionReport?.uploaded,
      reports.postActivityReport?.uploaded,
      reports.assessmentReport?.uploaded,
      reports.feedbackForm?.uploaded
    ].filter(Boolean).length;
    return { completed, total: 4, percentage: (completed / 4) * 100 };
  };

  const reportTypes = [
    {
      key: 'completionReport',
      label: 'Event Completion Report',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      key: 'postActivityReport',
      label: 'Post Activity Report',
      icon: ClipboardCheck,
      color: 'text-green-600'
    },
    {
      key: 'assessmentReport',
      label: 'Assessment & Evaluation',
      icon: BarChart3,
      color: 'text-purple-600'
    },
    {
      key: 'feedbackForm',
      label: 'Post-Event Feedback',
      icon: MessageSquare,
      color: 'text-orange-600'
    }
  ];

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.requestorDepartment.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.requestor.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    
    const stats = getCompletionStats(event);
    const isCompleted = stats.completed === stats.total;
    
    return matchesSearch && (statusFilter === 'completed' ? isCompleted : !isCompleted);
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedEvents = filteredEvents.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Calculate statistics
  const overallStats = {
    total: events.length,
    completed: events.filter(e => getCompletionStats(e).completed === 4).length,
    pending: events.filter(e => getCompletionStats(e).completed < 4).length,
    totalReports: events.reduce((sum, e) => sum + getCompletionStats(e).completed, 0),
    possibleReports: events.length * 4
  };

  const handleViewReports = (event: Event) => {
    setSelectedEvent(event);
    setShowReportsModal(true);
  };

  const handleViewPdf = (fileUrl: string, reportName: string) => {
    const fullUrl = fileUrl.startsWith('http') 
      ? fileUrl 
      : `${API_BASE_URL.replace('/api', '')}${fileUrl}`;
    setPdfPreviewUrl(fullUrl);
    setPdfPreviewTitle(reportName);
    setShowPdfPreview(true);
  };

  const handleDownloadPdf = (fileUrl: string, filename: string) => {
    const fullUrl = fileUrl.startsWith('http') 
      ? fileUrl 
      : `${API_BASE_URL.replace('/api', '')}${fileUrl}`;
    window.open(fullUrl, '_blank');
    toast.success('Opening report in new tab');
  };

  return (
    <div className="p-4 md:p-6 max-w-[1800px] mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Event Reports Management</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            Monitor and manage event completion reports
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Events</p>
                  <h3 className="text-2xl font-bold mt-2">{overallStats.total}</h3>
                </div>
                <div className="p-3 rounded-full bg-blue-50">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Reports</p>
                  <h3 className="text-2xl font-bold mt-2">{overallStats.completed}</h3>
                  <p className="text-xs text-green-600 mt-1">All 4 reports submitted</p>
                </div>
                <div className="p-3 rounded-full bg-green-50">
                  <FileCheck className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Reports</p>
                  <h3 className="text-2xl font-bold mt-2">{overallStats.pending}</h3>
                  <p className="text-xs text-orange-600 mt-1">Awaiting submission</p>
                </div>
                <div className="p-3 rounded-full bg-orange-50">
                  <FileClock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <h3 className="text-2xl font-bold mt-2">
                    {overallStats.possibleReports > 0 
                      ? Math.round((overallStats.totalReports / overallStats.possibleReports) * 100)
                      : 0}%
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overallStats.totalReports}/{overallStats.possibleReports} reports
                  </p>
                </div>
                <div className="p-3 rounded-full bg-purple-50">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Table Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Completed Events</CardTitle>
              <CardDescription>View and manage event reports</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Event Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Event Date</TableHead>
                  <TableHead className="text-center">Progress</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading events...
                    </TableCell>
                  </TableRow>
                ) : filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No events found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedEvents.map((event) => {
                    const stats = getCompletionStats(event);
                    return (
                      <TableRow key={event._id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="max-w-[280px]">
                            <p className="truncate">{event.eventTitle}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {event.locations && event.locations.length > 1
                                ? `${event.locations.length} locations`
                                : event.location}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{event.requestorDepartment}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{event.requestor}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(event.startDate), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-medium">{stats.completed}/{stats.total}</span>
                            <div className="w-full max-w-[80px] bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  stats.percentage === 100 ? 'bg-green-600' : 'bg-blue-600'
                                }`}
                                style={{ width: `${stats.percentage}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {stats.completed === stats.total ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewReports(event)}
                            className="gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View Reports
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filteredEvents.length > itemsPerPage && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length} events
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      // Show first page, last page, current page, and pages around current
                      return page === 1 || 
                             page === totalPages || 
                             (page >= currentPage - 1 && page <= currentPage + 1);
                    })
                    .map((page, index, array) => {
                      // Add ellipsis
                      const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsisBefore && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reports Modal */}
      <Dialog open={showReportsModal} onOpenChange={setShowReportsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedEvent?.eventTitle}</DialogTitle>
            <DialogDescription>
              Event Reports Status and Downloads
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-6 py-4">
              {/* Event Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium">{selectedEvent.requestorDepartment}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Requestor</p>
                  <p className="text-sm font-medium">{selectedEvent.requestor}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Event Date</p>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedEvent.startDate), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  {getCompletionStats(selectedEvent).completed === 4 ? (
                    <Badge variant="default" className="mt-1">Complete</Badge>
                  ) : (
                    <Badge variant="secondary" className="mt-1">Pending</Badge>
                  )}
                </div>
              </div>

              {/* Reports Grid */}
              <div className="space-y-3">
                <h3 className="font-semibold">Report Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTypes.map((report) => {
                    const Icon = report.icon;
                    const status = selectedEvent.eventReports?.[report.key as keyof typeof selectedEvent.eventReports];
                    return (
                      <Card key={report.key} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-muted ${report.color}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{report.label}</h4>
                                {status?.uploaded && status.uploadedAt && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    {format(new Date(status.uploadedAt), 'MMM dd, yyyy')}
                                  </p>
                                )}
                              </div>
                            </div>
                            {status?.uploaded ? (
                              <Badge variant="default" className="shrink-0">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Uploaded
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="shrink-0">Pending</Badge>
                            )}
                          </div>

                          {status?.uploaded && status.fileUrl ? (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewPdf(status.fileUrl!, report.label)}
                                className="flex-1 gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownloadPdf(status.fileUrl!, status.filename || 'report.pdf')}
                                className="flex-1 gap-2"
                              >
                                <ExternalLink className="w-4 h-4" />
                                Open
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Not yet uploaded by user
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {pdfPreviewTitle}
            </DialogTitle>
            <DialogDescription>
              Report Document Preview
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-gray-100 rounded-lg" style={{ height: '75vh' }}>
            {pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full border-0"
                title="PDF Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading preview...</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfPreview(false)}>
              Close Preview
            </Button>
            <Button onClick={() => window.open(pdfPreviewUrl, '_blank')} className="gap-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventReportsManagement;
