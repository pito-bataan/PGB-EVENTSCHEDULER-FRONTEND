import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';
import { useTaggedDepartmentsStore } from '@/stores/taggedDepartmentsStore';
import { useSocket, getGlobalSocket } from '@/hooks/useSocket';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CalendarDays,
  Clock,
  Building2,
  Mail,
  Phone,
  CheckCircle,
  AlertCircle,
  Loader2,
  XCircle,
  HelpCircle,
  Package,
  User,
  MessageSquare,
  Edit3,
  Save,
  X,
  MapPin
} from 'lucide-react';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

// Event type definitions
interface Requirement {
  id: string;
  name: string;
  selected: boolean;
  notes: string;
  type: string;
  totalQuantity: number;
  isAvailable: boolean;
  availabilityNotes: string;
  quantity: number;
  status?: string;
  departmentNotes?: string;
  lastUpdated?: string;
  declineReason?: string;
  requirementsStatus?: 'on-hold' | 'released'; // Track if requirements are on-hold or released
  yesNoAnswer?: 'yes' | 'no'; // For yesno type requirements
  isCustom?: boolean; // Custom requirement added by requestor
  replies?: Array<{
    userId: string;
    userName: string;
    role: 'requestor' | 'department';
    message: string;
    createdAt: string;
  }>;
}

interface Event {
  _id: string;
  eventTitle: string;
  requestor: string;
  requestorDepartment: string;
  location: string;
  participants: number;
  vip: number;
  vvip: number;
  withoutGov: boolean;
  multipleLocations: boolean;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  contactNumber: string;
  contactEmail: string;
  attachments: any[];
  noAttachments: boolean;
  govFiles: Record<string, any>;
  taggedDepartments: string[];
  departmentRequirements: Record<string, Requirement[]>;
  status: string;
  submittedAt: string;
  createdBy: string;
}

interface ApiResponse {
  success: boolean;
  data: Event[];
  message?: string;
}

const TaggedDepartmentPage: React.FC = () => {
  // Get current user data
  const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
  const userId = currentUser._id || currentUser.id || 'unknown';
  
  // Initialize Socket.IO
  const { onNewNotification, offNewNotification, onStatusUpdate, offStatusUpdate } = useSocket(userId);
  
  // Decline dialog state
  const [declineDialog, setDeclineDialog] = React.useState<{
    open: boolean;
    eventId: string;
    requirementId: string;
    requirementName: string;
  }>({
    open: false,
    eventId: '',
    requirementId: '',
    requirementName: ''
  });
  const [declineReason, setDeclineReason] = React.useState('');
  
  // Per-requirement reply drafts for department conversation
  const [replyDrafts, setReplyDrafts] = React.useState<{ [reqId: string]: string }>({});
  
  // Zustand store - replaces all useState calls above!
  const {
    events,
    selectedEvent,
    loading,
    showNotesMap,
    notesMap,
    currentUserDepartment,
    activeEventTab,
    statusDialog,
    fetchTaggedEvents,
    setSelectedEvent,
    setActiveEventTab,
    setShowNotes,
    setNotes,
    setStatusDialog,
    updateRequirementStatus,
    updateRequirementNotes,
    getOngoingEvents,
    getCompletedEvents,
    getRequirementCounts
  } = useTaggedDepartmentsStore();

  // Realtime reply updates for department via Socket.IO
  useEffect(() => {
    const socket = getGlobalSocket();
    if (!socket) return;

    const handleReplyUpdate = (data: any) => {
      // Ensure this event is one of our tagged events before forcing refresh
      if (!data || !data.eventId) return;
      fetchTaggedEvents(true);
    };

    if (socket.connected) {
      socket.on('reply-update', handleReplyUpdate);
    } else {
      socket.once('connect', () => {
        socket.on('reply-update', handleReplyUpdate);
      });
    }

    return () => {
      socket.off('reply-update', handleReplyUpdate);
    };
  }, [fetchTaggedEvents]);

  useEffect(() => {
    // Fetch tagged events using Zustand store (respects 30s cache)
    fetchTaggedEvents(false);
    
    // Set up Socket.IO listener for real-time updates (NO POLLING!)
    if (typeof onNewNotification === 'function') {
      const handleNewNotification = (notificationData: any) => {
        // Check if this notification is for a tagged event
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userDepartment = userData.department || userData.departmentName || '';
        
        // If user's department is tagged in this event, refresh the list
        if (userDepartment && notificationData.taggedDepartments?.includes(userDepartment)) {
          fetchTaggedEvents(true); // Force refresh to get new tagged event
        }
      };
      
      // Set up Socket.IO listener
      onNewNotification(handleNewNotification);
      
      // Cleanup
      return () => {
        if (typeof offNewNotification === 'function') {
          offNewNotification();
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps to prevent infinite loop

  // Socket.IO listener for real-time requirement status updates
  useEffect(() => {
    if (typeof onStatusUpdate === 'function') {
      const handleStatusUpdate = (data: any) => {
        // Immediately refresh events list to update tabs
        fetchTaggedEvents(true);
      };

      onStatusUpdate(handleStatusUpdate);

      return () => {
        if (typeof offStatusUpdate === 'function') {
          offStatusUpdate();
        }
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps to prevent infinite loop

  // Update selected event when events list changes
  useEffect(() => {
    if (selectedEvent && events.length > 0) {
      const updatedEvent = events.find(event => event._id === selectedEvent._id);
      if (updatedEvent) {
        setSelectedEvent(updatedEvent);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]); // Watch for changes in events array

  const handleDeclineWithReason = async () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }

    try {
      // Update status to declined with the reason
      await updateRequirementStatus(declineDialog.eventId, declineDialog.requirementId, 'declined', declineReason);
      
      // Close dialog and reset
      setDeclineDialog({ open: false, eventId: '', requirementId: '', requirementName: '' });
      setDeclineReason('');
      
      // Force a small delay then fetch to ensure backend has the latest data
      setTimeout(async () => {
        await fetchTaggedEvents(true);
        
        // After fetching, check if current event is now completed
        setTimeout(() => {
          const freshEvents = useTaggedDepartmentsStore.getState().events;
          const freshEvent = freshEvents.find(e => e._id === declineDialog.eventId);
          
          if (freshEvent) {
            const userDeptReqs = freshEvent.departmentRequirements[currentUserDepartment] || [];
            const confirmedCount = userDeptReqs.filter(r => (r.status || 'pending') === 'confirmed').length;
            const totalCount = userDeptReqs.length;
            const isNowCompleted = totalCount > 0 && confirmedCount === totalCount;
            
            if (isNowCompleted) {
              const ongoingEvents = getOngoingEvents();
              if (ongoingEvents.length > 0) {
                setSelectedEvent(ongoingEvents[0]);
                setActiveEventTab('ongoing');
              } else {
                setSelectedEvent(null);
                setActiveEventTab('completed');
              }
            }
          }
        }, 300);
      }, 200);
      
      toast.success('Requirement declined successfully');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to decline requirement. Please try again.');
      }
    }
  };

  const handleRequirementStatusChange = async (eventId: string, requirementId: string, status: string, requirementName?: string) => {
    // If declining, show the reason dialog first
    if (status === 'declined') {
      setDeclineDialog({
        open: true,
        eventId,
        requirementId,
        requirementName: requirementName || 'this requirement'
      });
      return; // Don't proceed with status update yet
    }
    
    try {
      await updateRequirementStatus(eventId, requirementId, status);
      
      // Force a small delay then fetch to ensure backend has the latest data
      // This will update the Ongoing/Completed tabs
      setTimeout(async () => {
        await fetchTaggedEvents(true);
        
        // After fetching, check if current event is now completed
        setTimeout(() => {
          // Get the FRESH events directly from the store (not from closure!)
          const freshEvents = useTaggedDepartmentsStore.getState().events;
          const freshEvent = freshEvents.find(e => e._id === eventId);
          
          if (freshEvent) {
            const userDeptReqs = freshEvent.departmentRequirements[currentUserDepartment] || [];
            const confirmedCount = userDeptReqs.filter(r => (r.status || 'pending') === 'confirmed').length;
            const totalCount = userDeptReqs.length;
            const isNowCompleted = totalCount > 0 && confirmedCount === totalCount;
            
            if (isNowCompleted) {
              // Get next ongoing event from store
              const ongoingEvents = getOngoingEvents();
              
              if (ongoingEvents.length > 0) {
                // Select the first ongoing event
                const nextEvent = ongoingEvents[0];
                setSelectedEvent(nextEvent);
                
                // Switch to Ongoing tab to show the next event
                setActiveEventTab('ongoing');
              } else {
                // No more ongoing events, switch to Completed tab
                setSelectedEvent(null);
                setActiveEventTab('completed');
              }
            }
          }
        }, 300); // Increased delay to ensure store is updated
      }, 200);
      
      toast.success('Requirement status updated successfully');
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update requirement status. Please try again.');
      }
    }
  };

  const handleNoteUpdate = async (eventId: string, requirementId: string, note: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        toast.error('Please log in to update notes');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/events/${eventId}/requirements/${requirementId}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ departmentNotes: note })
      });

      if (response.status === 403) {
        toast.error('You do not have permission to update notes for this requirement');
        return;
      }

      if (response.status === 401) {
        toast.error('Session expired. Please log in again');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      // Refresh the events list to get updated data
      const updatedResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/events/tagged`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (updatedResponse.ok) {
        const updatedData: ApiResponse = await updatedResponse.json();
        
        if (updatedData.success && Array.isArray(updatedData.data)) {
          // Events will be updated by the store's fetchTaggedEvents method
          // Update selected event with new data
          const updatedEvent = updatedData.data.find(event => event._id === eventId);
          if (updatedEvent) {
            setSelectedEvent(updatedEvent);
            
            // Update local notes state to match the updated data
            const requirement = Object.values(updatedEvent.departmentRequirements)
              .flat()
              .find(r => r.id === requirementId);
              
            if (requirement) {
              setNotes(requirementId, requirement.departmentNotes || note);
            } else {
              // Fallback: if requirement not found, use the note we just saved
              setNotes(requirementId, note);
            }
          }
          toast.success('Notes updated successfully');
        } else {
          toast.error('Invalid data format received from server');
        }
      } else {
        // If refresh fails, still update local state with the note
        setNotes(requirementId, note);
        toast.success('Notes updated successfully');
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update requirement notes. Please try again.');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'declined': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'declined': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Helper function to get requirement status with default
  const getRequirementStatus = (requirement: Requirement) => {
    return requirement.status || 'pending';
  };

  // Helper function to format time to 12-hour format with AM/PM
  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // This function is now handled by the Zustand store

  // Status update dialog
  const statusDialogContent = (
    <AlertDialog 
      open={statusDialog.isOpen} 
      onOpenChange={(open) => !open && setStatusDialog({ ...statusDialog, isOpen: false })}
    >
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Update Requirement Status</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to change the status to <span className="font-semibold">{statusDialog.status}</span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              handleRequirementStatusChange(statusDialog.eventId, statusDialog.requirementId, statusDialog.status, statusDialog.requirementName);
              setStatusDialog({ ...statusDialog, isOpen: false });
            }}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <>
      {statusDialogContent}
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-3 md:p-4 lg:p-6 pb-0"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
          <div className="space-y-0.5 md:space-y-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">Event Requirements</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Manage and track requirements for events you're tagged in
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-3 md:gap-4 lg:gap-6 p-3 md:p-4 lg:p-6 pt-4 md:pt-6 lg:pt-8 overflow-y-auto">
        {/* Events List */}
        <div className="w-full bg-muted/5 rounded-xl flex flex-col border">
          <div className="p-4 bg-background/95 backdrop-blur-sm border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Tagged Events</h3>
              <Badge variant="outline" className="font-mono">
                {events.length} Events
              </Badge>
            </div>
            
            {/* Event Tabs */}
            <Tabs value={activeEventTab} onValueChange={(value) => setActiveEventTab(value as 'ongoing' | 'completed' | 'declined')} className="w-full">
              <TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-0">
                <TabsTrigger 
                  value="ongoing" 
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-50 text-yellow-800 data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-900 hover:bg-yellow-100"
                >
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-xs font-medium">Pending</span>
                  {(() => {
                    const pendingCount = events.filter(event => {
                      const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                      const confirmedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
                      const declinedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'declined').length;
                      const totalCount = userDeptReqs.length;
                      return totalCount > 0 && confirmedCount < totalCount && declinedCount < totalCount;
                    }).length;
                    return pendingCount > 0 ? (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto bg-red-500 text-white">
                        {pendingCount}
                      </Badge>
                    ) : null;
                  })()}
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 text-green-800 data-[state=active]:bg-green-100 data-[state=active]:text-green-900 hover:bg-green-100"
                >
                  <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-xs font-medium">Completed</span>
                  {(() => {
                    const completedCount = events.filter(event => {
                      const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                      const confirmedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
                      const totalCount = userDeptReqs.length;
                      return totalCount > 0 && confirmedCount === totalCount;
                    }).length;
                    return completedCount > 0 ? (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto bg-red-500 text-white">
                        {completedCount}
                      </Badge>
                    ) : null;
                  })()}
                </TabsTrigger>
                <TabsTrigger 
                  value="declined" 
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-800 data-[state=active]:bg-red-100 data-[state=active]:text-red-900 hover:bg-red-100"
                >
                  <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="text-xs font-medium">Declined</span>
                  {(() => {
                    const declinedCount = events.filter(event => {
                      const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                      const declinedCountInner = userDeptReqs.filter(r => getRequirementStatus(r) === 'declined').length;
                      const totalCount = userDeptReqs.length;
                      return totalCount > 0 && declinedCountInner === totalCount;
                    }).length;
                    return declinedCount > 0 ? (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto bg-red-500 text-white">
                        {declinedCount}
                      </Badge>
                    ) : null;
                  })()}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <Tabs value={activeEventTab} className="flex-1 flex flex-col">
            <TabsContent value="ongoing" className="flex-1 mt-0 bg-white">
                <div className="p-3">
                  {loading ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                    <AnimatePresence>
                      {getOngoingEvents()
                        .map((event) => (
                    <motion.div
                    key={event._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex-shrink-0 w-[280px]"
                  >
                    <Card 
                      className={`transition-all hover:shadow-md cursor-pointer overflow-hidden border ${
                        selectedEvent?._id === event._id ? 'border-blue-400 shadow-lg bg-blue-50/30' : 'border-gray-200'
                      }`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Header: Title + Status Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-semibold text-sm leading-tight flex-1 truncate" title={event.eventTitle}>
                              {event.eventTitle}
                            </h3>
                            <Badge className={`text-[10px] px-2 py-0.5 flex-shrink-0 font-medium ${
                              event.status === 'approved' ? 'bg-green-500 text-white' :
                              event.status === 'submitted' ? 'bg-blue-500 text-white' :
                              event.status === 'rejected' ? 'bg-red-500 text-white' :
                              event.status === 'cancelled' ? 'bg-yellow-600 text-white' :
                              'bg-gray-500 text-white'
                            }`}>
                              {event.status}
                            </Badge>
                          </div>

                          {/* Location(s) */}
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                            {event.locations && event.locations.length > 1 ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-xs text-muted-foreground leading-tight truncate">
                                  {event.locations[0]}
                                </span>
                                <HoverCard openDelay={200}>
                                  <HoverCardTrigger asChild>
                                    <Badge 
                                      variant="secondary" 
                                      className="text-[9px] bg-purple-100 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-200 whitespace-nowrap px-1.5 py-0"
                                    >
                                      +{event.locations.length - 1} more
                                    </Badge>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-64" side="right" align="start" sideOffset={5}>
                                    <div className="space-y-2">
                                      <h4 className="text-[11px] font-semibold text-slate-900">
                                        All Locations ({event.locations.length})
                                      </h4>
                                      <div className="space-y-1">
                                        {event.locations.map((loc: string, idx: number) => (
                                          <div key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-700">
                                            <MapPin className="w-2.5 h-2.5 flex-shrink-0 mt-0.5 text-purple-600" />
                                            <span className="leading-tight">{loc}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground leading-tight">{event.location}</span>
                            )}
                          </div>
                          
                          {/* Date & Time in Grid */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground bg-gray-50 rounded-md px-2 py-1.5">
                              <CalendarDays className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              <span className="truncate">
                                {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground bg-gray-50 rounded-md px-2 py-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              <span className="truncate">
                                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Progress Section */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium">Progress</span>
                              <span className="font-semibold text-foreground">
                                {(() => {
                                  const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                                  const confirmedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
                                  const totalCount = userDeptReqs.length;
                                  return `${confirmedCount}/${totalCount}`;
                                })()}
                              </span>
                            </div>
                            <Progress 
                              value={
                                (() => {
                                  const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                                  const confirmedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
                                  const totalCount = userDeptReqs.length;
                                  return totalCount > 0 ? (confirmedCount / totalCount) * 100 : 0;
                                })()
                              } 
                              className="h-2"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                        ))}
                    </AnimatePresence>
                    </div>
                  )}
                </div>
            </TabsContent>
            
            <TabsContent value="completed" className="flex-1 mt-0 bg-white">
                <div className="p-3">
                  {loading ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                    <AnimatePresence>
                      {events
                        .filter(event => {
                          const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                          const confirmedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
                          const totalCount = userDeptReqs.length;
                          return totalCount > 0 && confirmedCount === totalCount;
                        })
                        .map((event) => (
                          <motion.div
                            key={event._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="flex-shrink-0 w-[280px]"
                          >
                            <Card 
                              className={`transition-all hover:shadow-md cursor-pointer overflow-hidden border-l-4 border ${
                                selectedEvent?._id === event._id ? 'border-l-green-500 border-blue-400 shadow-lg bg-blue-50/30' : 'border-l-green-500 border-gray-200'
                              }`}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-4">
                                  <div className="overflow-hidden">
                                    <div className="flex items-start gap-2 mb-2">
                                      <h3 className="font-semibold text-sm leading-tight flex-1 truncate" title={event.eventTitle}>{event.eventTitle}</h3>
                                      <Badge className={`text-xs px-2 py-1 flex-shrink-0 ${
                                        event.status === 'approved' ? 'bg-green-500 text-white' :
                                        event.status === 'submitted' ? 'bg-blue-500 text-white' :
                                        event.status === 'rejected' ? 'bg-red-500 text-white' :
                                        event.status === 'cancelled' ? 'bg-yellow-600 text-white' :
                                        'bg-gray-500 text-white'
                                      }`}>
                                        {event.status}
                                      </Badge>
                                      <Badge className="text-[10px] h-4 bg-green-500 text-white flex-shrink-0">
                                        ✓ Complete
                                      </Badge>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                        {event.locations && event.locations.length > 1 ? (
                                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            <span className="leading-tight truncate">
                                              {event.locations[0]}
                                            </span>
                                            <HoverCard openDelay={200}>
                                              <HoverCardTrigger asChild>
                                                <Badge 
                                                  variant="secondary" 
                                                  className="text-[9px] bg-purple-100 text-purple-700 border-purple-200 cursor-pointer hover:bg-purple-200 whitespace-nowrap px-1.5 py-0"
                                                >
                                                  +{event.locations.length - 1} more
                                                </Badge>
                                              </HoverCardTrigger>
                                              <HoverCardContent className="w-64" side="right" align="start" sideOffset={5}>
                                                <div className="space-y-2">
                                                  <h4 className="text-[11px] font-semibold text-slate-900">
                                                    All Locations ({event.locations.length})
                                                  </h4>
                                                  <div className="space-y-1">
                                                    {event.locations.map((loc: string, idx: number) => (
                                                      <div key={idx} className="flex items-start gap-1.5 text-[10px] text-slate-700">
                                                        <MapPin className="w-2.5 h-2.5 flex-shrink-0 mt-0.5 text-purple-600" />
                                                        <span className="leading-tight">{loc}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              </HoverCardContent>
                                            </HoverCard>
                                          </div>
                                        ) : (
                                          <span className="leading-tight">{event.location}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <CalendarDays className="w-3 h-3" />
                                          <span>
                                            {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                                          </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Clock className="w-3 h-3" />
                                          <span>
                                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                          </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-2 flex-1">
                                      <Progress 
                                        value={100}
                                        className="h-1 flex-1"
                                      />
                                      <span className="text-green-600 font-medium whitespace-nowrap">
                                        {(() => {
                                          const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                                          return `${userDeptReqs.length}/${userDeptReqs.length}`;
                                        })()}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] h-4 whitespace-nowrap bg-green-50 text-green-700 border-green-200">
                                      {(event.departmentRequirements[currentUserDepartment] || []).length} requirements
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                    </div>
                  )}
                </div>
            </TabsContent>

            <TabsContent value="declined" className="flex-1 mt-0 bg-white">
                <div className="p-3">
                  {loading ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                    <AnimatePresence>
                      {events
                        .filter(event => {
                          const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                          const declinedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'declined').length;
                          const totalCount = userDeptReqs.length;
                          return totalCount > 0 && declinedCount === totalCount;
                        })
                        .map((event) => (
                          <motion.div
                            key={event._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            className="flex-shrink-0 w-[280px]"
                          >
                            <Card 
                              className={`transition-all hover:shadow-md cursor-pointer overflow-hidden border-l-4 border ${
                                selectedEvent?._id === event._id ? 'border-l-red-500 border-blue-400 shadow-lg bg-blue-50/30' : 'border-l-red-500 border-gray-200'
                              }`}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-4">
                                  <div className="overflow-hidden">
                                    <div className="flex items-start gap-2 mb-2">
                                      <h3 className="font-semibold text-sm leading-tight flex-1 truncate" title={event.eventTitle}>{event.eventTitle}</h3>
                                      <Badge className={`text-xs px-2 py-1 flex-shrink-0 ${
                                        event.status === 'approved' ? 'bg-green-500 text-white' :
                                        event.status === 'submitted' ? 'bg-blue-500 text-white' :
                                        event.status === 'rejected' ? 'bg-red-500 text-white' :
                                        event.status === 'cancelled' ? 'bg-yellow-600 text-white' :
                                        'bg-gray-500 text-white'
                                      }`}>
                                        {event.status}
                                      </Badge>
                                      <Badge className="text-[10px] h-4 bg-red-500 text-white flex-shrink-0">
                                        ✗ Declined
                                      </Badge>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <CalendarDays className="w-3 h-3" />
                                          <span>
                                            {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                                          </span>
                                      </div>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Clock className="w-3 h-3" />
                                          <span>
                                            {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                          </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-3 text-xs">
                                    <div className="flex items-center gap-2 flex-1">
                                      <Progress 
                                        value={100}
                                        className="h-1 flex-1 bg-red-100"
                                      />
                                      <span className="text-red-600 font-medium whitespace-nowrap">
                                        {(() => {
                                          const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                                          return `${userDeptReqs.length}/${userDeptReqs.length}`;
                                        })()}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] h-4 whitespace-nowrap bg-red-50 text-red-700 border-red-200">
                                      {(event.departmentRequirements[currentUserDepartment] || []).length} requirements
                                    </Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                    </AnimatePresence>
                    </div>
                  )}
                </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Event Details */}
        <div className="w-full bg-muted/5 rounded-xl border flex flex-col">
          {selectedEvent ? (
            <motion.div 
              key={selectedEvent._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col"
            >
              {/* Event Header */}
              <div className="bg-background/95 backdrop-blur-sm border-b px-5 md:px-6 py-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">{selectedEvent.eventTitle}</h2>
                  <Badge variant="outline" className="text-sm px-2 py-0.5">
                    {(selectedEvent.departmentRequirements[currentUserDepartment] || []).length} Requirements
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-x-4 md:gap-x-6 gap-y-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Requestor's Department</Label>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{selectedEvent.requestorDepartment}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Event Location{selectedEvent.locations && selectedEvent.locations.length > 1 ? 's' : ''}</Label>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                      {selectedEvent.locations && selectedEvent.locations.length > 1 ? (
                        <div className="flex flex-col gap-0.5 flex-1">
                          {selectedEvent.locations.map((loc: string, idx: number) => (
                            <span key={idx} className="text-xs font-medium leading-tight">
                              {loc}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs font-medium leading-tight">{selectedEvent.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5 xl:mr-8">
                    <Label className="text-[10px] text-muted-foreground">Event Schedule</Label>
                    <div className="flex flex-col gap-0.5">
                      {(() => {
                        const formatTime = (time: string) => {
                          if (!time) return '';
                          const [hours, minutes] = time.split(':');
                          const hour = parseInt(hours, 10);
                          const ampm = hour >= 12 ? 'PM' : 'AM';
                          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                          return `${displayHour}:${minutes} ${ampm}`;
                        };
                        
                        const allDates = [
                          {
                            date: selectedEvent.startDate,
                            startTime: selectedEvent.startTime,
                            endTime: selectedEvent.endTime
                          },
                          ...((selectedEvent as any).dateTimeSlots || [])
                        ];
                        
                        return allDates.map((slot, index) => (
                          <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <CalendarDays className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs font-medium whitespace-nowrap">
                                {new Date(slot.date || slot.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 ml-4 sm:ml-0">
                              <Clock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-xs font-medium whitespace-nowrap">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </span>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Contact Email</Label>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium truncate">{selectedEvent.contactEmail}</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Contact Number</Label>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-medium">{selectedEvent.contactNumber}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements List */}
              <div className="flex-1">
                <Tabs defaultValue="all" className="flex flex-col">
                  <div className="px-6 md:px-8 pt-4">
                    <TabsList className="w-full grid grid-cols-4">
                      {(() => {
                        const counts = getRequirementCounts(selectedEvent);
                        return (
                          <>
                            <TabsTrigger value="all" className="flex items-center gap-2">
                              All
                              {counts.all > 0 && (
                                <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">
                                  {counts.all}
                                </Badge>
                              )}
                            </TabsTrigger>
                            <TabsTrigger value="confirmed" className="flex items-center gap-2">
                              Confirmed
                              {counts.confirmed > 0 && (
                                <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">
                                  {counts.confirmed}
                                </Badge>
                              )}
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="flex items-center gap-2">
                              Pending
                              {counts.pending > 0 && (
                                <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">
                                  {counts.pending}
                                </Badge>
                              )}
                            </TabsTrigger>
                            <TabsTrigger value="declined" className="flex items-center gap-2">
                              Declined
                              {counts.declined > 0 && (
                                <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">
                                  {counts.declined}
                                </Badge>
                              )}
                            </TabsTrigger>
                          </>
                        );
                      })()
                      }
                    </TabsList>
                  </div>

                  <TabsContent value="all" className="flex-1">
                  <div className="px-6 md:px-8 py-4 space-y-4">
                    <AnimatePresence>
                      {Object.entries(selectedEvent.departmentRequirements)
                        .filter(([department, requirements]) => department === currentUserDepartment)
                        .map(([department, requirements]) => 
                        requirements.map((req: Requirement) => (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                        >
                          <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-4 space-y-4">
                              {/* Requirement Header */}
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <Package className="h-4 w-4 text-gray-600" />
                                    <h4 className="text-lg font-semibold text-gray-900 mr-1">{req.name}</h4>
                                    <span className="text-lg font-semibold text-gray-900 mr-1">-</span>
                                    <span className="text-base font-semibold text-gray-900">
                                      {req.isCustom ? (
                                        req.type === 'physical' ? (
                                          <>
                                            (Quantity: <span className="font-bold text-lg">{req.quantity || 'N/A'}</span>)
                                          </>
                                        ) : req.notes ? (
                                          <>
                                            Notes: <span className="font-medium">{req.notes}</span>
                                          </>
                                        ) : (
                                          <>Custom requirement</>
                                        )
                                      ) : req.type === 'physical' ? (
                                        (() => {
                                          let displayTotal = req.totalQuantity;
                                          if (req.availabilityNotes && req.availabilityNotes.startsWith('PAVILION_DEFAULT:')) {
                                            const parts = req.availabilityNotes.split(':');
                                            const parsed = parseInt(parts[1], 10);
                                            if (!isNaN(parsed)) {
                                              displayTotal = parsed;
                                            }
                                          }
                                          return (
                                            <>
                                              (Quantity: <span className="font-bold text-lg">{req.quantity}</span> of {displayTotal})
                                            </>
                                          );
                                        })()
                                      ) : req.type === 'yesno' ? (
                                        <>
                                          (Quantity: <span className="font-bold text-lg">1</span> of 1)
                                        </>
                                      ) : null}
                                    </span>
                                    {req.isCustom && (
                                      <Badge variant="outline" className="text-[11px] h-5 px-2 border-orange-300 text-orange-700 bg-orange-50">
                                        Custom Requirement
                                      </Badge>
                                    )}
                                    <span className="text-sm text-gray-600">
                                      {req.type === 'physical' && '• Type: Physical'}
                                      {req.type === 'yesno' && '• Type: Service - Yes/No'}
                                      {req.type !== 'physical' && req.type !== 'yesno' && '• Type: Service'}
                                    </span>
                                  </div>
                                </div>
                                <Select
                                  key={req.id}
                                  value={getRequirementStatus(req)}
                                  disabled={getRequirementStatus(req) === 'confirmed'}
                                  onValueChange={(value) => setStatusDialog({
                                    isOpen: true,
                                    eventId: selectedEvent._id,
                                    requirementId: req.id,
                                    status: value
                                  })}
                                >
                                  <SelectTrigger className="w-[130px]">
                                    <SelectValue>
                                      {getRequirementStatus(req) === 'pending' && (
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3.5 w-3.5 text-yellow-600" />
                                          Pending
                                        </div>
                                      )}
                                      {getRequirementStatus(req) === 'confirmed' && (
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                          Confirm
                                        </div>
                                      )}
                                      {getRequirementStatus(req) === 'declined' && (
                                        <div className="flex items-center gap-2">
                                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                                          Decline
                                        </div>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="confirmed">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                        Confirm
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="declined">
                                      <div className="flex items-center gap-2">
                                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                                        Decline
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <Separator />

                              {/* Requestor's Note/Answer */}
                              <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-2">
                                  <User className="h-3.5 w-3.5" />
                                  {req.type === 'yesno' ? 'Requestor\'s Answer' : 'Requestor\'s Note'}
                                </Label>
                                <div className="bg-gray-50 rounded-md p-3 border">
                                  <p className="text-sm text-gray-700">
                                    {req.type === 'yesno' ? (
                                      req.yesNoAnswer ? (
                                        <span className="font-semibold text-green-600">✓ Yes</span>
                                      ) : (
                                        'No answer provided'
                                      )
                                    ) : (
                                      req.notes || 'No notes provided'
                                    )}
                                  </p>
                                </div>
                              </div>

                              {/* Department's Note */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Your Department Notes
                                  </Label>
                                  {!showNotesMap[req.id] && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setShowNotes(req.id, true);
                                        const currentNote = req.departmentNotes || notesMap[req.id] || '';
                                        setNotes(req.id, currentNote);
                                      }}
                                      className="h-7 text-xs"
                                    >
                                      <Edit3 className="h-3 w-3 mr-1" />
                                      {req.departmentNotes || notesMap[req.id] ? 'Edit' : 'Add'}
                                    </Button>
                                  )}
                                </div>
                                
                                {/* Display or Edit Notes */}
                                {showNotesMap[req.id] ? (
                                  <div className="space-y-2">
                                    <Textarea
                                      placeholder="Add your department's notes..."
                                      value={notesMap[req.id] || ''}
                                      onChange={(e) => setNotes(req.id, e.target.value)}
                                      className="min-h-[80px] text-sm"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setNotes(req.id, req.departmentNotes || '');
                                          setShowNotes(req.id, false);
                                        }}
                                        className="h-7 text-xs"
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          handleNoteUpdate(selectedEvent._id, req.id, notesMap[req.id] || '');
                                          setShowNotes(req.id, false);
                                        }}
                                        className="h-7 text-xs"
                                      >
                                        <Save className="h-3 w-3 mr-1" />
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <div className="bg-gray-50 rounded-md p-3 border">
                                      <p className="text-sm text-gray-700">
                                        {req.departmentNotes || notesMap[req.id] || 'No notes added yet'}
                                      </p>
                                    </div>

                                    {/* Replies thread - chat style (only when there are department notes) */}
                                    {(req.departmentNotes || notesMap[req.id]) && (
                                      <div className="space-y-2">
                                        <Label className="text-xs font-medium flex items-center gap-1 text-gray-700">
                                          <MessageSquare className="h-3 w-3" />
                                          Conversation
                                        </Label>
                                        <div className="bg-white rounded-md border min-h-[180px] max-h-60 flex flex-col px-2 py-2 text-xs">
                                          {/* Scrollable messages */}
                                          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                                            {req.replies && req.replies.length > 0 ? (
                                              req.replies.map((reply, idx) => (
                                                <div
                                                  key={idx}
                                                  className={`flex ${reply.role === 'department' ? 'justify-end' : 'justify-start'}`}
                                                >
                                                  <div
                                                    className={`max-w-[80%] rounded-lg px-2 py-1.5 shadow-sm border text-[11px] whitespace-pre-wrap ${
                                                      reply.role === 'department'
                                                        ? 'bg-blue-600 text-white border-blue-700'
                                                        : 'bg-gray-100 text-gray-900 border-gray-200'
                                                    }`}
                                                  >
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                      <span className="font-semibold truncate max-w-[120px]">
                                                        {reply.role === 'department' ? 'You' : reply.userName || 'Requestor'}
                                                      </span>
                                                      <span className="text-[9px] opacity-80">
                                                        {reply.createdAt ? new Date(reply.createdAt).toLocaleString() : ''}
                                                      </span>
                                                    </div>
                                                    <p className="leading-snug">
                                                      {reply.message}
                                                    </p>
                                                  </div>
                                                </div>
                                              ))
                                            ) : (
                                              <p className="text-[11px] text-gray-400 italic">
                                                No replies yet.
                                              </p>
                                            )}
                                          </div>

                                          {/* Reply input inside card (match MyEventsPage style) */}
                                          <div className="mt-2 border-t pt-2 space-y-1.5">
                                            <Label className="text-[11px] text-gray-700">
                                              Your reply as <span className="font-semibold">{currentUserDepartment}</span>
                                            </Label>
                                            <div className="flex items-center gap-2">
                                              <Input
                                                className="text-xs bg-white/90 border-blue-200 focus-visible:ring-blue-500 flex-1 h-8"
                                                placeholder="Type your reply to this department..."
                                                value={replyDrafts[req.id] || ''}
                                                onChange={(e) =>
                                                  setReplyDrafts(prev => ({
                                                    ...prev,
                                                    [req.id]: e.target.value
                                                  }))
                                                }
                                              />
                                              <Button
                                                type="button"
                                                size="sm"
                                                className="h-8 px-3 text-[11px] bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                                                disabled={!replyDrafts[req.id]?.trim()}
                                                onClick={async () => {
                                                  const message = replyDrafts[req.id]?.trim();
                                                  if (!message || !selectedEvent) return;

                                                  try {
                                                    const token = localStorage.getItem('authToken');
                                                    const response = await axios.patch(
                                                      `${API_BASE_URL}/events/${selectedEvent._id}/requirements/${req.id}/replies`,
                                                      {
                                                        message,
                                                        role: 'department'
                                                      },
                                                      {
                                                        headers: {
                                                          'Authorization': token ? `Bearer ${token}` : '',
                                                          'Content-Type': 'application/json'
                                                        }
                                                      }
                                                    );

                                                    if (response.data?.success) {
                                                      await fetchTaggedEvents(true);

                                                      setReplyDrafts(prev => ({
                                                        ...prev,
                                                        [req.id]: ''
                                                      }));

                                                      toast.success('Reply sent');
                                                    } else {
                                                      toast.error('Failed to send reply');
                                                    }
                                                  } catch (error) {
                                                    toast.error('Failed to send reply');
                                                  }
                                                }}
                                              >
                                                Send Reply
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Status Badge */}
                              <div className="pt-2 border-t space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">
                                    Updated: {new Date(selectedEvent.submittedAt).toLocaleDateString()}
                                  </span>
                                  <Badge 
                                    className={`${getStatusColor(getRequirementStatus(req))} text-white border-0`}
                                  >
                                    {getRequirementStatus(req).toUpperCase()}
                                  </Badge>
                                </div>
                                
                                {/* Decline Reason */}
                                {getRequirementStatus(req) === 'declined' && req.declineReason && (
                                  <div className="bg-red-50 border border-red-200 rounded-md p-2">
                                    <div className="flex items-start gap-2">
                                      <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-red-900 mb-0.5">Decline Reason:</p>
                                        <p className="text-xs text-red-700">{req.declineReason}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                  </TabsContent>

                  {/* Status-specific tabs */}
                  {['confirmed', 'pending', 'declined'].map((status) => (
                    <TabsContent key={status} value={status} className="flex-1">
                        <div className="px-6 py-4 space-y-4">
                          <AnimatePresence>
                            {Object.entries(selectedEvent.departmentRequirements)
                              .filter(([department, requirements]) => department === currentUserDepartment)
                              .map(([department, requirements]) => 
                              requirements
                                .filter(req => getRequirementStatus(req) === status)
                                .map((req: Requirement) => (
                                  <motion.div
                                    key={req.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                  >
                                    <Card className="hover:shadow-sm transition-shadow">
                                      <CardContent className="p-4 space-y-4">
                                        {/* Requirement Header */}
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                              <Package className="h-4 w-4 text-gray-600" />
                                              <h4 className="text-lg font-semibold text-gray-900 mr-1">{req.name}</h4>
                                              <span className="text-lg font-semibold text-gray-900 mr-1">-</span>
                                              <span className="text-base font-semibold text-gray-900">
                                                {req.isCustom ? (
                                                  req.type === 'physical' ? (
                                                    <>
                                                      (Quantity: <span className="font-bold text-lg">{req.quantity || 'N/A'}</span>)
                                                    </>
                                                  ) : req.notes ? (
                                                    <>
                                                      Notes: <span className="font-medium">{req.notes}</span>
                                                    </>
                                                  ) : (
                                                    <>Custom requirement</>
                                                  )
                                                ) : req.type === 'physical' ? (
                                                  (() => {
                                                    let displayTotal = req.totalQuantity;
                                                    if (req.availabilityNotes && req.availabilityNotes.startsWith('PAVILION_DEFAULT:')) {
                                                      const parts = req.availabilityNotes.split(':');
                                                      const parsed = parseInt(parts[1], 10);
                                                      if (!isNaN(parsed)) {
                                                        displayTotal = parsed;
                                                      }
                                                    }
                                                    return (
                                                      <>
                                                        (Quantity: <span className="font-bold text-lg">{req.quantity}</span> of {displayTotal})
                                                      </>
                                                    );
                                                  })()
                                                ) : req.type === 'yesno' ? (
                                                  <>
                                                    (Quantity: <span className="font-bold text-lg">1</span> of 1)
                                                  </>
                                                ) : null}
                                              </span>
                                              {req.isCustom && (
                                                <Badge variant="outline" className="text-[11px] h-5 px-2 border-orange-300 text-orange-700 bg-orange-50">
                                                  Custom Requirement
                                                </Badge>
                                              )}
                                              <span className="text-sm text-gray-600">
                                                {req.type === 'physical' && '• Type: Physical'}
                                                {req.type === 'yesno' && '• Type: Service - Yes/No'}
                                                {req.type !== 'physical' && req.type !== 'yesno' && '• Type: Service'}
                                              </span>
                                            </div>
                                          </div>
                                          <Select 
                                            key={`${req.id}-${getRequirementStatus(req)}`}
                                            value={getRequirementStatus(req)}
                                            disabled={getRequirementStatus(req) === 'confirmed'}
                                            onValueChange={(value) => setStatusDialog({
                                              isOpen: true,
                                              eventId: selectedEvent._id,
                                              requirementId: req.id,
                                              status: value
                                            })}
                                          >
                                            <SelectTrigger className="w-[130px]">
                                              <SelectValue>
                                                {getRequirementStatus(req) === 'pending' && (
                                                  <div className="flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5 text-yellow-600" />
                                                    Pending
                                                  </div>
                                                )}
                                                {getRequirementStatus(req) === 'confirmed' && (
                                                  <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                                    Confirm
                                                  </div>
                                                )}
                                                {getRequirementStatus(req) === 'declined' && (
                                                  <div className="flex items-center gap-2">
                                                    <XCircle className="h-3.5 w-3.5 text-red-600" />
                                                    Decline
                                                  </div>
                                                )}
                                              </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="confirmed">
                                                <div className="flex items-center gap-2">
                                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                                  Confirm
                                                </div>
                                              </SelectItem>
                                              <SelectItem value="declined">
                                                <div className="flex items-center gap-2">
                                                  <XCircle className="h-3.5 w-3.5 text-red-600" />
                                                  Decline
                                                </div>
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        <Separator />

                                        {/* Requestor's Note/Answer */}
                                        <div className="space-y-2">
                                          <Label className="text-sm font-medium flex items-center gap-2">
                                            <User className="h-3.5 w-3.5" />
                                            {req.type === 'yesno' ? 'Requestor\'s Answer' : 'Requestor\'s Note'}
                                          </Label>
                                          <div className="bg-gray-50 rounded-md p-3 border">
                                            <p className="text-sm text-gray-700">
                                              {req.type === 'yesno' ? (
                                                req.yesNoAnswer ? (
                                                  <span className="font-semibold text-green-600">✓ Yes</span>
                                                ) : (
                                                  'No answer provided'
                                                )
                                              ) : (
                                                req.notes || 'No notes provided'
                                              )}
                                            </p>
                                          </div>
                                        </div>

                                        {/* Department's Note */}
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <Label className="text-sm font-medium flex items-center gap-2">
                                              <MessageSquare className="h-3.5 w-3.5" />
                                              Your Department Notes
                                            </Label>
                                            {!showNotesMap[req.id] && (
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  setShowNotes(req.id, true);
                                                  const currentNote = req.departmentNotes || notesMap[req.id] || '';
                                                  setNotes(req.id, currentNote);
                                                }}
                                                className="h-7 text-xs"
                                              >
                                                <Edit3 className="h-3 w-3 mr-1" />
                                                {req.departmentNotes || notesMap[req.id] ? 'Edit' : 'Add'}
                                              </Button>
                                            )}
                                          </div>
                                          
                                          {/* Display or Edit Notes */}
                                          {showNotesMap[req.id] ? (
                                            <div className="space-y-2">
                                              <Textarea
                                                placeholder="Add your department's notes..."
                                                value={notesMap[req.id] || ''}
                                                onChange={(e) => setNotes(req.id, e.target.value)}
                                                className="min-h-[80px] text-sm"
                                              />
                                              <div className="flex justify-end gap-2">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    setNotes(req.id, req.departmentNotes || '');
                                                    setShowNotes(req.id, false);
                                                  }}
                                                  className="h-7 text-xs"
                                                >
                                                  Cancel
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  onClick={() => {
                                                    handleNoteUpdate(selectedEvent._id, req.id, notesMap[req.id] || '');
                                                    setShowNotes(req.id, false);
                                                  }}
                                                  className="h-7 text-xs"
                                                >
                                                  <Save className="h-3 w-3 mr-1" />
                                                  Save
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="space-y-3">
                                              <div className="bg-gray-50 rounded-md p-3 border">
                                                <p className="text-sm text-gray-700">
                                                  {(req.departmentNotes || notesMap[req.id]) ? (req.departmentNotes || notesMap[req.id]) : 'No notes added yet'}
                                                </p>
                                              </div>

                                              {/* Replies thread - chat style (status tabs) */}
                                              {(req.departmentNotes || notesMap[req.id]) && (
                                                <div className="space-y-2">
                                                  <Label className="text-xs font-medium flex items-center gap-1 text-gray-700">
                                                    <MessageSquare className="h-3 w-3" />
                                                    Conversation
                                                  </Label>
                                                  <div className="bg-white rounded-md border min-h-[180px] max-h-60 flex flex-col px-2 py-2 text-xs">
                                                    {/* Scrollable messages */}
                                                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                                                      {req.replies && req.replies.length > 0 ? (
                                                        req.replies.map((reply, idx) => (
                                                          <div
                                                            key={idx}
                                                            className={`flex ${reply.role === 'department' ? 'justify-end' : 'justify-start'}`}
                                                          >
                                                            <div
                                                              className={`max-w-[80%] rounded-lg px-2 py-1.5 shadow-sm border text-[11px] whitespace-pre-wrap ${
                                                                reply.role === 'department'
                                                                  ? 'bg-blue-600 text-white border-blue-700'
                                                                  : 'bg-gray-100 text-gray-900 border-gray-200'
                                                              }`}
                                                            >
                                                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                                                <span className="font-semibold truncate max-w-[120px]">
                                                                  {reply.role === 'department' ? 'You' : reply.userName || 'Requestor'}
                                                                </span>
                                                                <span className="text-[9px] opacity-80">
                                                                  {reply.createdAt ? new Date(reply.createdAt).toLocaleString() : ''}
                                                                </span>
                                                              </div>
                                                              <p className="leading-snug">
                                                                {reply.message}
                                                              </p>
                                                            </div>
                                                          </div>
                                                        ))
                                                      ) : (
                                                        <p className="text-[11px] text-gray-400 italic">
                                                          No replies yet.
                                                        </p>
                                                      )}
                                                    </div>

                                                    {/* Reply input inside card */}
                                                    <div className="mt-2 border-t pt-2 space-y-1.5">
                                                      <Label className="text-[11px] text-gray-700">
                                                        Reply as <span className="font-semibold">{currentUserDepartment}</span>
                                                      </Label>
                                                      <div className="flex items-center gap-2">
                                                        <Textarea
                                                          rows={1}
                                                          className="text-xs bg-white border-gray-200 focus-visible:ring-blue-500 flex-1 h-8 py-1 resize-none"
                                                          placeholder="Type your reply to the requestor..."
                                                          value={replyDrafts[req.id] || ''}
                                                          onChange={(e) =>
                                                            setReplyDrafts(prev => ({
                                                              ...prev,
                                                              [req.id]: e.target.value
                                                            }))
                                                          }
                                                        />
                                                        <Button
                                                          type="button"
                                                          size="sm"
                                                          className="h-8 px-3 text-[11px] bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                                                          disabled={!replyDrafts[req.id]?.trim()}
                                                          onClick={async () => {
                                                            const message = replyDrafts[req.id]?.trim();
                                                            if (!message || !selectedEvent) return;

                                                            try {
                                                              const token = localStorage.getItem('authToken');
                                                              const response = await axios.patch(
                                                                `${API_BASE_URL}/events/${selectedEvent._id}/requirements/${req.id}/replies`,
                                                                {
                                                                  message,
                                                                  role: 'department'
                                                                },
                                                                {
                                                                  headers: {
                                                                    'Authorization': token ? `Bearer ${token}` : '',
                                                                    'Content-Type': 'application/json'
                                                                  }
                                                                }
                                                              );

                                                              if (response.data?.success) {
                                                                await fetchTaggedEvents(true);

                                                                setReplyDrafts(prev => ({
                                                                  ...prev,
                                                                  [req.id]: ''
                                                                }));

                                                                toast.success('Reply sent');
                                                              } else {
                                                                toast.error('Failed to send reply');
                                                              }
                                                            } catch (error) {
                                                              toast.error('Failed to send reply');
                                                            }
                                                          }}
                                                        >
                                                          Send Reply
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* Status Badge */}
                                        <div className="pt-2 border-t space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">
                                              Updated: {new Date(selectedEvent.submittedAt).toLocaleDateString()}
                                            </span>
                                            <Badge 
                                              className={`${getStatusColor(getRequirementStatus(req))} text-white border-0`}
                                            >
                                              {getRequirementStatus(req).toUpperCase()}
                                            </Badge>
                                          </div>
                                          
                                          {/* Decline Reason */}
                                          {getRequirementStatus(req) === 'declined' && req.declineReason && (
                                            <div className="bg-red-50 border border-red-200 rounded-md p-2">
                                              <div className="flex items-start gap-2">
                                                <XCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                  <p className="text-xs font-medium text-red-900 mb-0.5">Decline Reason:</p>
                                                  <p className="text-xs text-red-700">{req.declineReason}</p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </motion.div>
                                ))
                            )}
                    </AnimatePresence>
                  </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <div className="space-y-4">
                <Building2 className="w-12 h-12 text-muted-foreground/50 mx-auto" />
                <div>
                  <h3 className="text-lg font-medium">Select an Event</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose an event to view and manage its requirements
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decline Reason Dialog */}
      <Dialog open={declineDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDeclineDialog({ open: false, eventId: '', requirementId: '', requirementName: '' });
          setDeclineReason('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Decline Requirement</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining "{declineDialog.requirementName}". This will be visible to the event requestor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="decline-reason">Reason for Declining *</Label>
              <Textarea
                id="decline-reason"
                placeholder="Please explain why you're declining this requirement..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-sm text-muted-foreground">
                {declineReason.length}/500 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeclineDialog({ open: false, eventId: '', requirementId: '', requirementName: '' });
                setDeclineReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeclineWithReason}
              disabled={!declineReason.trim()}
            >
              Decline Requirement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default TaggedDepartmentPage;