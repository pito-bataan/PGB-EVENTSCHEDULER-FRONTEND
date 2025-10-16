import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

// Global socket instance to prevent multiple connections
let globalSocket: Socket | null = null;
let isConnecting = false; // Prevent multiple simultaneous connection attempts

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
        globalSocket = io('http://localhost:5000', {
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
          isConnecting = false;
        });
        
        globalSocket.on('disconnect', () => {
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

    // Always try to join user room if connected and userId provided
    if (userId && socket.connected) {
      socket.emit('join-user-room', userId);
    } else if (userId) {
      // If not connected yet, wait for connection
      socket.once('connect', () => {
        socket.emit('join-user-room', userId);
      });
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect global socket - let other components reuse it
      // socket.disconnect();
    };
  }, [userId]);

  // Re-enabled Socket.IO functions with proper error handling
  const joinConversation = (conversationId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join-conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave-conversation', conversationId);
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
    onNewNotification,
    offNewNotification,
    onNotificationRead,
    offNotificationRead,
    onStatusUpdate,
    offStatusUpdate
  };
};
