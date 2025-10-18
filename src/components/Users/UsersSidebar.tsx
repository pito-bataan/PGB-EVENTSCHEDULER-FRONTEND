import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import EventCountBadge from '@/components/ui/event-count-badge';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useMessagesStore } from '@/stores/messagesStore';
import { useSocket } from '@/hooks/useSocket';
import { 
  Calendar, 
  CalendarDays,
  Package,
  MapPin,
  MessageSquare, 
  Building2, 
  LogOut,
  LayoutDashboard,
  CalendarPlus,
  PanelLeft,
  CalendarCheck
} from 'lucide-react';

interface UsersSidebarProps {
  user?: {
    name: string;
    email: string;
    department: string;
    avatar?: string;
  };
}

const UsersSidebar: React.FC<UsersSidebarProps> = ({ user }) => {
  // Get user data from localStorage for more accurate department info
  const [currentUser, setCurrentUser] = useState({
    id: "unknown",
    name: user?.name || "User",
    email: user?.email || "user@bataan.gov.ph",
    department: user?.department || "Department"
  });

  // Load user data from localStorage on mount
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setCurrentUser({
          id: parsedUser._id || parsedUser.id || "unknown",
          name: parsedUser.name || user?.name || "User",
          email: parsedUser.email || user?.email || "user@bataan.gov.ph",
          department: parsedUser.department || parsedUser.departmentName || user?.department || "Department"
        });
      } catch (error) {
        // Error parsing user data - using fallback values
      }
    }
  }, [user]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [permissions, setPermissions] = useState({
    myRequirements: false,
    manageLocation: false,
    myCalendar: false,
    allEvents: false,
    taggedDepartments: false
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize Socket.IO
  const { onStatusUpdate, offStatusUpdate } = useSocket(currentUser.id);

  // Event count state for My Calendar badge
  const [eventCount, setEventCount] = useState(0);
  
  // Location event count state for Manage Location badge
  const [locationEventCount, setLocationEventCount] = useState(0);
  
  // Tagged departments ongoing events count
  const [taggedDepartmentsCount, setTaggedDepartmentsCount] = useState(0);
  
  // Fetch event count for My Calendar badge
  useEffect(() => {
    const fetchEventCount = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        
        const response = await axios.get(`${API_BASE_URL}/events`, {
          headers: getAuthHeaders()
        });
        
        if (response.data.success) {
          const events = response.data.data || [];
          // Filter events for current user's department
          const departmentEvents = events.filter((event: any) => 
            event.taggedDepartments?.includes(currentUser.department) ||
            event.requestorDepartment === currentUser.department
          );
          setEventCount(departmentEvents.length);
        }
      } catch (error) {
        // Keep default count if fetch fails
        setEventCount(0);
      }
    };
    
    if (currentUser.department && currentUser.department !== "Department") {
      fetchEventCount();
    }
  }, [currentUser.department]);

  // Fetch location event count for Manage Location badge
  useEffect(() => {
    const fetchLocationEventCount = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        
        const response = await axios.get(`${API_BASE_URL}/events`, {
          headers: getAuthHeaders()
        });
        
        if (response.data.success) {
          const events = response.data.data || [];
          // Count all events that have location bookings (submitted or approved status)
          const locationBookedEvents = events.filter((event: any) => 
            event.location && 
            event.location.trim() !== '' &&
            (event.status === 'submitted' || event.status === 'approved')
          );
          setLocationEventCount(locationBookedEvents.length);
        }
      } catch (error) {
        // Keep default count if fetch fails
        setLocationEventCount(0);
      }
    };
    
    if (currentUser.department && currentUser.department !== "Department") {
      fetchLocationEventCount();
    }
  }, [currentUser.department]);

  // Fetch tagged departments ongoing events count
  useEffect(() => {
    const fetchTaggedDepartmentsCount = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        
        const response = await axios.get(`${API_BASE_URL}/events/tagged`, {
          headers: getAuthHeaders()
        });
        
        if (response.data.success) {
          const events = response.data.data || [];
          // Count only ongoing events (not completed)
          const ongoingEvents = events.filter((event: any) => {
            const userDeptReqs = event.departmentRequirements?.[currentUser.department] || [];
            const confirmedCount = userDeptReqs.filter((r: any) => (r.status || 'pending') === 'confirmed').length;
            const totalCount = userDeptReqs.length;
            // Ongoing = not all requirements are confirmed
            return totalCount === 0 || confirmedCount < totalCount;
          });
          setTaggedDepartmentsCount(ongoingEvents.length);
        }
      } catch (error) {
        // Keep default count if fetch fails
        setTaggedDepartmentsCount(0);
      }
    };
    
    if (currentUser.department && currentUser.department !== "Department" && permissions.taggedDepartments) {
      fetchTaggedDepartmentsCount();
    }
  }, [currentUser.department, permissions.taggedDepartments]);

  // Real-time refresh functions
  const refreshEventCounts = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await axios.get(`${API_BASE_URL}/events`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        const events = response.data.data || [];
        
        // Update My Calendar count
        const departmentEvents = events.filter((event: any) => 
          event.taggedDepartments?.includes(currentUser.department) ||
          event.requestorDepartment === currentUser.department
        );
        setEventCount(departmentEvents.length);
        
        // Update Manage Location count
        if (permissions.manageLocation) {
          const locationBookedEvents = events.filter((event: any) => 
            event.location && 
            event.location.trim() !== '' &&
            (event.status === 'submitted' || event.status === 'approved')
          );
          setLocationEventCount(locationBookedEvents.length);
        }
      }

      // Update Tagged Departments count
      if (permissions.taggedDepartments) {
        const taggedResponse = await axios.get(`${API_BASE_URL}/events/tagged`, {
          headers: getAuthHeaders()
        });
        
        if (taggedResponse.data.success) {
          const taggedEvents = taggedResponse.data.data || [];
          const ongoingEvents = taggedEvents.filter((event: any) => {
            const userDeptReqs = event.departmentRequirements?.[currentUser.department] || [];
            const confirmedCount = userDeptReqs.filter((r: any) => (r.status || 'pending') === 'confirmed').length;
            const totalCount = userDeptReqs.length;
            return totalCount === 0 || confirmedCount < totalCount;
          });
          setTaggedDepartmentsCount(ongoingEvents.length);
        }
      }
    } catch (error) {
      // Keep current counts if refresh fails
    }
  };

  // Refresh counts when navigating or permissions change
  useEffect(() => {
    refreshEventCounts();
  }, [location.pathname, permissions.manageLocation, permissions.myCalendar, permissions.taggedDepartments, currentUser.department]);

  // Removed polling - now using Socket.IO for real-time updates!
  // Badge counts update via Socket.IO 'status-update' event (see below)

  // Refresh when window gains focus (user comes back to the app)
  useEffect(() => {
    const handleFocus = () => {
      refreshEventCounts();
    };

    const handleStorageChange = (e: StorageEvent) => {
      // Refresh counts when localStorage changes (cross-tab sync)
      if (e.key === 'authToken' || e.key === 'userData') {
        refreshEventCounts();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUser.department, permissions]);

  // Socket.IO listener for real-time requirement status updates
  useEffect(() => {
    console.log('🔌 [SIDEBAR] Setting up Socket.IO listener, onStatusUpdate available:', typeof onStatusUpdate === 'function');
    
    if (typeof onStatusUpdate === 'function' && permissions.taggedDepartments) {
      const handleStatusUpdate = (data: any) => {
        console.log('🔔 [SIDEBAR] ✅✅✅ SOCKET.IO EVENT RECEIVED! ✅✅✅');
        console.log('📦 Event data:', data);
        
        // Immediately refresh badge count (non-blocking)
        setTimeout(() => {
          if (permissions.taggedDepartments) {
            const token = localStorage.getItem('authToken');
            if (token) {
              axios.get(`${API_BASE_URL}/events/tagged`, {
                headers: getAuthHeaders()
              })
              .then(taggedResponse => {
                if (taggedResponse.data.success) {
                  const taggedEvents = taggedResponse.data.data || [];
                  const ongoingEvents = taggedEvents.filter((event: any) => {
                    const userDeptReqs = event.departmentRequirements?.[currentUser.department] || [];
                    const confirmedCount = userDeptReqs.filter((r: any) => 
                      (r.status || 'pending') === 'confirmed'
                    ).length;
                    const totalCount = userDeptReqs.length;
                    return totalCount === 0 || confirmedCount < totalCount;
                  });
                  setTaggedDepartmentsCount(ongoingEvents.length);
                  console.log('✅ [SIDEBAR] Badge updated:', ongoingEvents.length);
                }
              })
              .catch(error => {
                console.error('Failed to update badge:', error);
              });
            }
          }
        }, 0); // Execute immediately but non-blocking
      };

      onStatusUpdate(handleStatusUpdate);

      return () => {
        if (typeof offStatusUpdate === 'function') {
          offStatusUpdate();
        }
      };
    }
  }, [currentUser.department, permissions.taggedDepartments]);

  // Use messages store for real-time unread counts
  const { 
    initializeUser: initializeMessagesUser, 
    fetchEventConversations, 
    getTotalUnreadCount,
    currentUser: messagesCurrentUser 
  } = useMessagesStore();
  
  // State for unread messages count
  const [totalUnreadMessages, setTotalUnreadMessages] = useState(0);
  const [unreadLoading, setUnreadLoading] = useState(false);

  // Initialize messages store user
  useEffect(() => {
    if (currentUser.id !== "unknown") {
      initializeMessagesUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id]); // REMOVED initializeMessagesUser to prevent infinite loop

  // Get unread count from messages store with real-time updates
  useEffect(() => {
    const updateUnreadCount = () => {
      const count = getTotalUnreadCount();
      setTotalUnreadMessages(count);
    };

    // Update immediately
    updateUnreadCount();

    // Set up interval to check for updates (reduced frequency)
    const interval = setInterval(updateUnreadCount, 15000); // Check every 15 seconds to reduce API calls

    // Listen for custom events for immediate updates
    const handleUnreadUpdate = () => {
      updateUnreadCount();
      // console.log('🔔 Sidebar: Immediate unread count update');
    };

    const handleMessageRead = () => {
      updateUnreadCount(); // INSTANT update - no delays
    };

    const handleNewMessage = () => {
      updateUnreadCount(); // INSTANT update - no delays
    };

    // Add event listeners
    window.addEventListener('unreadMessagesUpdated', handleUnreadUpdate);
    window.addEventListener('messagesReadGlobal', handleMessageRead);
    window.addEventListener('newMessageReceived', handleNewMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('unreadMessagesUpdated', handleUnreadUpdate);
      window.removeEventListener('messagesReadGlobal', handleMessageRead);
      window.removeEventListener('newMessageReceived', handleNewMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // REMOVED getTotalUnreadCount to prevent infinite loop - function is stable from Zustand

  // Fetch conversations when user changes or navigates
  useEffect(() => {
    if (currentUser.department && currentUser.department !== "Department") {
      fetchEventConversations(true); // Force refresh
      // Also update unread count immediately after fetching
      setTimeout(() => {
        const count = getTotalUnreadCount();
        setTotalUnreadMessages(count);
      }, 1000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.department, location.pathname]); // REMOVED fetchEventConversations and getTotalUnreadCount to prevent infinite loop
  



  // API Configuration
  const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch department permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/department-permissions/${currentUser.department}`, {
          headers: getAuthHeaders()
        });
        
        if (response.data.success) {
          setPermissions(response.data.data.permissions);
        }
      } catch (error) {
        // Keep default permissions if fetch fails
      }
    };

    if (currentUser.department && currentUser.department !== "Department") {
      fetchPermissions();
    }
  }, [currentUser.department]);
  
  // Dynamic navigation items based on permissions
  const getNavigationItems = () => {
    const baseItems = [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/users/dashboard' },
      { icon: CalendarPlus, label: 'Request Event', href: '/users/request-event' },
      { icon: Calendar, label: 'My Events', href: '/users/my-events' },
    ];

    const middleItems = [
      { icon: MessageSquare, label: 'Messages', href: '/users/messages' },
    ];

    const conditionalItems = [];
    
    // Add My Calendar if permitted
    if (permissions.myCalendar) {
      conditionalItems.push({ icon: CalendarDays, label: 'My Calendar', href: '/users/my-calendar' });
    }
    
    // Add My Requirements if permitted
    if (permissions.myRequirements) {
      conditionalItems.push({ icon: Package, label: 'My Requirements', href: '/users/my-requirements' });
    }
    
    // Add Manage Location if permitted
    if (permissions.manageLocation) {
      conditionalItems.push({ icon: MapPin, label: 'Manage Location', href: '/users/manage-location' });
    }
    
    // Add All Events if permitted
    if (permissions.allEvents) {
      conditionalItems.push({ icon: CalendarCheck, label: 'All Events', href: '/users/all-events' });
    }
    
    // Add Tagged Departments if permitted
    if (permissions.taggedDepartments) {
      conditionalItems.push({ icon: Building2, label: 'Tagged Departments', href: '/users/tagged-departments' });
    }

    return [...baseItems, ...middleItems, ...conditionalItems];
  };

  const navigationItems = getNavigationItems();

  const handleNavigation = (href: string) => {
    try {
      navigate(href);
    } catch (error) {
      // Navigation failed - handle silently
    }
  };

  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    // Navigate to login page
    navigate('/login');
  };

  return (
    <div className={`flex flex-col h-screen bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 relative">
        <img 
          src="/images/bataanlogo.png" 
          alt="Bataan Logo" 
          className="w-8 h-8 object-contain flex-shrink-0"
        />
        <div className={`flex-1 min-w-0 transition-opacity duration-200 ${
          isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
        }`}>
          <h2 className="text-sm font-semibold text-gray-900 truncate">Event Scheduler</h2>
          <p className="text-xs text-blue-600 truncate">Provincial Government</p>
        </div>
        
        {/* Floating Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 bg-white border border-gray-200 hover:bg-gray-50 rounded-full shadow-sm z-10"
        >
          <PanelLeft className={`h-3 w-3 transition-transform duration-200 ${
            isCollapsed ? 'rotate-180' : ''
          }`} />
        </Button>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          const isMyCalendar = item.label === 'My Calendar';
          const isMessages = item.label === 'Messages';
          const isManageLocation = item.label === 'Manage Location';
          const isTaggedDepartments = item.label === 'Tagged Departments';
          const totalEventCount = isMyCalendar ? eventCount : 0;
          

          
          return (
            <div key={item.label} className="relative">
              <Button
                variant="ghost"
                onClick={() => handleNavigation(item.href)}
                className={`w-full h-10 transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                } ${
                  isCollapsed 
                    ? 'justify-center px-2' 
                    : 'justify-start gap-3 px-3'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className={`truncate transition-opacity duration-200 ${
                  isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                }`}>
                  {item.label}
                </span>
              </Button>
              
              {/* Event Count Badge for My Calendar */}
              {isMyCalendar && totalEventCount > 0 && !isCollapsed && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full">
                  {totalEventCount > 99 ? '99+' : totalEventCount}
                </div>
              )}

              {/* Unread Messages Badge for Messages */}
              {isMessages && totalUnreadMessages > 0 && !isCollapsed && !unreadLoading && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full">
                  {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                </div>
              )}

              {/* Location Event Count Badge for Manage Location */}
              {isManageLocation && locationEventCount > 0 && !isCollapsed && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full">
                  {locationEventCount > 99 ? '99+' : locationEventCount}
                </div>
              )}

              {/* Ongoing Events Count Badge for Tagged Departments */}
              {isTaggedDepartments && taggedDepartmentsCount > 0 && !isCollapsed && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full">
                  {taggedDepartmentsCount > 99 ? '99+' : taggedDepartmentsCount}
                </div>
              )}
              
            </div>
          );
        })}
      </nav>
      
      {/* Footer */}
      <div className="border-t border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">
              {currentUser.department?.charAt(0)?.toUpperCase() || 'D'}
            </span>
          </div>
          <div className={`flex-1 min-w-0 transition-opacity duration-200 ${
            isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          }`}>
            <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.department}</p>
            <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
          </div>
        </div>
        
        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={`w-full h-9 transition-all duration-200 text-red-600 hover:bg-red-50 hover:text-red-700 ${
            isCollapsed 
              ? 'justify-center px-2' 
              : 'justify-start gap-3 px-3'
          }`}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          <span className={`truncate transition-opacity duration-200 ${
            isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
          }`}>
            Logout
          </span>
        </Button>
      </div>
    </div>
  );
};

export default UsersSidebar;
