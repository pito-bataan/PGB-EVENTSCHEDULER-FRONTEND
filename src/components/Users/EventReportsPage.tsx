import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { 
  FileText, 
  ClipboardCheck, 
  BarChart3, 
  MessageSquare,
  Construction,
  Calendar,
  MapPin,
  CheckCircle2,
  Upload,
  Eye,
  Download,
  AlertCircle,
  X,
  Paperclip
} from 'lucide-react';
import { format } from 'date-fns';
import PostActivityReportTemplate from './templates/PostActivityReportTemplate';
import AssessmentEvaluationTemplate from './templates/AssessmentEvaluationTemplate';
import PostEventFeedbackTemplate from './templates/PostEventFeedbackTemplate';

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
  participants: number;
  vip?: number;
  vvip?: number;
  eventReports?: {
    completionReport?: { uploaded: boolean; uploadedAt?: string; fileUrl?: string };
    postActivityReport?: { uploaded: boolean; uploadedAt?: string; fileUrl?: string };
    assessmentReport?: { uploaded: boolean; uploadedAt?: string; fileUrl?: string };
    feedbackForm?: { uploaded: boolean; uploadedAt?: string; fileUrl?: string };
  };
  reportsStatus?: 'pending' | 'completed';
}

const EventReportsPage: React.FC = () => {
  const [completedEvents, setCompletedEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('completion');
  const [eventStatusTab, setEventStatusTab] = useState<'pending' | 'completed'>('pending');
  
  // Uploaded PDF files for each report type
  const [uploadedReports, setUploadedReports] = useState<{
    completionReport: File | null;
    postActivityReport: File | null;
    assessmentReport: File | null;
    feedbackForm: File | null;
  }>({
    completionReport: null,
    postActivityReport: null,
    assessmentReport: null,
    feedbackForm: null
  });

  // Template modal states
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPostActivityModal, setShowPostActivityModal] = useState(false);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [currentTemplateType, setCurrentTemplateType] = useState<'completion' | 'post-activity' | 'assessment' | 'feedback'>('completion');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  // Template form data
  const [templateData, setTemplateData] = useState({
    eventTitle: '',
    dateAndVenue: '',
    organizingOffice: '',
    numberOfParticipants: '',
    summaryOfActivities: '',
    highlightsAndResults: '',
    challengesEncountered: '',
    recommendations: '',
    photoDocumentation: [] as File[],
    preparedBy: '',
    preparedDate: ''
  });

  useEffect(() => {
    fetchCompletedEvents();
  }, []);

  const fetchCompletedEvents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/events/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('📊 All events:', response.data.data);
      
      // Filter only completed events
      const completed = response.data.data.filter(
        (event: Event) => event.status?.toLowerCase() === 'completed'
      );
      
      console.log('✅ Completed events:', completed);
      
      setCompletedEvents(completed);
      if (completed.length > 0 && !selectedEvent) {
        setSelectedEvent(completed[0]);
      }
    } catch (error) {
      console.error('Error fetching completed events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (reportKey: string) => {
    if (!selectedEvent || !(uploadedReports as any)[reportKey]) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      const formData = new FormData();
      formData.append(reportKey, (uploadedReports as any)[reportKey]);

      const token = localStorage.getItem('authToken');
      const response = await axios.post(
        `${API_BASE_URL}/event-reports/${selectedEvent._id}/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        toast.success('Report uploaded successfully!');
        
        // Update the selected event with the new data immediately
        setSelectedEvent(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            eventReports: response.data.data.eventReports,
            reportsStatus: response.data.data.reportsStatus
          };
        });
        
        // Clear the uploaded file from state
        setUploadedReports(prev => ({
          ...prev,
          [reportKey]: null
        }));

        // Refresh events to get updated status in sidebar
        await fetchCompletedEvents();

        // If all reports are now completed, automatically switch to completed tab
        if (response.data.data.reportsStatus === 'completed') {
          toast.success('🎉 All reports completed! Event moved to Completed tab.');
          setEventStatusTab('completed');
        }
      }
    } catch (error: any) {
      console.error('Error uploading report:', error);
      toast.error(error.response?.data?.message || 'Failed to upload report');
    }
  };

  // All report types (including hidden ones for future use)
  const allReportTypes = [
    {
      value: 'completion',
      label: 'Event Completion Report',
      icon: FileText,
      description: 'Submit your event completion report',
      key: 'completionReport'
    },
    {
      value: 'post-activity',
      label: 'Post Activity Report',
      icon: ClipboardCheck,
      description: 'Document post-event activities',
      key: 'postActivityReport'
    },
    // HIDDEN: Assessment & Evaluation - Temporarily hidden for users
    // {
    //   value: 'assessment',
    //   label: 'Assessment & Evaluation',
    //   icon: BarChart3,
    //   description: 'Evaluate event performance',
    //   key: 'assessmentReport'
    // },
    // HIDDEN: Post-Event Feedback - Temporarily hidden for users
    // {
    //   value: 'feedback',
    //   label: 'Post-Event Feedback',
    //   icon: MessageSquare,
    //   description: 'Collect feedback from participants',
    //   key: 'feedbackForm'
    // }
  ];

  // Filter to show only visible report types for users
  const reportTypes = allReportTypes.filter(report => 
    report.value === 'completion' || report.value === 'post-activity'
  );

  const getReportStatus = (reportKey: string) => {
    if (!selectedEvent?.eventReports) return { uploaded: false };
    return (selectedEvent.eventReports as any)[reportKey] || { uploaded: false };
  };

  const getCompletionStats = (event: Event) => {
    if (!event.eventReports) return { completed: 0, total: 4 };
    const reports = event.eventReports;
    const completed = [
      reports.completionReport?.uploaded,
      reports.postActivityReport?.uploaded,
      reports.assessmentReport?.uploaded,
      reports.feedbackForm?.uploaded
    ].filter(Boolean).length;
    return { completed, total: 4 };
  };

  // Filter events based on reports status
  const getFilteredEvents = () => {
    return completedEvents.filter(event => {
      const stats = getCompletionStats(event);
      const isCompleted = stats.completed === stats.total;
      return eventStatusTab === 'completed' ? isCompleted : !isCompleted;
    });
  };

  const filteredEvents = getFilteredEvents();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Event Completion Reports</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Upload required reports for your completed events
            </p>
          </div>
          <Badge variant="outline" className="hidden sm:flex">
            {completedEvents.length} Completed Events
          </Badge>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Events List */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Your Completed Events</CardTitle>
              <CardDescription>Select an event to upload reports</CardDescription>
              
              {/* Status Tabs */}
              <Tabs value={eventStatusTab} onValueChange={(value) => setEventStatusTab(value as 'pending' | 'completed')} className="w-full mt-4">
                <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0">
                  <TabsTrigger 
                    value="pending" 
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-800 data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-900 hover:bg-yellow-100 border data-[state=active]:border-yellow-400"
                  >
                    <Construction className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-medium">Pending</span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-auto">
                      {completedEvents.filter(e => {
                        const stats = getCompletionStats(e);
                        return stats.completed < stats.total;
                      }).length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="completed" 
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-800 data-[state=active]:bg-green-100 data-[state=active]:text-green-900 hover:bg-green-100 border data-[state=active]:border-green-400"
                  >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-medium">Completed</span>
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-auto">
                      {completedEvents.filter(e => {
                        const stats = getCompletionStats(e);
                        return stats.completed === stats.total;
                      }).length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2 p-4 pt-0">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading events...
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-8 space-y-2">
                      <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {eventStatusTab === 'pending' 
                          ? 'No pending reports found' 
                          : 'No completed reports found'}
                      </p>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {filteredEvents.map((event) => {
                        const stats = getCompletionStats(event);
                        const isSelected = selectedEvent?._id === event._id;
                        return (
                          <motion.div
                            key={event._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            <Card
                              className={`cursor-pointer transition-all hover:shadow-md ${
                                isSelected ? 'border-primary border-2 bg-primary/5' : ''
                              }`}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <CardContent className="p-4 space-y-3">
                                <div className="space-y-1">
                                  <h3 className="font-semibold text-sm line-clamp-2">
                                    {event.eventTitle}
                                  </h3>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="w-3 h-3" />
                                    <span className="line-clamp-1">
                                      {event.locations && event.locations.length > 1
                                        ? `${event.locations.length} locations`
                                        : event.location}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                      {format(new Date(event.startDate), 'MMM dd, yyyy')} at {event.startTime}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="w-3 h-3" />
                                    <span className="font-medium">End:</span>
                                    <span>
                                      {format(new Date(event.endDate), 'MMM dd, yyyy')} at {event.endTime}
                                    </span>
                                  </div>
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">
                                    Reports: {stats.completed}/{stats.total}
                                  </span>
                                  {stats.completed === stats.total ? (
                                    <Badge variant="default" className="text-xs">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Complete
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      {stats.completed}/{stats.total}
                                    </Badge>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Report Forms */}
        <div className="lg:col-span-8">
          <Card className="h-full">
            <CardContent className="p-6">
              {!selectedEvent ? (
                <motion.div
                  key="no-event"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className="text-center py-8 space-y-2">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Select an event to view and upload reports
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={selectedEvent._id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                    {/* Tab List */}
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2 bg-transparent p-0">
                      {reportTypes.map((report) => {
                        const Icon = report.icon;
                        const status = getReportStatus(report.key);
                        return (
                          <TabsTrigger
                            key={report.value}
                            value={report.value}
                            className="flex flex-col items-center gap-2 p-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg border-2 data-[state=active]:border-primary data-[state=inactive]:border-border hover:bg-accent transition-all relative"
                          >
                            {status.uploaded && (
                              <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <Icon className="w-4 h-4" />
                            <span className="text-xs font-medium text-center leading-tight">
                              {report.label.split(' ').slice(0, 2).join(' ')}
                            </span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                {/* Tab Contents */}
                {reportTypes.map((report) => {
                  const Icon = report.icon;
                  const status = getReportStatus(report.key);
                  return (
                    <TabsContent key={report.value} value={report.value}>
                      <Card className="border-2">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Icon className="w-6 h-6 text-primary" />
                              </div>
                              <div>
                                <CardTitle className="text-xl">{report.label}</CardTitle>
                                <CardDescription className="mt-1">
                                  For: {selectedEvent.eventTitle}
                                </CardDescription>
                              </div>
                            </div>
                            {status.uploaded ? (
                              <Badge variant="default">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Uploaded
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {/* PDF Upload UI for all report types */}
                          <div className="space-y-6">
                            {/* View Template Button */}
                            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-center gap-3">
                                <Eye className="w-5 h-5 text-blue-600" />
                                <div>
                                  <p className="font-medium text-sm text-blue-900">Need help with the format?</p>
                                  <p className="text-xs text-blue-700">View the template to see required fields and format</p>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setCurrentTemplateType(report.value as any);
                                  
                                  // For post-activity report, open the new component
                                  if (report.value === 'post-activity') {
                                    setShowPostActivityModal(true);
                                    return;
                                  }
                                  
                                  // For assessment report, open the new component
                                  if (report.value === 'assessment') {
                                    setShowAssessmentModal(true);
                                    return;
                                  }
                                  
                                  // For feedback form, open the new component
                                  if (report.value === 'feedback') {
                                    setShowFeedbackModal(true);
                                    return;
                                  }
                                  
                                  // Auto-populate fields from selected event for other templates
                                  if (selectedEvent) {
                                    // Helper function to convert 24-hour to 12-hour format
                                    const formatTime = (time: string) => {
                                      if (!time) return '';
                                      const [hours, minutes] = time.split(':');
                                      const hour = parseInt(hours, 10);
                                      const ampm = hour >= 12 ? 'PM' : 'AM';
                                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                                      return `${displayHour}:${minutes} ${ampm}`;
                                    };
                                    
                                    const startDate = format(new Date(selectedEvent.startDate), 'MMMM dd, yyyy');
                                    const endDate = format(new Date(selectedEvent.endDate), 'MMMM dd, yyyy');
                                    const startTime = formatTime(selectedEvent.startTime);
                                    const endTime = formatTime(selectedEvent.endTime);
                                    const dateTimeRange = `${startDate} ${startTime} - ${endDate} ${endTime}`;
                                    
                                    // Get location(s)
                                    let venue = selectedEvent.location;
                                    if (selectedEvent.locations && selectedEvent.locations.length > 1) {
                                      venue = selectedEvent.locations.join(', ');
                                    }
                                    
                                    // Calculate total participants
                                    const totalParticipants = selectedEvent.participants + 
                                      (selectedEvent.vip || 0) + 
                                      (selectedEvent.vvip || 0);
                                    
                                    setTemplateData({
                                      eventTitle: selectedEvent.eventTitle,
                                      dateAndVenue: `${dateTimeRange} at ${venue}`,
                                      organizingOffice: selectedEvent.requestorDepartment,
                                      numberOfParticipants: totalParticipants.toString(),
                                      summaryOfActivities: '',
                                      highlightsAndResults: '',
                                      challengesEncountered: '',
                                      recommendations: '',
                                      photoDocumentation: [],
                                      preparedBy: '',
                                      preparedDate: ''
                                    });
                                  }
                                  
                                  setShowTemplateModal(true);
                                }}
                                className="gap-2 border-blue-300 hover:bg-blue-100"
                              >
                                <FileText className="w-4 h-4" />
                                View Template
                              </Button>
                            </div>

                            {/* PDF Upload Area */}
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">
                                {status.uploaded ? 'Uploaded Report' : 'Upload Your Report (PDF)'}
                              </Label>
                              
                              {/* Show uploaded file from server if exists */}
                              {status.uploaded && status.fileUrl && (
                                <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4 mb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-lg bg-green-100">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-green-900">
                                          Report uploaded successfully
                                        </p>
                                        <p className="text-xs text-green-700">
                                          Uploaded on {status.uploadedAt ? new Date(status.uploadedAt).toLocaleDateString() : 'N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const fileUrl = status.fileUrl?.startsWith('http') 
                                            ? status.fileUrl 
                                            : `${API_BASE_URL.replace('/api', '')}${status.fileUrl}`;
                                          window.open(fileUrl, '_blank');
                                        }}
                                        className="gap-2"
                                      >
                                        <Eye className="w-4 h-4" />
                                        View
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setReportToDelete(report.key);
                                          setShowDeleteDialog(true);
                                        }}
                                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                      >
                                        <X className="w-4 h-4" />
                                        Delete
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Upload new file area - Only show for pending events */}
                              {selectedEvent.reportsStatus !== 'completed' && (
                              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                                {(uploadedReports as any)[report.key] ? (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-lg bg-blue-50">
                                        <Paperclip className="w-5 h-5 text-blue-600" />
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">
                                          {(uploadedReports as any)[report.key].name}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {((uploadedReports as any)[report.key].size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setUploadedReports(prev => ({
                                          ...prev,
                                          [report.key]: null
                                        }));
                                        toast.info('File removed. You can upload a new file.');
                                      }}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-600 mb-1">
                                      {status.uploaded ? 'Upload a new file to replace' : 'Click to upload or drag and drop'}
                                    </p>
                                    <p className="text-xs text-gray-400 mb-4">
                                      PDF files only (Max 10MB)
                                    </p>
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          if (file.size > 10 * 1024 * 1024) {
                                            toast.error('File size must be less than 10MB');
                                            return;
                                          }
                                          setUploadedReports(prev => ({
                                            ...prev,
                                            [report.key]: file
                                          }));
                                          toast.success('File uploaded successfully!');
                                        }
                                      }}
                                      className="hidden"
                                      id={`upload-${report.key}`}
                                    />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => document.getElementById(`upload-${report.key}`)?.click()}
                                    >
                                      Choose File
                                    </Button>
                                  </div>
                                )}
                              </div>
                              )}
                            </div>

                            {/* Submit Button - Only show for pending events */}
                            {selectedEvent.reportsStatus !== 'completed' && (uploadedReports as any)[report.key] && (
                              <div className="flex justify-end gap-3 pt-4">
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    setUploadedReports(prev => ({
                                      ...prev,
                                      [report.key]: null
                                    }));
                                    toast.info('Draft cleared');
                                  }}
                                >
                                  Clear File
                                </Button>
                                <Button onClick={() => handleSubmitReport(report.key)}>
                                  <Upload className="w-4 h-4 mr-2" />
                                  Submit Report
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </motion.div>
          )}
          </CardContent>
          </Card>
        </div>
      </div>

      {/* Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentTemplateType === 'completion' && 'Event Completion Report Template'}
              {currentTemplateType === 'post-activity' && 'Post Activity Report Template'}
              {currentTemplateType === 'assessment' && 'Assessment & Evaluation Report Template'}
              {currentTemplateType === 'feedback' && 'Post-Event Feedback Form Template'}
            </DialogTitle>
            <DialogDescription>
              Fill out the template fields to see the format, then download as PDF
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Template Form - Table Style */}
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
                        value={templateData.eventTitle}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, eventTitle: e.target.value }))}
                        placeholder="Enter event title"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Date and Venue */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Date and Venue:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.dateAndVenue}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, dateAndVenue: e.target.value }))}
                        placeholder="Enter date and venue"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Organizing Office */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Organizing Office:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.organizingOffice}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, organizingOffice: e.target.value }))}
                        placeholder="Enter organizing office"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Number of Participants */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Number of Participants:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.numberOfParticipants}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, numberOfParticipants: e.target.value }))}
                        placeholder="Enter number"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Summary of Activities */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                      Summary of Activities:
                    </td>
                    <td className="p-2">
                      <Textarea
                        value={templateData.summaryOfActivities}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, summaryOfActivities: e.target.value }))}
                        placeholder="Describe activities"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px]"
                      />
                    </td>
                  </tr>
                  
                  {/* Highlights and Results */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                      Highlights and Key Results:
                    </td>
                    <td className="p-2">
                      <Textarea
                        value={templateData.highlightsAndResults}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, highlightsAndResults: e.target.value }))}
                        placeholder="List highlights"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px]"
                      />
                    </td>
                  </tr>
                  
                  {/* Challenges */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                      Challenges Encountered:
                    </td>
                    <td className="p-2">
                      <Textarea
                        value={templateData.challengesEncountered}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, challengesEncountered: e.target.value }))}
                        placeholder="Describe challenges"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px]"
                      />
                    </td>
                  </tr>
                  
                  {/* Recommendations */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                      Recommendations:
                    </td>
                    <td className="p-2">
                      <Textarea
                        value={templateData.recommendations}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, recommendations: e.target.value }))}
                        placeholder="Provide recommendations"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px]"
                      />
                    </td>
                  </tr>
                  
                  {/* Photo Documentation */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r align-top">
                      Photo Documentation:
                    </td>
                    <td className="p-2">
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setTemplateData(prev => ({
                              ...prev,
                              photoDocumentation: files
                            }));
                          }}
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        {templateData.photoDocumentation.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {templateData.photoDocumentation.length} photo(s) selected
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Prepared By */}
                  <tr className="border-b">
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Prepared By:
                    </td>
                    <td className="p-2">
                      <Input
                        value={templateData.preparedBy}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, preparedBy: e.target.value }))}
                        placeholder="Enter name"
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                  
                  {/* Date */}
                  <tr>
                    <td className="bg-gray-50 p-3 font-medium text-sm border-r">
                      Date:
                    </td>
                    <td className="p-2">
                      <Input
                        type="date"
                        value={templateData.preparedDate}
                        onChange={(e) => setTemplateData(prev => ({ ...prev, preparedDate: e.target.value }))}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
              Close
            </Button>
            <Button 
              onClick={async () => {
                try {
                  const pdf = new jsPDF();
                  const pageWidth = pdf.internal.pageSize.getWidth();
                  const pageHeight = pdf.internal.pageSize.getHeight();
                  const margin = 20;
                  
                  // Get report title
                  let reportTitle = 'EVENT COMPLETION REPORT';
                  if (currentTemplateType === 'post-activity') reportTitle = 'POST ACTIVITY REPORT';
                  if (currentTemplateType === 'assessment') reportTitle = 'ASSESSMENT & EVALUATION REPORT';
                  if (currentTemplateType === 'feedback') reportTitle = 'POST-EVENT FEEDBACK FORM';
                  
                  // Load Bataan logo once
                  let logoImg: HTMLImageElement | null = null;
                  try {
                    logoImg = new Image();
                    logoImg.src = '/images/bataanlogo.png';
                    await new Promise((resolve, reject) => {
                      logoImg!.onload = resolve;
                      logoImg!.onerror = reject;
                    });
                  } catch (error) {
                    console.error('Failed to load logo:', error);
                  }
                  
                  const now = new Date();
                  const timestamp = `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
                  
                  // Helper function to add header to any page
                  const addPageHeader = (isFirstPage: boolean = false) => {
                    let headerYPos = margin;
                    
                    // Add logo
                    if (logoImg) {
                      const logoWidth = 20;
                      const logoHeight = 20;
                      pdf.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, headerYPos, logoWidth, logoHeight);
                      headerYPos += logoHeight + 5;
                    } else {
                      // Fallback circle
                      pdf.setFillColor(0, 102, 204);
                      pdf.circle(pageWidth / 2, headerYPos + 10, 8, 'F');
                      headerYPos += 25;
                    }
                    
                    // Title
                    pdf.setFontSize(14);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(0, 0, 0);
                    pdf.text(reportTitle, pageWidth / 2, headerYPos, { align: 'center' });
                    headerYPos += 7;
                    
                    // Subtitle
                    pdf.setFontSize(11);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text('Provincial Government of Bataan', pageWidth / 2, headerYPos, { align: 'center' });
                    headerYPos += 6;
                    
                    // Timestamp (only on first page)
                    if (isFirstPage) {
                      pdf.setFontSize(9);
                      pdf.setTextColor(100, 100, 100);
                      pdf.text(timestamp, pageWidth / 2, headerYPos, { align: 'center' });
                      headerYPos += 10;
                    } else {
                      headerYPos += 4;
                    }
                    
                    // Horizontal line
                    pdf.setDrawColor(0, 0, 0);
                    pdf.setLineWidth(0.5);
                    pdf.line(margin, headerYPos, pageWidth - margin, headerYPos);
                    headerYPos += 10;
                    
                    // Reset text color
                    pdf.setTextColor(0, 0, 0);
                    
                    return headerYPos;
                  };
                  
                  // Add header to first page
                  let yPos = addPageHeader(true);

                  // Table data (without Photo Documentation)
                  const tableData = [
                    ['Event Title', templateData.eventTitle || 'N/A'],
                    ['Date and Venue', templateData.dateAndVenue || 'N/A'],
                    ['Organizing Office', templateData.organizingOffice || 'N/A'],
                    ['Number of Participants', templateData.numberOfParticipants || 'N/A'],
                    ['Summary of Activities Conducted', templateData.summaryOfActivities || 'N/A'],
                    ['Highlights and Key Results', templateData.highlightsAndResults || 'N/A'],
                    ['Challenges Encountered', templateData.challengesEncountered || 'N/A'],
                    ['Recommendations', templateData.recommendations || 'N/A'],
                    ['Prepared By', templateData.preparedBy || 'N/A'],
                    ['Date', templateData.preparedDate || 'N/A']
                  ];

                  // Draw table
                  const colWidth1 = 70; // Label column width
                  const colWidth2 = pageWidth - margin * 2 - colWidth1; // Value column width
                  const rowHeight = 10;
                  const cellPadding = 3;

                  let tableStartY = yPos;
                  let currentPageTableStart = yPos;
                  
                  tableData.forEach(([label, value], index) => {
                    // Check if we need a new page
                    if (yPos + rowHeight > pageHeight - margin) {
                      // Draw border for current page before moving to next
                      pdf.setDrawColor(200, 200, 200);
                      pdf.setLineWidth(0.3);
                      pdf.rect(margin, currentPageTableStart, pageWidth - margin * 2, yPos - currentPageTableStart);
                      pdf.line(margin + colWidth1, currentPageTableStart, margin + colWidth1, yPos);
                      
                      pdf.addPage();
                      yPos = addPageHeader(false);
                      currentPageTableStart = yPos;
                    }

                    // Label (left column) - bold and gray background
                    pdf.setFillColor(245, 245, 245);
                    pdf.rect(margin, yPos, colWidth1, rowHeight, 'F');
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(9);
                    
                    // Split label if too long
                    const labelLines = pdf.splitTextToSize(label, colWidth1 - cellPadding * 2);
                    const labelHeight = labelLines.length * 4;
                    pdf.text(labelLines, margin + cellPadding, yPos + cellPadding + 3);

                    // Value (right column)
                    pdf.setFont('helvetica', 'normal');
                    const valueLines = pdf.splitTextToSize(value, colWidth2 - cellPadding * 2);
                    const valueHeight = valueLines.length * 4;
                    pdf.text(valueLines, margin + colWidth1 + cellPadding, yPos + cellPadding + 3);

                    // Adjust row height if content is tall
                    const maxHeight = Math.max(labelHeight, valueHeight);
                    const adjustedHeight = Math.max(rowHeight, maxHeight + cellPadding * 2);
                    
                    // Redraw with adjusted height if needed
                    if (adjustedHeight > rowHeight) {
                      pdf.setFillColor(245, 245, 245);
                      pdf.rect(margin, yPos, colWidth1, adjustedHeight, 'F');
                      // Redraw text
                      pdf.setFont('helvetica', 'bold');
                      pdf.text(labelLines, margin + cellPadding, yPos + cellPadding + 3);
                      pdf.setFont('helvetica', 'normal');
                      pdf.text(valueLines, margin + colWidth1 + cellPadding, yPos + cellPadding + 3);
                      yPos += adjustedHeight;
                    } else {
                      yPos += rowHeight;
                    }
                    
                    // Draw horizontal line after each row (except last)
                    if (index < tableData.length - 1) {
                      pdf.setDrawColor(220, 220, 220);
                      pdf.setLineWidth(0.3);
                      pdf.line(margin, yPos, pageWidth - margin, yPos);
                    }
                  });
                  
                  // Draw outer table border for the last page
                  pdf.setDrawColor(200, 200, 200);
                  pdf.setLineWidth(0.3);
                  pdf.rect(margin, currentPageTableStart, pageWidth - margin * 2, yPos - currentPageTableStart);
                  
                  // Draw vertical line between columns
                  pdf.line(margin + colWidth1, currentPageTableStart, margin + colWidth1, yPos);

                  // Add Photo Documentation section if photos exist
                  if (templateData.photoDocumentation.length > 0) {
                    yPos += 10; // Space after table
                    
                    // Check if we need a new page
                    if (yPos + 30 > pageHeight - margin) {
                      pdf.addPage();
                      yPos = addPageHeader(false);
                    }
                    
                    // Photo Documentation header
                    pdf.setFontSize(12);
                    pdf.setFont('helvetica', 'bold');
                    pdf.text('Photo Documentation', margin, yPos);
                    yPos += 10;
                    
                    // Display all photos, 4 per page (2x2 grid)
                    const photosToDisplay = templateData.photoDocumentation;
                    
                    // Load and display photos in 2 columns
                    const photoWidth = (pageWidth - margin * 2 - 10) / 2; // 2 columns with 10px gap
                    const photoHeight = 60; // Fixed height for photos
                    const photoGap = 10;
                    const photosPerPage = 4; // 2x2 grid
                    
                    for (let i = 0; i < photosToDisplay.length; i++) {
                      const photo = photosToDisplay[i];
                      const positionInPage = i % photosPerPage; // Position within current page (0-3)
                      const col = positionInPage % 2; // 0 for left, 1 for right
                      const row = Math.floor(positionInPage / 2); // 0 for top row, 1 for bottom row
                      
                      // Add new page after every 4 photos (except first)
                      if (i > 0 && i % photosPerPage === 0) {
                        pdf.addPage();
                        yPos = addPageHeader(false);
                        // Re-add Photo Documentation header on new page
                        pdf.setFontSize(12);
                        pdf.setFont('helvetica', 'bold');
                        pdf.text('Photo Documentation (continued)', margin, yPos);
                        yPos += 10;
                      }
                      
                      try {
                        // Load image from file
                        const reader = new FileReader();
                        const imageData = await new Promise<string>((resolve, reject) => {
                          reader.onload = (e) => resolve(e.target?.result as string);
                          reader.onerror = reject;
                          reader.readAsDataURL(photo);
                        });
                        
                        // Calculate position
                        const xPos = margin + (col * (photoWidth + photoGap));
                        const currentY = yPos + (row * (photoHeight + photoGap));
                        
                        // Add image to PDF
                        pdf.addImage(imageData, 'JPEG', xPos, currentY, photoWidth, photoHeight);
                        
                        // Add photo caption
                        pdf.setFontSize(8);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(`Photo ${i + 1}`, xPos + photoWidth / 2, currentY + photoHeight + 4, { align: 'center' });
                      } catch (error) {
                        console.error(`Failed to load photo ${i + 1}:`, error);
                      }
                    }
                    
                    // Update yPos after photos on current page
                    const photosOnLastPage = photosToDisplay.length % photosPerPage || photosPerPage;
                    const rowsOnLastPage = Math.ceil(photosOnLastPage / 2);
                    yPos += rowsOnLastPage * (photoHeight + photoGap) + 10;
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              PDF Preview - Template
            </DialogTitle>
            <DialogDescription>
              This is how your report template will look when downloaded
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
                link.download = `${currentTemplateType}-report-template.pdf`;
                link.click();
                toast.success('PDF downloaded successfully!');
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Activity Report Template Component */}
      <PostActivityReportTemplate
        open={showPostActivityModal}
        onOpenChange={setShowPostActivityModal}
        initialData={selectedEvent ? {
          activityTitle: selectedEvent.eventTitle,
          officeOrganizer: selectedEvent.requestorDepartment,
          dateAndTime: (() => {
            const formatTime = (time: string) => {
              if (!time) return '';
              const [hours, minutes] = time.split(':');
              const hour = parseInt(hours, 10);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
              return `${displayHour}:${minutes} ${ampm}`;
            };
            const startDate = format(new Date(selectedEvent.startDate), 'MMMM dd, yyyy');
            const endDate = format(new Date(selectedEvent.endDate), 'MMMM dd, yyyy');
            const startTime = formatTime(selectedEvent.startTime);
            const endTime = formatTime(selectedEvent.endTime);
            return `${startDate} ${startTime} - ${endDate} ${endTime}`;
          })(),
          venue: selectedEvent.locations && selectedEvent.locations.length > 1
            ? selectedEvent.locations.join(', ')
            : selectedEvent.location,
          participantsBeneficiaries: `Total Participants: ${
            selectedEvent.participants + (selectedEvent.vip || 0) + (selectedEvent.vvip || 0)
          }`
        } : undefined}
      />

      {/* Assessment & Evaluation Template Component */}
      <AssessmentEvaluationTemplate
        open={showAssessmentModal}
        onOpenChange={setShowAssessmentModal}
        initialData={selectedEvent ? {
          eventTitle: selectedEvent.eventTitle,
          dateAndVenue: (() => {
            const formatTime = (time: string) => {
              if (!time) return '';
              const [hours, minutes] = time.split(':');
              const hour = parseInt(hours, 10);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
              return `${displayHour}:${minutes} ${ampm}`;
            };
            const startDate = format(new Date(selectedEvent.startDate), 'MMMM dd, yyyy');
            const endDate = format(new Date(selectedEvent.endDate), 'MMMM dd, yyyy');
            const startTime = formatTime(selectedEvent.startTime);
            const endTime = formatTime(selectedEvent.endTime);
            const venue = selectedEvent.locations && selectedEvent.locations.length > 1
              ? selectedEvent.locations.join(', ')
              : selectedEvent.location;
            return `${startDate} ${startTime} - ${endDate} ${endTime} at ${venue}`;
          })(),
          organizingOffice: selectedEvent.requestorDepartment
        } : undefined}
      />

      {/* Post-Event Feedback Template Component */}
      <PostEventFeedbackTemplate
        open={showFeedbackModal}
        onOpenChange={setShowFeedbackModal}
        initialData={selectedEvent ? {
          eventTitle: selectedEvent.eventTitle,
          date: (() => {
            const formatTime = (time: string) => {
              if (!time) return '';
              const [hours, minutes] = time.split(':');
              const hour = parseInt(hours, 10);
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
              return `${displayHour}:${minutes} ${ampm}`;
            };
            const startDate = format(new Date(selectedEvent.startDate), 'MMMM dd, yyyy');
            const endDate = format(new Date(selectedEvent.endDate), 'MMMM dd, yyyy');
            const startTime = formatTime(selectedEvent.startTime);
            const endTime = formatTime(selectedEvent.endTime);
            return `${startDate} ${startTime} - ${endDate} ${endTime}`;
          })(),
          venue: selectedEvent.locations && selectedEvent.locations.length > 1
            ? selectedEvent.locations.join(', ')
            : selectedEvent.location,
          organizingOffice: selectedEvent.requestorDepartment
        } : undefined}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this report? You can upload a new one after deletion. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!selectedEvent || !reportToDelete) return;
                
                try {
                  const token = localStorage.getItem('authToken');
                  const response = await axios.delete(
                    `${API_BASE_URL}/event-reports/${selectedEvent._id}/${reportToDelete}`,
                    {
                      headers: { Authorization: `Bearer ${token}` }
                    }
                  );

                  if (response.data.success) {
                    toast.success('Report deleted successfully!');
                    
                    // Update the selected event with the new data
                    setSelectedEvent(prev => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        eventReports: response.data.data.eventReports,
                        reportsStatus: response.data.data.reportsStatus
                      };
                    });
                    
                    // Refresh events list to update the sidebar
                    await fetchCompletedEvents();
                  }
                } catch (error: any) {
                  console.error('Error deleting report:', error);
                  toast.error(error.response?.data?.message || 'Failed to delete report');
                } finally {
                  setShowDeleteDialog(false);
                  setReportToDelete(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventReportsPage;
