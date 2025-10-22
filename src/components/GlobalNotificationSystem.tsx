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
  console.log('🔊 [AUDIO] Initializing AudioContext, current state:', globalAudioContext?.state);
  
  if (!globalAudioContext) {
    try {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('✅ [AUDIO] AudioContext created, state:', globalAudioContext.state);
    } catch (error) {
      console.error('❌ [AUDIO] Failed to create AudioContext:', error);
      return false;
    }
  }
  
  if (globalAudioContext) {
    if (globalAudioContext.state === 'suspended') {
      try {
        console.log('🔄 [AUDIO] Attempting to resume suspended AudioContext...');
        await globalAudioContext.resume();
        console.log('✅ [AUDIO] AudioContext resumed, new state:', globalAudioContext.state);
      } catch (error) {
        console.error('❌ [AUDIO] Failed to resume AudioContext:', error);
        return false;
      }
    }
    
    // Check final state
    audioInitialized = globalAudioContext.state === 'running';
    console.log('🔊 [AUDIO] Initialization complete, state:', globalAudioContext.state, 'ready:', audioInitialized);
    return audioInitialized;
  }
  
  return false;
};

// Global notification sound function with fallback
const playGlobalNotificationSound = async (title: string = 'New Event Notification', body: string = 'You have a new event update') => {
  console.log('🔔 [AUDIO] Attempting to play notification sound...');
  
  // ALWAYS try Web Notification API first if permission is granted (for desktop notifications)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      console.log('🔔 [AUDIO] Using Web Notification API for desktop notification + system sound');
      console.log('🔔 [AUDIO] Title:', title, 'Body:', body);
      // Create a notification that triggers system sound AND shows desktop notification
      const notification = new Notification(title, {
        body: body,
        icon: '/notification-icon.png', // Optional: add an icon
        silent: false,
        tag: 'notification-sound-' + Date.now(),
        requireInteraction: false
      });
      // Close it after 3 seconds
      setTimeout(() => notification.close(), 3000);
      console.log('✅ [AUDIO] Desktop notification shown with system sound');
      return true;
    } catch (e) {
      console.error('❌ [AUDIO] Web Notification failed with error:', e);
      console.log('ℹ️ [AUDIO] Trying AudioContext fallback...');
    }
  } else {
    console.log('⚠️ [AUDIO] Web Notification not available. Permission:', Notification?.permission);
  }
  
  // Fallback to AudioContext if Web Notification API is not available
  if (globalAudioContext && globalAudioContext.state === 'running') {
    try {
      console.log('🎵 [AUDIO] Playing sound via AudioContext (fallback)');
      
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
      
      console.log('✅ [AUDIO] Sound played successfully via AudioContext');
      return true;
    } catch (error) {
      console.error('❌ [AUDIO] AudioContext playback failed:', error);
      return await playFallbackSound();
    }
  } else {
    // AudioContext is suspended or not initialized - use HTML5 Audio immediately
    console.log('⚠️ [AUDIO] AudioContext not running (state:', globalAudioContext?.state, '), using fallback');
    return await playFallbackSound();
  }
};

// Fallback sound using HTML5 Audio or Web Notification
const playFallbackSound = async () => {
  console.log('🔄 [AUDIO] Using fallback sound method');
  
  // Try Web Notification API first (can play system sound without user interaction)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      console.log('🔔 [AUDIO] Using Web Notification API for system sound');
      // Create a silent notification that triggers system sound
      const notification = new Notification('', {
        body: '',
        silent: false,
        tag: 'notification-sound-' + Date.now(),
        requireInteraction: false
      });
      // Close it immediately so it doesn't show
      setTimeout(() => notification.close(), 1);
      console.log('✅ [AUDIO] System notification sound played');
      return true;
    } catch (e) {
      console.log('ℹ️ [AUDIO] Web Notification failed, trying HTML5 Audio');
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
    console.log('✅ [AUDIO] HTML5 Audio played');
    return true;
  } catch (e: any) {
    // Browser autoplay policy blocks audio until user interaction
    if (e.name === 'NotAllowedError') {
      console.log('ℹ️ [AUDIO] Audio blocked by browser. Click anywhere on the page, then sound will work for future notifications.');
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
            console.log('🔄 [NOTIFICATION] User data updated, new userId:', newUserId);
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
  
  console.log('🌐 [GLOBAL NOTIFICATION SYSTEM] Component mounted, userId:', userId);
  
  // Get current user data for refs
  const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
  
  // Initialize Socket.IO for global notifications
  const { onNewNotification, offNewNotification } = useSocket(userId);
  
  console.log('🔌 [GLOBAL NOTIFICATION SYSTEM] useSocket returned, onNewNotification:', typeof onNewNotification);

  // Request notification permission immediately on mount (ONCE)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      console.log('🔔 [NOTIFICATION] Requesting notification permission...');
      Notification.requestPermission().then(permission => {
        console.log('🔔 [NOTIFICATION] Permission granted:', permission);
        if (permission === 'granted') {
          console.log('✅ [NOTIFICATION] Web notifications are now enabled!');
        }
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      console.log('✅ [NOTIFICATION] Web notifications already enabled');
    }
  }, []); // Empty deps - run only once on mount

  // Initialize AudioContext on first user interaction (ONCE)
  useEffect(() => {
    let initialized = false;
    
    const initAudioOnInteraction = async () => {
      if (initialized) return; // Prevent multiple initializations
      
      console.log('👆 [AUDIO] User interaction detected, initializing audio...');
      const success = await initializeAudioContext();
      
      if (success) {
        initialized = true;
        // Remove all listeners after successful initialization
        document.removeEventListener('click', initAudioOnInteraction);
        document.removeEventListener('keydown', initAudioOnInteraction);
        document.removeEventListener('touchstart', initAudioOnInteraction);
        console.log('✅ [AUDIO] Audio initialized, listeners removed');
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
    console.log('🔄 [NOTIFICATION] Setting up notification listener for userId:', userId);
    console.log('🔄 [NOTIFICATION] onNewNotification type:', typeof onNewNotification, 'userId:', userId);
    
    if (typeof onNewNotification !== 'function') {
      console.warn('⚠️ [NOTIFICATION] onNewNotification is not a function');
      return;
    }
    
    if (userId === 'unknown') {
      console.warn('⚠️ [NOTIFICATION] userId is unknown, skipping listener setup');
      return;
    }
    
    console.log('✅ [NOTIFICATION] All checks passed, setting up listener now...');
    
    const handleGlobalNewNotification = (notificationData: any) => {
      console.log('🔔 [GLOBAL NOTIFICATION] Received:', notificationData);
      console.log('🔔 [NOTIFICATION TYPE]:', notificationData.type || notificationData.notificationType);
      console.log('🔔 [EVENT STATUS]:', notificationData.eventStatus || notificationData.status);
      const now = Date.now();
      
      // Create unique ID based on notification type and content
      const eventTitle = notificationData.eventTitle || notificationData.title || 'unknown';
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
      
      console.log('🆔 [NOTIFICATION ID]:', notificationId);
      
      // Check if we've shown this EXACT notification recently (within 2 seconds)
      // Use ref to get current state
      const recentNotifications = Array.from(shownNotificationsRef.current).filter(id => {
        const parts = id.split('-');
        const idTimestamp = parseInt(parts[parts.length - 1]);
        return !isNaN(idTimestamp) && (now - idTimestamp) < 2000;
      });
      
      if (recentNotifications.includes(notificationId)) {
        console.log('⏭️ [NOTIFICATION] Skipping duplicate (shown within 2s)');
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
      const hasEventStatus = notificationData.eventStatus || 
                            (notificationData.status && ['approved', 'rejected', 'cancelled'].includes(notificationData.status));
      const isEventStatusUpdateFallback = !isStatusUpdate && hasEventStatus && isUserEvent;
      
      // Determine notification title and message
      let notificationTitle = "New Event Notification";
      let notificationMessage = notificationData.message || `New event "${eventTitle}" notification`;
      
      if (isEventStatusUpdate || isEventStatusUpdateFallback) {
        // Event status update (approved/rejected/cancelled by admin)
        console.log('✅ [NOTIFICATION] Detected EVENT STATUS UPDATE!');
        console.log('🔍 [NOTIFICATION] isEventStatusUpdate:', isEventStatusUpdate, 'isEventStatusUpdateFallback:', isEventStatusUpdateFallback);
        
        const eventStatus = notificationData.eventStatus || notificationData.status || notificationData.newStatus || 'updated';
        const adminName = notificationData.adminName || notificationData.updatedBy || 'Admin';
        
        console.log('📊 [NOTIFICATION] Event Status:', eventStatus, 'Admin:', adminName);
        
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
        
        console.log('📢 [NOTIFICATION] Title:', notificationTitle);
        console.log('📢 [NOTIFICATION] Message:', notificationMessage);
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
      
      console.log('✅ [NOTIFICATION] Showing notification:', notificationTitle);
      
      // Play notification sound immediately with dynamic title and message
      playGlobalNotificationSound(notificationTitle, notificationMessage).catch(e => {});
      
      
      // Dispatch global event to refresh Dashboard notifications
      window.dispatchEvent(new CustomEvent('notificationUpdate', { 
        detail: { type: 'new', data: notificationData } 
      }));
      
      // Create a custom toast with Framer Motion animation
      toast.custom((t) => (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.8 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 100, scale: 0.8 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => {
            toast.dismiss(t);
            // Navigate to dashboard or open notification
            window.location.href = '/users/dashboard';
          }}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-sm text-gray-900">{notificationTitle}</h4>
                <span className="text-xs text-gray-500">Now</span>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {notificationMessage}
              </p>
              <div className="mt-2">
                <Badge variant="destructive" className="text-xs">New</Badge>
              </div>
            </div>
          </div>
        </motion.div>
      ), {
        duration: 5000,
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
        const filtered = Array.from(prev).filter(id => {
          const parts = id.split('-');
          const idTimestamp = parseInt(parts[parts.length - 1]);
          return !isNaN(idTimestamp) && idTimestamp > tenMinutesAgo;
        });
        console.log('🧹 [NOTIFICATION] Cleaned old notifications. Remaining:', filtered.length);
        return new Set(filtered);
      });
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything visible
}
