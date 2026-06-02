import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import CustomCalendar, { type CalendarEvent } from '@/components/ui/custom-calendar';
import { MapPin, Calendar as CalendarIcon, RefreshCw, Sparkles, Users, Check, Ban, Building2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

type LocationAvailabilityRecord = {
  _id?: string;
  locationName: string;
  date: string;
  status: 'available' | 'unavailable' | string;
  setBy?: {
    username?: string;
  };
};

type LocationItem = {
  name: string;
  isCustom: boolean;
};

type EventRecord = {
  _id: string;
  eventTitle?: string;
  requestorDepartment?: string;
  location?: string;
  locations?: string[];
  multipleLocations?: boolean;
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  dateTimeSlots?: Array<{
    startDate: string;
    startTime: string;
    endDate?: string;
    endTime: string;
  }>;
  status?: string;
};

interface AutoSuggestedLocation {
  name: string;
  chairs: number;
  isMulti: boolean;
  rooms: string[];
  note?: string;
  isBooked: boolean;
  bookedOnDates: string[];
}

const LocationAvailabilityCalendarPage: React.FC = () => {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [records, setRecords] = useState<LocationAvailabilityRecord[]>([]);
  const [bookedDates, setBookedDates] = useState<Map<string, EventRecord[]>>(new Map());
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Auto-suggest states
  const [showAutoSuggestModal, setShowAutoSuggestModal] = useState(false);
  const [autoSuggestParticipants, setAutoSuggestParticipants] = useState('');
  const [suggestedLocations, setSuggestedLocations] = useState<AutoSuggestedLocation[]>([]);
  const [loadingAutoSuggest, setLoadingAutoSuggest] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [selectedComboRooms, setSelectedComboRooms] = useState<string[]>([]); // Track multi-room combo

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const normalizeLocationName = (name: string) => {
    if (!name) return name;
    if (name.startsWith('Bookings for ')) return name.replace('Bookings for ', '');
    return name;
  };

  const fetchAllAvailability = async () => {
    const response = await axios.get(`${API_BASE_URL}/location-availability`, {
      headers: getAuthHeaders()
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Failed to fetch location availability');
    }

    return (response.data.data || []) as LocationAvailabilityRecord[];
  };

  const fetchAllEvents = async () => {
    const response = await axios.get(`${API_BASE_URL}/events`, {
      headers: getAuthHeaders()
    });

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Failed to fetch events');
    }

    return (response.data.data || []) as EventRecord[];
  };

  // Same idea as RequestEventPage locationsConflict: handle Pavilion sections + Conference room hierarchy
  const locationsConflict = (loc1: string, loc2: string): boolean => {
    if (!loc1 || !loc2) return false;
    if (loc1 === loc2) return true;

    const isPavilion1 = loc1.includes('Pavilion');
    const isPavilion2 = loc2.includes('Pavilion');

    if (isPavilion1 && isPavilion2) {
      const getHall = (loc: string) => {
        if (loc.includes('Kagitingan')) return 'Kagitingan';
        if (loc.includes('Kalayaan')) return 'Kalayaan';
        return null;
      };

      const hall1 = getHall(loc1);
      const hall2 = getHall(loc2);
      if (hall1 !== hall2) return false;

      const isEntire1 = loc1.includes('(Entire)');
      const isEntire2 = loc2.includes('(Entire)');
      if (isEntire1 || isEntire2) return true;
      return loc1 === loc2;
    }

    const isConferenceRoom1 = loc1.includes('Conference Room');
    const isConferenceRoom2 = loc2.includes('Conference Room');

    if (isConferenceRoom1 && isConferenceRoom2) {
      // If either is "(Entire)", they conflict with any conference room
      const isEntire1 = loc1.includes('(Entire)');
      const isEntire2 = loc2.includes('(Entire)');
      if (isEntire1 || isEntire2) return true;

      // Otherwise, check if they're the same specific room
      return loc1 === loc2;
    }

    return false;
  };

  const toYmd = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getEventSlotForDate = (evt: EventRecord, dateYmd: string) => {
    const startDateYmd = evt.startDate ? toYmd(new Date(evt.startDate)) : '';
    if (startDateYmd && startDateYmd === dateYmd) {
      return {
        startDate: evt.startDate || dateYmd,
        endDate: evt.endDate || evt.startDate || dateYmd,
        startTime: evt.startTime || 'N/A',
        endTime: evt.endTime || 'N/A'
      };
    }

    const slot = evt.dateTimeSlots?.find((s) => {
      const slotYmd = s?.startDate ? toYmd(new Date(s.startDate)) : '';
      return slotYmd === dateYmd;
    });

    if (slot) {
      return {
        startDate: slot.startDate,
        endDate: slot.endDate || slot.startDate,
        startTime: slot.startTime || 'N/A',
        endTime: slot.endTime || 'N/A'
      };
    }

    return {
      startDate: evt.startDate || dateYmd,
      endDate: evt.endDate || evt.startDate || dateYmd,
      startTime: evt.startTime || 'N/A',
      endTime: evt.endTime || 'N/A'
    };
  };

  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      const all = await fetchAllAvailability();

      const locationMap = new Map<string, LocationItem>();
      all.forEach((item) => {
        const locationName = normalizeLocationName(item.locationName);
        if (!locationMap.has(locationName)) {
          const isCustomLocation = item.setBy?.username !== 'event.pgso';
          locationMap.set(locationName, { name: locationName, isCustom: isCustomLocation });
        }
      });

      const uniqueLocations = Array.from(locationMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setLocations(uniqueLocations);

      // Keep current selection if still valid
      if (selectedLocation && uniqueLocations.some((l) => l.name === selectedLocation)) {
        return;
      }

      // Auto-select first location for better UX
      if (uniqueLocations.length > 0) {
        setSelectedLocation(uniqueLocations[0].name);
      }
    } catch (error: any) {
      toast.error('Failed to load locations', {
        description: error?.message || 'Please try again.'
      });
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const loadCalendarForLocation = async (locationName: string) => {
    if (!locationName) {
      setRecords([]);
      setBookedDates(new Map());
      return;
    }

    setLoadingCalendar(true);
    try {
      const [allAvailability, allEvents] = await Promise.all([
        fetchAllAvailability(),
        fetchAllEvents()
      ]);

      const filtered = allAvailability
        .map((r) => ({ ...r, locationName: normalizeLocationName(r.locationName) }))
        .filter((r) => r.locationName === locationName);

      // Build a date -> events map for this location
      const bookingMap = new Map<string, EventRecord[]>();
      allEvents.forEach((evt) => {
        const status = (evt.status || '').toLowerCase();
        if (status !== 'approved' && status !== 'submitted') return;
        if (!evt.startDate) return;

        const eventLocations = evt.multipleLocations && Array.isArray(evt.locations) && evt.locations.length > 0
          ? evt.locations
          : (evt.location ? [evt.location] : []);

        // If a multi-room combo is selected, check if event conflicts with ANY room in the combo
        const locationsToCheck = selectedComboRooms.length > 0 ? selectedComboRooms : [locationName];
        
        const hasLocationConflict = eventLocations.some((eventLoc) =>
          locationsToCheck.some((checkLoc) => locationsConflict(eventLoc, checkLoc))
        );
        
        if (!hasLocationConflict) return;

        const addBooking = (dateStr: string) => {
          const existing = bookingMap.get(dateStr) || [];
          bookingMap.set(dateStr, [...existing, evt]);
        };

        // Day 1
        addBooking(toYmd(new Date(evt.startDate)));

        // Multi-day slots
        if (evt.dateTimeSlots && Array.isArray(evt.dateTimeSlots)) {
          evt.dateTimeSlots.forEach((slot) => {
            if (!slot.startDate) return;
            addBooking(toYmd(new Date(slot.startDate)));
          });
        }
      });

      setRecords(filtered);
      setBookedDates(bookingMap);
    } catch (error: any) {
      toast.error('Failed to load availability', {
        description: error?.message || 'Please try again.'
      });
      setRecords([]);
      setBookedDates(new Map());
    } finally {
      setLoadingCalendar(false);
    }
  };

  useEffect(() => {
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedLocation) return;
    loadCalendarForLocation(selectedLocation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]);

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    const uniqueByDate = new Map<string, LocationAvailabilityRecord>();
    records.forEach((r) => {
      const dateObj = new Date(r.date);
      const key = toYmd(dateObj);
      // Prefer a record explicitly set as unavailable/available; last write wins by default
      uniqueByDate.set(key, r);
    });

    const result: CalendarEvent[] = [];

    // Render bookings first so they visually stand out (and we can override availability)
    bookedDates.forEach((eventsForDate, date) => {
      eventsForDate.forEach((evt) => {
        const locationDisplay = evt.multipleLocations && evt.locations && evt.locations.length > 0
          ? evt.locations.join(', ')
          : (evt.location || selectedLocation);

        const slot = getEventSlotForDate(evt, date);
        const status = evt.status || 'Booked';
        const department = evt.requestorDepartment || 'N/A';
        const dateTimeSlotsInfo = evt.dateTimeSlots && evt.dateTimeSlots.length > 0
          ? ' | DateTimeSlots: ' + JSON.stringify(evt.dateTimeSlots)
          : '';

        result.push({
          id: `${evt._id}-${date}`,
          date,
          title: evt.eventTitle || 'Booked',
          type: 'booking',
          notes: `Event: ${evt.eventTitle || evt._id} | Department: ${department} | Location: ${locationDisplay} | Status: ${status} | StartDate: ${slot.startDate} | EndDate: ${slot.endDate} | StartTime: ${slot.startTime} | EndTime: ${slot.endTime}${dateTimeSlotsInfo}`
        });
      });
    });

    // Render availability/unavailability only if there is no booking for that date
    Array.from(uniqueByDate.entries()).forEach(([date, r]) => {
      if (bookedDates.has(date)) return;
      const isAvailable = r.status === 'available';
      result.push({
        id: `${r.locationName}-${date}`,
        date,
        title: isAvailable ? 'Available' : 'Unavailable',
        type: isAvailable ? 'available' : 'unavailable',
        notes: `Location: ${r.locationName} | Status: ${r.status}`
      });
    });

    return result;
  }, [records, bookedDates, selectedLocation]);

  const availableCount = useMemo(
    () => calendarEvents.filter((e) => e.type === 'available').length,
    [calendarEvents]
  );

  const unavailableCount = useMemo(
    () => calendarEvents.filter((e) => e.type === 'unavailable').length,
    [calendarEvents]
  );

  const bookedCount = useMemo(
    () => calendarEvents.filter((e) => e.type === 'booking').length,
    [calendarEvents]
  );

  // Auto-suggest: Find suitable venues based on PAX
  const handleFindSuitableVenues = async () => {
    const count = parseInt(autoSuggestParticipants);
    if (!count || count < 1) {
      toast.error('Please enter a valid number of participants');
      return;
    }

    setLoadingAutoSuggest(true);
    setSuggestedLocations([]);
    setSelectedSuggestion(null);

    try {
      const results: AutoSuggestedLocation[] = [];

      // Helper: Extract chair count from location name
      const extractChairs = (loc: string) => {
        const match = loc.match(/(\d+)\s*chairs?/i);
        return match ? parseInt(match[1]) : 0;
      };

      // 1) Single locations (Atrium, Grand Lobby, etc.)
      const singleLocations = [
        'Atrium',
        'Grand Lobby Entrance',
        'Main Entrance Lobby',
        'Main Entrance Leasable Area',
        'Bataan People\'s Center',
        'Capitol Quadrangle',
        '1BOSSCO',
        'Emiliana Hall'
      ];

      singleLocations.forEach((loc) => {
        const chairs = extractChairs(loc);
        if (chairs >= count) {
          results.push({
            name: loc,
            chairs,
            isMulti: false,
            rooms: [loc],
            isBooked: false,
            bookedOnDates: []
          });
        }
      });

      // 2) 4th Floor Conference Rooms (combinable)
      const CR = [
        '4th Flr. Conference Room 1',
        '4th Flr. Conference Room 2',
        '4th Flr. Conference Room 3'
      ];

      const crChairs: Record<string, number> = {
        '4th Flr. Conference Room 1': 30,
        '4th Flr. Conference Room 2': 30,
        '4th Flr. Conference Room 3': 30
      };

      // Generate all combinations
      for (let mask = 1; mask < (1 << CR.length); mask++) {
        const combo: string[] = [];
        CR.forEach((r, i) => { if (mask & (1 << i)) combo.push(r); });
        const totalChairs = combo.reduce((sum, r) => sum + (crChairs[r] || 0), 0);
        if (totalChairs < count) continue;

        const isAllThree = combo.length === CR.length;
        const label = isAllThree
          ? '4th Flr. Conference Room (Entire)'
          : combo.length === 1 ? combo[0] : combo.join(' + ');

        if (results.some((r) => r.name === label)) continue;

        results.push({
          name: label,
          chairs: totalChairs,
          isMulti: combo.length > 1,
          rooms: combo,
          note: combo.length > 1
            ? `${combo.map((r) => r.replace('4th Flr. Conference Room ', 'CR')).join(' + ')} · ${totalChairs} chairs`
            : undefined,
          isBooked: false,
          bookedOnDates: []
        });
      }

      // 3) Pavilion - Kagitingan Hall sections (combinable, shared pool of 450 chairs)
      const KAGITINGAN_SECTIONS = [
        'Pavilion - Kagitingan Hall - Section A',
        'Pavilion - Kagitingan Hall - Section B',
        'Pavilion - Kagitingan Hall - Section C'
      ];

      const pavilionPoolChairs = 450;

      for (let mask = 1; mask < (1 << KAGITINGAN_SECTIONS.length); mask++) {
        const combo: string[] = [];
        KAGITINGAN_SECTIONS.forEach((s, i) => { if (mask & (1 << i)) combo.push(s); });

        const isAllSections = combo.length === KAGITINGAN_SECTIONS.length;
        const label = isAllSections
          ? 'Pavilion - Kagitingan Hall (Entire)'
          : combo.length === 1
            ? combo[0]
            : combo.map((s) => s.replace('Pavilion - Kagitingan Hall - ', '')).join(' + ') + ' (Kagitingan Hall)';

        if (results.some((r) => r.name === label)) continue;

        results.push({
          name: label,
          chairs: pavilionPoolChairs,
          isMulti: combo.length > 1,
          rooms: combo,
          note: combo.length > 1
            ? `${combo.map((s) => s.replace('Pavilion - Kagitingan Hall - ', '')).join(' + ')} · ${pavilionPoolChairs} chairs available (shared pool)`
            : `${pavilionPoolChairs} chairs available (shared pool)`,
          isBooked: false,
          bookedOnDates: []
        });
      }

      // Sort by chair count (smallest that fits first)
      results.sort((a, b) => a.chairs - b.chairs);

      setSuggestedLocations(results);
    } catch (error) {
      console.error('Auto suggest error:', error);
      toast.error('Failed to find suitable venues. Please try again.');
    } finally {
      setLoadingAutoSuggest(false);
    }
  };

  // Apply chosen suggestion
  const applyAutoSuggestion = (sug: AutoSuggestedLocation) => {
    setSelectedSuggestion(sug.name);
    setShowAutoSuggestModal(false);

    // Track the combo rooms so we can show bookings for ALL rooms in the combo
    if (sug.isMulti) {
      setSelectedComboRooms(sug.rooms);
    } else {
      setSelectedComboRooms([]);
    }

    // Select the first room to load its calendar
    const primaryLocation = sug.rooms[0];
    setSelectedLocation(primaryLocation);

    if (sug.isMulti) {
      toast.success(`Viewing availability for: ${sug.name}`, {
        description: `Showing bookings for all rooms in this combo.`
      });
    } else {
      toast.success(`Viewing availability for: ${sug.name}`);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <Card className="shadow-lg">
        <CardContent className="p-6 space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-blue-600" />
                Location Availability
              </h1>
              <p className="text-sm text-muted-foreground">
                Select a location to view its available/unavailable dates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowAutoSuggestModal(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Find Suitable Venues
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  loadLocations();
                  if (selectedLocation) loadCalendarForLocation(selectedLocation);
                }}
                disabled={loadingLocations || loadingCalendar}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Location</label>
              <Select value={selectedLocation} onValueChange={(value) => {
                setSelectedLocation(value);
                setSelectedComboRooms([]); // Reset combo when manually selecting
              }}>
                <SelectTrigger className="w-full" disabled={loadingLocations || locations.length === 0}>
                  <SelectValue placeholder={loadingLocations ? 'Loading locations...' : 'Select location'} />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {locations.map((loc) => (
                    <SelectItem key={loc.name} value={loc.name}>
                      <div className="flex items-center justify-between w-full">
                        <span className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          {loc.name}
                        </span>
                        {loc.isCustom && (
                          <Badge variant="secondary" className="ml-2">
                            Custom
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-green-100 text-green-800 border border-green-200">Available: {availableCount}</Badge>
                <Badge className="bg-red-100 text-red-800 border border-red-200">Unavailable: {unavailableCount}</Badge>
                <Badge className="bg-purple-100 text-purple-800 border border-purple-200">Booked: {bookedCount}</Badge>
              </div>
            </div>
          </div>

          {loadingCalendar ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading calendar...</span>
            </div>
          ) : (
            <CustomCalendar
              events={calendarEvents}
              onDateClick={(date) => {
                const ymd = date.toLocaleDateString('en-CA');
                const dayEvents = calendarEvents.filter((e) => e.date === ymd);

                if (!selectedLocation) {
                  toast.info('Select a location first');
                  return;
                }

                if (dayEvents.length === 0) {
                  toast.info('No availability record', {
                    description: `${selectedLocation} has no availability record set for ${ymd}.`
                  });
                  return;
                }

                const primary = dayEvents[0];
                if (primary.type === 'booking') {
                  const eventsForDate = bookedDates.get(ymd) || [];
                  toast.info(`${selectedLocation} — Booked`, {
                    description: eventsForDate.length > 0
                      ? `Date: ${ymd} | ${eventsForDate.map(e => e.eventTitle || e._id).join(', ')}`
                      : `Date: ${ymd}`
                  });
                  return;
                }

                toast.info(`${selectedLocation} — ${primary.title}`, {
                  description: `Date: ${ymd}`
                });
              }}
              showNavigation={true}
              showLegend={true}
              cellHeight="min-h-[130px]"
              showEventCount={false}
              isSelectionMode={false}
              selectedDates={[]}
            />
          )}
        </CardContent>
      </Card>

      {/* Auto-Suggest Modal */}
      <Dialog open={showAutoSuggestModal} onOpenChange={setShowAutoSuggestModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-600" />
              Find Suitable Venues
            </DialogTitle>
            <DialogDescription>
              Enter the number of participants to see available venues that can accommodate them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Participants Input */}
            <div>
              <Label htmlFor="participants" className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4" />
                PARTICIPANTS *
              </Label>
              <Input
                id="participants"
                type="number"
                min="1"
                placeholder="Enter number of participants"
                value={autoSuggestParticipants}
                onChange={(e) => setAutoSuggestParticipants(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFindSuitableVenues();
                  }
                }}
              />
            </div>

            {/* Find Button */}
            <Button
              onClick={handleFindSuitableVenues}
              disabled={loadingAutoSuggest || !autoSuggestParticipants}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {loadingAutoSuggest ? 'Searching...' : 'Find Suitable Venues'}
            </Button>

            {/* Results Summary */}
            {suggestedLocations.length > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline" className="gap-1">
                  <Building2 className="w-3 h-3 text-violet-600" />
                  {suggestedLocations.length} venues found
                </Badge>
                <span className="text-muted-foreground">
                  for {autoSuggestParticipants} participants
                </span>
              </div>
            )}

            {/* Suggested Locations */}
            {suggestedLocations.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {suggestedLocations.map((sug) => (
                  <button
                    key={sug.name}
                    type="button"
                    onClick={() => applyAutoSuggestion(sug)}
                    className={`w-full text-left rounded-xl border transition-all duration-150 group ${
                      selectedSuggestion === sug.name
                        ? 'border-violet-400 bg-violet-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-sm cursor-pointer'
                    } p-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
                          <h4 className="font-semibold text-gray-900 truncate">
                            {sug.name}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {sug.chairs} seats
                          </span>
                          {sug.isMulti && (
                            <>
                              <span className="text-gray-300 text-xs">·</span>
                              <Badge variant="secondary" className="text-xs">
                                Multi-room
                              </Badge>
                            </>
                          )}
                        </div>

                        {sug.note && (
                          <p className="text-xs text-gray-500 mt-1">{sug.note}</p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {selectedSuggestion === sug.name ? (
                          <div className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-violet-400 transition-colors" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loadingAutoSuggest && suggestedLocations.length === 0 && autoSuggestParticipants && (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No suitable venues found for {autoSuggestParticipants} participants.</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting the number of participants.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationAvailabilityCalendarPage;
