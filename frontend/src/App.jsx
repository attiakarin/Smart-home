import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DevicesProvider } from './context/DevicesContext';
import { AlertTriangle, Cpu, Settings, Users, Wrench } from 'lucide-react';

// Layouts & shared
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages publiques (Module Information)
import HomePage from './pages/public/HomePage';
import RegisterPage from './pages/public/RegisterPage';
import LoginPage from './pages/public/LoginPage';
import CreateHousePage from './pages/public/CreateHousePage';
import SmartCatalogPage from './pages/public/EventsPage';
import EnergyPage from './pages/public/PlacesPage';
import SecurityPage from './pages/public/TransportsPage';

// Module Visualisation (simple)
import DashboardPage from './pages/visualisation/DashboardPage';
import ProfilePage from './pages/visualisation/ProfilePage';
import MembersPage from './pages/visualisation/MembersPage';
import DevicesListPage from './pages/visualisation/DevicesListPage';
import DeviceDetailPage from './pages/visualisation/DeviceDetailPage';
import ServicesPage from './pages/visualisation/ServicesPage';
import AdminRequestsPage from './pages/visualisation/AdminRequestsPage';

// Module Gestion (complexe)
import GestionDashboard from './pages/gestion/GestionDashboard';
import GestionDevicePage from './pages/gestion/GestionDevicePage';
import ReportsPage from './pages/gestion/ReportsPage';

// Module Administration
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDevices from './pages/admin/AdminDevices';
import AdminSettings from './pages/admin/AdminSettings';
import AdminConsumption from './pages/admin/AdminConsumption';

function ProtectedRoute({ children, module }) {
  const { currentUser, canAccess } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!canAccess(module)) return <Navigate to="/tableau-de-bord" replace />;
  return children;
}

function AppRoutes() {
  const { currentUser, settings } = useAuth();
  const showMaintenanceBanner = currentUser?.appRole === 'admin' && settings.maintenanceMode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      {showMaintenanceBanner && <MaintenanceBanner />}
      <main style={{ flex: 1 }}>
        <Routes>
          {/* Module Information — public */}
          <Route path="/"               element={<HomePage />} />
          <Route path="/inscription"    element={<RegisterPage />} />
          <Route path="/creer-maison"   element={<CreateHousePage />} />
          <Route path="/login"          element={<LoginPage />} />
          <Route path="/catalogue-maison" element={<SmartCatalogPage />} />
          <Route path="/energie"          element={<EnergyPage />} />
          <Route path="/securite"         element={<SecurityPage />} />

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
          <Route path="/demandes-admin" element={
            <ProtectedRoute module="visualisation"><AdminRequestsPage /></ProtectedRoute>
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
            <ProtectedRoute module="device_config"><GestionDevicePage /></ProtectedRoute>
          } />
          <Route path="/gestion/rapports" element={
            <ProtectedRoute module="reports"><ReportsPage /></ProtectedRoute>
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
          <Route path="/admin/consommation" element={
            <ProtectedRoute module="administration"><AdminConsumption /></ProtectedRoute>
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

function MaintenanceBanner() {
  return (
    <div className="maintenance-banner" role="status">
      <div className="container maintenance-banner__inner">
        <div className="maintenance-banner__text">
          <AlertTriangle size={20} aria-hidden="true" />
          <div>
            <strong>Mode maintenance actif</strong>
            <span>Les habitants ne peuvent plus se connecter ni consulter la maison. Les admins peuvent intervenir.</span>
          </div>
        </div>
        <div className="maintenance-banner__actions">
          <NavigateLink to="/admin/objets" icon={<Cpu size={14} />} label="Maintenance" />
          <NavigateLink to="/admin/consommation" icon={<AlertTriangle size={14} />} label="Consommation" />
          <NavigateLink to="/gestion" icon={<Wrench size={14} />} label="Gestion" />
          <NavigateLink to="/admin/utilisateurs" icon={<Users size={14} />} label="Utilisateurs" />
          <NavigateLink to="/admin/parametres" icon={<Settings size={14} />} label="Paramètres" />
        </div>
      </div>
    </div>
  );
}

function NavigateLink({ to, icon, label }) {
  return <Link className="maintenance-banner__link" to={to}>{icon}{label}</Link>;
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
