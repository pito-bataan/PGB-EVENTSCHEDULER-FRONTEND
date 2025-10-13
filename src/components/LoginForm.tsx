import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      
      // Call login API
      const response = await axios.post(`${API_BASE_URL}/users/login`, {
        username,
        password
      });

      if (response.data.success) {
        const { user, token } = response.data.data;
        
        // Store token in localStorage
        localStorage.setItem('authToken', token);
        
        // Store user data for reference
        localStorage.setItem('userData', JSON.stringify(user));
        
        // Navigate based on user role
        if (user.role === 'Admin') {
          toast.success(`Welcome back, ${user.username}! Redirecting to Admin Panel...`);
          navigate('/admin/dashboard');
        } else {
          toast.success(`Welcome back, ${user.username}! Redirecting to User Dashboard...`);
          navigate('/users/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - 60% Blue Gradient */}
      <div className="lg:w-3/5 lg:flex hidden bg-gradient-to-br from-blue-600 via-blue-500 to-blue-700 relative overflow-hidden">
        <div className="flex flex-col justify-center items-center text-white p-12 z-10 relative w-full">
          {/* Logo */}
          <div className="mb-10">
            <img 
              src="/images/bataanlogo.png" 
              alt="Bataan Logo" 
              className="w-32 h-32 object-contain bg-white rounded-full p-3"
            />
          </div>
          
          {/* Title */}
          <h1 className="text-5xl font-bold mb-6 text-center">
            Event Scheduler
          </h1>
          
          {/* Subtitle */}
          <p className="text-2xl mb-4 text-center text-blue-100">
            Provincial Government of Bataan
          </p>
          
          {/* Description */}
          <p className="text-center text-blue-200 max-w-lg text-lg leading-relaxed mx-auto">
            Efficiently manage and organize events with our comprehensive scheduling platform
          </p>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full translate-y-48 -translate-x-48"></div>
      </div>

      {/* Right Side - 40% Login Form */}
      <div className="lg:w-2/5 w-full flex flex-col justify-center px-8 lg:px-12 bg-gray-50">
        <div className="w-full max-w-sm mx-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <img 
              src="/images/bataanlogo.png" 
              alt="Bataan Logo" 
              className="w-16 h-16 object-contain"
            />
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600">
              Sign in to manage your events
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200"
            >
              {loading ? 'Signing In...' : 'Log In'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              © 2024 Provincial Government of Bataan
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
