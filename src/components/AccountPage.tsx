import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import {
  User,
  Mail,
  Building2,
  Shield,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  Check,
  Loader2,
  KeyRound,
  CalendarDays,
  LogOut,
} from 'lucide-react';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

interface UserData {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  department?: string;
  departmentName?: string;
  role?: string;
  status?: string;
  createdAt?: string;
}

const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'overview' | 'security'>('overview');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Animation ref
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  // Fade-in animation
  useEffect(() => {
    if (!loading && containerRef.current) {
      containerRef.current.style.opacity = '0';
      containerRef.current.style.transform = 'translateY(12px)';
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          containerRef.current.style.opacity = '1';
          containerRef.current.style.transform = 'translateY(0)';
        }
      });
    }
  }, [loading]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'GET',
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUserData(data.data);
        }
      } else {
        // Fallback to localStorage
        const storedUser = localStorage.getItem('userData');
        if (storedUser) {
          setUserData(JSON.parse(storedUser));
        }
      }
    } catch {
      const storedUser = localStorage.getItem('userData');
      if (storedUser) {
        try {
          setUserData(JSON.parse(storedUser));
        } catch {
          // ignore
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setChangingPassword(true);
      const userId = userData?._id || userData?.id;

      const response = await axios.put(
        `${API_BASE_URL}/users/${userId}`,
        {
          password: newPassword,
          ...(currentPassword ? { currentPassword } : {}),
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        toast.success('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    navigate('/login');
  };

  const handleBack = () => {
    const role = (userData?.role || '').toLowerCase();
    if (role === 'admin') {
      navigate('/admin/calendar');
    } else if (role === 'superadmin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/users/dashboard');
    }
  };

  const getUserInitials = () => {
    const name = userData?.name || userData?.username || 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getRoleBadge = () => {
    const role = (userData?.role || '').toLowerCase();
    switch (role) {
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'coordinator':
        return 'Coordinator';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1) || 'User';
    }
  };

  const getStatusColor = () => {
    const status = (userData?.status || '').toLowerCase();
    return status === 'active' ? 'bg-emerald-400' : 'bg-gray-400';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          <p className="text-sm text-gray-400 tracking-wide">Loading account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Subtle background pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(0,0,0) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div ref={containerRef} className="relative max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="group inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors duration-200 mb-8"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          <span>Back</span>
        </button>

        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mb-10">
          {/* Avatar */}
          <div className="relative mb-5">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center shadow-lg shadow-gray-200/50 ring-4 ring-white">
              <span className="text-2xl font-semibold text-white tracking-wide">
                {getUserInitials()}
              </span>
            </div>
            {/* Online status dot */}
            <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full ${getStatusColor()} ring-3 ring-white`} />
          </div>

          {/* Name & info */}
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
            {userData?.name || userData?.username || 'User'}
          </h1>
          <p className="text-sm text-gray-400 mb-3">{userData?.email}</p>

          {/* Role badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200/60">
            <Shield className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-600 tracking-wide uppercase">
              {getRoleBadge()}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-1 mb-8 p-1 bg-gray-100/80 rounded-xl max-w-xs mx-auto">
          <button
            onClick={() => setActiveSection('overview')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeSection === 'overview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeSection === 'security'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Security
          </button>
        </div>

        {/* Content */}
        {activeSection === 'overview' && (
          <div className="space-y-3 animate-in fade-in duration-300">
            {/* Info Card */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {/* Username */}
                <div className="flex items-center gap-4 px-5 py-4 group hover:bg-gray-50/50 transition-colors duration-150">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-0.5">Username</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userData?.username || userData?.name || '—'}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-4 px-5 py-4 group hover:bg-gray-50/50 transition-colors duration-150">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-0.5">Email</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userData?.email || '—'}
                    </p>
                  </div>
                </div>

                {/* Department */}
                <div className="flex items-center gap-4 px-5 py-4 group hover:bg-gray-50/50 transition-colors duration-150">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-0.5">Department</p>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userData?.department || userData?.departmentName || '—'}
                    </p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center gap-4 px-5 py-4 group hover:bg-gray-50/50 transition-colors duration-150">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-0.5">Role</p>
                    <p className="text-sm font-medium text-gray-900">{getRoleBadge()}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-4 px-5 py-4 group hover:bg-gray-50/50 transition-colors duration-150">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-0.5">Status</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {userData?.status || 'active'}
                    </p>
                  </div>
                </div>

                {/* Member Since */}
                <div className="flex items-center gap-4 px-5 py-4 group hover:bg-gray-50/50 transition-colors duration-150">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-0.5">Member Since</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(userData?.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Logout Card */}
            <button
              onClick={handleLogout}
              className="w-full bg-white rounded-2xl border border-gray-200/60 shadow-sm px-5 py-4 flex items-center gap-4 hover:bg-red-50 hover:border-red-200/60 transition-all duration-200 group"
            >
              <div className="w-9 h-9 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                <LogOut className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-sm font-medium text-red-600">Sign Out</span>
            </button>
          </div>
        )}

        {activeSection === 'security' && (
          <div className="space-y-3 animate-in fade-in duration-300">
            {/* Password Change Card */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <KeyRound className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Update your account password</p>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-5 space-y-4">
                {/* Current Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 tracking-wide uppercase">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-gray-400 focus:ring-0 outline-none transition-all duration-200 placeholder:text-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-100" />

                {/* New Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 tracking-wide uppercase">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50/50 focus:bg-white focus:border-gray-400 focus:ring-0 outline-none transition-all duration-200 placeholder:text-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {newPassword && (
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            newPassword.length >= level * 3
                              ? newPassword.length >= 12
                                ? 'bg-emerald-400'
                                : newPassword.length >= 8
                                  ? 'bg-amber-400'
                                  : 'bg-red-300'
                              : 'bg-gray-100'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 tracking-wide uppercase">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`w-full pl-10 pr-10 py-2.5 text-sm border rounded-xl bg-gray-50/50 focus:bg-white focus:ring-0 outline-none transition-all duration-200 placeholder:text-gray-300 ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-red-300 focus:border-red-400'
                          : confirmPassword && confirmPassword === newPassword
                            ? 'border-emerald-300 focus:border-emerald-400'
                            : 'border-gray-200 focus:border-gray-400'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {/* Match indicator */}
                    {confirmPassword && confirmPassword === newPassword && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <Check className="w-4 h-4 text-emerald-500" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98] shadow-sm'
                  }`}
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Your account is secured with password authentication. Make sure to use a strong, 
                  unique password that you don't use for other accounts. Passwords must be at least 6 characters long.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-10 pb-6">
          <p className="text-xs text-gray-300">Provincial Government of Bataan • Event Scheduler</p>
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
