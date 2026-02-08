import React, { useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useTaggedDepartmentsStore } from '@/stores/taggedDepartmentsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CalendarDays, CheckCircle, ChevronsUpDown, Clock, Edit3, MapPin, MessageSquare, Save, User, XCircle } from 'lucide-react';

type StatusFilter = 'all' | 'pending' | 'completed' | 'declined' | 'done' | 'cancelled';

type Requirement = {
  id: string;
  name: string;
  type: string;
  totalQuantity: number;
  quantity: number;
  notes?: string;
  departmentNotes?: string;
  status?: string;
  declineReason?: string;
  requirementsStatus?: 'on-hold' | 'released';
  yesNoAnswer?: 'yes' | 'no';
  isCustom?: boolean;
  replies?: Array<{
    userId: string;
    userName: string;
    role: 'requestor' | 'department';
    message: string;
    createdAt: string;
    isRead?: boolean;
  }>;
};

type Event = {
  _id: string;
  eventTitle: string;
  requestorDepartment: string;
  location: string;
  locations?: string[];
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  status: string;
  departmentRequirements: Record<string, Requirement[]>;
};

const API_BASE_URL = import.meta.env.VITE_API_URL;

export default function TaggedDepartmentTableView({ onBack }: { onBack: () => void }) {
  const {
    events,
    loading,
    fetchTaggedEvents,
    currentUserDepartment,
    updateRequirementStatus,
    updateRequirementNotes,
    showNotesMap,
    notesMap,
    setShowNotes,
    setNotes,
    getOngoingEvents,
    getCompletedEvents,
  } = useTaggedDepartmentsStore();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [monthFilter, setMonthFilter] = React.useState<'all' | string>('all');
  const [page, setPage] = React.useState(1);

  const [requirementsModal, setRequirementsModal] = React.useState<{ open: boolean; event: Event | null }>({
    open: false,
    event: null,
  });

  const [declineDialog, setDeclineDialog] = React.useState<{
    open: boolean;
    eventId: string;
    requirementId: string;
    requirementName: string;
  }>({ open: false, eventId: '', requirementId: '', requirementName: '' });

  const [declineReason, setDeclineReason] = React.useState('');

  const [replyDrafts, setReplyDrafts] = React.useState<{ [reqId: string]: string }>({});

  useEffect(() => {
    fetchTaggedEvents(false);
  }, [fetchTaggedEvents]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, monthFilter]);

  const getEventIdString = (event: Event) => {
    const anyEvent = event as any;
    return (anyEvent?._id ?? anyEvent?.id ?? '').toString();
  };

  const handleNoteSave = async (eventId: string, requirementId: string) => {
    try {
      await updateRequirementNotes(eventId, requirementId, notesMap[requirementId] || '');
      toast.success('Notes updated successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update notes');
    }
  };

  const handleSendReply = async (eventId: string, requirementId: string) => {
    const message = replyDrafts[requirementId]?.trim();
    if (!message) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.patch(
        `${API_BASE_URL}/api/events/${eventId}/requirements/${requirementId}/replies`,
        {
          message,
          role: 'department',
        },
        {
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.success) {
        await fetchTaggedEvents(true);
        setReplyDrafts((prev) => ({
          ...prev,
          [requirementId]: '',
        }));
        toast.success('Reply sent');
      } else {
        toast.error('Failed to send reply');
      }
    } catch (e) {
      toast.error('Failed to send reply');
    }
  };

  const toInvoiceId = (event: Event) => {
    const date = new Date(event.startDate);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const idSuffix = getEventIdString(event).slice(-6).toUpperCase();
    return `INV-${yyyy}${mm}${dd}-${idSuffix || '000000'}`;
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getRequirementStatus = (req: Requirement) => req.status || 'pending';

  const getUserDeptReqs = (event: Event) => event.departmentRequirements[currentUserDepartment] || [];

  const getCountsForEvent = (event: Event) => {
    const reqs = getUserDeptReqs(event);
    const total = reqs.length;
    const pending = reqs.filter(r => getRequirementStatus(r) === 'pending').length;
    const confirmed = reqs.filter(r => getRequirementStatus(r) === 'confirmed').length;
    const declined = reqs.filter(r => getRequirementStatus(r) === 'declined').length;
    return { total, pending, confirmed, declined, progressed: confirmed + declined };
  };

  const getEventGroup = (event: Event): Exclude<StatusFilter, 'all'> => {
    const st = String(event.status || '').toLowerCase();
    if (st === 'cancelled') return 'cancelled';

    const reqs = getUserDeptReqs(event);
    const total = reqs.length;
    const pending = reqs.filter(r => getRequirementStatus(r) === 'pending').length;
    const declined = reqs.filter(r => getRequirementStatus(r) === 'declined').length;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isDoneByStatus = st === 'completed';
    const isDoneByDate = new Date(event.endDate) < startOfToday;

    const isResolved = total > 0 && pending === 0 && declined < total;

    if (total > 0 && declined === total) return 'declined';
    if (isResolved && (isDoneByStatus || isDoneByDate)) return 'done';
    if (isResolved && !(isDoneByStatus || isDoneByDate)) return 'completed';

    return 'pending';
  };

  const baseList = useMemo(() => {
    if (statusFilter === 'pending') return getOngoingEvents() as unknown as Event[];
    if (statusFilter === 'completed') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return (getCompletedEvents() as unknown as Event[]).filter(e => {
        const st = String(e.status || '').toLowerCase();
        const isDoneByStatus = st === 'completed';
        const isDoneByDate = new Date(e.endDate) < startOfToday;
        return !(isDoneByStatus || isDoneByDate);
      });
    }
    if (statusFilter === 'declined') return (events as unknown as Event[]).filter(e => getEventGroup(e) === 'declined');
    if (statusFilter === 'done') return (events as unknown as Event[]).filter(e => getEventGroup(e) === 'done');
    if (statusFilter === 'cancelled') return (events as unknown as Event[]).filter(e => getEventGroup(e) === 'cancelled');
    return events as unknown as Event[];
  }, [events, statusFilter, currentUserDepartment, getOngoingEvents, getCompletedEvents]);

  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, string>();
    (events as unknown as Event[]).forEach((e) => {
      const d = new Date(e.startDate);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      monthMap.set(key, label);
    });

    return Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, label]) => ({ key, label }));
  }, [events]);

  const filteredList = useMemo(() => {
    const qRaw = search.trim();
    const q = qRaw.toLowerCase();
    const isSuffix6Query = /^[a-f0-9]{6}$/i.test(qRaw);

    const monthFiltered = monthFilter === 'all'
      ? baseList
      : baseList.filter((e) => {
          const d = new Date(e.startDate);
          if (Number.isNaN(d.getTime())) return false;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return key === monthFilter;
        });

    if (!q) return monthFiltered;

    return monthFiltered.filter(e => {
      const title = (e.eventTitle || '').toLowerCase();
      const fullId = getEventIdString(e).toLowerCase();
      const suffix6 = fullId.slice(-6);

      if (isSuffix6Query) return suffix6 === q;
      return title.includes(q) || fullId.includes(q) || suffix6.includes(q);
    });
  }, [baseList, search, monthFilter]);

  const monthAndSearchFilteredAllStatuses = useMemo(() => {
    const qRaw = search.trim();
    const q = qRaw.toLowerCase();
    const isSuffix6Query = /^[a-f0-9]{6}$/i.test(qRaw);

    const monthFiltered = monthFilter === 'all'
      ? (events as unknown as Event[])
      : (events as unknown as Event[]).filter((e) => {
          const d = new Date(e.startDate);
          if (Number.isNaN(d.getTime())) return false;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return key === monthFilter;
        });

    if (!q) return monthFiltered;

    return monthFiltered.filter((e) => {
      const title = (e.eventTitle || '').toLowerCase();
      const fullId = getEventIdString(e).toLowerCase();
      const suffix6 = fullId.slice(-6);

      if (isSuffix6Query) return suffix6 === q;
      return title.includes(q) || fullId.includes(q) || suffix6.includes(q);
    });
  }, [events, search, monthFilter]);

  const statusCounts = useMemo(() => {
    const init = {
      all: 0,
      pending: 0,
      completed: 0,
      declined: 0,
      done: 0,
      cancelled: 0,
    };

    const counts = { ...init };
    counts.all = monthAndSearchFilteredAllStatuses.length;

    monthAndSearchFilteredAllStatuses.forEach((e) => {
      const g = getEventGroup(e);
      counts[g] += 1;
    });

    return counts;
  }, [monthAndSearchFilteredAllStatuses, currentUserDepartment]);

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));
  const clampedPage = Math.min(page, totalPages);

  const pagedList = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, clampedPage]);

  const monthFilterLabel = useMemo(() => {
    if (monthFilter === 'all') return 'All Months';
    return availableMonths.find(m => m.key === monthFilter)?.label ?? monthFilter;
  }, [monthFilter, availableMonths]);

  const paginationItems = useMemo(() => {
    if (totalPages <= 1) return [] as Array<number | 'ellipsis'>;

    const items: Array<number | 'ellipsis'> = [];
    const add = (v: number | 'ellipsis') => {
      if (items[items.length - 1] === v) return;
      items.push(v);
    };

    add(1);

    const windowStart = Math.max(2, clampedPage - 1);
    const windowEnd = Math.min(totalPages - 1, clampedPage + 1);

    if (windowStart > 2) add('ellipsis');
    for (let p = windowStart; p <= windowEnd; p++) add(p);
    if (windowEnd < totalPages - 1) add('ellipsis');

    if (totalPages > 1) add(totalPages);

    return items;
  }, [totalPages, clampedPage]);

  const openRequirements = (event: Event) => {
    setRequirementsModal({ open: true, event });
  };

  const handleRequirementStatusChange = async (eventId: string, requirementId: string, status: 'confirmed' | 'declined', requirementName: string) => {
    if (status === 'declined') {
      setDeclineDialog({ open: true, eventId, requirementId, requirementName });
      setDeclineReason('');
      return;
    }

    try {
      await updateRequirementStatus(eventId, requirementId, status);
      toast.success('Requirement updated');
      await fetchTaggedEvents(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update requirement');
    }
  };

  const handleDeclineWithReason = async () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }

    try {
      await updateRequirementStatus(declineDialog.eventId, declineDialog.requirementId, 'declined', declineReason);
      toast.success('Requirement declined');
      setDeclineDialog({ open: false, eventId: '', requirementId: '', requirementName: '' });
      setDeclineReason('');
      await fetchTaggedEvents(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to decline requirement');
    }
  };

  const statusBadge = (event: Event) => {
    const group = getEventGroup(event);
    if (group === 'pending') return <Badge className="bg-yellow-500 text-white">pending</Badge>;
    if (group === 'completed') return <Badge className="bg-green-500 text-white">completed</Badge>;
    if (group === 'declined') return <Badge className="bg-red-500 text-white">declined</Badge>;
    if (group === 'done') return <Badge className="bg-gray-700 text-white">done</Badge>;
    return <Badge className="bg-yellow-700 text-white">cancelled</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AlertDialog open={declineDialog.open} onOpenChange={(open) => !open && setDeclineDialog({ open: false, eventId: '', requirementId: '', requirementName: '' })}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Decline requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a reason for declining <span className="font-semibold">{declineDialog.requirementName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Type your reason..." />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeclineWithReason}>Decline</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-3 md:p-4 lg:p-6 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">Tagged Events - Table View</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Same functionality, modern table UI.</p>
          </div>

          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3 md:gap-4 lg:gap-6 p-3 md:p-4 lg:p-6 pt-4 md:pt-6 lg:pt-8">
        <div className="w-full bg-muted/5 rounded-xl flex flex-col border overflow-hidden">
          <div className="p-4 bg-background/95 backdrop-blur-sm border-b">
            <div className="flex flex-col lg:flex-row gap-2 lg:items-center lg:justify-between">
              <div className="w-full lg:w-auto">
                <Input
                  className="w-full lg:w-[360px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search event title or ID..."
                />
              </div>
              <div className="flex gap-2 items-center justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      {monthFilterLabel}
                      <ChevronsUpDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-[280px] overflow-auto">
                    <DropdownMenuItem onClick={() => setMonthFilter('all')}>All Months</DropdownMenuItem>
                    {availableMonths.map((m) => (
                      <DropdownMenuItem key={m.key} onClick={() => setMonthFilter(m.key)}>
                        {m.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      {statusFilter === 'all' ? 'All Status' : statusFilter}
                      <ChevronsUpDown className="h-4 w-4 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span>All</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500 text-white">
                              {statusCounts.all}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>{statusCounts.all} events (current filters)</TooltipContent>
                        </Tooltip>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setStatusFilter('pending')}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span>Pending</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500 text-white">
                              {statusCounts.pending}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>{statusCounts.pending} pending events (current filters)</TooltipContent>
                        </Tooltip>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setStatusFilter('completed')}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span>Completed</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500 text-white">
                              {statusCounts.completed}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>{statusCounts.completed} completed events (current filters)</TooltipContent>
                        </Tooltip>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setStatusFilter('declined')}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span>Declined</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500 text-white">
                              {statusCounts.declined}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>{statusCounts.declined} declined events (current filters)</TooltipContent>
                        </Tooltip>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setStatusFilter('done')}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span>Done</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500 text-white">
                              {statusCounts.done}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>{statusCounts.done} done events (current filters)</TooltipContent>
                        </Tooltip>
                      </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span>Cancelled</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500 text-white">
                              {statusCounts.cancelled}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent sideOffset={6}>{statusCounts.cancelled} cancelled events (current filters)</TooltipContent>
                        </Tooltip>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Badge variant="outline" className="font-mono">
                  {filteredList.length} Events
                </Badge>
              </div>
            </div>
          </div>

          <div className="bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Event</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : pagedList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      No events found.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedList.map((event) => {
                    const counts = getCountsForEvent(event);
                    return (
                      <TableRow key={event._id}>
                        <TableCell className="pl-6">
                          <div className="space-y-1">
                            <div className="font-semibold truncate max-w-[320px]" title={event.eventTitle}>{event.eventTitle}</div>
                            <div className="text-xs text-muted-foreground font-mono">{toInvoiceId(event)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground min-w-[160px]">
                            {event.requestorDepartment || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2 min-w-[160px]">
                            <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div className="text-xs text-muted-foreground">
                              {event.locations && event.locations.length > 1 ? `${event.locations[0]} (+${event.locations.length - 1} more)` : event.location}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[190px]">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <CalendarDays className="h-4 w-4 text-blue-600" />
                              <span>
                                {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{statusBadge(event)}</TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground min-w-[120px]">
                            {counts.progressed}/{counts.total} updated
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Button size="sm" variant="outline" onClick={() => openRequirements(event)}>
                            Requirements
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {filteredList.length > pageSize && (
            <div className="p-3 border-t bg-background flex items-center justify-end">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(p => Math.max(1, p - 1));
                      }}
                    />
                  </PaginationItem>

                  {paginationItems.map((it, idx) => (
                    <PaginationItem key={`${it}-${idx}`}>
                      {it === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          href="#"
                          isActive={it === clampedPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(it);
                          }}
                        >
                          {it}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setPage(p => Math.min(totalPages, p + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={requirementsModal.open}
        onOpenChange={(open) => !open && setRequirementsModal({ open: false, event: null })}
      >
        <DialogContent className="bg-white max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tagged Requirements</DialogTitle>
            <DialogDescription>
              Review and confirm or decline the requirements for your department.
            </DialogDescription>
          </DialogHeader>

          {requirementsModal.event ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate" title={requirementsModal.event.eventTitle}>{requirementsModal.event.eventTitle}</div>
                  <div className="text-xs text-muted-foreground font-mono">{toInvoiceId(requirementsModal.event)}</div>
                </div>
                {statusBadge(requirementsModal.event)}
              </div>

              <Separator />

              <div className="space-y-3 max-h-[55vh] overflow-auto pr-2">
                {getUserDeptReqs(requirementsModal.event).map((req) => {
                  const st = getRequirementStatus(req);
                  return (
                    <div key={req.id} className="border rounded-lg p-3 bg-muted/5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="font-medium truncate" title={req.name}>{req.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {req.type === 'physical' ? `Quantity: ${req.quantity ?? req.totalQuantity ?? 0}` : req.type}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {st === 'confirmed' && (
                            <Badge className="bg-green-500 text-white gap-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              confirmed
                            </Badge>
                          )}
                          {st === 'pending' && (
                            <Badge className="bg-yellow-500 text-white gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              pending
                            </Badge>
                          )}
                          {st === 'declined' && (
                            <Badge className="bg-red-500 text-white gap-1">
                              <XCircle className="h-3.5 w-3.5" />
                              declined
                            </Badge>
                          )}
                        </div>
                      </div>

                      {st === 'declined' && req.declineReason ? (
                        <div className="mt-2 text-xs text-muted-foreground">Reason: {req.declineReason}</div>
                      ) : null}

                      <Separator className="my-3" />

                      {/* Requestor's Note/Answer */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <User className="h-3.5 w-3.5" />
                          {req.type === 'yesno' ? "Requestor's Answer" : "Requestor's Note"}
                        </Label>
                        <div className="bg-gray-50 rounded-md p-3 border">
                          <p className="text-sm text-gray-700 font-semibold">
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

                      {/* Department Notes + Conversation */}
                      <div className="space-y-2 mt-4">
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
                                onClick={async () => {
                                  await handleNoteSave(requirementsModal.event!._id, req.id);
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

                            {(req.departmentNotes || notesMap[req.id]) && (
                              <div className="space-y-2">
                                <Label className="text-xs font-medium flex items-center gap-1 text-gray-700">
                                  <MessageSquare className="h-3 w-3" />
                                  Conversation
                                </Label>
                                <div className="bg-white rounded-md border min-h-[180px] max-h-60 flex flex-col px-2 py-2 text-xs">
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
                                            <p className="leading-snug">{reply.message}</p>
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-[11px] text-gray-400 italic">No replies yet.</p>
                                    )}
                                  </div>

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
                                          setReplyDrafts((prev) => ({
                                            ...prev,
                                            [req.id]: e.target.value,
                                          }))
                                        }
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="h-8 px-3 text-[11px] bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                                        disabled={!replyDrafts[req.id]?.trim()}
                                        onClick={() => handleSendReply(requirementsModal.event!._id, req.id)}
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

                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={st === 'confirmed'}
                          onClick={() => handleRequirementStatusChange(requirementsModal.event!._id, req.id, 'confirmed', req.name)}
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={st === 'declined'}
                          onClick={() => handleRequirementStatusChange(requirementsModal.event!._id, req.id, 'declined', req.name)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequirementsModal({ open: false, event: null })}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
