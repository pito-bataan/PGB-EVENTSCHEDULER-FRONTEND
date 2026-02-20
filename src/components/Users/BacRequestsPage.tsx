import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useSocket, getGlobalSocket } from '@/hooks/useSocket';
import { Check, X, ChevronLeft, ChevronRight, Search, RefreshCw } from 'lucide-react';

type BacRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

type BacRequestRow = {
  id: string;
  eventId: string;
  requestorDepartment: string;
  requestorName: string;
  eventTitle: string;
  location: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  isMultiDay: boolean;
  dateTimeSlots?: Array<{ date: string; startTime: string; endTime: string }>;
  scheduleLabel: string;
  status: BacRequestStatus;
  submittedAtLabel: string;
};

const BacRequestsPage: React.FC = () => {
  const userDataStr = localStorage.getItem('userData');
  const userId = useMemo(() => {
    try {
      if (!userDataStr) return 'unknown';
      const parsed = JSON.parse(userDataStr);
      return String(parsed._id || parsed.id || 'unknown');
    } catch {
      return 'unknown';
    }
  }, [userDataStr]);

  const currentDepartment = useMemo(() => {
    try {
      if (!userDataStr) return '';
      const parsed = JSON.parse(userDataStr);
      return String(parsed.department || parsed.departmentName || '').trim();
    } catch {
      return '';
    }
  }, [userDataStr]);

  const isBAC = currentDepartment.toLowerCase() === 'bac';

  // Ensure socket joins this user's personal room
  useSocket(userId);

  const [query, setQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState<BacRequestStatus>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<BacRequestRow[]>([]);
  const [totals, setTotals] = useState({ pending: 0, approved: 0, rejected: 0, completed: 0 });

  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<BacRequestRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.eventTitle.toLowerCase().includes(q) ||
        r.requestorDepartment.toLowerCase().includes(q) ||
        r.requestorName.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q) ||
        r.scheduleLabel.toLowerCase().includes(q)
      );
    });
  }, [query, rows]);

  const totalPages = useMemo(() => {
    const totalForTab = totals[activeStatus] || 0;
    return Math.max(1, Math.ceil(totalForTab / itemsPerPage));
  }, [activeStatus, itemsPerPage, totals]);

  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const pendingCount = totals.pending;
  const approvedCount = totals.approved;
  const rejectedCount = totals.rejected;
  const completedCount = totals.completed;

  const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const formatTime12h = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    if (Number.isNaN(hour) || !minutes) return time;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const safeFormatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return format(d, 'MMM dd, yyyy');
  };

  const buildMultiDaySlots = (row: BacRequestRow) => {
    const slotsFromApi = Array.isArray(row.dateTimeSlots) ? row.dateTimeSlots : [];
    if (slotsFromApi.length > 0) return slotsFromApi;

    if (!row.startDate || !row.endDate) return [];
    const start = new Date(row.startDate);
    const end = new Date(row.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

    const out: Array<{ date: string; startTime: string; endTime: string }> = [];
    const d = new Date(start);
    d.setDate(d.getDate() + 1);
    while (d <= end) {
      out.push({
        date: d.toISOString().split('T')[0],
        startTime: row.startTime,
        endTime: row.endTime
      });
      d.setDate(d.getDate() + 1);
    }
    return out;
  };

  const formatScheduleLabel = (evt: any) => {
    const startDate = evt?.startDate ? String(evt.startDate).split('T')[0] : '';
    const endDate = evt?.endDate ? String(evt.endDate).split('T')[0] : '';
    const startTime = String(evt?.startTime || '');
    const endTime = String(evt?.endTime || '');
    if (!startDate || !startTime || !endDate || !endTime) return 'N/A';
    const startDateLabel = safeFormatDate(startDate);
    const endDateLabel = safeFormatDate(endDate);
    const startTimeLabel = formatTime12h(startTime);
    const endTimeLabel = formatTime12h(endTime);
    if (startDate === endDate) return `${startDateLabel} ${startTimeLabel} - ${endTimeLabel}`;
    return `${startDateLabel} ${startTimeLabel} - ${endDateLabel} ${endTimeLabel}`;
  };

  const formatSubmittedAtLabel = (evt: any) => {
    const submittedAt = evt?.submittedAt ? new Date(evt.submittedAt) : null;
    if (!submittedAt || Number.isNaN(submittedAt.getTime())) return 'N/A';
    return submittedAt.toLocaleString();
  };

  const mapEventToRow = (evt: any): BacRequestRow => {
    // First check if event status is completed
    const eventStatus = typeof evt?.status === 'string' ? evt.status.toLowerCase() : '';
    let status: BacRequestStatus;
    
    if (eventStatus === 'completed') {
      status = 'completed';
    } else {
      const bacStatusRaw = typeof evt?.bacApprovalStatus === 'string' ? evt.bacApprovalStatus.toLowerCase() : 'pending';
      status = (bacStatusRaw === 'approved' || bacStatusRaw === 'rejected') ? bacStatusRaw : 'pending';
    }

    const startDate = evt?.startDate ? String(evt.startDate).split('T')[0] : '';
    const endDate = evt?.endDate ? String(evt.endDate).split('T')[0] : '';
    const startTime = String(evt?.startTime || '');
    const endTime = String(evt?.endTime || '');
    const isMultiDay = Boolean(startDate && endDate && startDate !== endDate);
    const dateTimeSlots = Array.isArray(evt?.dateTimeSlots)
      ? evt.dateTimeSlots
          .map((s: any) => ({
            date: s?.date ? String(s.date).split('T')[0] : '',
            startTime: String(s?.startTime || ''),
            endTime: String(s?.endTime || ''),
          }))
          .filter((s: any) => s.date && s.startTime && s.endTime)
      : undefined;

    return {
      id: String(evt?._id || evt?.id || ''),
      eventId: String(evt?._id || evt?.id || ''),
      requestorDepartment: String(evt?.requestorDepartment || ''),
      requestorName: String(evt?.requestor || ''),
      eventTitle: String(evt?.eventTitle || 'Untitled'),
      location: String(evt?.location || ''),
      startDate,
      endDate,
      startTime,
      endTime,
      isMultiDay,
      dateTimeSlots,
      scheduleLabel: formatScheduleLabel(evt),
      status,
      submittedAtLabel: formatSubmittedAtLabel(evt)
    };
  };

  const fetchTotals = async () => {
    try {
      const [p, a, r, c] = await Promise.all([
        fetch(`${API_BASE_URL}/events/bac/requests?status=pending&page=1&limit=1`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/events/bac/requests?status=approved&page=1&limit=1`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/events/bac/requests?status=rejected&page=1&limit=1`, { headers: getAuthHeaders() }),
        fetch(`${API_BASE_URL}/events/bac/requests?status=completed&page=1&limit=1`, { headers: getAuthHeaders() })
      ]);

      const pj = await p.json().catch(() => null);
      const aj = await a.json().catch(() => null);
      const rj = await r.json().catch(() => null);
      const cj = await c.json().catch(() => null);

      setTotals({
        pending: typeof pj?.total === 'number' ? pj.total : 0,
        approved: typeof aj?.total === 'number' ? aj.total : 0,
        rejected: typeof rj?.total === 'number' ? rj.total : 0,
        completed: typeof cj?.total === 'number' ? cj.total : 0
      });
    } catch {
      setTotals({ pending: 0, approved: 0, rejected: 0, completed: 0 });
    }
  };

  const fetchPage = async (status: BacRequestStatus, page: number) => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/events/bac/requests?status=${encodeURIComponent(status)}&page=${page}&limit=${itemsPerPage}`;
      const resp = await fetch(url, { headers: getAuthHeaders() });
      const json = await resp.json();
      if (!resp.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to load BAC requests');
      }

      const mapped = Array.isArray(json.data) ? json.data.map(mapEventToRow) : [];
      setRows(mapped);
      setTotals((prev) => ({ ...prev, [status]: typeof json.total === 'number' ? json.total : prev[status] }));
    } catch (e: any) {
      setRows([]);
      toast.error('Failed to load BAC requests', { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchTotals();
    await fetchPage(activeStatus, safePage);
  };

  const submitDecision = async (eventId: string, decision: 'approved' | 'rejected', notes?: string) => {
    setSubmitting(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/events/${encodeURIComponent(eventId)}/bac-approval`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ decision, notes })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to update BAC decision');
      }

      toast.success(`BAC ${decision}`, { description: 'Decision recorded successfully.' });
      await refresh();
    } catch (e: any) {
      toast.error('Failed to update decision', { description: e?.message });
    } finally {
      setSubmitting(false);
    }
  };

  const openApprove = (row: BacRequestRow) => {
    setSelectedRow(row);
    setApproveOpen(true);
  };

  const openReject = (row: BacRequestRow) => {
    setSelectedRow(row);
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmApprove = async () => {
    if (!selectedRow) return;
    await submitDecision(selectedRow.eventId, 'approved');
    setApproveOpen(false);
    setSelectedRow(null);
  };

  const confirmReject = async () => {
    if (!selectedRow) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error('Rejection reason is required');
      return;
    }
    await submitDecision(selectedRow.eventId, 'rejected', reason);
    setRejectOpen(false);
    setSelectedRow(null);
    setRejectReason('');
  };

  useEffect(() => {
    if (!isBAC) return;
    setCurrentPage(1);
    fetchTotals();
    fetchPage('pending', 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBAC]);

  useEffect(() => {
    if (!isBAC) return;
    fetchPage(activeStatus, safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatus, safePage]);

  useEffect(() => {
    if (!isBAC) return;

    const socket = getGlobalSocket();
    if (!socket) return;

    const handleBacUpdated = () => {
      refresh();
    };

    const handleNewNotif = (data: any) => {
      const t = data?.notificationType || data?.type;
      if (t === 'bac-location-request') {
        refresh();
      }
    };

    socket.on('bac-request-updated', handleBacUpdated);
    socket.on('new-notification', handleNewNotif);

    return () => {
      socket.off('bac-request-updated', handleBacUpdated);
      socket.off('new-notification', handleNewNotif);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBAC, activeStatus, safePage]);

  if (!isBAC) {
    return <Navigate to="/users/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this request?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the BAC approval as approved for
              <span className="font-medium"> {selectedRow?.eventTitle || 'this event'}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove} disabled={submitting}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Reject this request</DialogTitle>
            <DialogDescription>
              Provide a rejection reason so admins can see why this BAC request was rejected.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900">Reason</div>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Type rejection reason..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRejectOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmReject} disabled={submitting}>
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BAC Location Requests</h1>
          <p className="text-sm text-gray-600">
            Review and manage event requests for{' '}
            <span className="font-medium">5th Flr. Training Room 1 (BAC)</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-amber-200/70 bg-gradient-to-br from-amber-50 via-amber-50/40 to-orange-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{pendingCount}</div>
            <p className="text-xs text-gray-500 mt-1">Needs BAC action</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-green-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{approvedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Approved by BAC</p>
          </CardContent>
        </Card>
        <Card className="border-rose-200/70 bg-gradient-to-br from-rose-50 via-rose-50/40 to-red-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{rejectedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Rejected by BAC</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200/70 bg-gradient-to-br from-gray-50 via-gray-50/40 to-slate-50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{completedCount}</div>
            <p className="text-xs text-gray-500 mt-1">Events completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Requests</CardTitle>
              <Badge variant="outline" className="text-xs">
                {activeStatus.toUpperCase()}
              </Badge>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
              <div className="relative w-full sm:w-[320px]">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                  }}
                  className="pl-9"
                  placeholder="Search requestor / title / schedule"
                />
              </div>

              <Select
                value={activeStatus}
                onValueChange={(value) => {
                  setActiveStatus(value as BacRequestStatus);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[190px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={() => refresh()}
                disabled={loading}
              >
                <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requestor</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-sm text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-sm text-gray-500">
                      No matching requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-gray-900">{row.requestorDepartment}</div>
                          <div className="text-xs text-gray-500">{row.requestorName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="font-medium text-gray-900">{row.eventTitle}</div>
                          <div className="text-xs text-gray-500">{row.location}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-700">
                        {row.isMultiDay ? (
                          <div className="flex items-center gap-2">
                            <span>
                              {safeFormatDate(row.startDate)} {formatTime12h(row.startTime)}
                            </span>
                            <HoverCard openDelay={200}>
                              <HoverCardTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer hover:bg-blue-200 whitespace-nowrap px-2 py-0"
                                >
                                  Multi-day
                                </Badge>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-72" side="right" align="start" sideOffset={6}>
                                <div className="space-y-2">
                                  <div className="text-[12px] font-semibold text-slate-900">Multi-Day Event Schedule</div>
                                  <div className="space-y-1.5 text-xs text-slate-700">
                                    <div>
                                      <span className="font-medium">Day 1:</span> {safeFormatDate(row.startDate)} at {formatTime12h(row.startTime)} - {formatTime12h(row.endTime)}
                                    </div>
                                    {buildMultiDaySlots(row).map((slot, idx) => (
                                      <div key={`${slot.date}-${idx}`}>
                                        <span className="font-medium">Day {idx + 2}:</span> {safeFormatDate(slot.date)} at {formatTime12h(slot.startTime)} - {formatTime12h(slot.endTime)}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          </div>
                        ) : (
                          <span>
                            {safeFormatDate(row.startDate)} {formatTime12h(row.startTime)} - {formatTime12h(row.endTime)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.status === 'pending' && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            Pending
                          </Badge>
                        )}
                        {row.status === 'approved' && (
                          <Badge className="bg-green-600">Approved</Badge>
                        )}
                        {row.status === 'rejected' && (
                          <Badge variant="destructive">Rejected</Badge>
                        )}
                        {row.status === 'completed' && (
                          <Badge className="bg-gray-600">Completed</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-gray-500">{row.submittedAtLabel}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => openApprove(row)}
                            disabled={row.status !== 'pending' || submitting}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8"
                            onClick={() => openReject(row)}
                            disabled={row.status !== 'pending' || submitting}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
            <p className="text-sm text-gray-600">
              Showing page <span className="font-medium">{safePage}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm text-gray-700">
                Page <span className="font-medium">{safePage}</span> / <span className="font-medium">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BacRequestsPage;
