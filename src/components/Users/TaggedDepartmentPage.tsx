import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  X
} from 'lucide-react';

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
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNotesMap, setShowNotesMap] = useState<Record<string, boolean>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [currentUserDepartment, setCurrentUserDepartment] = useState<string>('');
  const [activeEventTab, setActiveEventTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [statusDialog, setStatusDialog] = useState<{
    isOpen: boolean;
    eventId: string;
    requirementId: string;
    status: string;
  }>({
    isOpen: false,
    eventId: '',
    requirementId: '',
    status: ''
  });

  useEffect(() => {
    // Get current user's department from localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserDepartment(user.department || user.departmentName || '');
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    const fetchTaggedEvents = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          toast.error('Please log in to view tagged events');
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/events/tagged`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 403) {
          toast.error('You do not have permission to view tagged events');
          return;
        }

        if (response.status === 401) {
          toast.error('Session expired. Please log in again');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch tagged events');
        }

        const data: ApiResponse = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setEvents(data.data);
        } else {
          console.error('Unexpected API response structure:', data);
          setEvents([]);
          toast.error('Invalid data format received from server');
        }
      } catch (error) {
        console.error('Error fetching tagged events:', error);
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error('Failed to fetch tagged events. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTaggedEvents();
  }, []);

  const handleRequirementStatusChange = async (eventId: string, requirementId: string, status: string) => {
    try {
      console.log('🔄 Updating requirement status:', { eventId, requirementId, status });
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        toast.error('Please log in to update requirements');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/events/${eventId}/requirements/${requirementId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      console.log('📋 Status update response status:', response.status);

      if (response.status === 403) {
        toast.error('You do not have permission to update this requirement');
        return;
      }

      if (response.status === 401) {
        toast.error('Session expired. Please log in again');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to update requirement status');
      }

      // Refresh the events list to get updated data
      const updatedResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/events/tagged`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (updatedResponse.ok) {
        const updatedData: ApiResponse = await updatedResponse.json();
        if (updatedData.success && Array.isArray(updatedData.data)) {
          setEvents(updatedData.data);
          // Update selected event with new data
          const updatedEvent = updatedData.data.find(event => event._id === eventId);
          if (updatedEvent) {
            setSelectedEvent(updatedEvent);
          }
          toast.success('Requirement status updated successfully');
        } else {
          console.error('Unexpected API response structure:', updatedData);
          toast.error('Invalid data format received from server');
        }
      }
    } catch (error) {
      console.error('Error updating requirement status:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update requirement status. Please try again.');
      }
    }
  };

  const handleNoteUpdate = async (eventId: string, requirementId: string, note: string) => {
    try {
      console.log('Updating notes:', { eventId, requirementId, note });
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        toast.error('Please log in to update notes');
        return;
      }

      console.log('Making API request to:', `${import.meta.env.VITE_API_URL}/api/events/${eventId}/requirements/${requirementId}/notes`);
      console.log('Request body:', { departmentNotes: note });
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/events/${eventId}/requirements/${requirementId}/notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ departmentNotes: note })
      });

      console.log('API Response status:', response.status);

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
        console.error('Error response:', errorData);
        console.error('Response status:', response.status);
        console.error('Response statusText:', response.statusText);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('Update notes response:', responseData);
      console.log('Response data type:', typeof responseData);
      console.log('Response data keys:', Object.keys(responseData || {}));

      // Refresh the events list to get updated data
      const updatedResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/events/tagged`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (updatedResponse.ok) {
        const updatedData: ApiResponse = await updatedResponse.json();
        console.log('Refresh data response:', updatedData);
        
        if (updatedData.success && Array.isArray(updatedData.data)) {
          setEvents(updatedData.data);
          // Update selected event with new data
          const updatedEvent = updatedData.data.find(event => event._id === eventId);
          if (updatedEvent) {
            console.log('Updated event:', updatedEvent);
            setSelectedEvent(updatedEvent);
            
            // Update local notes state to match the updated data
            const requirement = Object.values(updatedEvent.departmentRequirements)
              .flat()
              .find(r => r.id === requirementId);
              
            if (requirement) {
              console.log('Found requirement after update:', requirement);
              setNotesMap(prev => ({
                ...prev,
                [requirementId]: requirement.departmentNotes || note
              }));
            } else {
              // Fallback: if requirement not found, use the note we just saved
              console.log('Requirement not found, using fallback note');
              setNotesMap(prev => ({
                ...prev,
                [requirementId]: note
              }));
            }
          }
          toast.success('Notes updated successfully');
        } else {
          console.error('Unexpected API response structure:', updatedData);
          toast.error('Invalid data format received from server');
        }
      } else {
        // If refresh fails, still update local state with the note
        console.log('Refresh failed, updating local state only');
        setNotesMap(prev => ({
          ...prev,
          [requirementId]: note
        }));
        toast.success('Notes updated successfully');
      }
    } catch (error) {
      console.error('Error updating note:', error);
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
      case 'partially_fulfill': return 'bg-blue-500';
      case 'in_preparation': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'declined': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'partially_fulfill': return <HelpCircle className="w-4 h-4 text-blue-500" />;
      case 'in_preparation': return <Loader2 className="w-4 h-4 text-purple-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Helper function to get requirement status with default
  const getRequirementStatus = (requirement: Requirement) => {
    return requirement.status || 'pending';
  };

  // Helper function to get requirement counts by status (filtered by current user's department)
  const getRequirementCounts = (event: Event) => {
    // Only get requirements for the current user's department
    const userDepartmentRequirements = event.departmentRequirements[currentUserDepartment] || [];
    const counts = {
      all: userDepartmentRequirements.length,
      confirmed: 0,
      pending: 0,
      declined: 0,
      partially_fulfill: 0,
      in_preparation: 0
    };

    userDepartmentRequirements.forEach(req => {
      const status = getRequirementStatus(req);
      if (counts.hasOwnProperty(status)) {
        counts[status as keyof typeof counts]++;
      }
    });

    return counts;
  };

  // Status update dialog
  const statusDialogContent = (
    <AlertDialog 
      open={statusDialog.isOpen} 
      onOpenChange={(open) => !open && setStatusDialog(prev => ({ ...prev, isOpen: false }))}
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
              handleRequirementStatusChange(statusDialog.eventId, statusDialog.requirementId, statusDialog.status);
              setStatusDialog(prev => ({ ...prev, isOpen: false }));
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
        className="p-6 pb-0"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Event Requirements</h1>
            <p className="text-muted-foreground">
              Manage and track requirements for events you're tagged in
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 p-6 pt-8 min-h-0">
        {/* Events List */}
        <div className="w-[380px] bg-muted/5 rounded-xl flex flex-col overflow-hidden border">
          <div className="p-4 bg-background/95 backdrop-blur-sm border-b">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Tagged Events</h3>
              <Badge variant="outline" className="font-mono">
                {events.length} Events
              </Badge>
            </div>
            
            {/* Event Tabs */}
            <Tabs value={activeEventTab} onValueChange={(value) => setActiveEventTab(value as 'ongoing' | 'completed')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="ongoing" className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  Ongoing
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {events.filter(event => {
                      const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                      const confirmedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
                      const totalCount = userDeptReqs.length;
                      return totalCount === 0 || confirmedCount < totalCount;
                    }).length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3" />
                  Completed
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                    {events.filter(event => {
                      const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                      const confirmedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
                      const totalCount = userDeptReqs.length;
                      return totalCount > 0 && confirmedCount === totalCount;
                    }).length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <Tabs value={activeEventTab} className="flex-1 flex flex-col">
            <TabsContent value="ongoing" className="flex-1 mt-0">
              <ScrollArea className="h-full">
                <div className="p-3">
                  {loading ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <AnimatePresence>
                      {events
                        .filter(event => {
                          const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                          const confirmedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
                          const totalCount = userDeptReqs.length;
                          return totalCount === 0 || confirmedCount < totalCount;
                        })
                        .map((event) => (
                    <motion.div
                    key={event._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="mb-2 last:mb-0"
                  >
                    <Card 
                      className={`transition-all hover:shadow-sm cursor-pointer overflow-hidden ${
                        selectedEvent?._id === event._id ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-sm truncate">{event.eventTitle}</h3>
                              <Badge variant="secondary" className="text-[10px] h-4">
                                {event.status}
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
                                    {event.startTime} - {event.endTime}
                                  </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-2 flex-1">
                              <Progress 
                                value={
                                  (() => {
                                    const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                                    const confirmedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
                                    const totalCount = userDeptReqs.length;
                                    return totalCount > 0 ? (confirmedCount / totalCount) * 100 : 0;
                                  })()
                                } 
                                className="h-1 flex-1"
                              />
                              <span className="text-muted-foreground whitespace-nowrap">
                                {(() => {
                                  const userDeptReqs = event.departmentRequirements[currentUserDepartment] || [];
                                  const confirmedCount = userDeptReqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
                                  const totalCount = userDeptReqs.length;
                                  return `${confirmedCount}/${totalCount}`;
                                })()}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px] h-4 whitespace-nowrap">
                              {(event.departmentRequirements[currentUserDepartment] || []).length} requirements
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                        ))}
                    </AnimatePresence>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="completed" className="flex-1 mt-0">
              <ScrollArea className="h-full">
                <div className="p-3">
                  {loading ? (
                    <div className="flex items-center justify-center h-24">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
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
                            className="mb-2 last:mb-0"
                          >
                            <Card 
                              className={`transition-all hover:shadow-sm cursor-pointer overflow-hidden border-l-4 border-l-green-500 ${selectedEvent?._id === event._id ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                              onClick={() => setSelectedEvent(event)}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-4">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-medium text-sm truncate">{event.eventTitle}</h3>
                                      <Badge variant="secondary" className="text-[10px] h-4">
                                        {event.status}
                                      </Badge>
                                      <Badge className="text-[10px] h-4 bg-green-500 text-white">
                                        ✓ Complete
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
                                            {event.startTime} - {event.endTime}
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
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        {/* Event Details */}
        <div className="flex-1 bg-muted/5 rounded-xl border overflow-hidden flex flex-col h-[calc(100vh-80px)]">
          {selectedEvent ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col"
            >
              {/* Event Header */}
              <div className="bg-background/95 backdrop-blur-sm border-b p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold">{selectedEvent.eventTitle}</h2>
                  <Badge variant="outline" className="text-base px-3 py-1">
                    {(selectedEvent.departmentRequirements[currentUserDepartment] || []).length} Requirements
                  </Badge>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Requestor's Department</Label>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{selectedEvent.requestorDepartment}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Event Schedule</Label>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarDays className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {new Date(selectedEvent.startDate).toLocaleDateString()} - {new Date(selectedEvent.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {selectedEvent.startTime} - {selectedEvent.endTime}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Contact Email</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{selectedEvent.contactEmail}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Contact Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{selectedEvent.contactNumber}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirements List */}
              <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="all" className="h-full flex flex-col">
                  <div className="px-6 pt-4">
                    <TabsList className="w-full grid grid-cols-6 gap-4">
                      {(() => {
                        const counts = getRequirementCounts(selectedEvent);
                        return (
                          <>
                            <TabsTrigger value="all" className="flex items-center gap-2">
                              All
                              <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">
                                {counts.all}
                              </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="confirmed" className="flex items-center gap-2">
                              Confirmed
                              <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">
                                {counts.confirmed}
                              </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="flex items-center gap-2">
                              Pending
                              <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">
                                {counts.pending}
                              </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="declined" className="flex items-center gap-2">
                              Declined
                              <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">
                                {counts.declined}
                              </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="partially_fulfill" className="flex items-center gap-2">
                              Partially Fulfilled
                              <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">
                                {counts.partially_fulfill}
                              </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="in_preparation" className="flex items-center gap-2">
                              In Preparation
                              <Badge className="text-[10px] h-4 px-1.5 bg-red-500 text-white hover:bg-red-600">
                                {counts.in_preparation}
                              </Badge>
                            </TabsTrigger>
                          </>
                        );
                      })()
                      }
                    </TabsList>
                  </div>

                  <TabsContent value="all" className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="px-6 py-4 space-y-4">
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
                          className="group"
                        >
                          <Card className="overflow-hidden hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
                            <CardContent className="p-0">
                              {/* Header Section */}
                              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3 flex-1">
                                    <Avatar className="h-10 w-10 bg-blue-100">
                                      <AvatarFallback className="bg-blue-100 text-blue-700">
                                        <Package className="h-5 w-5" />
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-semibold text-gray-900 truncate">{req.name}</h4>
                                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                          {req.type}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                          <Package className="h-3 w-3" />
                                          Requested: {req.quantity} of {req.totalQuantity}
                                        </span>
                                        {getStatusIcon(getRequirementStatus(req))}
                                      </div>
                                    </div>
                                  </div>
                                  <Select 
                                    defaultValue={getRequirementStatus(req)}
                                    onValueChange={(value) => setStatusDialog({
                                      isOpen: true,
                                      eventId: selectedEvent._id,
                                      requirementId: req.id,
                                      status: value
                                    })}
                                  >
                                    <SelectTrigger className="w-[140px] h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="confirmed">
                                        <div className="flex items-center gap-2">
                                          <CheckCircle className="h-3 w-3 text-green-500" />
                                          Confirm
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="pending">
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-3 w-3 text-yellow-500" />
                                          Pending
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="declined">
                                        <div className="flex items-center gap-2">
                                          <XCircle className="h-3 w-3 text-red-500" />
                                          Decline
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="partially_fulfill">
                                        <div className="flex items-center gap-2">
                                          <HelpCircle className="h-3 w-3 text-blue-500" />
                                          Partially Fulfill
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="in_preparation">
                                        <div className="flex items-center gap-2">
                                          <Loader2 className="h-3 w-3 text-purple-500" />
                                          In Preparation
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Content Section */}
                              <div className="p-4 space-y-4">
                                {/* Requestor's Note */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-blue-600" />
                                    <Label className="text-sm font-medium text-gray-700">Requestor's Note</Label>
                                  </div>
                                  <Card className="bg-blue-50/50 border-blue-200">
                                    <CardContent className="p-3">
                                      <p className="text-sm text-gray-700 leading-relaxed">
                                        {req.notes || 'No notes provided by the requestor'}
                                      </p>
                                    </CardContent>
                                  </Card>
                                </div>

                                <Separator className="my-4" />

                                {/* Department's Note */}
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <MessageSquare className="h-4 w-4 text-green-600" />
                                      <Label className="text-sm font-medium text-gray-700">Your Department Notes</Label>
                                    </div>
                                    <Button
                                      variant={showNotesMap[req.id] ? "secondary" : "outline"}
                                      size="sm"
                                      onClick={() => {
                                        setShowNotesMap(prev => ({
                                          ...prev,
                                          [req.id]: !prev[req.id]
                                        }));
                                        if (!showNotesMap[req.id]) {
                                          const currentNote = req.departmentNotes || notesMap[req.id] || '';
                                          setNotesMap(prev => ({
                                            ...prev,
                                            [req.id]: currentNote
                                          }));
                                        }
                                      }}
                                      className="h-8 px-3 text-xs gap-1"
                                    >
                                      {showNotesMap[req.id] ? (
                                        <><X className="h-3 w-3" /> Cancel</>
                                      ) : (
                                        <><Edit3 className="h-3 w-3" /> {req.departmentNotes || notesMap[req.id] ? 'Edit' : 'Add'} Notes</>
                                      )}
                                    </Button>
                                  </div>
                                  
                                  {/* Display saved notes when not editing */}
                                  {!showNotesMap[req.id] && (req.departmentNotes || notesMap[req.id]) && (
                                    <Card className="bg-green-50/50 border-green-200">
                                      <CardContent className="p-3">
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                          {req.departmentNotes || notesMap[req.id]}
                                        </p>
                                      </CardContent>
                                    </Card>
                                  )}
                                  
                                  {/* Empty state when no notes */}
                                  {!showNotesMap[req.id] && !(req.departmentNotes || notesMap[req.id]) && (
                                    <Card className="bg-gray-50/50 border-gray-200 border-dashed">
                                      <CardContent className="p-4 text-center">
                                        <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">No notes added yet</p>
                                        <p className="text-xs text-gray-400 mt-1">Click "Add Notes" to provide feedback</p>
                                      </CardContent>
                                    </Card>
                                  )}
                                  
                                  {/* Editing interface */}
                                  {showNotesMap[req.id] && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <Card className="border-green-300 bg-green-50/30">
                                        <CardContent className="p-4 space-y-3">
                                          <Textarea
                                            placeholder="Add your department's notes about this requirement..."
                                            value={notesMap[req.id] || ''}
                                            onChange={(e) => {
                                              setNotesMap(prev => ({
                                                ...prev,
                                                [req.id]: e.target.value
                                              }));
                                            }}
                                            className="resize-none min-h-[100px] border-green-200 focus:border-green-400"
                                          />
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setNotesMap(prev => ({
                                                  ...prev,
                                                  [req.id]: req.departmentNotes || ''
                                                }));
                                                setShowNotesMap(prev => ({
                                                  ...prev,
                                                  [req.id]: false
                                                }));
                                              }}
                                              className="gap-1"
                                            >
                                              <X className="h-3 w-3" />
                                              Cancel
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                handleNoteUpdate(selectedEvent._id, req.id, notesMap[req.id] || '');
                                                setShowNotesMap(prev => ({
                                                  ...prev,
                                                  [req.id]: false
                                                }));
                                              }}
                                              className="gap-1 bg-green-600 hover:bg-green-700"
                                            >
                                              <Save className="h-3 w-3" />
                                              Save Notes
                                            </Button>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </motion.div>
                                  )}
                                </div>
                              </div>

                              {/* Footer */}
                              <div className="px-4 py-3 bg-gray-50/50 border-t">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3" />
                                    Last updated: {new Date(selectedEvent.submittedAt).toLocaleDateString()}
                                  </span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${getStatusColor(getRequirementStatus(req))} text-white border-0`}
                                  >
                                    {getRequirementStatus(req).replace('_', ' ').toUpperCase()}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
                  </TabsContent>

                  {/* Status-specific tabs */}
                  {['confirmed', 'pending', 'declined', 'partially_fulfill', 'in_preparation'].map((status) => (
                    <TabsContent key={status} value={status} className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
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
                                    className="group"
                                  >
                                    <Card className="overflow-hidden hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500">
                                      <CardContent className="p-0">
                                        {/* Header Section */}
                                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border-b">
                                          <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3 flex-1">
                                              <Avatar className="h-10 w-10 bg-blue-100">
                                                <AvatarFallback className="bg-blue-100 text-blue-700">
                                                  <Package className="h-5 w-5" />
                                                </AvatarFallback>
                                              </Avatar>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <h4 className="font-semibold text-gray-900 truncate">{req.name}</h4>
                                                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                                    {req.type}
                                                  </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                  <span className="flex items-center gap-1">
                                                    <Package className="h-3 w-3" />
                                                    Requested: {req.quantity} of {req.totalQuantity}
                                                  </span>
                                                  {getStatusIcon(getRequirementStatus(req))}
                                                </div>
                                              </div>
                                            </div>
                                            <Select 
                                              defaultValue={getRequirementStatus(req)}
                                              onValueChange={(value) => setStatusDialog({
                                                isOpen: true,
                                                eventId: selectedEvent._id,
                                                requirementId: req.id,
                                                status: value
                                              })}
                                            >
                                              <SelectTrigger className="w-[140px] h-9">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="confirmed">
                                                  <div className="flex items-center gap-2">
                                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                                    Confirm
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="pending">
                                                  <div className="flex items-center gap-2">
                                                    <Clock className="h-3 w-3 text-yellow-500" />
                                                    Pending
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="declined">
                                                  <div className="flex items-center gap-2">
                                                    <XCircle className="h-3 w-3 text-red-500" />
                                                    Decline
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="partially_fulfill">
                                                  <div className="flex items-center gap-2">
                                                    <HelpCircle className="h-3 w-3 text-blue-500" />
                                                    Partially Fulfill
                                                  </div>
                                                </SelectItem>
                                                <SelectItem value="in_preparation">
                                                  <div className="flex items-center gap-2">
                                                    <Loader2 className="h-3 w-3 text-purple-500" />
                                                    In Preparation
                                                  </div>
                                                </SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-4 space-y-4">
                                          {/* Requestor's Note */}
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <User className="h-4 w-4 text-blue-600" />
                                              <Label className="text-sm font-medium text-gray-700">Requestor's Note</Label>
                                            </div>
                                            <Card className="bg-blue-50/50 border-blue-200">
                                              <CardContent className="p-3">
                                                <p className="text-sm text-gray-700 leading-relaxed">
                                                  {req.notes || 'No notes provided by the requestor'}
                                                </p>
                                              </CardContent>
                                            </Card>
                                          </div>

                                          <Separator className="my-4" />

                                          {/* Department's Note */}
                                          <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-green-600" />
                                                <Label className="text-sm font-medium text-gray-700">Your Department Notes</Label>
                                              </div>
                                              <Button
                                                variant={showNotesMap[req.id] ? "secondary" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                  setShowNotesMap(prev => ({
                                                    ...prev,
                                                    [req.id]: !prev[req.id]
                                                  }));
                                                  if (!showNotesMap[req.id]) {
                                                    const currentNote = req.departmentNotes || notesMap[req.id] || '';
                                                    setNotesMap(prev => ({
                                                      ...prev,
                                                      [req.id]: currentNote
                                                    }));
                                                  }
                                                }}
                                                className="h-8 px-3 text-xs gap-1"
                                              >
                                                {showNotesMap[req.id] ? (
                                                  <><X className="h-3 w-3" /> Cancel</>
                                                ) : (
                                                  <><Edit3 className="h-3 w-3" /> {req.departmentNotes || notesMap[req.id] ? 'Edit' : 'Add'} Notes</>
                                                )}
                                              </Button>
                                            </div>
                                            
                                            {/* Display saved notes when not editing */}
                                            {!showNotesMap[req.id] && (req.departmentNotes || notesMap[req.id]) && (
                                              <Card className="bg-green-50/50 border-green-200">
                                                <CardContent className="p-3">
                                                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                    {req.departmentNotes || notesMap[req.id]}
                                                  </p>
                                                </CardContent>
                                              </Card>
                                            )}
                                            
                                            {/* Empty state when no notes */}
                                            {!showNotesMap[req.id] && !(req.departmentNotes || notesMap[req.id]) && (
                                              <Card className="bg-gray-50/50 border-gray-200 border-dashed">
                                                <CardContent className="p-4 text-center">
                                                  <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                                  <p className="text-sm text-gray-500">No notes added yet</p>
                                                  <p className="text-xs text-gray-400 mt-1">Click "Add Notes" to provide feedback</p>
                                                </CardContent>
                                              </Card>
                                            )}
                                            
                                            {/* Editing interface */}
                                            {showNotesMap[req.id] && (
                                              <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                              >
                                                <Card className="border-green-300 bg-green-50/30">
                                                  <CardContent className="p-4 space-y-3">
                                                    <Textarea
                                                      placeholder="Add your department's notes about this requirement..."
                                                      value={notesMap[req.id] || ''}
                                                      onChange={(e) => {
                                                        setNotesMap(prev => ({
                                                          ...prev,
                                                          [req.id]: e.target.value
                                                        }));
                                                      }}
                                                      className="resize-none min-h-[100px] border-green-200 focus:border-green-400"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                      <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                          setNotesMap(prev => ({
                                                            ...prev,
                                                            [req.id]: req.departmentNotes || ''
                                                          }));
                                                          setShowNotesMap(prev => ({
                                                            ...prev,
                                                            [req.id]: false
                                                          }));
                                                        }}
                                                        className="gap-1"
                                                      >
                                                        <X className="h-3 w-3" />
                                                        Cancel
                                                      </Button>
                                                      <Button
                                                        size="sm"
                                                        onClick={() => {
                                                          handleNoteUpdate(selectedEvent._id, req.id, notesMap[req.id] || '');
                                                          setShowNotesMap(prev => ({
                                                            ...prev,
                                                            [req.id]: false
                                                          }));
                                                        }}
                                                        className="gap-1 bg-green-600 hover:bg-green-700"
                                                      >
                                                        <Save className="h-3 w-3" />
                                                        Save Notes
                                                      </Button>
                                                    </div>
                                                  </CardContent>
                                                </Card>
                                              </motion.div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="px-4 py-3 bg-gray-50/50 border-t">
                                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1.5">
                                              <Clock className="w-3 h-3" />
                                              Last updated: {new Date(selectedEvent.submittedAt).toLocaleDateString()}
                                            </span>
                                            <Badge 
                                              variant="outline" 
                                              className={`text-xs ${getStatusColor(getRequirementStatus(req))} text-white border-0`}
                                            >
                                              {getRequirementStatus(req).replace('_', ' ').toUpperCase()}
                                            </Badge>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </motion.div>
                                ))
                            )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
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
    </div>
    </>
  );
};

export default TaggedDepartmentPage;