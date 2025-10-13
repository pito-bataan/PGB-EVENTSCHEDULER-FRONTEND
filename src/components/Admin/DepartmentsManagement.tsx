import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Settings
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  isVisible: boolean;
  createdAt: string;
  userCount: number;
  requirements?: string[];
}

interface Requirement {
  id: string;
  text: string;
  createdAt: string;
}

const API_BASE_URL = 'http://localhost:5000/api';

const DepartmentsManagement: React.FC = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [newRequirementText, setNewRequirementText] = useState('');
  const [departmentRequirements, setDepartmentRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Mock data for departments
  const [departments, setDepartments] = useState<Department[]>([
    { id: '1', name: 'ACCOUNTING', isVisible: true, createdAt: '2024-01-15', userCount: 12 },
    { id: '2', name: 'ADMINISTRATOR', isVisible: true, createdAt: '2024-01-20', userCount: 8 },
    { id: '3', name: 'ASSESSOR', isVisible: true, createdAt: '2024-01-10', userCount: 15 },
    { id: '4', name: 'BAC', isVisible: true, createdAt: '2024-02-01', userCount: 6 },
    { id: '5', name: 'BCMH', isVisible: true, createdAt: '2024-01-25', userCount: 20 },
    { id: '6', name: 'BHSO', isVisible: true, createdAt: '2024-02-05', userCount: 4 },
    { id: '7', name: 'BUDGET', isVisible: true, createdAt: '2024-01-30', userCount: 18 },
    { id: '8', name: 'DOLE', isVisible: true, createdAt: '2024-02-10', userCount: 7 },
    { id: '9', name: 'INB', isVisible: true, createdAt: '2024-02-15', userCount: 11 },
    { id: '10', name: 'JCPJMH', isVisible: true, createdAt: '2024-01-05', userCount: 9 },
    { id: '11', name: 'LEGAL', isVisible: true, createdAt: '2024-01-12', userCount: 5 },
    { id: '12', name: 'MBDA', isVisible: true, createdAt: '2024-01-18', userCount: 14 },
    { id: '13', name: 'MDH', isVisible: true, createdAt: '2024-01-22', userCount: 16 },
    { id: '14', name: 'ODH', isVisible: true, createdAt: '2024-01-28', userCount: 13 },
    { id: '15', name: 'OMSP', isVisible: true, createdAt: '2024-02-02', userCount: 8 },
    { id: '16', name: 'OPA', isVisible: true, createdAt: '2024-02-08', userCount: 10 },
    { id: '17', name: 'OPAgriculturist', isVisible: true, createdAt: '2024-02-12', userCount: 7 },
    { id: '18', name: 'OPG', isVisible: true, createdAt: '2024-02-18', userCount: 12 },
    { id: '19', name: 'OPPDC', isVisible: true, createdAt: '2024-02-22', userCount: 9 },
    { id: '20', name: 'OSM', isVisible: true, createdAt: '2024-02-25', userCount: 6 },
    { id: '21', name: 'OSSP', isVisible: true, createdAt: '2024-03-01', userCount: 11 },
    { id: '22', name: 'OVG', isVisible: true, createdAt: '2024-03-05', userCount: 15 },
    { id: '23', name: 'PCEDO', isVisible: true, createdAt: '2024-03-08', userCount: 8 },
    { id: '24', name: 'PDRRMO', isVisible: true, createdAt: '2024-03-12', userCount: 14 },
    { id: '25', name: 'PEO', isVisible: true, createdAt: '2024-03-15', userCount: 10 },
    { id: '26', name: 'PESO', isVisible: true, createdAt: '2024-03-18', userCount: 7 },
    { id: '27', name: 'PG-ENRO', isVisible: true, createdAt: '2024-03-22', userCount: 13 },
    { id: '28', name: 'PGO', isVisible: true, createdAt: '2024-03-25', userCount: 16 },
    { id: '29', name: 'PGO-BAC', isVisible: true, createdAt: '2024-03-28', userCount: 5 },
    { id: '30', name: 'PGO-IAS', isVisible: true, createdAt: '2024-04-01', userCount: 9 },
    { id: '31', name: 'PGO-ISKOLAR', isVisible: true, createdAt: '2024-04-05', userCount: 12 },
    { id: '32', name: 'PGSO', isVisible: true, createdAt: '2024-04-08', userCount: 8 },
    { id: '33', name: 'PHO', isVisible: true, createdAt: '2024-04-12', userCount: 18 },
    { id: '34', name: 'PHRMO', isVisible: true, createdAt: '2024-04-15', userCount: 6 },
    { id: '35', name: 'PIO', isVisible: true, createdAt: '2024-04-18', userCount: 11 },
    { id: '36', name: 'PITO', isVisible: true, createdAt: '2024-04-22', userCount: 22 },
    { id: '37', name: 'PLO', isVisible: true, createdAt: '2024-04-25', userCount: 7 },
    { id: '38', name: 'PMO', isVisible: true, createdAt: '2024-04-28', userCount: 14 },
    { id: '39', name: 'PPDO', isVisible: true, createdAt: '2024-05-01', userCount: 10 },
    { id: '40', name: 'PPO', isVisible: true, createdAt: '2024-05-05', userCount: 25 },
    { id: '41', name: 'PPP', isVisible: true, createdAt: '2024-05-08', userCount: 4 },
    { id: '42', name: 'PSWDO', isVisible: true, createdAt: '2024-05-12', userCount: 13 },
    { id: '43', name: 'SAP', isVisible: true, createdAt: '2024-05-15', userCount: 8 },
    { id: '44', name: 'SP', isVisible: true, createdAt: '2024-05-18', userCount: 12 },
    { id: '45', name: 'TOURISM', isVisible: true, createdAt: '2024-05-22', userCount: 9 },
    { id: '46', name: 'TREASURY', isVisible: true, createdAt: '2024-05-25', userCount: 15 },
    { id: '47', name: 'VET', isVisible: true, createdAt: '2024-05-28', userCount: 6 }
  ]);

  const toggleDepartmentVisibility = (id: string) => {
    setDepartments(prev =>
      prev.map(dept =>
        dept.id === id ? { ...dept, isVisible: !dept.isVisible } : dept
      )
    );
  };

  const handleAddDepartment = () => {
    if (!newDepartmentName.trim()) {
      toast.error('Please enter a department name');
      return;
    }

    // Check if department already exists
    const exists = departments.some(dept => 
      dept.name.toLowerCase() === newDepartmentName.toLowerCase()
    );

    if (exists) {
      toast.error('Department already exists');
      return;
    }

    const newDepartment: Department = {
      id: Date.now().toString(),
      name: newDepartmentName.trim(),
      isVisible: true,
      createdAt: new Date().toISOString().split('T')[0],
      userCount: 0
    };

    setDepartments(prev => [...prev, newDepartment]);
    setNewDepartmentName('');
    setShowAddModal(false);
    toast.success('Department added successfully!');
  };

  const handleDeleteDepartment = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}" department?`)) {
      setDepartments(prev => prev.filter(dept => dept.id !== id));
      toast.success('Department deleted successfully!');
    }
  };

  const handleOpenRequirements = async (department: Department) => {
    setSelectedDepartment(department);
    setShowRequirementsModal(true);
    
    // Fetch existing requirements for this department
    try {
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(
        `${API_BASE_URL}/departments/${department.id}/requirements`,
        { headers }
      );

      if (response.data.success) {
        // Map _id to id for frontend compatibility
        const mappedRequirements = (response.data.data || []).map((req: any) => ({
          id: req._id,
          text: req.text,
          createdAt: req.createdAt
        }));
        setDepartmentRequirements(mappedRequirements);
      }
    } catch (error: any) {
      console.error('Error fetching requirements:', error);
      setDepartmentRequirements([]);
    }
  };

  const handleAddRequirement = async () => {
    if (!selectedDepartment || !newRequirementText.trim()) {
      toast.error('Please enter a requirement');
      return;
    }

    try {
      setLoading(true);
      
      // Get auth headers
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Call API to add requirement
      const response = await axios.post(
        `${API_BASE_URL}/departments/${selectedDepartment.id}/requirements`,
        { requirement: newRequirementText.trim() },
        { headers }
      );

      if (response.data.success) {
        // Add to local state
        const newRequirement: Requirement = {
          id: response.data.data.id,
          text: newRequirementText.trim(),
          createdAt: new Date().toISOString()
        };
        
        setDepartmentRequirements(prev => [...prev, newRequirement]);
        setNewRequirementText('');
        toast.success('Requirement added successfully!');
      }
    } catch (error: any) {
      console.error('Error adding requirement:', error);
      toast.error(error.response?.data?.message || 'Failed to add requirement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequirement = async (requirementId: string) => {
    if (!selectedDepartment) return;

    try {
      setLoading(true);
      
      const token = localStorage.getItem('authToken');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.delete(
        `${API_BASE_URL}/departments/${selectedDepartment.id}/requirements/${requirementId}`,
        { headers }
      );

      if (response.data.success) {
        setDepartmentRequirements(prev => 
          prev.filter(req => req.id !== requirementId)
        );
        toast.success('Requirement deleted successfully!');
      }
    } catch (error: any) {
      console.error('Error deleting requirement:', error);
      toast.error(error.response?.data?.message || 'Failed to delete requirement');
    } finally {
      setLoading(false);
    }
  };

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredDepartments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDepartments = filteredDepartments.slice(startIndex, endIndex);

  const visibleDepartments = departments.filter(dept => dept.isVisible).length;
  const totalDepartments = departments.length;
  const totalUsers = departments.reduce((sum, dept) => sum + dept.userCount, 0);

  // Load departments from database on component mount
  React.useEffect(() => {
    const loadDepartments = async () => {
      try {
        setSyncing(true);
        const token = localStorage.getItem('authToken');
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // First, try to get existing departments from database
        const response = await axios.get(`${API_BASE_URL}/departments`, { headers });

        if (response.data.success && response.data.data.length > 0) {
          // Departments exist in database, use them
          const dbDepartments = response.data.data.map((dept: any) => ({
            id: dept._id,
            name: dept.name,
            isVisible: dept.isVisible,
            createdAt: dept.createdAt.split('T')[0],
            userCount: 0, // This would come from user collection count
            requirements: dept.requirements
          }));
          setDepartments(dbDepartments);
          console.log('✅ Loaded departments from database');
        } else {
          // No departments in database, sync mock data
          console.log('🔄 No departments found, syncing mock data...');
          const syncResponse = await axios.post(
            `${API_BASE_URL}/departments/sync`,
            { departments },
            { headers }
          );

          if (syncResponse.data.success) {
            setDepartments(syncResponse.data.data);
            console.log('✅ Mock departments synced to database');
          }
        }
      } catch (error) {
        console.error('Error loading departments:', error);
        // Continue with mock data if both operations fail
        setSyncing(false);
      } finally {
        setSyncing(false);
      }
    };

    loadDepartments();
  }, []);

  // Reset to first page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (syncing) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading departments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments Management</h1>
          <p className="text-gray-600 mt-2">Manage departments and their visibility</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Departments
            </CardTitle>
            <Building2 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalDepartments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Visible Departments
            </CardTitle>
            <Eye className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{visibleDepartments}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Users
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{totalUsers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Departments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Departments List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search departments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Visibility</TableHead>
                  <TableHead>Department Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDepartments.map((department, index) => (
                  <TableRow 
                    key={department.id}
                    className={`${!department.isVisible ? 'opacity-50' : ''} ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDepartmentVisibility(department.id)}
                        className="p-1"
                      >
                        {department.isVisible ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell 
                      className={`font-medium ${!department.isVisible ? 'text-gray-400' : 'text-gray-900'}`}
                    >
                      {department.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={department.isVisible ? 'default' : 'secondary'}>
                        {department.isVisible ? 'Visible' : 'Hidden'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={!department.isVisible}
                          className={!department.isVisible ? 'opacity-50 cursor-not-allowed' : ''}
                          onClick={() => handleOpenRequirements(department)}
                          title="Manage Requirements"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          disabled={!department.isVisible}
                          className={!department.isVisible ? 'opacity-50 cursor-not-allowed' : ''}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteDepartment(department.id, department.name)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Department Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Department</DialogTitle>
            <DialogDescription>
              Create a new department for the organization.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="departmentName">Department Name</Label>
              <Input
                id="departmentName"
                placeholder="Enter department name"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddDepartment();
                  }
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddDepartment} className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Requirements Modal */}
      <Dialog open={showRequirementsModal} onOpenChange={setShowRequirementsModal}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Requirements - {selectedDepartment?.name}</DialogTitle>
            <DialogDescription>
              Add default requirements for this department's events.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden">
            {/* Add New Requirement */}
            <div className="space-y-2">
              <Label htmlFor="newRequirement">Add New Requirement</Label>
              <div className="flex gap-2">
                <Input
                  id="newRequirement"
                  placeholder="Enter a new requirement..."
                  value={newRequirementText}
                  onChange={(e) => setNewRequirementText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddRequirement();
                    }
                  }}
                />
                <Button 
                  onClick={handleAddRequirement}
                  disabled={loading || !newRequirementText.trim()}
                  className="bg-red-600 hover:bg-red-700 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {loading ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>

            {/* Requirements List */}
            <div className="space-y-2">
              <Label>Current Requirements ({departmentRequirements.length})</Label>
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {departmentRequirements.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No requirements added yet. Add your first requirement above.
                  </div>
                ) : (
                  <div className="divide-y">
                    {departmentRequirements.map((requirement, index) => (
                      <div key={requirement.id} className="p-3 flex items-start justify-between hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              #{index + 1}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900">{requirement.text}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRequirement(requirement.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                          title="Delete requirement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRequirementsModal(false);
                setSelectedDepartment(null);
                setNewRequirementText('');
                setDepartmentRequirements([]);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentsManagement;
