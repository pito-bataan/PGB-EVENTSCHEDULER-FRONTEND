import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Types
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

interface MessagesState {
  // Data
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  unreadCounts: { [conversationId: string]: number };
  currentUser: User | null;
  
  // UI State
  selectedConversation: string | null;
  newMessage: string;
  searchQuery: string;
  expandedEvents: Set<string>;
  isUploading: boolean;
  loading: boolean;
  
  // Cache
  lastFetched: number | null;
  conversationDataFetched: Set<string>;
  CACHE_DURATION: number;
  
  // Actions
  initializeUser: () => void;
  fetchEventConversations: (force?: boolean) => Promise<void>;
  fetchConversationData: (conversationId: string, force?: boolean) => Promise<void>;
  fetchAllConversationData: (force?: boolean) => Promise<void>;
  markConversationAsRead: (eventId: string, userId: string) => Promise<void>;
  sendMessage: (eventId: string, receiverId: string, content: string) => Promise<boolean>;
  sendFile: (eventId: string, receiverId: string, file: File, content?: string) => Promise<boolean>;
  
  // UI Actions
  setSelectedConversation: (conversationId: string | null) => void;
  setNewMessage: (message: string) => void;
  setSearchQuery: (query: string) => void;
  toggleEventExpansion: (eventId: string) => void;
  setIsUploading: (uploading: boolean) => void;
  
  // Real-time updates
  addNewMessage: (conversationId: string, message: Message) => void;
  updateMessageReadStatus: (eventId: string, readerId: string) => void;
  updateUnreadCount: (conversationId: string, count: number) => void;
  
  // Getters
  getFilteredConversations: () => Conversation[];
  getEventUnreadCount: (eventId: string) => number;
  getLatestMessage: (conversationId: string) => Message | null;
  getSelectedConversation: () => { conversation: Conversation | null; user: User | null };
  
  // Cache management
  clearCache: () => void;
  isConversationDataStale: (conversationId: string) => boolean;
}

export const useMessagesStore = create<MessagesState>()(
  devtools(
    (set, get) => ({
      // Initial state
      conversations: [],
      messages: {},
      unreadCounts: {},
      currentUser: null,
      selectedConversation: null,
      newMessage: '',
      searchQuery: '',
      expandedEvents: new Set<string>(),
      isUploading: false,
      loading: false,
      lastFetched: null,
      conversationDataFetched: new Set<string>(),
      CACHE_DURATION: 5 * 60 * 1000, // 5 minutes cache
      
      // Initialize current user from localStorage
      initializeUser: () => {
        const userData = localStorage.getItem('userData');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            const currentUserData = {
              id: user._id || '1',
              name: user.email || 'User',
              department: user.department || user.departmentName || 'Unknown',
              isOnline: true
            };
            set({ currentUser: currentUserData });
            
            // Auto-fetch conversations after setting user
            get().fetchEventConversations();
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
      },
      
      // Fetch events and create conversations with caching
      fetchEventConversations: async (force = false) => {
        const state = get();
        const now = Date.now();
        
        // Check cache (unless forced)
        if (!force && state.lastFetched && (now - state.lastFetched) < state.CACHE_DURATION) {
          console.log('🎯 Using cached conversations data');
          return;
        }
        
        console.log('🔄 Fetching fresh conversations data...');
        set({ loading: true });
        
        try {
          const token = localStorage.getItem('authToken');
          const userData = localStorage.getItem('userData');
          
          if (!token || !userData) {
            set({ loading: false });
            return;
          }
          
          const user = JSON.parse(userData);
          const userDepartment = user.department || user.departmentName;
          
          // Fetch events
          const response = await fetch(`${API_BASE_URL}/api/events`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch events');
          }

          const eventsData = await response.json();
          const events = eventsData.data || [];
          
          // Filter events where current user is involved
          const relevantEvents = events.filter((event: any) => {
            return event.requestorDepartment === userDepartment || 
                   (event.taggedDepartments && event.taggedDepartments.includes(userDepartment));
          });

          // Create conversations with participants
          const conversationsPromises = relevantEvents.map(async (event: any) => {
            const participants: User[] = [];
            const isRequestor = event.requestorDepartment === userDepartment;
            
            if (isRequestor) {
              // If current user is the requestor, show users from tagged departments
              if (event.taggedDepartments) {
                for (const deptName of event.taggedDepartments) {
                  try {
                    const usersResponse = await fetch(`${API_BASE_URL}/api/users/department/${deptName}`, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    
                    if (usersResponse.ok) {
                      const usersData = await usersResponse.json();
                      const deptUsers = usersData.data || usersData || [];
                      
                      deptUsers.forEach((deptUser: any) => {
                        if (!participants.find(p => p.id === deptUser._id)) {
                          participants.push({
                            id: deptUser._id,
                            name: deptUser.email,
                            department: deptUser.department || deptUser.departmentName || deptName,
                            isOnline: Math.random() > 0.5, // Mock online status
                            lastSeen: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000)
                          });
                        }
                      });
                    }
                  } catch (error) {
                    console.error('Error fetching department users:', error);
                  }
                }
              }
            } else {
              // If current user is from tagged department, show the requestor
              participants.push({
                id: event.createdBy || 'unknown',
                name: event.contactEmail || event.requestor || 'Unknown Requestor',
                department: event.requestorDepartment || 'Unknown',
                isOnline: Math.random() > 0.5,
                lastSeen: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000)
              });
              
              // Also add other users from the same tagged department (colleagues)
              try {
                const usersResponse = await fetch(`${API_BASE_URL}/api/users/department/${userDepartment}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (usersResponse.ok) {
                  const usersData = await usersResponse.json();
                  const deptUsers = usersData.data || [];
                  
                  deptUsers.forEach((deptUser: any) => {
                    if (deptUser._id !== user._id && !participants.find(p => p.id === deptUser._id)) {
                      participants.push({
                        id: deptUser._id,
                        name: deptUser.email,
                        department: deptUser.department || deptUser.departmentName || userDepartment,
                        isOnline: Math.random() > 0.5,
                        lastSeen: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000)
                      });
                    }
                  });
                }
              } catch (error) {
                console.error('Error fetching colleague users:', error);
              }
            }

            return {
              id: event._id,
              participants,
              lastMessage: {
                _id: 'placeholder',
                senderId: event.createdBy || 'unknown',
                receiverId: '',
                content: `Event "${event.eventTitle}" has been created. Let's coordinate the requirements!`,
                messageType: 'text' as const,
                timestamp: new Date(event.createdAt || Date.now()).toISOString(),
                isRead: true
              },
              unreadCount: 0,
              isGroup: true,
              groupName: event.eventTitle,
              eventId: event._id,
              eventTitle: event.eventTitle
            };
          });

          const conversations = await Promise.all(conversationsPromises);
          
          set({
            conversations,
            lastFetched: now,
            loading: false
          });
          
          console.log('✅ Conversations data cached successfully');
          
          // Auto-fetch conversation data for all conversations
          get().fetchAllConversationData();
          
        } catch (error) {
          console.error('❌ Error fetching conversations:', error);
          set({ loading: false });
        }
      },
      
      // Fetch messages and unread counts for a specific conversation
      fetchConversationData: async (conversationId: string, force = false) => {
        const state = get();
        
        // Check if data is already fetched and not stale
        if (!force && state.conversationDataFetched.has(conversationId) && !state.isConversationDataStale(conversationId)) {
          console.log(`🎯 Using cached data for conversation ${conversationId}`);
          return;
        }
        
        try {
          const token = localStorage.getItem('authToken');
          if (!token || !state.currentUser) return;
          
          const [eventId, userId] = conversationId.split('-');
          
          // Fetch messages
          const messagesResponse = await fetch(`${API_BASE_URL}/api/messages/conversation/${eventId}/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          // Fetch unread count
          const unreadResponse = await fetch(`${API_BASE_URL}/api/messages/unread-count/${eventId}/${userId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          const updates: Partial<MessagesState> = {};
          
          if (messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            updates.messages = {
              ...state.messages,
              [conversationId]: messagesData.data || []
            };
          }
          
          if (unreadResponse.ok) {
            const unreadData = await unreadResponse.json();
            updates.unreadCounts = {
              ...state.unreadCounts,
              [conversationId]: unreadData.data?.unreadCount || 0
            };
          }
          
          // Mark as fetched
          const newFetchedSet = new Set(state.conversationDataFetched);
          newFetchedSet.add(conversationId);
          updates.conversationDataFetched = newFetchedSet;
          
          set(updates);
          
        } catch (error) {
          console.error(`❌ Error fetching conversation data for ${conversationId}:`, error);
        }
      },
      
      // Fetch all conversation data
      fetchAllConversationData: async (force = false) => {
        const state = get();
        if (!state.currentUser || state.conversations.length === 0) return;
        
        console.log('🔄 Fetching all conversation data...');
        
        const conversationIds: string[] = [];
        state.conversations.forEach(conv => {
          conv.participants.forEach(participant => {
            if (participant.id !== state.currentUser?.id) {
              const participantId = typeof participant.id === 'object' ? (participant.id as any)._id : participant.id;
              conversationIds.push(`${conv.id}-${participantId}`);
            }
          });
        });
        
        // Fetch data for all conversations in parallel
        await Promise.all(
          conversationIds.map(id => get().fetchConversationData(id, force))
        );
        
        console.log('✅ All conversation data fetched');
      },
      
      // Mark conversation as read
      markConversationAsRead: async (eventId: string, userId: string) => {
        const state = get();
        const conversationId = `${eventId}-${userId}`;
        const currentUnreadCount = state.unreadCounts[conversationId] || 0;
        
        // Optimistically update UI
        set({
          unreadCounts: {
            ...state.unreadCounts,
            [conversationId]: 0
          }
        });
        
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/api/messages/mark-conversation-read/${eventId}/${userId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            // Notify global hook via custom event
            if (currentUnreadCount > 0) {
              window.dispatchEvent(new CustomEvent('messagesReadGlobal', {
                detail: {
                  readerId: state.currentUser?.id,
                  messageCount: currentUnreadCount,
                  conversationId,
                  eventId,
                  userId
                }
              }));
            }
          } else {
            // Rollback on failure
            set({
              unreadCounts: {
                ...state.unreadCounts,
                [conversationId]: currentUnreadCount
              }
            });
          }
        } catch (error) {
          console.error('❌ Error marking conversation as read:', error);
          // Rollback on error
          set({
            unreadCounts: {
              ...state.unreadCounts,
              [conversationId]: currentUnreadCount
            }
          });
        }
      },
      
      // Send text message
      sendMessage: async (eventId: string, receiverId: string, content: string) => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(`${API_BASE_URL}/api/messages/send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              eventId,
              receiverId,
              content: content.trim(),
              messageType: 'text'
            })
          });

          if (response.ok) {
            const messageData = await response.json();
            const conversationId = `${eventId}-${receiverId}`;
            
            // Add message to local state
            get().addNewMessage(conversationId, messageData.data);
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Error sending message:', error);
          return false;
        }
      },
      
      // Send file message
      sendFile: async (eventId: string, receiverId: string, file: File, content = '') => {
        set({ isUploading: true });
        
        try {
          const token = localStorage.getItem('authToken');
          const formData = new FormData();
          formData.append('file', file);
          formData.append('eventId', eventId);
          formData.append('receiverId', receiverId);
          formData.append('content', content.trim());

          const response = await fetch(`${API_BASE_URL}/api/messages/send-file`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });

          if (response.ok) {
            const messageData = await response.json();
            const conversationId = `${eventId}-${receiverId}`;
            
            // Add message to local state
            get().addNewMessage(conversationId, messageData.data);
            return true;
          }
          return false;
        } catch (error) {
          console.error('❌ Error sending file:', error);
          return false;
        } finally {
          set({ isUploading: false });
        }
      },
      
      // UI Actions
      setSelectedConversation: (conversationId: string | null) => {
        set({ selectedConversation: conversationId });
        
        // Auto-fetch conversation data when selected
        if (conversationId) {
          get().fetchConversationData(conversationId);
          
          // Auto-mark as read
          const [eventId, userId] = conversationId.split('-');
          if (eventId && userId) {
            get().markConversationAsRead(eventId, userId);
          }
        }
      },
      
      setNewMessage: (message: string) => {
        set({ newMessage: message });
      },
      
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },
      
      toggleEventExpansion: (eventId: string) => {
        const state = get();
        const newExpanded = new Set(state.expandedEvents);
        if (newExpanded.has(eventId)) {
          newExpanded.delete(eventId);
        } else {
          newExpanded.add(eventId);
        }
        set({ expandedEvents: newExpanded });
      },
      
      setIsUploading: (uploading: boolean) => {
        set({ isUploading: uploading });
      },
      
      // Real-time updates
      addNewMessage: (conversationId: string, message: Message) => {
        const state = get();
        set({
          messages: {
            ...state.messages,
            [conversationId]: [...(state.messages[conversationId] || []), message]
          }
        });
        
        // Update unread count if not in current conversation
        if (conversationId !== state.selectedConversation) {
          set({
            unreadCounts: {
              ...state.unreadCounts,
              [conversationId]: (state.unreadCounts[conversationId] || 0) + 1
            }
          });
        }
      },
      
      updateMessageReadStatus: (eventId: string, readerId: string) => {
        const state = get();
        const updatedMessages = { ...state.messages };
        
        Object.keys(updatedMessages).forEach(convId => {
          if (convId.startsWith(eventId)) {
            updatedMessages[convId] = updatedMessages[convId].map(message => {
              if (message.senderId === state.currentUser?.id || (message.senderId as any)?._id === state.currentUser?.id) {
                return { ...message, isRead: true };
              }
              return message;
            });
          }
        });
        
        set({ messages: updatedMessages });
      },
      
      updateUnreadCount: (conversationId: string, count: number) => {
        const state = get();
        set({
          unreadCounts: {
            ...state.unreadCounts,
            [conversationId]: count
          }
        });
      },
      
      // Getters
      getFilteredConversations: () => {
        const state = get();
        if (!state.searchQuery) return state.conversations;
        
        const searchLower = state.searchQuery.toLowerCase();
        return state.conversations.filter(conv => 
          conv.participants.some(p => p.name.toLowerCase().includes(searchLower)) ||
          conv.groupName?.toLowerCase().includes(searchLower) ||
          conv.eventTitle?.toLowerCase().includes(searchLower) ||
          conv.lastMessage.content.toLowerCase().includes(searchLower)
        );
      },
      
      getEventUnreadCount: (eventId: string) => {
        const state = get();
        const conversations = state.getFilteredConversations();
        
        let total = 0;
        conversations.forEach(conv => {
          if (conv.eventId === eventId || conv.id === eventId) {
            conv.participants.forEach(participant => {
              const actualUserId = typeof participant.id === 'object' ? (participant.id as any)._id : participant.id;
              if (actualUserId !== state.currentUser?.id) {
                const conversationId = `${conv.id}-${actualUserId}`;
                total += state.unreadCounts[conversationId] || 0;
              }
            });
          }
        });
        
        return total;
      },
      
      getLatestMessage: (conversationId: string) => {
        const state = get();
        const conversationMessages = state.messages[conversationId] || [];
        if (conversationMessages.length === 0) return null;
        return conversationMessages[conversationMessages.length - 1];
      },
      
      getSelectedConversation: () => {
        const state = get();
        if (!state.selectedConversation) {
          return { conversation: null, user: null };
        }
        
        const [eventId, userId] = state.selectedConversation.split('-');
        const conversation = state.conversations.find(c => c.id === eventId);
        const user = conversation?.participants.find(p => {
          const participantId = typeof p.id === 'object' ? (p.id as any)._id : p.id;
          return participantId === userId;
        });
        
        return { conversation: conversation || null, user: user || null };
      },
      
      // Cache management
      clearCache: () => {
        set({
          conversations: [],
          messages: {},
          unreadCounts: {},
          lastFetched: null,
          conversationDataFetched: new Set<string>(),
          selectedConversation: null,
          expandedEvents: new Set<string>()
        });
      },
      
      isConversationDataStale: (conversationId: string) => {
        const state = get();
        // Consider data stale after 2 minutes for active conversations
        return state.lastFetched ? (Date.now() - state.lastFetched) > (2 * 60 * 1000) : true;
      },
    }),
    {
      name: 'messages-store',
    }
  )
);
