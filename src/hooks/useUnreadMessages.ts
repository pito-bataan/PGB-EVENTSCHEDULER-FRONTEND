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

  console.log('🔧 useUnreadMessages hook initialized with userId:', currentUserId);
  console.log('🆔 Hook instance ID:', instanceId.current);
  console.log('🔍 Hook state:', { totalUnreadCount, isLoading });
  console.log('📊 Current badge count on render:', totalUnreadCount);

  // Re-enable Socket.IO for real-time badge updates
  const { onNewMessage, offNewMessage } = useSocket(currentUserId);

  // Add a ref to prevent multiple simultaneous fetches
  const isFetching = useRef(false);

  // Define fetchUnreadCounts function with useCallback to prevent infinite loops
  const fetchUnreadCounts = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetching.current) {
      console.log('⏭️ Skipping fetch - already in progress');
      return;
    }

    try {
      isFetching.current = true;
      setIsLoading(true);
      const userData = localStorage.getItem('userData');
      if (!userData) {
        console.log('❌ No userData in localStorage');
        setIsLoading(false);
        return;
      }

      const user = JSON.parse(userData);
      const userDepartment = user.department || user.departmentName;
      const token = localStorage.getItem('authToken');

      console.log('🔄 Fetching unread counts globally for user:', currentUserId, 'department:', userDepartment);
      console.log('🔧 User data:', user);
      console.log('🔧 Token exists:', !!token);

      // 1. Fetch events relevant to user
      const eventsResponse = await fetch('http://localhost:5000/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!eventsResponse.ok) {
        console.log('❌ Failed to fetch events:', eventsResponse.status, eventsResponse.statusText);
        throw new Error('Failed to fetch events');
      }

      const eventsData = await eventsResponse.json();
      const events = eventsData.data || [];
      console.log(`📊 Fetched ${events.length} total events from API`);
      
      // Filter events where current user is involved
      const relevantEvents = events.filter((event: any) => {
        const isRelevant = event.requestorDepartment === userDepartment || 
               (event.taggedDepartments && event.taggedDepartments.includes(userDepartment));
        if (isRelevant) {
          console.log(`✅ Relevant event: "${event.eventTitle}" - Requestor: ${event.requestorDepartment}, Tagged: ${event.taggedDepartments}`);
        }
        return isRelevant;
      });

      console.log(`📊 Found ${relevantEvents.length} relevant events for unread count calculation`);

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
                const usersResponse = await fetch(`http://localhost:5000/api/users/department/${deptName}`, {
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
                console.error(`Error fetching users for department ${deptName}:`, error);
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
            const usersResponse = await fetch(`http://localhost:5000/api/users/department/${userDepartment}`, {
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
            console.error(`Error fetching colleagues:`, error);
          }
        }

        // 3. For each participant, get unread count
        console.log(`🔍 Checking unread counts for ${participants.length} participants in event "${event.eventTitle}"`);
        console.log(`🔍 Participants data:`, participants);
        
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
          
          console.log(`🔍 Participant object:`, participant, `Extracted ID: ${participantId}`);
          
          if (participantId && participantId !== currentUserId) {
            try {
              console.log(`🔍 Fetching unread count for participant: ${participantId} in event: ${event._id}`);
              const unreadResponse = await fetch(`http://localhost:5000/api/messages/unread-count/${event._id}/${participantId}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });
              
              console.log(`🔍 Unread API response status: ${unreadResponse.status}`);
              
              if (unreadResponse.ok) {
                const unreadData = await unreadResponse.json();
                const count = unreadData.data.unreadCount || 0;
                totalUnread += count;
                
                console.log(`📨 Event "${event.eventTitle}" - User "${participantId}": ${count} unread (Total so far: ${totalUnread})`);
              } else {
                console.log(`❌ Failed to fetch unread count for ${participantId}:`, unreadResponse.status);
              }
            } catch (error) {
              console.error(`❌ Error fetching unread count for ${participantId}:`, error);
            }
          } else {
            console.log(`⏭️ Skipping current user or invalid participant ID: ${participantId}`);
          }
        }
      }

      console.log(`📊 Total unread messages calculated: ${totalUnread}`);
      console.log('🔍 Detailed unread breakdown:', {
        totalEvents: relevantEvents.length,
        totalUnread,
        currentUserId,
        userDepartment,
        breakdown: relevantEvents.map((event: any) => ({
          eventTitle: event.eventTitle,
          eventId: event._id,
          unreadForThisEvent: 0 // Simplified for now
        }))
      });
      
      // FORCE RESET the badge count to prevent inflated numbers
      console.log('🔄 RESETTING badge count to correct value:', totalUnread);
      setTotalUnreadCount(totalUnread);
      
      // Update localStorage for other components
      localStorage.setItem('totalUnreadMessages', totalUnread.toString());
      window.dispatchEvent(new CustomEvent('unreadMessagesUpdated', { 
        detail: { count: totalUnread } 
      }));
      
      // Clear any cached inflated counts
      console.log('✅ Badge count reset complete - should now show:', totalUnread);

    } catch (error) {
      console.error('Error fetching global unread counts:', error);
    } finally {
      setIsLoading(false);
      isFetching.current = false; // Reset flag
    }
  }, [currentUserId]); // Only depend on currentUserId to prevent infinite loops

  useEffect(() => {
    console.log('🔧 useUnreadMessages useEffect triggered with currentUserId:', currentUserId);
    
    if (!currentUserId) {
      console.log('❌ No currentUserId provided to useUnreadMessages hook');
      setIsLoading(false);
      return;
    }

    console.log('✅ Valid currentUserId found, starting fetchUnreadCounts...');

    // Initial fetch only (no more background polling since real-time works perfectly)
    fetchUnreadCounts();

    // Disabled background polling - real-time events handle everything now
    // const interval = setInterval(fetchUnreadCounts, 300000);
    // return () => clearInterval(interval);
  }, [currentUserId]);

  // Real-time listeners for immediate badge updates
  useEffect(() => {
    if (!currentUserId) return;

    console.log('🔧 Setting up real-time listeners for badge updates');

    // Track processed messages to prevent duplicates (with time-based cleanup)
    const processedMessages = new Map<string, number>();
    const MESSAGE_CACHE_TIME = 30000; // 30 seconds

    // Listen for new messages via Socket.IO - increment count
    onNewMessage((data: any) => {
      console.log('🔔 Global hook received new message:', data);
      console.log('🔍 Current user check:', { currentUserId, messageSenderId: data?.message?.senderId, messageSenderIdObj: data?.message?.senderId?._id });
      
      const { message } = data;
      const messageId = message._id || message.id || `${message.senderId}-${Date.now()}`;
      const now = Date.now();
      
      // Clean up old processed messages (older than 30 seconds)
      for (const [id, timestamp] of processedMessages.entries()) {
        if (now - timestamp > MESSAGE_CACHE_TIME) {
          processedMessages.delete(id);
        }
      }
      
      // Check if we've recently processed this message
      if (processedMessages.has(messageId)) {
        const lastProcessed = processedMessages.get(messageId)!;
        if (now - lastProcessed < 5000) { // Only block if within 5 seconds
          console.log('🚫 RECENT DUPLICATE MESSAGE - Skipping increment for messageId:', messageId);
          return;
        }
      }
      
      // Mark message as processed with timestamp
      processedMessages.set(messageId, now);
      console.log('✅ New unique message processed, messageId:', messageId);
      
      // Only increment if the message is not from current user
      if (message.senderId !== currentUserId && message.senderId._id !== currentUserId) {
        console.log('✅ Message is from another user, incrementing badge count');
        setTotalUnreadCount(prev => {
          const newCount = prev + 1;
          console.log(`📈 Badge count increased: ${prev} → ${newCount}`);
          console.log('📊 Badge increment details:', { 
            previousCount: prev, 
            newCount, 
            messageFrom: message.senderId,
            currentUser: currentUserId,
            messageId 
          });
          
          // Update localStorage for other components
          localStorage.setItem('totalUnreadMessages', newCount.toString());
          window.dispatchEvent(new CustomEvent('unreadMessagesUpdated', { 
            detail: { count: newCount } 
          }));
          
          return newCount;
        });
      } else {
        console.log('⏭️ Message is from current user, skipping badge increment');
      }
    });

    // Listen for custom browser events when messages are read (more reliable than Socket.IO)
    const handleMessagesRead = (event: CustomEvent) => {
      console.log('🔥 GLOBAL HOOK - Custom messages read event received!', event.detail);
      const { readerId, messageCount = 1 } = event.detail;
      
      console.log('🔍 Checking readerId match:', { readerId, currentUserId, match: readerId === currentUserId });
      
      if (readerId === currentUserId) {
        console.log('🔥 MATCH! Current user read messages, updating badge immediately...');
        
        setTotalUnreadCount(prev => {
          const newCount = Math.max(0, prev - messageCount); // Decrease by actual count
          console.log(`📉 Badge count decreased immediately: ${prev} → ${newCount} (decreased by ${messageCount})`);
          
          // Update localStorage immediately
          localStorage.setItem('totalUnreadMessages', newCount.toString());
          window.dispatchEvent(new CustomEvent('unreadMessagesUpdated', { 
            detail: { count: newCount } 
          }));
          
          return newCount;
        });
      }
    };

    // Listen for custom browser event instead of Socket.IO
    window.addEventListener('messagesReadGlobal', handleMessagesRead as EventListener);

    return () => {
      console.log('🔧 Cleaning up real-time listeners');
      // Re-enable proper cleanup for real-time functionality
      offNewMessage();
      window.removeEventListener('messagesReadGlobal', handleMessagesRead as EventListener);
    };
  }, [currentUserId, onNewMessage, offNewMessage]);

  console.log('🔧 useUnreadMessages hook returning:', { totalUnreadCount, isLoading });
  return { totalUnreadCount, isLoading };
};
