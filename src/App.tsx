import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { PageLoader } from './components/States'

const ParentLogin = lazy(() => import('./pages/parent/ParentLogin'))
const ParentPortal = lazy(() => import('./pages/parent/ParentPortal'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const StudentLogin = lazy(() => import('./pages/student/StudentLogin'))
const StudentPortal = lazy(() => import('./pages/student/StudentPortal'))
const NotFound = lazy(() => import('./pages/NotFound'))

export default function App() {
  return (
    <Suspense fallback={<div className="page-center"><PageLoader /></div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/parent/app" replace />} />
        <Route path="/parent/login" element={<ParentLogin />} />
        <Route path="/parent/app" element={<ParentPortal />} />
        <Route path="/class/:classId" element={<Navigate to="/parent/login" replace />} />
        <Route path="/student/:studentId" element={<Navigate to="/parent/login" replace />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/student/app" element={<StudentPortal />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
