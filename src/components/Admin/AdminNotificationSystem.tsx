import { useEffect, useState, useRef } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { CalendarClock, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getGlobalSocket } from '@/hooks/useSocket'
import { useAllEventsStore } from '@/stores/allEventsStore'

// Global Admin Notification System
export default function AdminNotificationSystem() {
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());
  const processedEventsRef = useRef<Set<string>>(new Set()); // Track processed events to prevent duplicates

  const adminUserIdRef = useRef<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Setup Socket.IO listeners for admin notifications
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    let isSetup = false;

    const setupSocketListeners = () => {
      if (isSetup) return; // Prevent duplicate setup
      
      const socket = getGlobalSocket();
      
      if (!socket) {
        console.log(`❌ AdminNotificationSystem: Socket not available (retry ${retryCount}/${maxRetries})`);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(setupSocketListeners, 1000);
        }
        return;
      }

      // Wait for socket to be connected before adding listeners
      if (!socket.connected) {
        console.log('⏳ AdminNotificationSystem: Waiting for socket to connect...');
        socket.once('connect', () => {
          console.log('✅ AdminNotificationSystem: Socket connected, now setting up listeners');
          setupSocketListeners();
        });
        return;
      }

      console.log('✅ AdminNotificationSystem: Setting up socket listeners for event-created, event-updated, event-status-updated');
      console.log('📊 Socket connection status:', {
        connected: socket.connected,
        id: socket.id
      });

      // IMPORTANT: join admin's personal room so backend can target io.to(`user-<adminId>`)
      // (AdminNotificationSystem uses getGlobalSocket directly, so it must join manually)
      if (!adminUserIdRef.current) {
        try {
          const userData = localStorage.getItem('userData');
          if (userData) {
            const parsed = JSON.parse(userData);
            adminUserIdRef.current = parsed?._id || parsed?.id || null;
          }
        } catch (e) {
          adminUserIdRef.current = null;
        }
      }

      if (adminUserIdRef.current) {
        socket.emit('join-user-room', adminUserIdRef.current);
      }

      // Use onAny to catch all events and handle them directly
      socket.onAny((eventName, ...args) => {
        console.log('🔍 Caught event via onAny:', eventName, args);
        
        if (eventName === 'new-notification') {
          const data = args[0] || {};
          const notificationType = data.notificationType || data.type;

          if (notificationType === 'event-rescheduled') {
            const now = Date.now();
            const eventId = data.eventId || data._id;
            const eventTitle = data.eventTitle || data.title || 'Event';
            const department = data.requestorDepartment || data.department || 'Unknown Department';
            const oldSchedule = data.oldSchedule || '';
            const newSchedule = data.newSchedule || '';

            const notificationId = `admin-event-rescheduled-${eventId}-${data.timestamp ? new Date(data.timestamp).getTime() : now}`;

            if (!Array.from(shownNotifications).includes(notificationId)) {
              setShownNotifications(prev => new Set([...prev, notificationId]));

              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  const notification = new Notification('🗓️ Event Rescheduled', {
                    body: `${eventTitle}\nDepartment: ${department}\n${newSchedule || 'Schedule updated'}`,
                    icon: `${window.location.origin}/images/bataanlogo.png`,
                    badge: `${window.location.origin}/images/bataanlogo.png`,
                    tag: 'event-rescheduled-' + String(eventId || 'unknown'),
                    requireInteraction: false
                  });
                  setTimeout(() => notification.close(), 15000);
                } catch (e) {
                  console.error('❌ Notification failed:', e);
                }
              }

              toast.custom((t) => (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="bg-white rounded-xl shadow-2xl overflow-hidden w-80 cursor-pointer hover:shadow-3xl transition-all duration-200 border border-gray-100"
                  onClick={() => {
                    toast.dismiss(t);
                    window.location.href = '/admin/all-events';
                  }}
                >
                  <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <CalendarClock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">Event Rescheduled</h3>
                        <p className="text-amber-100 text-xs">Just now</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 space-y-3">
                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Event</p>
                      <p className="text-gray-900 font-bold text-base mt-1">{eventTitle}</p>
                    </div>

                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Department</p>
                      <p className="text-gray-700 text-sm mt-1">{department}</p>
                    </div>

                    {(oldSchedule || newSchedule) && (
                      <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Schedule</p>
                        {oldSchedule && (
                          <p className="text-gray-700 text-sm mt-1">From: {oldSchedule}</p>
                        )}
                        {newSchedule && (
                          <p className="text-gray-700 text-sm mt-1">To: {newSchedule}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Click to review</span>
                    <Badge className="text-xs bg-amber-600 hover:bg-amber-700 text-white">Review</Badge>
                  </div>
                </motion.div>
              ), {
                id: notificationId,
                duration: Infinity,
                position: 'bottom-right',
              });
            }
          }
        } else if (eventName === 'event-created') {
          const data = args[0];
          
          // Prevent duplicate processing of the same event
          const eventId = data._id;
          if (processedEventsRef.current.has(eventId)) {
            console.log('⏭️ Event already processed, skipping:', eventId);
            return;
          }
          
          // Mark this event as processed
          processedEventsRef.current.add(eventId);
          
          console.log('🎉 AdminNotificationSystem: Received event-created event!');
          console.log('📋 AdminNotificationSystem: Event data:', data);
          
          // Add new event to store immediately for real-time display
          useAllEventsStore.setState((state) => {
            if (!state.events.find(e => e._id === data._id)) {
              return { events: [data, ...state.events] };
            }
            return state;
          });
          
          // Show push notification for new submitted events
          if (data.status?.toLowerCase() === 'submitted') {
            const eventTitle = data.title || data.eventTitle || 'New Event';
            const requestor = data.requestor || data.createdBy || 'Unknown';
            const department = data.requestorDepartment || data.department || data.departmentName || 'Unknown Department';
            
            // Format date and time properly
            let eventDate = 'TBD';
            let eventTime = '';
            if (data.startDate) {
              try {
                const dateObj = new Date(data.startDate);
                const dateStr = dateObj.toISOString().split('T')[0];
                const [year, month, day] = dateStr.split('-');
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                eventDate = `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
              } catch (e) {
                eventDate = 'TBD';
              }
            }
            if (data.startTime) {
              eventTime = data.startTime;
            }
            
            const formattedDateTime = eventTime ? `${eventDate} at ${eventTime}` : eventDate;
            
            console.log('🔔 Showing notification for submitted event:', eventTitle);
            
            // Show browser notification
            console.log('🔔 Checking notification permission:', {
              available: 'Notification' in window,
              permission: 'Notification' in window ? Notification.permission : 'N/A'
            });
            
            if ('Notification' in window) {
              if (Notification.permission === 'granted') {
                try {
                  const notification = new Notification('📋 New Event Submitted', {
                    body: `${eventTitle}\nBy: ${requestor}\nDepartment: ${department}\n${formattedDateTime}`,
                    icon: `${window.location.origin}/images/bataanlogo.png`,
                    badge: `${window.location.origin}/images/bataanlogo.png`,
                    tag: 'new-event-' + data._id,
                    requireInteraction: false
                  });
                  
                  console.log('✅ Browser notification shown');
                  // Auto-close push notification after 15 seconds
                  setTimeout(() => notification.close(), 15000);
                } catch (e) {
                  console.error('❌ Notification failed:', e);
                }
              } else if (Notification.permission === 'denied') {
                console.warn('⚠️ Notification permission denied by user');
              } else if (Notification.permission === 'default') {
                console.warn('⚠️ Notification permission not yet requested');
              }
            } else {
              console.warn('⚠️ Notifications not available in this browser');
            }
            
            // Show toast notification directly
            const now = Date.now();
            const notificationId = `admin-event-${data._id}-${now}`;
            
            if (!Array.from(shownNotifications).includes(notificationId)) {
              setShownNotifications(prev => new Set([...prev, notificationId]));
              
              toast.custom((t) => (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="bg-white rounded-xl shadow-2xl overflow-hidden w-80 cursor-pointer hover:shadow-3xl transition-all duration-200 border border-gray-100"
                  onClick={() => {
                    toast.dismiss(t);
                    window.location.href = '/admin/all-events';
                  }}
                >
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">New Event Submitted</h3>
                        <p className="text-blue-100 text-xs">Just now</p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 space-y-3">
                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Event</p>
                      <p className="text-gray-900 font-bold text-base mt-1">{eventTitle}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Requestor</p>
                        <p className="text-gray-700 text-sm mt-1">{requestor}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Department</p>
                        <p className="text-gray-700 text-sm mt-1">{department}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Scheduled</p>
                      <p className="text-gray-700 text-sm mt-1">{formattedDateTime}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Click to view details</span>
                    <Badge className="text-xs bg-blue-600 hover:bg-blue-700 text-white">View Event</Badge>
                  </div>
                </motion.div>
              ), {
                id: notificationId,
                duration: Infinity, // Never auto-close - admin must click to dismiss
                position: 'bottom-right',
              });
            }
          }
        } else if (eventName === 'event-updated') {
          const data = args[0];
          console.log('📋 AdminNotificationSystem: Received event-updated:', data);
          useAllEventsStore.setState((state) => {
            const events = state.events.map(e => e._id === data._id ? data : e);
            return { events };
          });
        } else if (eventName === 'event-status-updated') {
          const data = args[0];
          console.log('📋 AdminNotificationSystem: Received event-status-updated:', data);
          if (data._id && data.status) {
            useAllEventsStore.setState((state) => {
              const events = state.events.map(e => e._id === data._id ? { ...e, status: data.status } : e);
              return { events };
            });
          }
        }
      });

      isSetup = true;
      console.log('✅ AdminNotificationSystem: Socket listeners attached successfully');
      console.log('📋 Total listeners on socket:', socket.listeners('event-created').length);
    };

    setupSocketListeners();

    return () => {
      // Don't remove listeners on unmount - keep them active globally
    };
  }, []);


  return null; // This component doesn't render anything visible
}
