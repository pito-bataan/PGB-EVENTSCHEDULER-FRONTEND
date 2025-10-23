import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { getGlobalSocket } from '@/hooks/useSocket';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CalendarDays, 
  Building2,
  Activity,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut,
  List
} from 'lucide-react';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

interface AdminSidebarProps {
  user?: {
    name: string;
    email: string;
    department: string;
    role?: string;
    avatar?: string;
  };
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ user }) => {
  // Use actual user data or fallback
  const currentUser = user || {
    name: "Admin User",
    email: "admin@bataan.gov.ph",
    department: "Administration",
    role: "admin"
  };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [calendarEventCount, setCalendarEventCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get user role from user prop or localStorage (normalized to lowercase)
  const getUserRole = (): string => {
    let role = 'admin'; // default
    
    if (user?.role) {
      role = user.role;
    } else {
      const userData = localStorage.getItem('userData');
      if (userData) {
        try {
          const parsed = JSON.parse(userData);
          role = parsed.role || 'admin';
        } catch {
          role = 'admin';
        }
      }
    }
    
    // Normalize to lowercase for consistent checking
    return role.toLowerCase();
  };
  
  const userRole = getUserRole();
  const isSuperAdmin = userRole === 'superadmin';
  
  // All navigation items
  const allNavigationItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard', roles: ['superadmin'] },
    { icon: Calendar, label: 'All Events', href: '/admin/all-events', roles: ['superadmin', 'admin'] },
    { icon: List, label: 'Overall Events', href: '/admin/overall-events', roles: ['superadmin', 'admin'] },
    { icon: CalendarDays, label: 'Calendar', href: '/admin/calendar', roles: ['superadmin', 'admin'] },
    { icon: Users, label: 'Users', href: '/admin/users', roles: ['superadmin'] },
    { icon: Activity, label: 'Users Logs', href: '/admin/users-logs', roles: ['superadmin'] },
    { icon: Building2, label: 'Departments', href: '/admin/departments', roles: ['superadmin'] },
  ];
  
  // Filter navigation items based on user role (case-insensitive)
  const navigationItems = allNavigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  // Fetch calendar event count
  const fetchCalendarEventCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        const events = response.data.data || [];
        // Count all events except drafts (submitted, approved, rejected, cancelled, completed)
        const count = events.filter((event: any) => 
          event.status !== 'draft'
        ).length;
        setCalendarEventCount(count);
      }
    } catch (error) {
      console.error('Error fetching calendar event count:', error);
    }
  };

  // Fetch count on mount and when location changes
  useEffect(() => {
    fetchCalendarEventCount();
    
    // Refresh every 30 seconds as fallback
    const interval = setInterval(fetchCalendarEventCount, 30000);
    
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Socket.IO real-time updates
  useEffect(() => {
    const socket = getGlobalSocket();
    
    if (!socket) {
      return;
    }

    const handleEventCreated = (data: any) => {
      fetchCalendarEventCount();
    };

    const handleEventUpdated = (data: any) => {
      fetchCalendarEventCount();
    };

    const handleEventDeleted = (data: any) => {
      fetchCalendarEventCount();
    };

    const handleEventStatusUpdated = (data: any) => {
      fetchCalendarEventCount();
    };

    // Remove existing listeners to prevent duplicates
    socket.off('event-created');
    socket.off('event-updated');
    socket.off('event-deleted');
    socket.off('event-status-updated');

    // Add listeners
    socket.on('event-created', handleEventCreated);
    socket.on('event-updated', handleEventUpdated);
    socket.on('event-deleted', handleEventDeleted);
    socket.on('event-status-updated', handleEventStatusUpdated);

    return () => {
      socket.off('event-created', handleEventCreated);
      socket.off('event-updated', handleEventUpdated);
      socket.off('event-deleted', handleEventDeleted);
      socket.off('event-status-updated', handleEventStatusUpdated);
    };
  }, []);

  const handleLogout = () => {
    // Clear authentication token and user data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    // Navigate to login page or home
    navigate('/login');
  };

  return (
    <div className={`flex flex-col h-screen bg-white border-r border-gray-200 shadow-sm transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo Section */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-100 relative">
        {!isCollapsed && (
          <>
            <img 
              src="/images/bataanlogo.png" 
              alt="Bataan Logo" 
              className="w-10 h-10 object-contain"
            />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Event Scheduler</h2>
              <p className="text-xs text-red-600 font-medium">Admin Panel</p>
            </div>
          </>
        )}
        {isCollapsed && (
          <img 
            src="/images/bataanlogo.png" 
            alt="Bataan Logo" 
            className="w-8 h-8 object-contain mx-auto"
          />
        )}
        
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-gray-200 hover:bg-gray-50 rounded-full shadow-sm"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigationItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          const isCalendar = item.href === '/admin/calendar';
          const showBadge = isCalendar && calendarEventCount > 0;
          
          return (
            <Button
              key={index}
              variant="ghost"
              onClick={() => handleNavigation(item.href)}
              className={`w-full h-11 transition-colors relative ${
                isActive 
                  ? 'bg-red-100 text-red-700 border-r-2 border-red-600'
                  : 'text-gray-700 hover:bg-red-50 hover:text-red-700'
              } ${
                isCollapsed 
                  ? 'justify-center px-0' 
                  : 'justify-start gap-3 px-3'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5" />
              {!isCollapsed && <span className="font-medium">{item.label}</span>}
              
              {/* Badge for Calendar */}
              {showBadge && !isCollapsed && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                  {calendarEventCount > 99 ? '99+' : calendarEventCount}
                </div>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Profile Section */}
      <div className="border-t border-gray-100 p-4 space-y-3">
        <div className={`flex items-center rounded-lg bg-gray-50 ${
          isCollapsed ? 'justify-center p-2' : 'gap-3 p-3'
        }`}>
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentUser.name}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {currentUser.department}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {currentUser.email}
              </p>
            </div>
          )}
        </div>
        
        {/* Logout Button */}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={`w-full h-10 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors ${
            isCollapsed 
              ? 'justify-center px-0' 
              : 'justify-start gap-3 px-3'
          }`}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">Logout</span>}
        </Button>
      </div>
    </div>
  );
};

export default AdminSidebar;
