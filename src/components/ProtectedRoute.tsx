import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  isLoggedIn?: boolean;
}

const ProtectedRoute = ({ children, isLoggedIn }: ProtectedRouteProps) => {
  // Check if user is authenticated
  // If isLoggedIn prop is provided, use it (for auto-login)
  // Otherwise, check for auth token in localStorage
  const token = localStorage.getItem('authToken');
  const isAuthenticated = isLoggedIn !== undefined ? isLoggedIn : !!token;
  
  if (!isAuthenticated) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
