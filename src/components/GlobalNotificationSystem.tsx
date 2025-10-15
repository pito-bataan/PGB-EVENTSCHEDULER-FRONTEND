import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSocket } from '@/hooks/useSocket'

// Global AudioContext for notification sounds
let globalAudioContext: AudioContext | null = null;

// Initialize AudioContext on first user interaction
const initializeAudioContext = async () => {
  if (!globalAudioContext) {
    try {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      // Failed to initialize AudioContext
    }
  }
  
  if (globalAudioContext && globalAudioContext.state === 'suspended') {
    try {
      await globalAudioContext.resume();
    } catch (error) {
      // Failed to resume AudioContext
    }
  }
};

// Global notification sound function
const playGlobalNotificationSound = async () => {
  
  try {
    await initializeAudioContext();
    
    if (globalAudioContext && globalAudioContext.state === 'running') {
      const oscillator = globalAudioContext.createOscillator();
      const gainNode = globalAudioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(globalAudioContext.destination);
      
      // Create a pleasant "ding" sound
      oscillator.frequency.setValueAtTime(800, globalAudioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, globalAudioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0, globalAudioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, globalAudioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, globalAudioContext.currentTime + 0.3);
      
      oscillator.start(globalAudioContext.currentTime);
      oscillator.stop(globalAudioContext.currentTime + 0.3);
      
    }
  } catch (error) {
    // Global notification sound failed
  }
};

// Global Notification Component
export default function GlobalNotificationSystem() {
  const [shownNotifications, setShownNotifications] = useState<Set<string>>(new Set());
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  
  // Get current user data
  const currentUser = JSON.parse(localStorage.getItem('userData') || '{}');
  const userId = currentUser._id || currentUser.id || 'unknown';
  
  // Initialize Socket.IO for global notifications
  const { onNewNotification, offNewNotification } = useSocket(userId);

  // Initialize AudioContext on any user interaction
  useEffect(() => {
    const initAudioOnInteraction = async () => {
      await initializeAudioContext();
      
      // Remove listeners after first interaction
      document.removeEventListener('click', initAudioOnInteraction);
      document.removeEventListener('keydown', initAudioOnInteraction);
      document.removeEventListener('touchstart', initAudioOnInteraction);
    };

    // Listen for any user interaction to initialize audio
    document.addEventListener('click', initAudioOnInteraction);
    document.addEventListener('keydown', initAudioOnInteraction);
    document.addEventListener('touchstart', initAudioOnInteraction);

    return () => {
      document.removeEventListener('click', initAudioOnInteraction);
      document.removeEventListener('keydown', initAudioOnInteraction);
      document.removeEventListener('touchstart', initAudioOnInteraction);
    };
  }, []);

  // Global real-time notification popup system
  useEffect(() => {
    if (typeof onNewNotification !== 'function') {
      return;
    }
    
    const handleGlobalNewNotification = (notificationData: any) => {
      const now = Date.now();
      
      // Throttle notifications - prevent spam (minimum 2 seconds between notifications)
      if (now - lastNotificationTime < 2000) {
        return;
      }
      
      // Create unique ID for this notification to prevent duplicates
      const eventTitle = notificationData.eventTitle || notificationData.title || 'unknown';
      const eventId = notificationData.eventId || notificationData.id;
      const notificationId = eventId ? `global-event-${eventId}` : `global-title-${eventTitle}`;
      
      
      // Check if we've already shown this notification
      if (shownNotifications.has(notificationId)) {
        return;
      }
      
      // Add to shown notifications set and update timestamp
      setShownNotifications(prev => {
        const newSet = new Set([...prev, notificationId]);
        return newSet;
      });
      
      // Update last notification time
      setLastNotificationTime(now);
      
      // Play notification sound immediately
      playGlobalNotificationSound().catch(e => {});
      
      // Determine if this is user's own event or tagged event
      const userName = currentUser.name || '';
      const userDepartment = currentUser.department || currentUser.departmentName || '';
      
      // More reliable user event detection
      const isUserEventByName = userName && notificationData.requestor === userName;
      const isUserEventById = notificationData.createdBy === userId;
      const isUserEvent = isUserEventByName || isUserEventById;
      
      // Check if user's department is tagged (but user didn't create the event)
      const isTaggedEvent = userDepartment && notificationData.taggedDepartments?.includes(userDepartment) && !isUserEvent;
      
      // Check if this is a status update notification
      const isStatusUpdate = notificationData.type === 'status_update' || notificationData.notificationType === 'status_update';
      
      // Determine notification title and message
      let notificationTitle = "New Event Notification";
      let notificationMessage = notificationData.message || `New event "${eventTitle}" notification`;
      
      if (isStatusUpdate) {
        // Status update notification
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

    // Set up the global real-time listener
    onNewNotification(handleGlobalNewNotification);

    // Cleanup
    return () => {
      offNewNotification();
    };
  }, [onNewNotification, offNewNotification]);

  // Clear old shown notifications every 5 minutes to prevent memory buildup
  useEffect(() => {
    const interval = setInterval(() => {
      setShownNotifications(new Set());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything visible
}
