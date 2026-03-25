// Smart Hospital Management System - Main Entry Point
import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

import PublicLayout from './layouts/PublicLayout'
import PatientLayout from './layouts/PatientLayout'
import DoctorLayout from './layouts/DoctorLayout'
import AdminLayout from './layouts/AdminLayout'
import ErrorBoundary from './components/ErrorBoundary'
import { DashboardSkeleton } from './components/SkeletonLoader'

// Lazy load all pages for code splitting
const Home = React.lazy(() => import('./pages/public/Home'))
const Login = React.lazy(() => import('./pages/public/Login'))
const Register = React.lazy(() => import('./pages/public/Register'))
const ForgotPassword = React.lazy(() => import('./pages/public/ForgotPassword'))
const Doctors = React.lazy(() => import('./pages/public/Doctors'))
const About = React.lazy(() => import('./pages/public/About'))

// Patient
const PatientDashboard = React.lazy(() => import('./pages/patient/Dashboard'))
const BookAppointment = React.lazy(() => import('./pages/patient/BookAppointment'))
const SmartBookAppointment = React.lazy(() => import('./pages/patient/SmartBookAppointment'))
const Appointments = React.lazy(() => import('./pages/patient/Appointments'))
const VisitHistory = React.lazy(() => import('./pages/patient/VisitHistory'))
const MedicalRecords = React.lazy(() => import('./pages/patient/MedicalRecords'))
const Profile = React.lazy(() => import('./pages/patient/Profile'))
const SymptomChecker = React.lazy(() => import('./pages/patient/SymptomChecker'))

// Doctor
const DoctorDashboard = React.lazy(() => import('./pages/doctor/Dashboard'))
const DoctorAppointments = React.lazy(() => import('./pages/doctor/Appointments'))
const PatientDetails = React.lazy(() => import('./pages/doctor/PatientDetails'))
const Diagnosis = React.lazy(() => import('./pages/doctor/Diagnosis'))
const Schedule = React.lazy(() => import('./pages/doctor/Schedule'))
const DoctorProfile = React.lazy(() => import('./pages/doctor/Profile'))
const RequestLeave = React.lazy(() => import('./pages/doctor/RequestLeave'))

// Admin
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'))
const ManageDoctors = React.lazy(() => import('./pages/admin/ManageDoctors'))
const ManagePatients = React.lazy(() => import('./pages/admin/ManagePatients'))
const AppointmentManagement = React.lazy(() => import('./pages/admin/AppointmentManagement'))
const OffDutyManagement = React.lazy(() => import('./pages/admin/OffDutyManagement'))
const Reports = React.lazy(() => import('./pages/admin/Reports'))
const AdminSettings = React.lazy(() => import('./pages/admin/Settings'))

// AI
const Chatbot = React.lazy(() => import('./pages/ai/Chatbot'))
const ReportSummary = React.lazy(() => import('./pages/ai/ReportSummary'))
const VideoRoom = React.lazy(() => import('./pages/VideoRoom'))

import ProtectedRoute from './components/ProtectedRoute'
import FloatingChatbot from './components/FloatingChatbot'
import { useAuth } from './contexts/AuthContext'

// Wrapper to conditionally show FloatingChatbot (not for doctors who have DoctorChatbot)
function FloatingChatbotWrapper() {
  const { user } = useAuth()
  // Don't show for doctors - they have DoctorChatbot in DoctorLayout
  if (user?.role === 'doctor') return null
  return <FloatingChatbot />
}

// Loading fallback component
const LoadingFallback = () => (
  <div className="p-8">
    <DashboardSkeleton />
  </div>
)

export default function App() {
  // ==========================================
  // FIX #6: Reset scroll & fix overflow on load
  // ==========================================
  React.useEffect(() => {
    // Ensure body scroll is enabled
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    
    // Scroll to top
    window.scrollTo(0, 0);
  }, [])

  // ==========================================
  // FIX #7: Version-based hard reload on deploy
  // ==========================================
  React.useEffect(() => {
    const APP_VERSION = '1.1.0'; // Update this when deploying UI changes
    const storedVersion = sessionStorage.getItem('app_version');

    if (storedVersion !== APP_VERSION) {
      sessionStorage.setItem('app_version', APP_VERSION);
      // Force reload to get latest assets
      window.location.reload();
    }
  }, [])

  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes future={{ v7_relativeSplatPath: true }}>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={
              <Suspense fallback={<LoadingFallback />}>
                <Home />
              </Suspense>
            } />
            <Route path="doctors" element={
              <Suspense fallback={<LoadingFallback />}>
                <Doctors />
              </Suspense>
            } />
            <Route path="about" element={
              <Suspense fallback={<LoadingFallback />}>
                <About />
              </Suspense>
            } />
            <Route path="login" element={
              <Suspense fallback={<LoadingFallback />}>
                <Login />
              </Suspense>
            } />
            <Route path="register" element={
              <Suspense fallback={<LoadingFallback />}>
                <Register />
              </Suspense>
            } />
            <Route path="forgot-password" element={
              <Suspense fallback={<LoadingFallback />}>
                <ForgotPassword />
              </Suspense>
            } />
          </Route>

          {/* AI Routes (No Global Footer) */}
          <Route path="/ai/report-summary" element={
            <Suspense fallback={<LoadingFallback />}>
              <ReportSummary />
            </Suspense>
          } />

          {/* Video Room — full screen, no layout wrapper, accessible by patient & doctor */}
          <Route path="/video-room/:appointmentId" element={
            <ProtectedRoute allowedRoles={['patient', 'doctor']}>
              <Suspense fallback={
                <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
                </div>
              }>
                <VideoRoom />
              </Suspense>
            </ProtectedRoute>
          } />

          {/* Patient Routes */}
          <Route path="/patient" element={
            <ProtectedRoute allowedRoles={['patient']}>
              <PatientLayout />
            </ProtectedRoute>
          }>
            <Route index element={
              <Suspense fallback={<LoadingFallback />}>
                <PatientDashboard />
              </Suspense>
            } />
            <Route path="book" element={
              <Suspense fallback={<LoadingFallback />}>
                <SmartBookAppointment />
              </Suspense>
            } />
            <Route path="book-legacy" element={
              <Suspense fallback={<LoadingFallback />}>
                <BookAppointment />
              </Suspense>
            } />
            <Route path="appointments" element={
              <Suspense fallback={<LoadingFallback />}>
                <Appointments />
              </Suspense>
            } />
            <Route path="history" element={
              <Suspense fallback={<LoadingFallback />}>
                <VisitHistory />
              </Suspense>
            } />
            <Route path="records" element={
              <Suspense fallback={<LoadingFallback />}>
                <MedicalRecords />
              </Suspense>
            } />
            <Route path="profile" element={
              <Suspense fallback={<LoadingFallback />}>
                <Profile />
              </Suspense>
            } />
            <Route path="symptom-checker" element={
              <Suspense fallback={<LoadingFallback />}>
                <SymptomChecker />
              </Suspense>
            } />
          </Route>

          {/* Doctor Routes */}
          <Route path="/doctor" element={
            <ProtectedRoute allowedRoles={['doctor']}>
              <DoctorLayout />
            </ProtectedRoute>
          }>
            <Route index element={
              <Suspense fallback={<LoadingFallback />}>
                <DoctorDashboard />
              </Suspense>
            } />
            <Route path="appointments" element={
              <Suspense fallback={<LoadingFallback />}>
                <DoctorAppointments />
              </Suspense>
            } />
            <Route path="patients" element={
              <Suspense fallback={<LoadingFallback />}>
                <PatientDetails />
              </Suspense>
            } />
            <Route path="patients/:id" element={
              <Suspense fallback={<LoadingFallback />}>
                <PatientDetails />
              </Suspense>
            } />
            <Route path="diagnosis" element={
              <Suspense fallback={<LoadingFallback />}>
                <Diagnosis />
              </Suspense>
            } />
            <Route path="schedule" element={
              <Suspense fallback={<LoadingFallback />}>
                <Schedule />
              </Suspense>
            } />
            <Route path="profile" element={
              <Suspense fallback={<LoadingFallback />}>
                <DoctorProfile />
              </Suspense>
            } />
            <Route path="off-duty" element={
              <Suspense fallback={<LoadingFallback />}>
                <RequestLeave />
              </Suspense>
            } />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={
              <Suspense fallback={<LoadingFallback />}>
                <AdminDashboard />
              </Suspense>
            } />
            <Route path="doctors" element={
              <Suspense fallback={<LoadingFallback />}>
                <ManageDoctors />
              </Suspense>
            } />
            <Route path="patients" element={
              <Suspense fallback={<LoadingFallback />}>
                <ManagePatients />
              </Suspense>
            } />
            <Route path="appointments" element={
              <Suspense fallback={<LoadingFallback />}>
                <AppointmentManagement />
              </Suspense>
            } />
            <Route path="off-duty" element={
              <Suspense fallback={<LoadingFallback />}>
                <OffDutyManagement />
              </Suspense>
            } />
            <Route path="reports" element={
              <Suspense fallback={<LoadingFallback />}>
                <Reports />
              </Suspense>
            } />
            <Route path="settings" element={
              <Suspense fallback={<LoadingFallback />}>
                <AdminSettings />
              </Suspense>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <FloatingChatbotWrapper />
      </AuthProvider>
    </ErrorBoundary>
  )
}
