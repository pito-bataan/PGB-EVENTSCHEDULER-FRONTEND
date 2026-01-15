import { useEffect, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSocket } from '@/hooks/useSocket'

// Global AudioContext for notification sounds
let globalAudioContext: AudioContext | null = null;
let audioInitialized = false;

// Initialize AudioContext on first user interaction
const initializeAudioContext = async () => {
  if (!globalAudioContext) {
    try {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.error('❌ [AUDIO] Failed to create AudioContext:', error);
      return false;
    }
  }
  
  if (globalAudioContext) {
    if (globalAudioContext.state === 'suspended') {
      try {
        await globalAudioContext.resume();
      } catch (error) {
        console.error('❌ [AUDIO] Failed to resume AudioContext:', error);
        return false;
      }
    }
    
    // Check final state
    audioInitialized = globalAudioContext.state === 'running';
    return audioInitialized;
  }
  
  return false;
};

// Global notification sound function with fallback
const playGlobalNotificationSound = async (title: string = 'New Event Notification', body: string = 'You have a new event update') => {
  console.log('🔔 [WEB PUSH] Attempting to show notification:', { title, body });
  console.log('🔔 [WEB PUSH] Notification permission:', Notification.permission);
  
  // ALWAYS try Web Notification API first if permission is granted (for desktop notifications)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      console.log('✅ [WEB PUSH] Creating browser notification...');
      // Create a notification that triggers system sound AND shows desktop notification
      const notification = new Notification(title, {
        body: body,
        icon: `${window.location.origin}/images/bataanlogo.png`, // Use absolute URL for better compatibility
        badge: `${window.location.origin}/images/bataanlogo.png`, // Badge icon for mobile/some browsers
        silent: false,
        tag: 'notification-' + Date.now(),
        requireInteraction: false
      });
      
      console.log('✅ [WEB PUSH] Browser notification created successfully!');
      
      // Close it after 5 seconds
      setTimeout(() => {
        notification.close();
        console.log('🔔 [WEB PUSH] Notification closed');
      }, 5000);
      
      return true;
    } catch (e) {
      console.error('❌ [WEB PUSH] Web Notification failed with error:', e);
    }
  } else {
    console.warn('⚠️ [WEB PUSH] Notification not available or permission not granted');
    console.log('   - Notification in window:', 'Notification' in window);
    console.log('   - Permission:', Notification?.permission);
  }
  
  // Fallback to AudioContext if Web Notification API is not available
  if (globalAudioContext && globalAudioContext.state === 'running') {
    try {
      
      const oscillator = globalAudioContext.createOscillator();
      const gainNode = globalAudioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(globalAudioContext.destination);
      
      // Create a pleasant "ding" sound
      oscillator.frequency.setValueAtTime(800, globalAudioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, globalAudioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, globalAudioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, globalAudioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, globalAudioContext.currentTime + 0.4);
      
      oscillator.start(globalAudioContext.currentTime);
      oscillator.stop(globalAudioContext.currentTime + 0.4);
      
      return true;
    } catch (error) {
      console.error('❌ [AUDIO] AudioContext playback failed:', error);
      return await playFallbackSound();
    }
  } else {
    // AudioContext is suspended or not initialized - use HTML5 Audio immediately
    return await playFallbackSound();
  }
};

// Fallback sound using HTML5 Audio or Web Notification
const playFallbackSound = async () => {
  // Try Web Notification API first (can play system sound without user interaction)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      // Create a silent notification that triggers system sound
      const notification = new Notification('', {
        body: '',
        silent: false,
        tag: 'notification-sound-' + Date.now(),
        requireInteraction: false
      });
      // Close it immediately so it doesn't show
      setTimeout(() => notification.close(), 1);
      return true;
    } catch (e) {
    }
  }
  
  // Fallback to HTML5 Audio
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
    audio.volume = 0.5;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      await playPromise;
    }
    return true;
  } catch (e: any) {
    // Browser autoplay policy blocks audio until user interaction
    if (e.name === 'NotAllowedError') {
      // Audio blocked by browser
    } else {
      console.error('❌ [AUDIO] Fallback sound failed:', e);
    }
    return false;
  }
};

// Global Notification Component
export default function GlobalNotificationSystem() {
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  
  // Get current user data - use state to make it reactive
  const [userId, setUserId] = useState<string>(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        return user._id || user.id || 'unknown';
      } catch {
        return 'unknown';
      }
    }
    return 'unknown';
  });
  
  // Listen for localStorage changes (when user logs in)
  useEffect(() => {
    const handleStorageChange = () => {
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const newUserId = user._id || user.id || 'unknown';
          if (newUserId !== userId) {
            setUserId(newUserId);
          }
        } catch (e) {
          console.error('❌ [NOTIFICATION] Failed to parse userData:', e);
        }
      }
    };
    
    // Check for changes every 500ms (for same-window updates)
    const interval = setInterval(handleStorageChange, 500);
    
    // Also listen for storage events (for cross-tab updates)
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [userId]);
  
  // Get current user data for refs
  const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
  
  // Initialize Socket.IO for global notifications
  const { onNewNotification, offNewNotification } = useSocket(userId);

  // Request notification permission immediately on mount (ONCE)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []); // Empty deps - run only once on mount

  // Initialize AudioContext on first user interaction (ONCE)
  useEffect(() => {
    let initialized = false;
    
    const initAudioOnInteraction = async () => {
      if (initialized) return; // Prevent multiple initializations
      
      const success = await initializeAudioContext();
      
      if (success) {
        initialized = true;
        // Remove all listeners after successful initialization
        document.removeEventListener('click', initAudioOnInteraction);
        document.removeEventListener('keydown', initAudioOnInteraction);
        document.removeEventListener('touchstart', initAudioOnInteraction);
      }
    };

    // Listen for any user interaction to initialize audio (use { once: true } for auto-removal)
    document.addEventListener('click', initAudioOnInteraction, { once: true });
    document.addEventListener('keydown', initAudioOnInteraction, { once: true });
    document.addEventListener('touchstart', initAudioOnInteraction, { once: true });

    return () => {
      // Cleanup on unmount
      document.removeEventListener('click', initAudioOnInteraction);
      document.removeEventListener('keydown', initAudioOnInteraction);
      document.removeEventListener('touchstart', initAudioOnInteraction);
    };
  }, []); // Empty deps - run only once on mount

  // Use refs to avoid stale closures
  const shownNotificationsRef = useRef(shownNotifications);
  const currentUserRef = useRef(currentUser);
  
  // Update refs when state changes
  useEffect(() => {
    shownNotificationsRef.current = shownNotifications;
  }, [shownNotifications]);
  
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  
  // Global real-time notification popup system
  useEffect(() => {
    if (typeof onNewNotification !== 'function') {
      return;
    }
    
    if (userId === 'unknown') {
      return;
    }
    
    const handleGlobalNewNotification = (notificationData: any) => {
      const now = Date.now();
      
      // Create unique ID based on notification type and content
      const extractQuotedTitle = (msg: any) => {
        if (typeof msg !== 'string') return '';
        const match = msg.match(/"([^"]+)"/);
        return match?.[1] || '';
      };

      const inferEventStatusFromMessage = (msg: any): string | null => {
        if (typeof msg !== 'string') return null;
        const m = msg.toLowerCase();
        if (m.includes('has been approved')) return 'approved';
        if (m.includes('has been rejected')) return 'rejected';
        if (m.includes('has been cancelled') || m.includes('has been canceled')) return 'cancelled';
        return null;
      };

      const eventTitle = notificationData.eventTitle || notificationData.title || extractQuotedTitle(notificationData.message) || 'unknown';
      const eventId = notificationData.eventId || notificationData.id;
      const notificationType = notificationData.type || notificationData.notificationType || 'event';
      const timestamp = notificationData.timestamp || now;
      
      // Generate unique notification ID based on type
      let notificationId;
      if (notificationType === 'status_update') {
        // Requirement status update
        const reqId = notificationData.requirementId || 'unknown';
        const status = notificationData.newStatus || 'unknown';
        notificationId = `status-${eventId}-${reqId}-${status}-${timestamp}`;
      } else if (notificationType === 'event_status_update' || (notificationData.eventStatus || notificationData.status)) {
        // Event status update (approved/rejected/cancelled)
        const eventStatus = notificationData.eventStatus || notificationData.status || notificationData.newStatus || 'unknown';
        notificationId = `event-status-${eventId}-${eventStatus}-${timestamp}`;
      } else {
        // For new events, use event ID + timestamp to allow re-notifications
        notificationId = `event-${eventId}-${timestamp}`;
      }
      
      // Check if we've shown this EXACT notification recently (within 100ms to prevent true duplicates only)
      // Use ref to get current state
      const recentNotifications = Array.from(shownNotificationsRef.current).filter(id => {
        const parts = id.split('-');
        const idTimestamp = parseInt(parts[parts.length - 1]);
        return !isNaN(idTimestamp) && (now - idTimestamp) < 100;
      });
      
      if (recentNotifications.includes(notificationId)) {
        return;
      }
      
      // Add to shown notifications set
      setShownNotifications(prev => {
        const newSet = new Set([...prev, notificationId]);
        // Keep only recent notifications (last 5 minutes)
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        const filtered = Array.from(newSet).filter(id => {
          const parts = id.split('-');
          const idTimestamp = parseInt(parts[parts.length - 1]);
          return !isNaN(idTimestamp) && idTimestamp > fiveMinutesAgo;
        });
        return new Set(filtered);
      });
      
      // Update last notification time
      setLastNotificationTime(now);
      
      // Determine if this is user's own event or tagged event
      // Use ref to get current user data
      const userName = currentUserRef.current.name || '';
      const userDepartment = currentUserRef.current.department || currentUserRef.current.departmentName || '';
      
      // More reliable user event detection
      const isUserEventByName = userName && notificationData.requestor === userName;
      const isUserEventById = notificationData.createdBy === userId;
      const isUserEvent = isUserEventByName || isUserEventById;
      
      // Check if user's department is tagged (but user didn't create the event)
      const isTaggedEvent = userDepartment && notificationData.taggedDepartments?.includes(userDepartment) && !isUserEvent;
      
      // Check notification type
      const isStatusUpdate = notificationData.type === 'status_update' || notificationData.notificationType === 'status_update';
      const isEventStatusUpdate = notificationData.type === 'event_status_update' || notificationData.notificationType === 'event_status_update';
      
      // Fallback: Check if this is an event status update by looking at the data
      // If notification has eventStatus field or status field with approved/rejected/cancelled
      const inferredStatus = inferEventStatusFromMessage(notificationData.message);
      const statusValue = typeof notificationData.status === 'string' ? notificationData.status.toLowerCase() : notificationData.status;
      const hasEventStatus = notificationData.eventStatus || 
                            (statusValue && ['approved', 'rejected', 'cancelled'].includes(statusValue)) ||
                            inferredStatus;
      const isEventStatusUpdateFallback = !isStatusUpdate && hasEventStatus;
      
      // Determine notification title and message
      let notificationTitle = "New Event Notification";
      let notificationMessage = notificationData.message || `New event "${eventTitle}" notification`;
      
      if (isEventStatusUpdate || isEventStatusUpdateFallback) {
        // Event status update (approved/rejected/cancelled by admin)
        const eventStatus = notificationData.eventStatus || statusValue || notificationData.newStatus || inferredStatus || 'updated';
        const adminName = notificationData.adminName || notificationData.updatedBy || 'Admin';
        
        if (eventStatus === 'approved') {
          notificationTitle = "Event Approved! 🎉";
          notificationMessage = `Your event "${eventTitle}" has been approved by ${adminName}`;
        } else if (eventStatus === 'rejected') {
          notificationTitle = "Event Rejected";
          notificationMessage = `Your event "${eventTitle}" has been rejected by ${adminName}`;
        } else if (eventStatus === 'cancelled') {
          notificationTitle = "Event Cancelled";
          notificationMessage = `Your event "${eventTitle}" has been cancelled by ${adminName}`;
        } else {
          notificationTitle = "Event Status Updated";
          notificationMessage = `Your event "${eventTitle}" status changed to "${eventStatus}" by ${adminName}`;
        }

        const extras: string[] = [];
        if (notificationData.requestorDepartment) {
          extras.push(`Department: ${notificationData.requestorDepartment}`);
        }
        if (notificationData.schedule) {
          extras.push(`Schedule: ${notificationData.schedule}`);
        }
        if (notificationData.location) {
          extras.push(`Location: ${notificationData.location}`);
        }
        if (extras.length > 0) {
          notificationMessage = `${notificationMessage}\n${extras.join('\n')}`;
        }
      } else if (isStatusUpdate) {
        // Requirement status update
        notificationTitle = "Requirement Status Updated";
        notificationMessage = notificationData.message || `Requirement "${notificationData.requirementName}" status changed to "${notificationData.newStatus}"`;
      } else if (isUserEvent && !isTaggedEvent) {
        // User's own event
        notificationTitle = "Your Upcoming Event";
        notificationMessage = `Your event "${eventTitle}" is coming up`;
      } else if (isTaggedEvent && !isUserEvent) {
        // Tagged department event
        notificationTitle = "Department Event Notification";
        notificationMessage = `New event "${eventTitle}" has tagged your department`;
      }
      
      // Play notification sound immediately with dynamic title and message
      playGlobalNotificationSound(notificationTitle, notificationMessage).catch(e => {});
      
      
      // Dispatch global event to refresh Dashboard notifications
      window.dispatchEvent(new CustomEvent('notificationUpdate', { 
        detail: { type: 'new', data: notificationData } 
      }));
      
      // Create a custom toast with Framer Motion animation - Professional Design
      // Use unique ID to allow multiple toasts to stack
      toast.custom((t) => (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white rounded-xl shadow-2xl overflow-hidden w-80 cursor-pointer hover:shadow-3xl transition-all duration-200 border border-gray-100"
          onClick={() => {
            toast.dismiss(t);
            // Navigate to dashboard or open notification
            window.location.href = '/users/dashboard';
          }}
        >
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Bell className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">{notificationTitle}</h3>
                <p className="text-blue-100 text-xs">Just now</p>
              </div>
            </div>
          </div>

          {/* Content section */}
          <div className="px-6 py-4 space-y-3">
            {/* Notification Message */}
            <div>
              <p className="text-gray-700 text-sm leading-relaxed font-medium">{notificationMessage}</p>
            </div>

            {/* Event Title if available */}
            {eventTitle && eventTitle !== 'unknown' && (
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Event</p>
                <p className="text-gray-900 font-bold text-base mt-1">{eventTitle}</p>
              </div>
            )}

            {/* Additional Info */}
            {notificationData.requestor && (
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Requestor</p>
                <p className="text-gray-700 text-sm mt-1">{notificationData.requestor}</p>
              </div>
            )}

            {notificationData.requestorDepartment && (
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Department</p>
                <p className="text-gray-700 text-sm mt-1">{notificationData.requestorDepartment}</p>
              </div>
            )}

            {notificationData.schedule && (
              <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Schedule</p>
                <p className="text-gray-700 text-sm mt-1">{notificationData.schedule}</p>
              </div>
            )}
          </div>

          {/* Footer with action */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Click to view details</span>
            <Badge className="text-xs bg-blue-600 hover:bg-blue-700 text-white">View</Badge>
          </div>
        </motion.div>
      ), {
        id: notificationId, // Unique ID allows multiple toasts to stack
        duration: 5000, // 5 seconds for better readability
        position: 'bottom-right',
      });
    };

    // Set up the global listener
    onNewNotification(handleGlobalNewNotification);

    // Cleanup function
    return () => {
      if (offNewNotification) {
        offNewNotification();
      }
    };
    // Only depend on the Socket.IO functions and userId - refs handle the rest
  }, [onNewNotification, offNewNotification, userId]);

  // Clear old shown notifications every 10 minutes to prevent memory buildup
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const tenMinutesAgo = now - (10 * 60 * 1000);
      
      setShownNotifications(prev => {
        const filtered = Array.from(shownNotificationsRef.current).filter(id => {
          const parts = id.split('-');
          const idTimestamp = parseInt(parts[parts.length - 1]);
          return !isNaN(idTimestamp) && idTimestamp > tenMinutesAgo;
        });
        return new Set(filtered);
      });
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything visible
}
