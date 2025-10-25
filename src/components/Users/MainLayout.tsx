import React, { useEffect, useState } from 'react';
import UsersSidebar from './UsersSidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    department: string;
    avatar?: string;
  };
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <UsersSidebar user={currentUser} />
      <main className="flex-1 overflow-auto bg-gray-50 w-full relative z-0">
        {/* Add top padding on mobile for hamburger button */}
        <div className="p-4 pt-20 lg:p-6 lg:pt-6 min-h-screen bg-gray-50">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
