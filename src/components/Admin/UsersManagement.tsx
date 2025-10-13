import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  UserPlus,
  Settings,
  Package,
  MapPin,
  CalendarDays
} from 'lucide-react';

interface User {
  _id: string;
  id?: string; // Fallback for compatibility
  username: string;
  email: string;
  department: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface NewUser {
  department: string;
  departmentEmail: string;
  username: string;
  role: string;
  password: string;
  confirmPassword: string;
}

interface DepartmentPermissions {
  department: string;
  permissions: {
    myRequirements: boolean;
    manageLocation: boolean;
    myCalendar: boolean;
  };
}

interface EditUser {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'inactive';
  newPassword: string;
  confirmPassword: string;
}

const UsersManagement: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<EditUser>({
    id: '',
    username: '',
    email: '',
    status: 'active',
    newPassword: '',
    confirmPassword: ''
  });
  const [departmentPermissions, setDepartmentPermissions] = useState<DepartmentPermissions>({
    department: '',
    permissions: {
      myRequirements: false,
      manageLocation: false,
      myCalendar: false
    }
  });
  const [newUser, setNewUser] = useState<NewUser>({
    department: '',
    departmentEmail: '',
    username: '',
    role: '',
    password: '',
    confirmPassword: ''
  });

  // Users data from API
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const departments = [
    'ACCOUNTING',
    'ADMINISTRATOR',
    'ASSESSOR',
    'BAC',
    'BCMH',
    'BHSO',
    'BUDGET',
    'DOLE',
    'INB',
    'JCPJMH',
    'LEGAL',
    'MBDA',
    'MDH',
    'ODH',
    'OMSP',
    'OPA',
    'OPAgriculturist',
    'OPG',
    'OPPDC',
    'OSM',
    'OSSP',
    'OVG',
    'PCEDO',
    'PDRRMO',
    'PEO',
    'PESO',
    'PG-ENRO',
    'PGO',
    'PGO-BAC',
    'PGO-IAS',
    'PGO-ISKOLAR',
    'PGSO',
    'PHO',
    'PHRMO',
    'PIO',
    'PITO',
    'PLO',
    'PMO',
    'PPDO',
    'PPO',
    'PPP',
    'PSWDO',
    'SAP',
    'SP',
    'TOURISM',
    'TREASURY',
    'VET'
  ];

  const roles = ['User', 'Admin'];

  // API Configuration
  const API_BASE_URL = 'http://localhost:5000/api';
  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch department permissions
  const fetchDepartmentPermissions = async (department: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/department-permissions/${department}`, {
        headers: getAuthHeaders()
      });
      
      if (response.data.success) {
        setDepartmentPermissions(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching department permissions:', error);
      // If no permissions found, use defaults
      setDepartmentPermissions({
        department,
        permissions: {
          myRequirements: false,
          manageLocation: false,
          myCalendar: false
        }
      });
    }
  };

  // Update department permissions
  const updateDepartmentPermissions = async () => {
    try {
      setLoading(true);
      const response = await axios.put(
        `${API_BASE_URL}/department-permissions/${selectedDepartment}`,
        { permissions: departmentPermissions.permissions },
        { headers: getAuthHeaders() }
      );
      
      if (response.data.success) {
        toast.success('Department permissions updated successfully!');
        setShowPermissionsModal(false);
      }
    } catch (error: any) {
      console.error('Error updating department permissions:', error);
      toast.error(error.response?.data?.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening permissions modal
  const handleEditPermissions = async (department: string) => {
    setSelectedDepartment(department);
    await fetchDepartmentPermissions(department);
    setShowPermissionsModal(true);
  };

  // Handle opening edit user modal
  const handleEditUser = (user: User) => {
    console.log('🔍 User object for editing:', user);
    console.log('🆔 User ID fields:', { _id: user._id, id: user.id });
    
    const userId = user._id || user.id || '';
    console.log('✅ Selected user ID:', userId);
    
    setEditingUser({
      id: userId,
      username: user.username,
      email: user.email,
      status: user.status,
      newPassword: '',
      confirmPassword: ''
    });
    setShowEditModal(true);
  };

  // Handle editing user input changes
  const handleEditInputChange = (field: keyof EditUser, value: string) => {
    setEditingUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update user information
  const handleUpdateUser = async () => {
    try {
      setLoading(true);
      
      // Validate password if provided
      if (editingUser.newPassword || editingUser.confirmPassword) {
        if (editingUser.newPassword !== editingUser.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        if (editingUser.newPassword.length < 6) {
          toast.error('Password must be at least 6 characters long');
          return;
        }
      }

      // Prepare update data
      const updateData: any = {
        username: editingUser.username,
        email: editingUser.email,
        status: editingUser.status
      };

      // Add password if provided
      if (editingUser.newPassword) {
        updateData.password = editingUser.newPassword;
      }
      
      const response = await axios.put(`${API_BASE_URL}/users/${editingUser.id}`, updateData, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        toast.success('User updated successfully!');
        await fetchUsers(); // Refresh the users list
        setShowEditModal(false);
      }
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  // Handle opening delete confirmation dialog
  const handleDeleteUser = (user: User) => {
    console.log('🗑️ Preparing to delete user:', user.username);
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  // Confirm and delete user
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setLoading(true);
      console.log('🗑️ Deleting user:', userToDelete.username);
      
      const response = await axios.delete(`${API_BASE_URL}/users/${userToDelete._id || userToDelete.id}`, {
        headers: getAuthHeaders()
      });

      if (response.data.success) {
        toast.success(`User "${userToDelete.username}" deleted successfully!`);
        await fetchUsers(); // Refresh the users list
        setShowDeleteDialog(false);
        setUserToDelete(null);
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  // Cancel delete operation
  const cancelDeleteUser = () => {
    setShowDeleteDialog(false);
    setUserToDelete(null);
  };

  const handleInputChange = (field: keyof NewUser, value: string) => {
    setNewUser(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddUser = async () => {
    // Validation
    if (!newUser.department || !newUser.departmentEmail || !newUser.username || 
        !newUser.role || !newUser.password || !newUser.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newUser.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      
      // Check if user is logged in (has token)
      const token = localStorage.getItem('authToken');
      let endpoint = '/users/register';
      let headers: any = getAuthHeaders();
      
      // If no token, try setup endpoint for first admin
      if (!token) {
        endpoint = '/users/setup';
        headers = { 'Content-Type': 'application/json' }; // No auth needed for setup
      }
      
      // Create user via API
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, {
        username: newUser.username,
        email: newUser.departmentEmail,
        password: newUser.password,
        department: newUser.department,
        role: newUser.role
      }, {
        headers
      });

      if (response.data.success) {
        // If setup endpoint was used, save the token
        if (endpoint === '/users/setup' && response.data.data.token) {
          localStorage.setItem('authToken', response.data.data.token);
          toast.success('First admin user created! You are now logged in.');
        } else {
          toast.success('User created successfully!');
        }
        
        // Refresh users list
        await fetchUsers();
        
        // Reset form
        setNewUser({
          department: '',
          departmentEmail: '',
          username: '',
          role: '',
          password: '',
          confirmPassword: ''
        });
        
        setShowAddModal(false);
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeUsers = users.filter(user => user.status === 'active').length;
  const totalUsers = users.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600 mt-2">Manage user accounts and permissions</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Add New User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Users
            </CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{activeUsers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Departments
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{departments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Users List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id || user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'Admin' ? 'destructive' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.createdAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          title="Edit User Information"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditPermissions(user.department)}
                          title="Edit Department Permissions"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteUser(user)}
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add User Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={newUser.department} onValueChange={(value) => handleInputChange('department', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="departmentEmail">Email</Label>
                <Input
                  id="departmentEmail"
                  type="email"
                  placeholder="user@bataan.gov.ph"
                  value={newUser.departmentEmail}
                  onChange={(e) => handleInputChange('departmentEmail', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter username"
                  value={newUser.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={newUser.role} onValueChange={(value) => handleInputChange('role', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter password"
                    value={newUser.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={newUser.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddUser} 
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Permissions Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Department Sidebar Permissions
            </DialogTitle>
            <DialogDescription>
              Control which sidebar buttons are visible for <strong>{selectedDepartment}</strong> department users.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* My Requirements Permission */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium">My Requirements</h4>
                  <p className="text-sm text-gray-600">Allow users to view and manage their department requirements</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="myRequirements"
                  checked={departmentPermissions.permissions.myRequirements}
                  onChange={(e) => setDepartmentPermissions(prev => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      myRequirements: e.target.checked
                    }
                  }))}
                  className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                />
              </div>
            </div>

            {/* Manage Location Permission */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-green-600" />
                <div>
                  <h4 className="font-medium">Manage Location</h4>
                  <p className="text-sm text-gray-600">Allow users to manage location availability and bookings</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="manageLocation"
                  checked={departmentPermissions.permissions.manageLocation}
                  onChange={(e) => setDepartmentPermissions(prev => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      manageLocation: e.target.checked
                    }
                  }))}
                  className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                />
              </div>
            </div>

            {/* My Calendar Permission */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-purple-600" />
                <div>
                  <h4 className="font-medium">My Calendar</h4>
                  <p className="text-sm text-gray-600">Allow users to access their personal calendar view</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="myCalendar"
                  checked={departmentPermissions.permissions.myCalendar}
                  onChange={(e) => setDepartmentPermissions(prev => ({
                    ...prev,
                    permissions: {
                      ...prev.permissions,
                      myCalendar: e.target.checked
                    }
                  }))}
                  className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                />
              </div>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Changes will apply to all users in the {selectedDepartment} department. 
                Users may need to refresh their browser to see the updated sidebar.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={updateDepartmentPermissions} 
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Permissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit User Information
            </DialogTitle>
            <DialogDescription>
              Update user details for <strong>{editingUser.username}</strong>
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Information</TabsTrigger>
              <TabsTrigger value="password">Change Password</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editUsername">Username</Label>
                  <Input
                    id="editUsername"
                    placeholder="Enter username"
                    value={editingUser.username}
                    onChange={(e) => handleEditInputChange('username', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    placeholder="user@bataan.gov.ph"
                    value={editingUser.email}
                    onChange={(e) => handleEditInputChange('email', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select value={editingUser.status} onValueChange={(value) => handleEditInputChange('status', value as 'active' | 'inactive')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Username and email changes will affect the user's login credentials. 
                  Status changes will activate or deactivate the user account.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="password" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showEditPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={editingUser.newPassword}
                      onChange={(e) => handleEditInputChange('newPassword', e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                    >
                      {showEditPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showEditConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={editingUser.confirmPassword}
                      onChange={(e) => handleEditInputChange('confirmPassword', e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                    >
                      {showEditConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Security Note:</strong> Password must be at least 6 characters long. 
                    Leave password fields empty if you don't want to change the password.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete the user account for{' '}
                <strong className="text-red-600">{userToDelete?.username}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Warning:</strong> This action cannot be undone. All user data will be permanently deleted:
                </p>
                <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                  <li>User account and login credentials</li>
                  <li>User profile information</li>
                  <li>Associated permissions and access rights</li>
                  <li>All user activity history</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                <p className="text-sm text-blue-800">
                  <strong>📋 User Details:</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-1">
                  <li><strong>Username:</strong> {userToDelete?.username}</li>
                  <li><strong>Email:</strong> {userToDelete?.email}</li>
                  <li><strong>Department:</strong> {userToDelete?.department}</li>
                  <li><strong>Role:</strong> {userToDelete?.role}</li>
                  <li><strong>Status:</strong> {userToDelete?.status}</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteUser}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete User'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UsersManagement;
