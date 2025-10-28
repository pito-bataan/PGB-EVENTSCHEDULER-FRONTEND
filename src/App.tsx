import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import GlobalNotificationSystem from './components/GlobalNotificationSystem'
import LoginForm from './components/LoginForm'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/Users/MainLayout'
import Dashboard from './components/Users/Dashboard'
import RequestEventPage from './components/Users/RequestEventPage'
import MyEventsPage from './components/Users/MyEventsPage'
import MyCalendarPage from './components/Users/MyCalendarPage'
import MyRequirementsPage from './components/Users/MyRequirementsPage'
import ManageLocationPage from './components/Users/ManageLocationPage'
import MessagesPage from './components/Users/MessagesPage'
import TaggedDepartmentPage from './components/Users/TaggedDepartmentPage'
import UserAllEventsPage from './components/Users/AllEventsPage'
import EventReportsPage from './components/Users/EventReportsPage'
import RequestEventGuidePage from './components/Users/RequestEventGuidePage'
import AdminMainLayout from './components/Admin/AdminMainLayout'
import AdminDashboard from './components/Admin/AdminDashboard'
import AllEventsPage from './components/Admin/AllEventsPage'
import OverallEventsPage from './components/Admin/OverallEventsPage'
import AdminCalendarPage from './components/Admin/CalendarPage'
import UsersManagement from './components/Admin/UsersManagement'
import UsersLogsPage from './components/Admin/UsersLogsPage'
import DepartmentsManagement from './components/Admin/DepartmentsManagement'
import EventReportsManagement from './components/Admin/EventReportsManagement'
import './App.css'

function App() {
  const user = {
    name: "John Doe",
    email: "john.doe@bataan.gov.ph",
    department: "Information Technology"
  };

  const adminUser = {
    name: "Admin User",
    email: "admin@bataan.gov.ph",
    department: "Administration"
  };

  return (
    <>
      <GlobalNotificationSystem />
      <Router>
        <Routes>
          {/* Login Route */}
          <Route path="/login" element={<LoginForm />} />
          
          {/* Users Routes */}
          <Route path="/users/*" element={
            <ProtectedRoute>
              <MainLayout user={user}>
                <Routes>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="request-event" element={<RequestEventPage />} />
                  <Route path="my-events" element={<MyEventsPage />} />
                  <Route path="my-calendar" element={<MyCalendarPage />} />
                  <Route path="my-requirements" element={<MyRequirementsPage />} />
                  <Route path="manage-location" element={<ManageLocationPage />} />
                  <Route path="calendar" element={<div className="p-6"><h1 className="text-2xl font-bold">Calendar</h1><p>Coming soon...</p></div>} />
                  <Route path="all-events" element={<UserAllEventsPage />} />
                  <Route path="messages" element={<MessagesPage />} />
                  <Route path="tagged-departments" element={<TaggedDepartmentPage />} />
                  <Route path="event-reports" element={<EventReportsPage />} />
                  <Route path="request-event-guide" element={<RequestEventGuidePage />} />
                  <Route path="" element={<Navigate to="dashboard" replace />} />
                </Routes>
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute>
              <AdminMainLayout user={adminUser}>
                <Routes>
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="all-events" element={<AllEventsPage />} />
                  <Route path="overall-events" element={<OverallEventsPage />} />
                  <Route path="calendar" element={<AdminCalendarPage />} />
                  <Route path="users" element={<UsersManagement />} />
                  <Route path="users-logs" element={<UsersLogsPage />} />
                  <Route path="departments" element={<DepartmentsManagement />} />
                  <Route path="event-reports" element={<EventReportsManagement />} />
                  <Route path="reports" element={<div className="p-6"><h1 className="text-2xl font-bold">Reports</h1><p>Coming soon...</p></div>} />
                  <Route path="" element={
                    <Navigate 
                      to={
                        (() => {
                          const userData = localStorage.getItem('userData');
                          if (userData) {
                            try {
                              const parsed = JSON.parse(userData);
                              const role = (parsed.role || '').toLowerCase();
                              // If admin role, redirect to all-events, if superadmin go to dashboard
                              if (role === 'admin') {
                                return 'all-events';
                              } else if (role === 'superadmin') {
                                return 'dashboard';
                              }
                              // Default fallback
                              return 'all-events';
                            } catch {
                              return 'all-events';
                            }
                          }
                          return 'all-events';
                        })()
                      } 
                      replace 
                    />
                  } />
                </Routes>
              </AdminMainLayout>
            </ProtectedRoute>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </>
  )
}

export default App
