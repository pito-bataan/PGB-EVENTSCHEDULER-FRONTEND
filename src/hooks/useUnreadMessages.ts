import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

// Global flag to prevent multiple hook instances from fetching simultaneously
let isGlobalFetching = false;
let globalFetchPromise: Promise<void> | null = null;

interface UseUnreadMessagesReturn {
  totalUnreadCount: number;
  isLoading: boolean;
}

export const useUnreadMessages = (currentUserId?: string): UseUnreadMessagesReturn => {
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Generate unique instance ID to track multiple hook instances
  const instanceId = useRef(Math.random().toString(36).substr(2, 9));


  // Re-enable Socket.IO for real-time badge updates
  const { onNewMessage, offNewMessage } = useSocket(currentUserId);

  // Add a ref to prevent multiple simultaneous fetches
  const isFetching = useRef(false);

  // Define fetchUnreadCounts function with useCallback to prevent infinite loops
  const fetchUnreadCounts = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetching.current) {
      return;
    }

    try {
      isFetching.current = true;
      setIsLoading(true);
      const userData = localStorage.getItem('userData');
      if (!userData) {
        setIsLoading(false);
        return;
      }

      const user = JSON.parse(userData);
      const userDepartment = user.department || user.departmentName;
      const token = localStorage.getItem('authToken');


      // 1. Fetch events relevant to user
      const eventsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch events');
      }

      const eventsData = await eventsResponse.json();
      const events = eventsData.data || [];
      // Filter events where current user is involved
      const relevantEvents = events.filter((event: any) => {
        const isRelevant = event.requestorDepartment === userDepartment || 
               (event.taggedDepartments && event.taggedDepartments.includes(userDepartment));
        return isRelevant;
      });

      // 2. For each event, get participants and calculate unread counts
      let totalUnread = 0;

      for (const event of relevantEvents) {
        const isRequestor = event.requestorDepartment === userDepartment;
        let participants: any[] = [];

        if (isRequestor) {
          // If user is requestor, get users from tagged departments
          if (event.taggedDepartments) {
            for (const deptName of event.taggedDepartments) {
              try {
                const usersResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/department/${deptName}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (usersResponse.ok) {
                  const usersData = await usersResponse.json();
                  const deptUsers = usersData.data || usersData || [];
                  participants.push(...deptUsers);
                }
              } catch (error) {
                // Handle error silently
              }
            }
          }
        } else {
          // If user is from tagged department, include requestor and colleagues
          participants.push({
            _id: event.createdBy || 'unknown'
          });

          // Also get colleagues from same department
          try {
            const usersResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/department/${userDepartment}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (usersResponse.ok) {
              const usersData = await usersResponse.json();
              const deptUsers = usersData.data || [];
              participants.push(...deptUsers.filter((u: any) => u._id !== currentUserId));
            }
          } catch (error) {
            // Handle error silently
          }
        }

        // 3. For each participant, get unread count
        
        for (const participant of participants) {
          // Extract the actual ID from participant object - handle nested _id structure
          let participantId;
          if (typeof participant._id === 'object' && participant._id._id) {
            participantId = participant._id._id; // Nested structure: {_id: {_id: "actual-id"}}
          } else if (typeof participant._id === 'string') {
            participantId = participant._id; // Direct string ID
          } else if (participant.id) {
            participantId = participant.id; // Alternative id field
          }
          
          
          if (participantId && participantId !== currentUserId) {
            try {
              const unreadResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/messages/unread-count/${event._id}/${participantId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (unreadResponse.ok) {
                const unreadData = await unreadResponse.json();
                const count = unreadData.data.unreadCount || 0;
                totalUnread += count;
              }
            } catch (error) {
              // Handle error silently
            }
          }
        }
      }

      setTotalUnreadCount(totalUnread);
      
      // Update localStorage for other components
      localStorage.setItem('unreadMessageCount', JSON.stringify({
        count: totalUnread,
        timestamp: Date.now(),
        userId: currentUserId
      }));

    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false);
      isFetching.current = false; // Reset flag
    }
  }, [currentUserId]); // Only depend on currentUserId to prevent infinite loops

  useEffect(() => {
    if (!currentUserId) {
      setIsLoading(false);
      return;
    }

    // DISABLED: Using messagesStore for unread counts instead
    // fetchUnreadCounts();
    
    // DISABLED: Polling to prevent duplicate API calls
    // const interval = setInterval(fetchUnreadCounts, 30000);
    // return () => clearInterval(interval);
    
    setIsLoading(false);
  }, [currentUserId]);

  // Real-time listeners for immediate badge updates from messagesStore
  useEffect(() => {
    if (!currentUserId) return;

    console.log('🔔 Setting up real-time badge update listeners');

    // Listen for unread messages updates from messagesStore
    const handleUnreadUpdate = (event: CustomEvent) => {
      const { count } = event.detail;
      console.log(`📊 Received unread update: ${count} messages`);
      setTotalUnreadCount(count);
      setIsLoading(false);
    };

    // Listen for new messages to update badge
    const handleNewMessage = (event: CustomEvent) => {
      const { count } = event.detail;
      if (count !== undefined) {
        console.log(`📨 New message received, updating badge: ${count}`);
        setTotalUnreadCount(count);
      }
    };

    // Listen for messages read to update badge
    const handleMessagesRead = (event: CustomEvent) => {
      const { count } = event.detail;
      if (count !== undefined) {
        console.log(`✅ Messages read, updating badge: ${count}`);
        setTotalUnreadCount(count);
      }
    };

    // Add event listeners
    window.addEventListener('unreadMessagesUpdated', handleUnreadUpdate as EventListener);
    window.addEventListener('newMessageReceived', handleNewMessage as EventListener);
    window.addEventListener('messagesReadGlobal', handleMessagesRead as EventListener);

    // Initial sync from localStorage
    const storedCount = localStorage.getItem('totalUnreadMessages');
    if (storedCount) {
      const count = parseInt(storedCount, 10);
      if (!isNaN(count)) {
        setTotalUnreadCount(count);
        console.log(`📂 Loaded initial count from localStorage: ${count}`);
      }
    }

    return () => {
      // Cleanup listeners
      window.removeEventListener('unreadMessagesUpdated', handleUnreadUpdate as EventListener);
      window.removeEventListener('newMessageReceived', handleNewMessage as EventListener);
      window.removeEventListener('messagesReadGlobal', handleMessagesRead as EventListener);
      console.log('🧹 Cleaned up badge update listeners');
    };
  }, [currentUserId]);

  return { totalUnreadCount, isLoading };
};
