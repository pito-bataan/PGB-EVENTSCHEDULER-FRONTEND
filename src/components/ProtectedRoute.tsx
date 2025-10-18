import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Check if user is authenticated by checking for auth token
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
