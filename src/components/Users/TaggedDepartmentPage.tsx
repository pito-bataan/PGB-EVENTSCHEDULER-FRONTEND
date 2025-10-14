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
  HelpCircle
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

  // Helper function to get requirement counts by status
  const getRequirementCounts = (event: Event) => {
    const allRequirements = Object.values(event.departmentRequirements).flat();
    const counts = {
      all: allRequirements.length,
      confirmed: 0,
      pending: 0,
      declined: 0,
      partially_fulfill: 0,
      in_preparation: 0
    };

    allRequirements.forEach(req => {
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Tagged Events</h3>
              <Badge variant="outline" className="font-mono">
                {events.length} Events
              </Badge>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            <div className="p-3">
              {loading ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <AnimatePresence>
                  {events.map((event) => (
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
                                  (Object.values(event.departmentRequirements)
                                    .flat()
                                    .filter(r => getRequirementStatus(r) === 'confirmed').length / 
                                  Object.values(event.departmentRequirements)
                                    .flat().length) * 100
                                } 
                                className="h-1 flex-1"
                              />
                              <span className="text-muted-foreground whitespace-nowrap">
                                {Object.values(event.departmentRequirements)
                                  .flat()
                                  .filter(r => getRequirementStatus(r) === 'confirmed').length}/
                                {Object.values(event.departmentRequirements)
                                  .flat().length}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-[10px] h-4 whitespace-nowrap">
                              {Object.values(event.departmentRequirements)
                                .flat().length} requirements
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
        </div>

        {/* Event Details */}
        <div className="flex-1 bg-muted/5 rounded-xl border overflow-hidden flex flex-col">
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
                    {Object.values(selectedEvent.departmentRequirements).flat().length} Requirements
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
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {counts.all}
                              </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="confirmed" className="flex items-center gap-2">
                              Confirmed
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {counts.confirmed}
                              </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="flex items-center gap-2">
                              Pending
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {counts.pending}
                              </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="declined" className="flex items-center gap-2">
                              Declined
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {counts.declined}
                              </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="partially_fulfill" className="flex items-center gap-2">
                              Partially Fulfilled
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                {counts.partially_fulfill}
                              </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="in_preparation" className="flex items-center gap-2">
                              In Preparation
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
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
                      {Object.entries(selectedEvent.departmentRequirements).map(([department, requirements]) => 
                        requirements.map((req: Requirement) => (
                        <motion.div
                          key={req.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="bg-white rounded-lg border"
                        >
                          {/* Requirement Header */}
                          <div className="flex items-center justify-between p-4 border-b">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{req.name}</h4>
                              <Badge variant="outline" className="text-[10px] h-5 px-2">
                                {req.type}
                              </Badge>
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
                                <SelectTrigger className="w-[130px] h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="confirmed">Confirm</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="declined">Decline</SelectItem>
                                  <SelectItem value="partially_fulfill">Partially Fulfill</SelectItem>
                                  <SelectItem value="in_preparation">In Preparation</SelectItem>
                                </SelectContent>
                              </Select>
                              
                            </div>

                            <div className="px-4 py-3">
                              <div className="text-sm text-muted-foreground mb-4">
                                Requested: {req.quantity} of {req.totalQuantity} available
                              </div>

                              {/* Notes Section */}
                              <div className="space-y-4">
                                {/* Requestor's Note */}
                                <div>
                                  <Label className="text-xs uppercase text-muted-foreground mb-2">Requestor's Note</Label>
                                  <div className="text-sm border rounded-lg p-3">
                                    {req.notes || 'No notes provided'}
                                  </div>
                                </div>

                                {/* Department's Note */}
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <Label className="text-xs uppercase text-muted-foreground">Your Notes</Label>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setShowNotesMap(prev => ({
                                          ...prev,
                                          [req.id]: !prev[req.id]
                                        }));
                                        // Initialize notes when showing
                                        if (!showNotesMap[req.id]) {
                                          const currentNote = req.departmentNotes || notesMap[req.id] || '';
                                          setNotesMap(prev => ({
                                            ...prev,
                                            [req.id]: currentNote
                                          }));
                                        }
                                      }}
                                      className="h-7 px-2 text-xs"
                                    >
                                      {showNotesMap[req.id] ? 'Hide Notes' : (req.departmentNotes || notesMap[req.id] ? 'Edit Notes' : 'Add Notes')}
                                    </Button>
                                  </div>
                                  
                                  {/* Display saved notes when not editing */}
                                  {!showNotesMap[req.id] && (req.departmentNotes || notesMap[req.id]) && (
                                    <div className="text-sm border rounded-lg p-3 bg-muted/20">
                                      {req.departmentNotes || notesMap[req.id] || 'No notes provided'}
                                    </div>
                                  )}
                                  
                                  {/* Editing interface */}
                                  {showNotesMap[req.id] && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <div className="space-y-2">
                                        <Textarea
                                          placeholder="Add your notes about this requirement..."
                                          value={notesMap[req.id] || ''}
                                          onChange={(e) => {
                                            setNotesMap(prev => ({
                                              ...prev,
                                              [req.id]: e.target.value
                                            }));
                                          }}
                                          className="resize-none text-sm min-h-[80px]"
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
                                          >
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
                                          >
                                            Save Notes
                                          </Button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              </div>

                              {/* Footer */}
                              <div className="flex items-center gap-6 text-xs text-muted-foreground mt-4 pt-3 border-t">
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  Last updated: {new Date(selectedEvent.submittedAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
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
                            {Object.entries(selectedEvent.departmentRequirements).map(([department, requirements]) => 
                              requirements
                                .filter(req => getRequirementStatus(req) === status)
                                .map((req: Requirement) => (
                                  <motion.div
                                    key={req.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className="bg-white rounded-lg border"
                                  >
                                    {/* Requirement Header */}
                                    <div className="flex items-center justify-between p-4 border-b">
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-medium">{req.name}</h4>
                                        <Badge variant="outline" className="text-[10px] h-5 px-2">
                                          {req.type}
                                        </Badge>
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
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="confirmed">Confirm</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="declined">Decline</SelectItem>
                                <SelectItem value="partially_fulfill">Partially Fulfill</SelectItem>
                                <SelectItem value="in_preparation">In Preparation</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="px-4 py-3">
                            <div className="text-sm text-muted-foreground mb-4">
                              Requested: {req.quantity} of {req.totalQuantity} available
                            </div>

                            {/* Notes Section */}
                            <div className="space-y-4">
                              {/* Requestor's Note */}
                              <div>
                                <Label className="text-xs uppercase text-muted-foreground mb-2">Requestor's Note</Label>
                                <div className="text-sm border rounded-lg p-3">
                                  {req.notes || 'No notes provided'}
                                </div>
                              </div>

                              {/* Department's Note */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <Label className="text-xs uppercase text-muted-foreground">Your Notes</Label>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShowNotesMap(prev => ({
                                        ...prev,
                                        [req.id]: !prev[req.id]
                                      }));
                                      // Initialize notes when showing
                                      if (!showNotesMap[req.id]) {
                                        const currentNote = req.departmentNotes || notesMap[req.id] || '';
                                        setNotesMap(prev => ({
                                          ...prev,
                                          [req.id]: currentNote
                                        }));
                                      }
                                    }}
                                    className="h-7 px-2 text-xs"
                                  >
                                    {showNotesMap[req.id] ? 'Hide Notes' : (req.departmentNotes || notesMap[req.id] ? 'Edit Notes' : 'Add Notes')}
                                  </Button>
                                </div>
                                
                                {/* Display saved notes when not editing */}
                                {!showNotesMap[req.id] && (req.departmentNotes || notesMap[req.id]) && (
                                  <div className="text-sm border rounded-lg p-3 bg-muted/20">
                                    {req.departmentNotes || notesMap[req.id] || 'No notes provided'}
                                  </div>
                                )}
                                
                                {/* Editing interface */}
                                {showNotesMap[req.id] && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <div className="space-y-2">
                                      <Textarea
                                        placeholder="Add your notes about this requirement..."
                                        value={notesMap[req.id] || ''}
                                        onChange={(e) => {
                                          setNotesMap(prev => ({
                                            ...prev,
                                            [req.id]: e.target.value
                                          }));
                                        }}
                                        className="resize-none text-sm min-h-[80px]"
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
                                        >
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
                                        >
                                          Save Notes
                                        </Button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center gap-6 text-xs text-muted-foreground mt-4 pt-3 border-t">
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Last updated: {new Date(selectedEvent.submittedAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
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