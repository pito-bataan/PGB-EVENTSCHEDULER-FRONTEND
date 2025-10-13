import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import EventCountBadge from '@/components/ui/event-count-badge';
import { useEventCount } from '@/hooks/useEventCount';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
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
  PanelLeft
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
        console.log('🔧 Sidebar User Data:', {
          parsedUser,
          finalDepartment: parsedUser.department || parsedUser.departmentName || user?.department || "Department"
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [user]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [permissions, setPermissions] = useState({
    myRequirements: false,
    manageLocation: false,
    myCalendar: false
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Use event count hook for My Calendar badge
  const { getTotalEventCount } = useEventCount({
    userDepartment: currentUser.department,
    includeAllStatuses: false
  });

  // Re-enable global unread messages hook for real-time badge updates
  const validUserId = currentUser.id !== "unknown" ? currentUser.id : undefined;
  const { totalUnreadCount: totalUnreadMessages, isLoading: unreadLoading } = useUnreadMessages(validUserId);
  
  // Debug the hook results
  console.log('🔧 UsersSidebar - Unread Messages Hook Results:', {
    currentUserId: currentUser.id,
    validUserId,
    totalUnreadMessages,
    unreadLoading,
    currentUserDepartment: currentUser.department
  });

  // Track badge count changes in real-time
  useEffect(() => {
    console.log('🔔 SIDEBAR BADGE COUNT CHANGED:', {
      newCount: totalUnreadMessages,
      isLoading: unreadLoading,
      timestamp: new Date().toLocaleTimeString(),
      userId: currentUser.id
    });
  }, [totalUnreadMessages, unreadLoading, currentUser.id]);


  // API Configuration
  const API_BASE_URL = 'http://localhost:5000/api';
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
        console.error('Error fetching department permissions:', error);
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
      { icon: Building2, label: 'Tagged Departments', href: '/users/tagged-departments' },
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

    return [...baseItems, ...middleItems, ...conditionalItems];
  };

  const navigationItems = getNavigationItems();

  const handleNavigation = (href: string) => {
    console.log('🔧 Sidebar navigation clicked:', href);
    try {
      navigate(href);
      console.log('✅ Navigation successful to:', href);
    } catch (error) {
      console.error('❌ Navigation failed:', error);
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
          const totalEventCount = isMyCalendar ? getTotalEventCount() : 0;
          
          // Debug logging for sidebar badge
          if (isMyCalendar) {
            console.log('🔧 Sidebar Debug:', {
              isMyCalendar,
              totalEventCount,
              currentUserDepartment: currentUser.department,
              isCollapsed,
              shouldShowBadge: totalEventCount > 0 && !isCollapsed
            });
          }

          // Debug logging for messages badge
          if (isMessages) {
            console.log('🔧 Messages Badge Debug (Real-time Check):', {
              isMessages,
              totalUnreadMessages,
              unreadLoading,
              isCollapsed,
              shouldShowBadge: totalUnreadMessages > 0 && !isCollapsed && !unreadLoading,
              timestamp: new Date().toLocaleTimeString()
            });
          }
          
          return (
            <div key={item.label} className="relative">
              <Button
                variant="ghost"
                onClick={() => {
                  console.log('🖱️ Button clicked for:', item.label, 'href:', item.href);
                  handleNavigation(item.href);
                }}
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
                <EventCountBadge 
                  count={totalEventCount}
                  variant="destructive"
                  size="sm"
                  position="top-right"
                  className="absolute -top-1 -right-1"
                />
              )}

              {/* Unread Messages Badge for Messages */}
              {isMessages && totalUnreadMessages > 0 && !isCollapsed && !unreadLoading && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 flex items-center justify-center rounded-full">
                  {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
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
