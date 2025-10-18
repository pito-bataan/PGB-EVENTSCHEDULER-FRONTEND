import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null;
let isConnecting = false; // Prevent multiple simultaneous connection attempts
let joinedUserRooms = new Set<string>(); // Track joined user rooms globally
let globalListenersInitialized = false; // Track if global listeners are set up

export const useSocket = (userId?: string) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {

    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      return;
    }

    // Use existing global socket or create new one (with proper deduplication)
    if (!globalSocket || globalSocket.disconnected) {
      if (isConnecting) return; // Double check
      
      isConnecting = true;
      
      try {
        globalSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
          transports: ['websocket', 'polling'],
          // Add connection options to prevent spam
          forceNew: false,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
          timeout: 20000
        });
        
        
        // Reset connecting flag when connection is established
        globalSocket.on('connect', () => {
          console.log('🔗 [SOCKET] Connected to Socket.IO server');
          isConnecting = false;
        });
        
        globalSocket.on('disconnect', () => {
          console.log('🔌 [SOCKET] Disconnected from Socket.IO server');
          isConnecting = false;
        });
        
        globalSocket.on('connect_error', (error) => {
          isConnecting = false;
        });
        
      } catch (error) {
        isConnecting = false;
      }
      
    }

    // Always assign the global socket to the ref
    socketRef.current = globalSocket;
    const socket = socketRef.current;

    // Add debug logging to see what's happening

    // If we still don't have a socket, something is very wrong
    if (!socket) {
      return;
    }

    // Only add event listeners if this is a new connection
    if (!socket.hasListeners('connect')) {
      socket.on('connect', () => {
        // Connected to server
      });

      socket.on('disconnect', () => {
        // Disconnected from server
      });

      socket.on('connect_error', (error) => {
        // Connection error
      });
    }

    // Only join user room if not already joined and userId provided
    if (userId && !joinedUserRooms.has(userId)) {
      if (socket.connected) {
        console.log(`👤 [SOCKET] Joining user room for userId: ${userId}`);
        socket.emit('join-user-room', userId);
        joinedUserRooms.add(userId);
      } else {
        // If not connected yet, wait for connection
        socket.once('connect', () => {
          if (!joinedUserRooms.has(userId)) {
            console.log(`👤 [SOCKET] Joining user room after connection for userId: ${userId}`);
            socket.emit('join-user-room', userId);
            joinedUserRooms.add(userId);
          }
        });
      }
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect global socket - let other components reuse it
      // socket.disconnect();
    };
  }, [userId]);

  // Re-enabled Socket.IO functions with proper error handling
  // Track joined rooms to prevent duplicate joins
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  
  const joinConversation = (conversationId: string) => {
    const socket = socketRef.current || globalSocket;
    
    if (socket && socket.connected) {
      // Only join if not already joined
      if (!joinedRoomsRef.current.has(conversationId)) {
        socket.emit('join-conversation', conversationId);
        joinedRoomsRef.current.add(conversationId);
      }
    } else if (socket) {
      // Wait for connection and then join
      socket.once('connect', () => {
        if (!joinedRoomsRef.current.has(conversationId)) {
          socket.emit('join-conversation', conversationId);
          joinedRoomsRef.current.add(conversationId);
        }
      });
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave-conversation', conversationId);
      joinedRoomsRef.current.delete(conversationId); // Remove from tracking
    }
  };

  const onNewMessage = (callback: (data: any) => void) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.on('new-message', callback);
    } else if (socketRef.current) {
      // Wait for connection if not connected yet
      socketRef.current.once('connect', () => {
        socketRef.current!.on('new-message', callback);
      });
    }
  };

  const offNewMessage = () => {
    if (socketRef.current) {
      socketRef.current.off('new-message');
    }
  };

  const onMessagesRead = (callback: (data: any) => void) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.on('messages-read', callback);
    } else if (socketRef.current) {
      // Wait for connection if not connected yet
      socketRef.current.once('connect', () => {
        socketRef.current!.on('messages-read', callback);
      });
    }
  };

  const offMessagesRead = () => {
    if (socketRef.current) {
      socketRef.current.off('messages-read');
    }
  };

  // Message delivery status events
  const onMessageDelivered = (callback: (data: any) => void) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.on('message-delivered', callback);
    } else if (socketRef.current) {
      socketRef.current.once('connect', () => {
        socketRef.current!.on('message-delivered', callback);
      });
    }
  };

  const offMessageDelivered = () => {
    if (socketRef.current) {
      socketRef.current.off('message-delivered');
    }
  };

  // Message seen status events
  const onMessageSeen = (callback: (data: any) => void) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.on('message-seen', callback);
    } else if (socketRef.current) {
      socketRef.current.once('connect', () => {
        socketRef.current!.on('message-seen', callback);
      });
    }
  };

  const offMessageSeen = () => {
    if (socketRef.current) {
      socketRef.current.off('message-seen');
    }
  };

  // Typing indicator events
  const onUserTyping = (callback: (data: any) => void) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.on('user-typing', callback);
    } else if (socketRef.current) {
      socketRef.current.once('connect', () => {
        socketRef.current!.on('user-typing', callback);
      });
    }
  };

  const offUserTyping = () => {
    if (socketRef.current) {
      socketRef.current.off('user-typing');
    }
  };

  const emitTyping = (conversationId: string, isTyping: boolean) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('typing', { conversationId, isTyping });
    }
  };

  // Online status events
  const onUserOnline = (callback: (data: any) => void) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.on('user-online', callback);
    } else if (socketRef.current) {
      socketRef.current.once('connect', () => {
        socketRef.current!.on('user-online', callback);
      });
    }
  };

  const offUserOnline = () => {
    if (socketRef.current) {
      socketRef.current.off('user-online');
    }
  };

  const onUserOffline = (callback: (data: any) => void) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.on('user-offline', callback);
    } else if (socketRef.current) {
      socketRef.current.once('connect', () => {
        socketRef.current!.on('user-offline', callback);
      });
    }
  };

  const offUserOffline = () => {
    if (socketRef.current) {
      socketRef.current.off('user-offline');
    }
  };

  // Notification event listeners - Enhanced for reliability
  const onNewNotification = (callback: (data: any) => void) => {
    const socket = socketRef.current || globalSocket;
    
    if (socket) {
      // Remove any existing listeners to prevent duplicates
      socket.off('new-notification');
      
      if (socket.connected) {
        socket.on('new-notification', callback);
      } else {
        // Wait for connection and then add listener
        socket.once('connect', () => {
          socket.off('new-notification'); // Remove any duplicates
          socket.on('new-notification', callback);
        });
      }
    } else {
      // Retry after socket initialization
      setTimeout(() => {
        onNewNotification(callback);
      }, 500);
    }
  };

  const offNewNotification = () => {
    if (socketRef.current) {
      socketRef.current.off('new-notification');
    }
  };

  const onNotificationRead = (callback: (data: any) => void) => {
    // Use global socket if socketRef is not available
    const socket = socketRef.current || globalSocket;
    
    if (socket && socket.connected) {
      socket.on('notification-read', callback);
    } else if (socket) {
      socket.once('connect', () => {
        socket.on('notification-read', callback);
      });
    } else {
      // Retry after a short delay
      setTimeout(() => {
        onNotificationRead(callback);
      }, 1000);
    }
  };

  const offNotificationRead = () => {
    if (socketRef.current) {
      socketRef.current.off('notification-read');
    }
  };

  // Status update event listeners
  const onStatusUpdate = (callback: (data: any) => void) => {
    const socket = socketRef.current || globalSocket;
    
    if (socket && socket.connected) {
      socket.on('status-update', callback);
    } else if (socket) {
      socket.once('connect', () => {
        socket.on('status-update', callback);
      });
    } else {
      setTimeout(() => {
        onStatusUpdate(callback);
      }, 1000);
    }
  };

  const offStatusUpdate = () => {
    if (socketRef.current) {
      socketRef.current.off('status-update');
    }
  };

  return {
    socket: socketRef.current,
    joinConversation,
    leaveConversation,
    onNewMessage,
    offNewMessage,
    onMessagesRead,
    offMessagesRead,
    onMessageDelivered,
    offMessageDelivered,
    onMessageSeen,
    offMessageSeen,
    onUserTyping,
    offUserTyping,
    emitTyping,
    onUserOnline,
    offUserOnline,
    onUserOffline,
    offUserOffline,
    onNewNotification,
    offNewNotification,
    onNotificationRead,
    offNotificationRead,
    onStatusUpdate,
    offStatusUpdate
  };
};

// Global function to initialize message listeners (works across all pages)
export const initializeGlobalMessageListeners = (addNewMessage: (conversationId: string, message: any) => void, getTotalUnreadCount: () => number) => {
  if (globalListenersInitialized || !globalSocket) {
    return;
  }
  
  // Remove any existing listeners to prevent duplicates
  globalSocket.removeAllListeners('new-message');
  
  // Set up global message listener (SINGLE instance)
  globalSocket.on('new-message', (data: any) => {
    const { message, conversationId } = data;
    
    if (!message || !conversationId) {
      console.error('❌ [GLOBAL] Invalid message data received:', data);
      return;
    }
    
    // Add message using Zustand store (with duplicate protection)
    // The store will handle badge updates internally
    addNewMessage(conversationId, message);
  });
  
  globalListenersInitialized = true;
};

// Track joined event rooms globally to prevent duplicates
let joinedEventRooms = new Set<string>();

// Global function to join all event rooms (works across all pages)
export const joinAllEventRooms = (conversations: any[]) => {
  if (!globalSocket || !globalSocket.connected) {
    if (globalSocket) {
      globalSocket.once('connect', () => {
        joinAllEventRooms(conversations);
      });
    }
    return;
  }
  
  // Filter out already joined rooms to prevent spam
  const newRooms = conversations.filter(conv => {
    const eventRoomId = conv.eventId || conv.id;
    return !joinedEventRooms.has(eventRoomId);
  });
  
  if (newRooms.length === 0) {
    return;
  }
  
  newRooms.forEach(conv => {
    const eventRoomId = conv.eventId || conv.id;
    globalSocket!.emit('join-conversation', eventRoomId);
    joinedEventRooms.add(eventRoomId); // Track joined room
  });
};

// Function to reset global state (useful for cleanup)
export const resetGlobalSocketState = () => {
  joinedUserRooms.clear();
  joinedEventRooms.clear();
  globalListenersInitialized = false;
};

// Function to get global socket instance
export const getGlobalSocket = () => globalSocket;
