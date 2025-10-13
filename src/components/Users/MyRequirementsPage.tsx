import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  Zap
} from 'lucide-react';

interface Requirement {
  _id: string;
  text: string;
  type: 'physical' | 'service';
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
    type: 'physical' as 'physical' | 'service',
    totalQuantity: 1,
    isActive: true,
    isAvailable: true,
    responsiblePerson: ''
  });

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
      const response = await fetch('/api/departments/visible');
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
      }
    } catch (error) {
      console.error('Error fetching department requirements:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      text: '',
      type: 'physical',
      totalQuantity: 1,
      isActive: true,
      isAvailable: true,
      responsiblePerson: ''
    });
    setEditingRequirement(null);
  };

  // Handle add requirement
  const handleAddRequirement = () => {
    setIsAddModalOpen(true);
    resetForm();
  };

  // Handle edit requirement
  const handleEditRequirement = (requirement: Requirement) => {
    setFormData({
      text: requirement.text,
      type: requirement.type,
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
      if (!department) return;

      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No authentication token found');
        alert('Please log in again to continue.');
        return;
      }

      if (editingRequirement) {
        // Update existing requirement
        const response = await fetch(`/api/departments/${department._id}/requirements/${editingRequirement._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
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
        const response = await fetch(`/api/departments/name/${encodeURIComponent(department.name)}/requirements`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to add requirement');
        }

        const result = await response.json();
        
        // Update local state
        setDepartment({
          ...department,
          requirements: [...department.requirements, result.data]
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
  const handleDeleteRequirement = async () => {
    if (!deleteRequirementId || !department) return;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Authentication required', {
          description: 'Please log in again to continue.'
        });
        return;
      }

      const response = await fetch(`/api/departments/${department._id}/requirements/${deleteRequirementId}`, {
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
      const deletedRequirement = department.requirements.find(req => req._id === deleteRequirementId);

      // Update local state
      const updatedRequirements = department.requirements.filter(req => req._id !== deleteRequirementId);
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

      const response = await fetch(`/api/departments/${department._id}/requirements/${requirementId}/toggle`, {
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
  const services = activeRequirements.filter(req => req.type === 'service');

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
                
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Button 
                        onClick={handleAddRequirement} 
                        className="gap-2 px-6 py-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Requirement
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
                    </DialogTitle>
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
                          onValueChange={(value: 'physical' | 'service') => 
                            setFormData({...formData, type: value})
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="physical">Physical Item (has quantity)</SelectItem>
                            <SelectItem value="service">Service/Task (no quantity)</SelectItem>
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
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="active" className="gap-2">
                <CheckCircle className="w-4 h-4" />
                Active ({activeRequirements.length})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="gap-2">
                <XCircle className="w-4 h-4" />
                Inactive ({inactiveRequirements.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              {/* Physical Items */}
              {physicalItems.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Physical Requirements ({physicalItems.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {physicalItems.map((requirement, index) => (
                    <motion.div
                      key={requirement._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0 pr-3">
                              <h3 className="font-medium text-foreground truncate">{requirement.text}</h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                <Package className="w-3 h-3 flex-shrink-0" />
                                <span>Qty: {requirement.totalQuantity}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRequirement(requirement)}
                                className="h-8 px-2 text-xs gap-1 justify-start"
                              >
                                <Edit3 className="w-3 h-3" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRequirementStatus(requirement._id)}
                                className={`h-8 px-2 text-xs gap-1 justify-start ${requirement.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                              >
                                {requirement.isActive ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                {requirement.isActive ? 'Deactivate' : 'Activate'}
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
                                      onClick={() => {
                                        setDeleteRequirementId(requirement._id);
                                        handleDeleteRequirement();
                                      }}
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

            {/* Services */}
            {services.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-orange-600" />
                  Services Requirements ({services.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((requirement, index) => (
                    <motion.div
                      key={requirement._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0 pr-3">
                              <h3 className="font-medium text-foreground truncate">{requirement.text}</h3>
                              <div className="flex items-center gap-2 mt-1 text-sm">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  requirement.isAvailable 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {requirement.isAvailable ? 'Available' : 'Unavailable'}
                                </span>
                              </div>
                              {requirement.responsiblePerson && (
                                <div className="text-xs text-muted-foreground mt-1 truncate">
                                  By: {requirement.responsiblePerson}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditRequirement(requirement)}
                                className="h-8 px-2 text-xs gap-1 justify-start"
                              >
                                <Edit3 className="w-3 h-3" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRequirementStatus(requirement._id)}
                                className={`h-8 px-2 text-xs gap-1 justify-start ${requirement.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                              >
                                {requirement.isActive ? <XCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                {requirement.isActive ? 'Deactivate' : 'Activate'}
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
                                      onClick={() => {
                                        setDeleteRequirementId(requirement._id);
                                        handleDeleteRequirement();
                                      }}
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
                                {requirement.type === 'physical' ? 'Physical Item' : 'Service'}
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
                                      onClick={() => {
                                        setDeleteRequirementId(requirement._id);
                                        handleDeleteRequirement();
                                      }}
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
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyRequirementsPage;
