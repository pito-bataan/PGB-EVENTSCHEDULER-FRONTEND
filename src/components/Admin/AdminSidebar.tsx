import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CalendarDays, 
  Building2,
  FileText,
  Activity,
  Shield,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

interface AdminSidebarProps {
  user?: {
    name: string;
    email: string;
    department: string;
    avatar?: string;
  };
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ user }) => {
  // Use actual user data or fallback
  const currentUser = user || {
    name: "Admin User",
    email: "admin@bataan.gov.ph",
    department: "Administration"
  };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const navigationItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard' },
    { icon: Calendar, label: 'All Events', href: '/admin/all-events' },
    { icon: CalendarDays, label: 'Calendar', href: '/admin/calendar' },
    { icon: Users, label: 'Users', href: '/admin/users' },
    { icon: Activity, label: 'Users Logs', href: '/admin/users-logs' },
    { icon: Building2, label: 'Departments', href: '/admin/departments' },
    { icon: FileText, label: 'Reports', href: '/admin/reports' },
  ];

  const handleNavigation = (href: string) => {
    navigate(href);
  };

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
          return (
            <Button
              key={index}
              variant="ghost"
              onClick={() => handleNavigation(item.href)}
              className={`w-full h-11 transition-colors ${
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
