import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CustomCalendar, { type CalendarEvent } from '@/components/ui/custom-calendar';
import { MapPin, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
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

const LocationAvailabilityCalendarPage: React.FC = () => {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [records, setRecords] = useState<LocationAvailabilityRecord[]>([]);
  const [bookedDates, setBookedDates] = useState<Map<string, EventRecord[]>>(new Map());
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

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
      const getBaseRoom = (loc: string) => {
        const match = loc.match(/(.+Conference Room)\s*\d+/);
        if (match) return match[1].trim();
        return loc.trim();
      };

      const baseRoom1 = getBaseRoom(loc1);
      const baseRoom2 = getBaseRoom(loc2);
      if (baseRoom1 !== baseRoom2) return false;
      return true;
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

        const hasLocationConflict = eventLocations.some((eventLoc) =>
          locationsConflict(eventLoc, locationName)
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
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
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
    </div>
  );
};

export default LocationAvailabilityCalendarPage;
