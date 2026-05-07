import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DevicesProvider } from './context/DevicesContext';

// Layouts & shared
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages publiques (Module Information)
import HomePage from './pages/public/HomePage';
import RegisterPage from './pages/public/RegisterPage';
import LoginPage from './pages/public/LoginPage';
import CreateHousePage from './pages/public/CreateHousePage';

// Module Visualisation (simple)
import DashboardPage from './pages/visualisation/DashboardPage';
import ProfilePage from './pages/visualisation/ProfilePage';
import MembersPage from './pages/visualisation/MembersPage';
import DevicesListPage from './pages/visualisation/DevicesListPage';
import DeviceDetailPage from './pages/visualisation/DeviceDetailPage';
import ServicesPage from './pages/visualisation/ServicesPage';

// Module Gestion (complexe)
import GestionDashboard from './pages/gestion/GestionDashboard';
import GestionDevicePage from './pages/gestion/GestionDevicePage';
import ReportsPage from './pages/gestion/ReportsPage';

// Module Administration
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDevices from './pages/admin/AdminDevices';
import AdminSettings from './pages/admin/AdminSettings';

function ProtectedRoute({ children, module }) {
  const { currentUser, canAccess } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!canAccess(module)) return <Navigate to="/tableau-de-bord" replace />;
  return children;
}

function AppRoutes() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          {/* Module Information — public */}
          <Route path="/"               element={<HomePage />} />
          <Route path="/inscription"    element={<RegisterPage />} />
          <Route path="/creer-maison"   element={<CreateHousePage />} />
          <Route path="/login"          element={<LoginPage />} />

          {/* Module Visualisation */}
          <Route path="/tableau-de-bord" element={
            <ProtectedRoute module="visualisation"><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/profil" element={
            <ProtectedRoute module="visualisation"><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/membres" element={
            <ProtectedRoute module="visualisation"><MembersPage /></ProtectedRoute>
          } />
          <Route path="/services" element={
            <ProtectedRoute module="visualisation"><ServicesPage /></ProtectedRoute>
          } />
          <Route path="/objets" element={
            <ProtectedRoute module="visualisation"><DevicesListPage /></ProtectedRoute>
          } />
          <Route path="/objets/:id" element={
            <ProtectedRoute module="visualisation"><DeviceDetailPage /></ProtectedRoute>
          } />

          {/* Module Gestion */}
          <Route path="/gestion" element={
            <ProtectedRoute module="gestion"><GestionDashboard /></ProtectedRoute>
          } />
          <Route path="/gestion/objet/:id" element={
            <ProtectedRoute module="gestion"><GestionDevicePage /></ProtectedRoute>
          } />
          <Route path="/gestion/rapports" element={
            <ProtectedRoute module="gestion"><ReportsPage /></ProtectedRoute>
          } />

          {/* Module Administration */}
          <Route path="/admin" element={
            <ProtectedRoute module="administration"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/utilisateurs" element={
            <ProtectedRoute module="administration"><AdminUsers /></ProtectedRoute>
          } />
          <Route path="/admin/objets" element={
            <ProtectedRoute module="administration"><AdminDevices /></ProtectedRoute>
          } />
          <Route path="/admin/parametres" element={
            <ProtectedRoute module="administration"><AdminSettings /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DevicesProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </DevicesProvider>
    </AuthProvider>
  );
}
