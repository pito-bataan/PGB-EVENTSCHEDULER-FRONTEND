import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMessagesStore } from '@/stores/messagesStore';

// Authenticated Image Component
const AuthenticatedImage: React.FC<{ 
  filePath: string; 
  fileName: string; 
  className?: string;
  onClick?: () => void;
}> = ({ filePath, fileName, className, onClick }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/messages/file/${filePath}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          setImageUrl(url);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl) {
        window.URL.revokeObjectURL(imageUrl);
      }
    };
  }, [filePath]);

  if (loading) {
    return (
      <div className={`bg-gray-200 rounded-lg p-4 flex items-center justify-center min-h-[100px] ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-gray-200 rounded-lg p-4 flex items-center justify-center min-h-[100px] ${className}`}>
        <span className="text-sm text-gray-600">📷 {fileName}</span>
      </div>
    );
  }

  return (
    <img 
      src={imageUrl}
      alt={fileName}
      className={`rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90 ${className}`}
      onClick={onClick}
    />
  );
};
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  MessageCircle, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Send, 
  Paperclip, 
  AlertCircle,
  Check,
  CheckCheck,
  Calendar,
  Smile,
  User,
  Image,
  FileText,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSocket } from '@/hooks/useSocket';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface User {
  id: string;
  name: string;
  email?: string;
  department: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

interface Message {
  _id: string;
  senderId: string | { _id: string; email: string; department: string };
  receiverId: string;
  content: string;
  messageType: 'text' | 'image' | 'file';
  timestamp: string;
  isRead: boolean;
  attachments?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
  }[];
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  eventId?: string;
  eventTitle?: string;
}

const MessagesPage: React.FC = () => {
  // Zustand store - replaces all useState calls above!
  const {
    conversations,
    messages,
    unreadCounts,
    currentUser,
    selectedConversation,
    newMessage,
    searchQuery,
    expandedEvents,
    isUploading,
    loading,
    initializeUser,
    setSelectedConversation,
    setNewMessage,
    setSearchQuery,
    toggleEventExpansion,
    sendMessage,
    sendFile,
    addNewMessage,
    updateMessageReadStatus,
    updateMessageDeliveryStatus,
    updateMessageSeenStatus,
    fetchEventConversations,
    fetchAllConversationData,
    getTotalUnreadCount,
    getFilteredConversations,
    getEventUnreadCount,
    getLatestMessage,
    getSelectedConversation,
    fixStuckMessages
  } = useMessagesStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentRoomRef = useRef<string | null>(null);

  // Enhanced Socket.IO for full real-time messaging
  const { 
    socket,
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
    offUserOffline
  } = useSocket(currentUser?.id);

  // Get selected conversation data from store (moved up to fix scope issue)
  const { conversation: selectedConv, user: selectedUser } = getSelectedConversation();
  const selectedUserId = selectedConversation?.split('-')[1];
  const conversationMessages = selectedConversation ? messages[selectedConversation] || [] : [];

  // Socket connection status
  const [socketConnected, setSocketConnected] = useState(false);
  
  useEffect(() => {
    if (socket) {
      const handleConnect = () => {
        setSocketConnected(true);
        
        // Retry joining current conversation room when connection is established
        if (selectedConversation && selectedConv) {
          const eventRoomId = selectedConv.eventId || selectedConv.id;
          joinConversation(eventRoomId);
          currentRoomRef.current = eventRoomId;
        }
      };
      
      const handleDisconnect = () => {
        setSocketConnected(false);
        currentRoomRef.current = null; // Clear current room on disconnect
      };
      
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      
      // Set initial state
      setSocketConnected(socket.connected);
      
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      };
    }
  }, [socket, selectedConversation, selectedConv, joinConversation]);

  // Temporarily disable global unread messages hook to prevent duplicate API calls
  // const { totalUnreadCount: globalUnreadCount } = useUnreadMessages(currentUser?.id);
  const globalUnreadCount = 0; // Disabled for now


  // Initialize user and fetch conversations using Zustand store
  useEffect(() => {
    initializeUser();
    
    // Restore selected conversation from localStorage (for page refresh)
    const savedConversation = localStorage.getItem('selectedConversation');
    if (savedConversation) {
      setSelectedConversation(savedConversation);
    }
    
    // Fix any stuck messages after initialization
    setTimeout(() => {
      fixStuckMessages();
    }, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // REMOVED initializeUser and fixStuckMessages to prevent infinite loop - only run once on mount

  // CRITICAL: Clear selected conversation when user leaves MessagesPage
  // This ensures badge counts update properly when user is on other pages
  // BUT keep it in localStorage for page refresh support
  useEffect(() => {
    return () => {
      setSelectedConversation(null, true); // true = skip localStorage update
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // REMOVED setSelectedConversation to prevent re-runs - only cleanup on unmount

  // Note: Auto-joining event rooms is now handled globally in messagesStore
  // This ensures users receive messages even when not on the MessagesPage

  // Periodic refresh DISABLED - relying on Socket.IO for real-time updates
  // useEffect(() => {
  //   if (!currentUser?.id) return;

  //   const refreshInterval = setInterval(() => {
  //     console.log('🔄 Periodic refresh: Fetching latest conversation data');
  //     fetchAllConversationData(true); // Force refresh
  //   }, 30000); // Reduced to every 30 seconds to prevent spam

  //   return () => clearInterval(refreshInterval);
  // }, [currentUser?.id, fetchAllConversationData]);

  // This function is now handled by the Zustand store

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation, messages]);

  // Get filtered conversations from store
  const filteredConversations = getFilteredConversations();

  // Event unread counts are now handled by the Zustand store

  // Note: Total unread count is now calculated globally by useUnreadMessages hook
  

  // This function is now handled by the Zustand store

  // This function is now handled by the Zustand store

  // This function is now handled by the Zustand store

  // Conversation selection is now handled by the Zustand store

  // CRITICAL: All message listeners are now handled globally in messagesStore
  // Local listeners have been removed to prevent duplicate message processing
  // This ensures clean real-time messaging across all pages without conflicts

  // Set up real-time seen status listener
  useEffect(() => {
    onMessagesRead((data: any) => {
      const { eventId, readerId } = data;
      
      // Update message read status using Zustand store
      updateMessageReadStatus(eventId, readerId);
    });

    // Cleanup listener on unmount
    return () => {
      offMessagesRead();
    };
  }, [onMessagesRead, offMessagesRead, updateMessageReadStatus]);

  // Set up real-time delivery status listener
  useEffect(() => {
    onMessageDelivered((data: any) => {
      const { messageId, isDelivered } = data;
      
      // Update message delivery status
      updateMessageDeliveryStatus(messageId, isDelivered);
    });

    return () => {
      offMessageDelivered();
    };
  }, [onMessageDelivered, offMessageDelivered, updateMessageDeliveryStatus]);

  // Set up real-time seen status listener
  useEffect(() => {
    onMessageSeen((data: any) => {
      const { messageId, isRead, readAt } = data;
      
      // Update message seen status
      updateMessageSeenStatus(messageId, isRead, readAt);
    });

    return () => {
      offMessageSeen();
    };
  }, [onMessageSeen, offMessageSeen, updateMessageSeenStatus]);

  // Set up typing indicator listeners
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    onUserTyping((data: any) => {
      const { userId, isTyping, conversationId } = data;
      
      // Only show typing for current conversation
      if (conversationId === selectedConversation) {
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          if (isTyping) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      }
    });

    return () => {
      offUserTyping();
    };
  }, [onUserTyping, offUserTyping, selectedConversation]);

  // Handle typing indicator when user types
  const handleTyping = () => {
    if (selectedConversation) {
      emitTyping(selectedConversation, true);
      
      // Stop typing after 3 seconds of inactivity
      setTimeout(() => {
        emitTyping(selectedConversation, false);
      }, 3000);
    }
  };

  // Conversation data fetching is now handled by the Zustand store

  // Note: Badge count is now handled globally by useUnreadMessages hook

  // Enhanced room joining with connection checking
  useEffect(() => {
    if (selectedConversation && selectedConv && socketConnected) {
      const eventRoomId = selectedConv.eventId || selectedConv.id;
      
      // Only join if we're not already in this room and socket is connected
      if (currentRoomRef.current !== eventRoomId) {
        // Leave previous room if exists
        if (currentRoomRef.current) {
          leaveConversation(currentRoomRef.current);
        }
        
        // Join the event room only when socket is connected
        joinConversation(eventRoomId);
        currentRoomRef.current = eventRoomId;
      }
    } else {

      // No conversation selected, leave current room
      if (currentRoomRef.current) {
        leaveConversation(currentRoomRef.current);
        currentRoomRef.current = null;
      }
    }
  }, [selectedConversation, selectedConv, socketConnected, joinConversation, leaveConversation]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Auto-send file when selected
      handleSendFile(file);
    }
  };

  // Handle sending file
  const handleSendFile = async (file: File) => {
    if (!selectedConversation || !selectedConv || !selectedUserId) return;
    
    const success = await sendFile(selectedConv.eventId || selectedConv.id, selectedUserId, file, newMessage);
    
    if (success) {
      setNewMessage('');
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file download with authentication
  const handleFileDownload = async (filePath: string, fileName: string) => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Extract just the filename from the full path (handle both / and \ separators)
      const filename = filePath.split(/[/\\]/).pop() || filePath;
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/messages/file/${filename}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        alert('Failed to download file. Please try again.');
      }
    } catch (error) {
      alert('Error downloading file. Please try again.');
    }
  };


  // Handle sending message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !selectedConv || !selectedUserId) return;
    
    const success = await sendMessage(selectedConv.eventId || selectedConv.id, selectedUserId, newMessage);
    
    if (success) {
      setNewMessage('');
    }
  };

  // Format time
  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM dd');
    }
  };

  // This function is now handled by the Zustand store

  return (
    <div className="min-h-screen bg-gray-100 p-0 md:p-4">
      <div className="w-full h-screen md:h-[calc(100vh-2rem)] flex bg-white md:rounded-lg md:shadow-lg overflow-hidden">
      {/* Left Sidebar - Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 bg-white border-r border-gray-200 flex-col md:rounded-l-lg`}>
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h1 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
              Messages
            </h1>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Event Groups with Expandable Users */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading conversations...</span>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-gray-500 text-sm">
                Create or get tagged in events to start messaging with other departments
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
            const isExpanded = expandedEvents.has(conv.eventId || conv.id);
            const taggedDepartments = [...new Set(conv.participants.map(p => p.department))];
            const onlineCount = conv.participants.filter(p => p.isOnline).length;
            const totalParticipants = conv.participants.length;
            
            const toggleExpanded = (e: React.MouseEvent) => {
              e.stopPropagation();
              const eventKey = conv.eventId || conv.id;
              toggleEventExpansion(eventKey);
            };
            
            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="border-b border-gray-100"
              >
                {/* Event Group Header */}
                <div 
                  className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={toggleExpanded}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate text-gray-900">
                            {conv.eventTitle}
                          </h3>
                          {(() => {
                            const eventUnreadCount = getEventUnreadCount(conv.eventId || conv.id);
                            return eventUnreadCount > 0 ? (
                              <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full">
                                {eventUnreadCount > 99 ? '99+' : eventUnreadCount}
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(new Date(conv.lastMessage.timestamp))}
                        </span>
                      </div>
                      
                      {/* Tagged Departments */}
                      <div className="flex flex-wrap gap-1 mb-1">
                        {taggedDepartments.slice(0, 2).map((dept) => (
                          <Badge key={dept} variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                            {dept}
                          </Badge>
                        ))}
                        {taggedDepartments.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-gray-50 text-gray-600 border-gray-200">
                            +{taggedDepartments.length - 2}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Participants Count */}
                      <p className="text-xs text-gray-500">
                        👥 {totalParticipants} participants • {onlineCount} online
                      </p>
                    </div>
                    
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Expanded Users List */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-50"
                  >
                    {conv.participants.map((user) => {
                      const actualUserId = typeof user.id === 'object' ? (user.id as any)._id : user.id;
                      const isUserSelected = selectedConversation === `${conv.id}-${actualUserId}`;
                      const isCurrentUser = actualUserId === currentUser?.id;
                      
                      return (
                        <div
                          key={user.id}
                          className={`pl-12 pr-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors border-l-2 ${
                            isUserSelected ? 'bg-blue-50 border-l-blue-600' : 'border-l-transparent'
                          }`}
                          onClick={() => {
                            // Extract the actual user ID - handle both string and object cases
                            const actualUserId = typeof user.id === 'object' ? (user.id as any)._id : user.id;
                            const conversationId = `${conv.id}-${actualUserId}`;
                            setSelectedConversation(conversationId);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className={`text-xs ${
                                  isCurrentUser ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {user.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {user.isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border border-white rounded-full"></div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                {(() => {
                                  const actualUserId = typeof user.id === 'object' ? (user.id as any)._id : user.id;
                                  const conversationId = `${conv.id}-${actualUserId}`;
                                  const unreadCount = unreadCounts[conversationId] || 0;
                                  const hasUnreadMessages = unreadCount > 0 && !isCurrentUser;
                                  
                                  return (
                                    <p className={`text-sm truncate ${
                                      hasUnreadMessages 
                                        ? 'font-bold text-gray-900' 
                                        : 'font-medium text-gray-900'
                                    }`}>
                                      {user.name} {isCurrentUser && '(You)'}
                                    </p>
                                  );
                                })()}
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const actualUserId = typeof user.id === 'object' ? (user.id as any)._id : user.id;
                                    const conversationId = `${conv.id}-${actualUserId}`;
                                    const unreadCount = unreadCounts[conversationId] || 0;
                                    
                                    return (
                                      <>
                                        {unreadCount > 0 && !isCurrentUser && (
                                          <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                          </Badge>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              {(() => {
                                const actualUserId = typeof user.id === 'object' ? (user.id as any)._id : user.id;
                                const conversationId = `${conv.id}-${actualUserId}`;
                                const latestMessage = getLatestMessage(conversationId);
                                
                                if (latestMessage) {
                                  const isOwnMessage = latestMessage.senderId === currentUser?.id || (latestMessage.senderId as any)?._id === currentUser?.id;
                                  const messagePreview = latestMessage.content.length > 30 
                                    ? latestMessage.content.substring(0, 30) + '...' 
                                    : latestMessage.content;
                                  
                                  // Check if there are unread messages for this conversation
                                  const unreadCount = unreadCounts[conversationId] || 0;
                                  const hasUnreadMessages = unreadCount > 0 && !isCurrentUser;
                                  
                                  return (
                                    <div className="flex items-center justify-between">
                                      <p className={`text-xs truncate ${
                                        hasUnreadMessages 
                                          ? 'text-gray-900 font-semibold' 
                                          : 'text-gray-500 font-normal'
                                      }`}>
                                        {isOwnMessage ? 'You: ' : ''}{messagePreview}
                                      </p>
                                      <span className="text-xs text-gray-400 ml-2">
                                        {formatMessageTime(new Date(latestMessage.timestamp))}
                                      </span>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <p className="text-xs text-gray-500">{user.department}</p>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            );
          })
          )}
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col rounded-r-lg bg-gray-50`}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-3 md:p-4 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 overflow-hidden">
                  {/* Back Button - Mobile Only */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden p-2 -ml-2 flex-shrink-0"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-700" />
                  </Button>
                  
                  <Avatar className="w-8 h-8 md:w-10 md:h-10 flex-shrink-0">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm md:text-base">
                      {selectedUser?.name?.charAt(0) || selectedUser?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <h2 className="font-semibold text-sm md:text-base truncate">
                      {selectedUser?.name || selectedUser?.email || 'Unknown User'}
                    </h2>
                    <p className="text-[10px] md:text-xs text-blue-600 truncate leading-tight" title={selectedConv.eventTitle || ''}>
                      📅 {selectedConv.eventTitle && selectedConv.eventTitle.length > 30 ? selectedConv.eventTitle.substring(0, 30) + '...' : selectedConv.eventTitle || 'Event'}
                    </p>
                    <p className="text-[10px] md:text-xs text-gray-500 truncate">
                      {selectedUser?.department} • {selectedUser?.isOnline ? 'Online' : 'Offline'}
                    </p>
                    {/* Socket Connection Status - Hidden on mobile */}
                    <p className="hidden md:flex text-xs items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {socketConnected ? 'Connected' : 'Disconnected'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm">
                        <AlertCircle className="w-4 h-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-[400px] sm:w-[540px] p-0">
                      <SheetHeader className="px-6 py-4 border-b border-gray-100">
                        <SheetTitle className="text-lg font-semibold text-gray-900">Conversation Info</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col h-full">
                        {/* User Info Section */}
                        {(() => {
                          const selectedUser = selectedConv?.participants?.find(p => 
                            (typeof p.id === 'object' ? (p.id as any)._id : p.id) === selectedUserId
                          );
                          
                          return (
                            <div className="flex items-center gap-4 px-6 py-6 border-b border-gray-100">
                              <Avatar className="w-16 h-16">
                                <AvatarFallback className="text-lg bg-blue-100 text-blue-600">
                                  {selectedUser?.name?.charAt(0) || selectedUser?.email?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-lg">{selectedUser?.email || selectedUser?.name || 'Unknown User'}</h3>
                                <p className="text-sm text-gray-600">{selectedUser?.department || 'Unknown Department'}</p>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Tabs Section */}
                        <div className="flex-1 px-6 py-4">
                          <Tabs defaultValue="images" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="images" className="flex items-center gap-2">
                                <Image className="w-4 h-4" />
                                Images
                              </TabsTrigger>
                              <TabsTrigger value="files" className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Files
                              </TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="images" className="mt-4">
                              <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                                {(() => {
                                  const currentMessages = selectedConversation ? messages[selectedConversation] || [] : [];
                                  const imageMessages = currentMessages.filter(msg => 
                                    msg.attachments && msg.attachments.some((att: any) => att.mimeType?.startsWith('image/'))
                                  );
                                  
                                  if (imageMessages.length === 0) {
                                    return (
                                      <div className="col-span-3 text-center py-8 text-gray-500">
                                        <Image className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                        <p>No images shared yet</p>
                                      </div>
                                    );
                                  }
                                  
                                  return imageMessages.map((msg, index) => 
                                    msg.attachments?.map((attachment: any, attIndex: number) => {
                                      if (!attachment.mimeType?.startsWith('image/')) return null;
                                      const filePath = attachment.filePath?.split('/').pop() || attachment.filePath;
                                      return (
                                        <div key={`${index}-${attIndex}`} className="aspect-square">
                                          <AuthenticatedImage
                                            filePath={filePath}
                                            fileName={attachment.fileName}
                                            className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90"
                                            onClick={() => handleFileDownload(filePath, attachment.fileName)}
                                          />
                                        </div>
                                      );
                                    })
                                  );
                                })()}
                              </div>
                            </TabsContent>
                            
                            <TabsContent value="files" className="mt-4">
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {(() => {
                                  const currentMessages = selectedConversation ? messages[selectedConversation] || [] : [];
                                  const fileMessages = currentMessages.filter(msg => 
                                    msg.attachments && msg.attachments.some((att: any) => !att.mimeType?.startsWith('image/'))
                                  );
                                  
                                  if (fileMessages.length === 0) {
                                    return (
                                      <div className="text-center py-8 text-gray-500">
                                        <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                        <p>No files shared yet</p>
                                      </div>
                                    );
                                  }
                                  
                                  return fileMessages.map((msg, index) => 
                                    msg.attachments?.map((attachment: any, attIndex: number) => {
                                      if (attachment.mimeType?.startsWith('image/')) return null;
                                      const fileName = attachment.fileName || 'Unknown file';
                                      const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                                      const fileSize = attachment.fileSize ? `${Math.round(attachment.fileSize / 1024)}KB` : '';
                                      const filePath = attachment.filePath?.split('/').pop() || attachment.filePath;
                                      
                                      return (
                                        <div 
                                          key={`${index}-${attIndex}`}
                                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                                          onClick={() => handleFileDownload(filePath, fileName)}
                                        >
                                          <div className="w-10 h-10 bg-gray-600 rounded-md flex items-center justify-center text-white text-xs font-bold">
                                            {fileExtension.substring(0, 3)}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{fileName}</p>
                                            <p className="text-xs text-gray-500">{fileExtension} • {fileSize}</p>
                                          </div>
                                        </div>
                                      );
                                    })
                                  );
                                })()}
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 lg:p-6 pt-4 md:pt-6 lg:pt-8 bg-gray-50 min-h-0">
              {conversationMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Start a conversation</h3>
                  <p className="text-gray-500 text-sm">
                    Send a message to {selectedUser?.name} about "{selectedConv.eventTitle}"
                  </p>
                </div>
              ) : (
                conversationMessages.map((message: any) => {
                  const isOwnMessage = message.senderId._id === currentUser?.id || message.senderId === currentUser?.id;
                  const senderInfo = message.senderId._id ? message.senderId : selectedUser;
                  
                  return (
                    <motion.div
                      key={message._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
                    >
                      <div className={`max-w-xs lg:max-w-md ${isOwnMessage ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
                        {!isOwnMessage && (
                          <p className="text-xs text-gray-500 mb-1 ml-2">
                            {senderInfo?.department}
                          </p>
                        )}
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isOwnMessage
                              ? 'bg-blue-600 text-white rounded-br-md'
                              : 'bg-white text-gray-900 rounded-bl-md border border-gray-200'
                          }`}
                        >
                          {/* Render file attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mb-2">
                              {message.attachments.map((attachment: any, index: number) => {
                                const fileName = attachment.fileName || 'Unknown file';
                                const fileSize = attachment.fileSize ? `${Math.round(attachment.fileSize / 1024)}KB` : '';
                                const isImage = attachment.mimeType?.startsWith('image/');
                                const filePath = attachment.filePath?.split('/').pop() || attachment.filePath;
                                
                                return (
                                  <div key={index} className="mb-2">
                                    {isImage ? (
                                      <div className="max-w-sm">
                                        <AuthenticatedImage
                                          filePath={filePath}
                                          fileName={fileName}
                                          className="w-full max-w-[300px] max-h-[250px] min-h-[150px] object-cover rounded-lg"
                                          onClick={() => handleFileDownload(filePath, fileName)}
                                        />
                                      </div>
                                    ) : (
                                      (() => {
                                        // Get file extension
                                        const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
                                        
                                        // Get file name without extension for display
                                        const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
                                        const displayName = nameWithoutExt.length > 20 
                                          ? nameWithoutExt.substring(0, 17) + '...' 
                                          : nameWithoutExt;
                                        
                                        return (
                                          <div 
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-90 transition-all max-w-[280px] ${
                                              isOwnMessage 
                                                ? 'bg-blue-50 border border-blue-200' 
                                                : 'bg-gray-50 border border-gray-200'
                                            }`}
                                            onClick={() => handleFileDownload(filePath, fileName)}
                                          >
                                            {/* File Type Badge */}
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-md text-xs font-bold ${
                                              isOwnMessage 
                                                ? 'bg-blue-600 text-white' 
                                                : 'bg-gray-600 text-white'
                                            }`}>
                                              {fileExtension.substring(0, 3)}
                                            </div>
                                            
                                            {/* File Info */}
                                            <div className="flex-1 min-w-0">
                                              <p className={`text-sm font-medium truncate ${
                                                isOwnMessage ? 'text-blue-900' : 'text-gray-900'
                                              }`}>
                                                {displayName}
                                              </p>
                                              <p className={`text-xs ${
                                                isOwnMessage ? 'text-blue-600' : 'text-gray-500'
                                              }`}>
                                                {fileExtension} • {fileSize}
                                              </p>
                                            </div>
                                          </div>
                                        );
                                      })()
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Render text content */}
                          {message.content && message.content.trim() && (
                            (() => {
                              let content = message.content.trim();
                              
                              // Clean up old "Sent an image:" messages for images
                              if (message.messageType === 'image' && content.startsWith('Sent an image:')) {
                                return null; // Don't show this old text for images
                              }
                              
                              // Clean up old "Sent a file:" messages that might exist
                              if (message.messageType === 'file' && content.startsWith('Sent a file:')) {
                                return null; // Don't show this old text for files either
                              }
                              
                              return <p className="text-sm">{content}</p>;
                            })()
                          )}
                        </div>
                        <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-gray-500">
                            {format(new Date(message.timestamp), 'HH:mm')}
                          </span>
                          {isOwnMessage && (
                            <div className="flex items-center gap-1">
                              {message.isRead ? (
                                <div className="flex items-center gap-1 text-blue-600" title={`Seen ${message.readAt ? format(new Date(message.readAt), 'HH:mm') : ''}`}>
                                  <CheckCheck className="w-3 h-3" />
                                  <span className="text-xs">Seen</span>
                                </div>
                              ) : message.isDelivered ? (
                                <div className="flex items-center gap-1 text-gray-500" title={`Delivered ${message.deliveredAt ? format(new Date(message.deliveredAt), 'HH:mm') : ''}`}>
                                  <CheckCheck className="w-3 h-3" />
                                  <span className="text-xs">Delivered</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-gray-400" title="Sending...">
                                  <Check className="w-3 h-3" />
                                  <span className="text-xs">Sending</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}

              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2 p-3 text-gray-500 text-sm"
                >
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span>
                    {typingUsers.size === 1 ? 'Someone is typing...' : `${typingUsers.size} people are typing...`}
                  </span>
                </motion.div>
              )}

              {/* Scroll to bottom marker */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-2 md:p-3 lg:p-4 flex-shrink-0">
              {/* File Upload Input (Hidden) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,application/pdf,.doc,.docx,.txt,.zip,.rar,video/*,audio/*"
              />
              
              <div className="flex items-center gap-1.5 md:gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  title="Attach file"
                  className="p-2 flex-shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                <div className="flex-1 relative min-w-0">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping(); // Trigger typing indicator
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="pr-10 text-sm"
                  />
                  <Button variant="ghost" size="sm" className="hidden md:flex absolute right-1 top-1/2 transform -translate-y-1/2">
                    <Smile className="w-4 h-4" />
                  </Button>
                </div>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isUploading}
                  className="bg-blue-600 hover:bg-blue-700 p-2 md:px-4 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Upload Progress Indicator */}
              {isUploading && (
                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Uploading file...</span>
                </div>
              )}
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-r-lg">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default MessagesPage;
