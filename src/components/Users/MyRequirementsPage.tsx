import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle,
  XCircle,
  Settings,
  Save,
  Sparkles,
  Zap,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import CustomCalendar from '@/components/ui/custom-calendar';
import { format } from 'date-fns';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

interface Requirement {
  _id: string;
  text: string;
  type: 'physical' | 'service' | 'yesno';
  serviceType?: 'notes' | 'yesno'; // To distinguish between service types
  totalQuantity?: number;
  isActive: boolean;
  isAvailable?: boolean; // For services
  responsiblePerson?: string; // For services
  createdAt: string;
  updatedAt?: string;
}

interface Department {
  _id: string;
  name: string;
  requirements: Requirement[];
}

const MyRequirementsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<Requirement | null>(null);
  const [deleteRequirementId, setDeleteRequirementId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    text: '',
    type: 'physical' as 'physical' | 'service' | 'yesno',
    serviceType: 'notes' as 'notes' | 'yesno',
    totalQuantity: 1,
    isActive: true,
    isAvailable: true,
    responsiblePerson: ''
  });

  // Availability Calendar State
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availabilityData, setAvailabilityData] = useState<{[key: string]: any}>({});
  const [calendarCurrentMonth, setCalendarCurrentMonth] = useState(new Date());
  const [resourceAvailabilities, setResourceAvailabilities] = useState<any[]>([]);

  // Requirements Table State
  const [requirementTab, setRequirementTab] = useState<'physical' | 'services'>('physical');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get current user
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUser(user);
        fetchDepartmentRequirements(user.department || 'PGSO');
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch department requirements
  const fetchDepartmentRequirements = async (departmentName: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/departments/visible`);
      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }
      
      const data = await response.json();
      const dept = data.data?.find((d: any) => d.name === departmentName);
      
      if (dept) {
        // Transform requirements to include type info
        const transformedRequirements = dept.requirements.map((req: any) => ({
          ...req,
          type: req.type || 'physical', // Default to physical for existing data
          isActive: req.isActive !== false, // Default to active
          totalQuantity: req.totalQuantity || 1,
          isAvailable: req.isAvailable !== false,
          responsiblePerson: req.responsiblePerson || ''
        }));
        
        setDepartment({
          ...dept,
          requirements: transformedRequirements
        });

        // Fetch resource availabilities for this department
        fetchResourceAvailabilities(dept._id);
      }
    } catch (error) {
      console.error('Error fetching department requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch resource availabilities
  const fetchResourceAvailabilities = async (departmentId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/resource-availability/department/${departmentId}/availability`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Backend returns array directly, not wrapped in data
        setResourceAvailabilities(Array.isArray(data) ? data : (data.data || []));
        console.log('📊 Fetched resource availabilities:', Array.isArray(data) ? data.length : (data.data?.length || 0));
      }
    } catch (error) {
      console.error('Error fetching resource availabilities:', error);
    }
  };

  // Convert resource availabilities to calendar events
  const getCalendarEvents = () => {
    const events: any[] = [];
    const dateMap: {[date: string]: any[]} = {};
    
    console.log('🔍 Total resourceAvailabilities:', resourceAvailabilities.length);
    
    // Group availabilities by date
    resourceAvailabilities.forEach(av => {
      if (!dateMap[av.date]) {
        dateMap[av.date] = [];
      }
      dateMap[av.date].push(av);
    });
    
    console.log('📅 Dates with availability:', Object.keys(dateMap));
    
    // Create calendar events for each date
    Object.keys(dateMap).forEach(date => {
      const dayAvailabilities = dateMap[date];
      const availableCount = dayAvailabilities.filter(a => a.isAvailable).length;
      const totalCount = dayAvailabilities.length;
      
      const event = {
        id: date,
        date: date,
        title: `${availableCount}/${totalCount} Available`,
        type: availableCount === totalCount ? 'available' : 
              availableCount === 0 ? 'unavailable' : 'custom',
        notes: `${availableCount} of ${totalCount} requirements available`
      };
      
      console.log('📊 Created event for', date, ':', event);
      events.push(event);
    });
    
    console.log('✅ Total calendar events:', events.length);
    return events;
  };

  // Get existing availability data for selected date
  const getExistingAvailabilityForDate = (dateStr: string) => {
    const existing: {[key: string]: any} = {};
    resourceAvailabilities
      .filter(av => av.date === dateStr)
      .forEach(av => {
        existing[av.requirementId] = {
          isAvailable: av.isAvailable,
          quantity: av.quantity,
          notes: av.notes
        };
      });
    return existing;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      text: '',
      type: 'physical',
      serviceType: 'notes',
      totalQuantity: 1,
      isActive: true,
      isAvailable: true,
      responsiblePerson: ''
    });
    setEditingRequirement(null);
  };

  // Handle add requirement
  const handleAddRequirement = () => {
    console.log('Add requirement button clicked');
    setIsAddModalOpen(true);
    resetForm();
    console.log('isAddModalOpen set to:', true);
  };

  // Handle edit requirement
  const handleEditRequirement = (requirement: Requirement) => {
    // Reconstruct the correct type based on serviceType or original type
    let displayType: 'physical' | 'service' | 'yesno' = requirement.type;
    let displayServiceType: 'notes' | 'yesno' = 'notes';
    
    // Check if it's a yesno service (either from serviceType or type field)
    if (requirement.type === 'yesno' || requirement.serviceType === 'yesno') {
      displayType = 'yesno';
      displayServiceType = 'yesno';
    } else if (requirement.type === 'service') {
      displayType = 'service';
      displayServiceType = requirement.serviceType || 'notes';
    }
    
    setFormData({
      text: requirement.text,
      type: displayType,
      serviceType: displayServiceType,
      totalQuantity: requirement.totalQuantity || 1,
      isActive: requirement.isActive,
      isAvailable: requirement.isAvailable || true,
      responsiblePerson: requirement.responsiblePerson || ''
    });
    setEditingRequirement(requirement);
    setIsAddModalOpen(true);
  };

  // Handle save requirement
  const handleSaveRequirement = async () => {
    try {
      console.log('Attempting to save requirement with data:', formData);
      console.log('Current department:', department);

      if (!department) {
        console.error('No department found');
        toast.error('Department information is missing');
        return;
      }

      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication required', {
          description: 'Please log in again to continue.'
        });
        return;
      }

      if (editingRequirement) {
        // Update existing requirement
        // Convert 'yesno' type to 'service' for backend compatibility
        const requestData = {
          ...formData,
          type: formData.type === 'yesno' ? 'service' : formData.type,
          serviceType: formData.type === 'yesno' ? 'yesno' : (formData.type === 'service' ? 'notes' : undefined),
          totalQuantity: (formData.type === 'service' || formData.type === 'yesno') ? undefined : formData.totalQuantity
        };
        
        const response = await fetch(`${API_BASE_URL}/departments/${department._id}/requirements/${editingRequirement._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update requirement');
        }

        const result = await response.json();
        
        // Update local state
        const updatedRequirements = department.requirements.map(req => 
          req._id === editingRequirement._id ? result.data : req
        );
        
        setDepartment({
          ...department,
          requirements: updatedRequirements
        });
      } else {
        // Add new requirement using department name
        const apiUrl = `${API_BASE_URL}/departments/name/${encodeURIComponent(department.name)}/requirements`;
        console.log('Making API call to:', apiUrl);
        console.log('With request body:', formData);
        
        // Convert 'yesno' type to 'service' for backend compatibility
        const requestData = {
          ...formData,
          type: formData.type === 'yesno' ? 'service' : formData.type,
          serviceType: formData.type === 'yesno' ? 'yesno' : (formData.type === 'service' ? 'notes' : undefined),
          totalQuantity: (formData.type === 'service' || formData.type === 'yesno') ? undefined : formData.totalQuantity
        };
        
        console.log('🔍 ADD REQUIREMENT - formData.type:', formData.type);
        console.log('📤 ADD REQUIREMENT - requestData:', requestData);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestData)
        });
        
        console.log('API Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error details:', errorData);
          throw new Error(errorData.message || 'Failed to add requirement');
        }

        const result = await response.json();
        console.log('📥 API Response data:', result.data);
        console.log('📥 serviceType from response:', result.data?.serviceType);
        
        // WORKAROUND: Backend doesn't return serviceType, so we add it manually
        const requirementWithServiceType = {
          ...result.data,
          serviceType: requestData.serviceType // Use the serviceType we sent
        };
        
        console.log('✅ Fixed requirement data:', requirementWithServiceType);
        
        // Update local state
        setDepartment({
          ...department,
          requirements: [...department.requirements, requirementWithServiceType]
        });
      }
      
      setIsAddModalOpen(false);
      resetForm();
      
      // Show success toast
      toast.success(
        editingRequirement ? 'Requirement updated successfully!' : 'Requirement added successfully!',
        {
          description: `${formData.text} has been ${editingRequirement ? 'updated' : 'added'}.`
        }
      );
    } catch (error) {
      console.error('Error saving requirement:', error);
      toast.error('Failed to save requirement', {
        description: error instanceof Error ? error.message : 'Please try again.'
      });
    }
  };

  // Handle delete requirement
  const handleDeleteRequirement = async (requirementId: string) => {
    if (!requirementId || !department) return;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication required', {
          description: 'Please log in again to continue.'
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/departments/${department._id}/requirements/${requirementId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete requirement');
      }

      // Find the deleted requirement name for toast
      const deletedRequirement = department.requirements.find(req => req._id === requirementId);

      // Update local state
      const updatedRequirements = department.requirements.filter(req => req._id !== requirementId);
      setDepartment({
        ...department,
        requirements: updatedRequirements
      });

      // Show success toast
      toast.success('Requirement deleted successfully!', {
        description: deletedRequirement ? `${deletedRequirement.text} has been removed.` : 'The requirement has been removed.'
      });

      // Reset delete state
      setDeleteRequirementId(null);
    } catch (error) {
      console.error('Error deleting requirement:', error);
      toast.error('Failed to delete requirement', {
        description: error instanceof Error ? error.message : 'Please try again.'
      });
      setDeleteRequirementId(null);
    }
  };

  // Toggle requirement active status
  const toggleRequirementStatus = async (requirementId: string) => {
    try {
      if (!department) return;

      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication required', {
          description: 'Please log in again to continue.'
        });
        return;
      }

      // Find the requirement to get its current status and name
      const requirement = department.requirements.find(req => req._id === requirementId);
      if (!requirement) return;

      const response = await fetch(`${API_BASE_URL}/departments/${department._id}/requirements/${requirementId}/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle requirement status');
      }

      const result = await response.json();

      // Update local state
      const updatedRequirements = department.requirements.map(req => 
        req._id === requirementId ? result.data : req
      );
      setDepartment({
        ...department,
        requirements: updatedRequirements
      });

      // Show success toast
      const newStatus = result.data.isActive ? 'activated' : 'deactivated';
      toast.success(`Requirement ${newStatus} successfully!`, {
        description: `${requirement.text} has been ${newStatus}.`
      });
    } catch (error) {
      console.error('Error toggling requirement status:', error);
      toast.error('Failed to update requirement status', {
        description: error instanceof Error ? error.message : 'Please try again.'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading requirements...</span>
      </div>
    );
  }

  const activeRequirements = department?.requirements.filter(req => req.isActive) || [];
  const inactiveRequirements = department?.requirements.filter(req => !req.isActive) || [];
  const physicalItems = activeRequirements.filter(req => req.type === 'physical');
  const services = activeRequirements.filter(req => req.type === 'service' || req.type === 'yesno');

  return (
    <div className="p-2 max-w-[98%] mx-auto">
      <Card className="shadow-lg">
        <CardContent className="p-8 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-xl -z-10" />
            
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      My Requirements
                    </h1>
                    <p className="text-muted-foreground">
                      Manage your department's resource inventory and services
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm font-medium">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    {department?.name || 'Department'}
                  </Badge>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button 
                    onClick={() => {
                      console.log('Add button clicked directly');
                      setIsAddModalOpen(true);
                      resetForm();
                    }}
                    className="gap-2 px-6 py-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Requirement
                  </Button>
                </motion.div>

                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingRequirement 
                        ? 'Update the details of your existing requirement.' 
                        : 'Add a new requirement for your department.'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="text">Requirement Name</Label>
                        <Input
                          id="text"
                          value={formData.text}
                          onChange={(e) => setFormData({...formData, text: e.target.value})}
                          placeholder="e.g., Chairs, Documentation, etc."
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select 
                          value={formData.type} 
                          onValueChange={(value: 'physical' | 'service' | 'yesno') => {
                            // Update serviceType based on the selected type
                            const newServiceType = value === 'yesno' ? 'yesno' : value === 'service' ? 'notes' : formData.serviceType;
                            console.log('🎯 Type changed to:', value, 'serviceType:', newServiceType);
                            setFormData({...formData, type: value, serviceType: newServiceType});
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physical">Physical Item (has quantity)</SelectItem>
                            <SelectItem value="service">Service/Task (Notes)</SelectItem>
                            <SelectItem value="yesno">Service/Task (Yes or No)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    {/* Physical Item Fields */}
                    {formData.type === 'physical' && (
                      <div className="space-y-4">
                        <h3 className="font-medium">Physical Item Details</h3>
                        <div className="space-y-2">
                          <Label htmlFor="totalQuantity">Total Quantity</Label>
                          <Input
                            id="totalQuantity"
                            type="number"
                            min="1"
                            value={formData.totalQuantity}
                            onChange={(e) => setFormData({...formData, totalQuantity: parseInt(e.target.value) || 1})}
                          />
                        </div>
                      </div>
                    )}

                    {/* Service Fields */}
                    {formData.type === 'service' && (
                      <div className="space-y-4">
                        <h3 className="font-medium">Service Details</h3>
                        <div className="space-y-2">
                          <Label htmlFor="responsiblePerson">Responsible Person</Label>
                          <Input
                            id="responsiblePerson"
                            value={formData.responsiblePerson}
                            onChange={(e) => setFormData({...formData, responsiblePerson: e.target.value})}
                            placeholder="e.g., John Doe, IT Team, etc."
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="isAvailable"
                            checked={formData.isAvailable}
                            onCheckedChange={(checked) => setFormData({...formData, isAvailable: checked})}
                          />
                          <Label htmlFor="isAvailable">Service Available</Label>
                        </div>
                      </div>
                    )}

                    {/* Yes/No Fields */}
                    {formData.type === 'yesno' && (
                      <div className="space-y-4">
                        <h3 className="font-medium">Yes/No Service Details</h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Requestors will be able to select <strong>Yes</strong> or <strong>No</strong> for this requirement.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="responsiblePerson">Responsible Person</Label>
                          <Input
                            id="responsiblePerson"
                            value={formData.responsiblePerson}
                            onChange={(e) => setFormData({...formData, responsiblePerson: e.target.value})}
                            placeholder="e.g., John Doe, IT Team, etc."
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="isAvailable"
                            checked={formData.isAvailable}
                            onCheckedChange={(checked) => setFormData({...formData, isAvailable: checked})}
                          />
                          <Label htmlFor="isAvailable">Service Available</Label>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Common Fields */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                        />
                        <Label htmlFor="isActive">Active (visible in calendar)</Label>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveRequirement} className="gap-2">
                        <Save className="w-4 h-4" />
                        {editingRequirement ? 'Update' : 'Add'} Requirement
                      </Button>
                    </div>
                  </div>
                </DialogContent>
                </Dialog>
              </div>
            </div>
          </motion.div>

          <Separator className="my-8" />

          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            {/* Total Requirements */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">Total Requirements</p>
                      <p className="text-3xl font-bold text-blue-900">{department?.requirements.length || 0}</p>
                    </div>
                    <div className="p-3 bg-blue-200/50 rounded-xl">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-blue-200/20 rounded-full" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Active Requirements */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-green-50 to-green-100/50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">Active</p>
                      <p className="text-3xl font-bold text-green-900">{activeRequirements.length}</p>
                    </div>
                    <div className="p-3 bg-green-200/50 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-green-200/20 rounded-full" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Physical Items */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-purple-50 to-purple-100/50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700 mb-1">Physical Requirements</p>
                      <p className="text-3xl font-bold text-purple-900">{physicalItems.length}</p>
                    </div>
                    <div className="p-3 bg-purple-200/50 rounded-xl">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-purple-200/20 rounded-full" />
                </CardContent>
              </Card>
            </motion.div>

            {/* Services */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-orange-100/50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700 mb-1">Services Requirements</p>
                      <p className="text-3xl font-bold text-orange-900">{services.length}</p>
                    </div>
                    <div className="p-3 bg-orange-200/50 rounded-xl">
                      <Zap className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-orange-200/20 rounded-full" />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Requirements Tabs */}
          <Tabs defaultValue="active" className="space-y-6">
            <TabsList className="grid w-fit grid-cols-3">
              <TabsTrigger value="active" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Active ({activeRequirements.length})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="gap-2">
                <XCircle className="w-4 h-4" />
                Inactive ({inactiveRequirements.length})
              </TabsTrigger>
              <TabsTrigger value="availability" className="gap-2">
                <CalendarDays className="w-4 h-4" />
                Availability Calendar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              {/* Requirements Tabs */}
              <div>
                {/* Tab Buttons */}
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={() => {
                      setRequirementTab('physical');
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-2 ${
                      requirementTab === 'physical'
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-900'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    Physical Requirements ({physicalItems.length})
                  </Button>
                  <Button
                    onClick={() => {
                      setRequirementTab('services');
                      setCurrentPage(1);
                    }}
                    className={`flex items-center gap-2 ${
                      requirementTab === 'services'
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : 'bg-orange-100 hover:bg-orange-200 text-orange-900'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    Services Requirements ({services.length})
                  </Button>
                </div>

                {/* Physical Requirements Table */}
                {requirementTab === 'physical' && physicalItems.length > 0 && (
              <div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-purple-50 hover:bg-purple-50">
                        <TableHead className="font-semibold text-purple-900">Requirement Name</TableHead>
                        <TableHead className="font-semibold text-purple-900 text-center">Quantity</TableHead>
                        <TableHead className="font-semibold text-purple-900 text-center">Status</TableHead>
                        <TableHead className="font-semibold text-purple-900 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {physicalItems
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((requirement) => (
                        <TableRow key={requirement._id} className="hover:bg-purple-50/30">
                          <TableCell className="font-medium">{requirement.text}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                              {requirement.totalQuantity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={requirement.isActive ? "default" : "secondary"} className={requirement.isActive ? "bg-green-500" : "bg-gray-400"}>
                              {requirement.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRequirement(requirement)}
                                className="h-8 px-2"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRequirementStatus(requirement._id)}
                                className={`h-8 px-2 ${requirement.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                              >
                                {requirement.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 h-8 px-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Requirement</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{requirement.text}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteRequirement(requirement._id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination for Physical Requirements */}
                {physicalItems.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, physicalItems.length)} of {physicalItems.length} requirements
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(physicalItems.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page ? "bg-purple-600 hover:bg-purple-700" : ""}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(physicalItems.length / itemsPerPage), prev + 1))}
                        disabled={currentPage === Math.ceil(physicalItems.length / itemsPerPage)}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Services Requirements Table */}
            {requirementTab === 'services' && services.length > 0 && (
              <div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-orange-50 hover:bg-orange-50">
                        <TableHead className="font-semibold text-orange-900">Service Name</TableHead>
                        <TableHead className="font-semibold text-orange-900 text-center">Type</TableHead>
                        <TableHead className="font-semibold text-orange-900 text-center">Responsible Person</TableHead>
                        <TableHead className="font-semibold text-orange-900 text-center">Status</TableHead>
                        <TableHead className="font-semibold text-orange-900 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((requirement) => (
                        <TableRow key={requirement._id} className="hover:bg-orange-50/30">
                          <TableCell className="font-medium">{requirement.text}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-xs">
                              {(requirement.serviceType === 'yesno' || requirement.type === 'yesno') ? 'Yes/No' : 'Notes'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {requirement.responsiblePerson || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={requirement.isActive ? "default" : "secondary"} className={requirement.isActive ? "bg-green-500" : "bg-gray-400"}>
                              {requirement.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRequirement(requirement)}
                                className="h-8 px-2"
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRequirementStatus(requirement._id)}
                                className={`h-8 px-2 ${requirement.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                              >
                                {requirement.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 h-8 px-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Requirement</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{requirement.text}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteRequirement(requirement._id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination for Services Requirements */}
                {services.length > itemsPerPage && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, services.length)} of {services.length} requirements
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(services.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page ? "bg-orange-600 hover:bg-orange-700" : ""}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(services.length / itemsPerPage), prev + 1))}
                        disabled={currentPage === Math.ceil(services.length / itemsPerPage)}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

              {/* Close the main requirements div */}
              </div>

            {/* Empty State */}
            {activeRequirements.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No requirements yet</h3>
                <p className="text-gray-500 mb-4">
                  Start by adding your department's resources and services
                </p>
                <Button onClick={handleAddRequirement} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Your First Requirement
                </Button>
              </motion.div>
            )}
            </TabsContent>

            <TabsContent value="inactive" className="space-y-6">
              {/* Inactive Requirements */}
              {inactiveRequirements.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-500">
                  <XCircle className="w-5 h-5" />
                  Inactive Requirements ({inactiveRequirements.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {inactiveRequirements.map((requirement, index) => (
                    <motion.div
                      key={requirement._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="opacity-60 hover:opacity-80 transition-opacity">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0 pr-3">
                              <h3 className="font-medium text-foreground truncate">{requirement.text}</h3>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {requirement.type === 'physical' ? 'Physical Item' : 
                                 (requirement.serviceType === 'yesno' || requirement.type === 'yesno') ? 'Service (Yes/No)' : 
                                 'Service (Notes)'}
                              </Badge>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled
                                className="h-8 px-2 text-xs gap-1 opacity-40 cursor-not-allowed justify-start"
                              >
                                <Edit3 className="w-3 h-3" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRequirementStatus(requirement._id)}
                                className="text-green-600 hover:text-green-700 h-8 px-2 text-xs gap-1 justify-start"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Activate
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 h-8 px-2 text-xs gap-1 justify-start"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Requirement</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{requirement.text}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteRequirement(requirement._id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State for Inactive */}
            {inactiveRequirements.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No inactive requirements</h3>
                <p className="text-gray-500">
                  All your requirements are currently active
                </p>
              </motion.div>
            )}
            </TabsContent>

            <TabsContent value="availability" className="space-y-6">
              {/* Availability Calendar Tab */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-blue-600" />
                      Requirement Availability Calendar
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click on any date to set availability for your requirements
                    </p>
                  </div>
                </div>

                {/* Calendar */}
                <Card>
                  <CardContent className="p-6">
                    <CustomCalendar
                      events={getCalendarEvents()}
                      onDateClick={(date) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        setSelectedDate(dateStr);
                        // Pre-fill with existing data
                        const existing = getExistingAvailabilityForDate(dateStr);
                        setAvailabilityData({ [dateStr]: existing });
                        setIsAvailabilityModalOpen(true);
                      }}
                      onMonthChange={setCalendarCurrentMonth}
                      showNavigation={true}
                      showLegend={true}
                      cellHeight="min-h-[120px]"
                    />
                  </CardContent>
                </Card>

                {/* Info Card */}
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2 text-sm">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-700">
                          <strong>Physical Items:</strong> Set quantity available per date
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-700">
                          <strong>Services:</strong> Mark as available/unavailable with notes
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Availability Modal */}
      <Dialog open={isAvailabilityModalOpen} onOpenChange={setIsAvailabilityModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              Set Availability for {selectedDate && format(new Date(selectedDate), 'MMMM dd, yyyy')}
            </DialogTitle>
            <DialogDescription>
              Set which requirements are available and their quantities for this date
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Physical Requirements */}
            {activeRequirements.filter(req => req.type === 'physical').length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Package className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold">Physical Requirements</h3>
                </div>
                <div className="grid gap-4">
                  {activeRequirements
                    .filter(req => req.type === 'physical')
                    .map(req => (
                      <Card key={req._id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-medium">{req.text}</h4>
                              <p className="text-sm text-muted-foreground">
                                Total Quantity: {req.totalQuantity || 1}
                              </p>
                            </div>
                            <Switch
                              checked={availabilityData[selectedDate]?.[req._id]?.isAvailable !== false}
                              onCheckedChange={(checked) => {
                                setAvailabilityData(prev => ({
                                  ...prev,
                                  [selectedDate]: {
                                    ...prev[selectedDate],
                                    [req._id]: {
                                      ...prev[selectedDate]?.[req._id],
                                      isAvailable: checked,
                                      quantity: checked ? (req.totalQuantity || 1) : 0
                                    }
                                  }
                                }));
                              }}
                            />
                          </div>
                          {availabilityData[selectedDate]?.[req._id]?.isAvailable !== false && (
                            <div className="space-y-2">
                              <Label>Available Quantity</Label>
                              <Input
                                type="number"
                                min={0}
                                max={req.totalQuantity || 1}
                                value={availabilityData[selectedDate]?.[req._id]?.quantity || req.totalQuantity || 1}
                                onChange={(e) => {
                                  const value = parseInt(e.target.value) || 0;
                                  setAvailabilityData(prev => ({
                                    ...prev,
                                    [selectedDate]: {
                                      ...prev[selectedDate],
                                      [req._id]: {
                                        ...prev[selectedDate]?.[req._id],
                                        quantity: Math.min(value, req.totalQuantity || 1)
                                      }
                                    }
                                  }));
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            )}

            {/* Service Requirements */}
            {activeRequirements.filter(req => req.type === 'service' || req.type === 'yesno').length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Settings className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold">Service Requirements</h3>
                </div>
                <div className="grid gap-4">
                  {activeRequirements
                    .filter(req => req.type === 'service' || req.type === 'yesno')
                    .map(req => (
                      <Card key={req._id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{req.text}</h4>
                                {req.serviceType === 'yesno' && (
                                  <Badge variant="secondary" className="text-xs">Yes/No</Badge>
                                )}
                              </div>
                              {req.responsiblePerson && (
                                <p className="text-sm text-muted-foreground">
                                  By: {req.responsiblePerson}
                                </p>
                              )}
                            </div>
                            <Switch
                              checked={availabilityData[selectedDate]?.[req._id]?.isAvailable !== false}
                              onCheckedChange={(checked) => {
                                setAvailabilityData(prev => ({
                                  ...prev,
                                  [selectedDate]: {
                                    ...prev[selectedDate],
                                    [req._id]: {
                                      ...prev[selectedDate]?.[req._id],
                                      isAvailable: checked
                                    }
                                  }
                                }));
                              }}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsAvailabilityModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('authToken');
                  const dateData = availabilityData[selectedDate] || {};
                  
                  // Build requirements array
                  const requirements = activeRequirements.map(req => ({
                    requirementId: req._id,
                    requirementText: req.text,
                    isAvailable: dateData[req._id]?.isAvailable !== false,
                    notes: dateData[req._id]?.notes || '',
                    quantity: dateData[req._id]?.quantity || (req.type === 'physical' ? req.totalQuantity : 1) || 1,
                    maxCapacity: req.type === 'physical' ? req.totalQuantity : 1
                  }));

                  const response = await fetch(`${API_BASE_URL}/resource-availability/availability/bulk`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      departmentId: department?._id,
                      departmentName: department?.name,
                      date: selectedDate,
                      requirements
                    })
                  });

                  if (response.ok) {
                    toast.success('Availability saved!', {
                      description: `Settings saved for ${format(new Date(selectedDate), 'MMM dd, yyyy')}`
                    });
                    // Refresh availability data
                    if (department?._id) {
                      fetchResourceAvailabilities(department._id);
                    }
                    setIsAvailabilityModalOpen(false);
                  } else {
                    throw new Error('Failed to save availability');
                  }
                } catch (error) {
                  toast.error('Failed to save availability', {
                    description: error instanceof Error ? error.message : 'Please try again'
                  });
                }
              }}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save Availability
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyRequirementsPage;
