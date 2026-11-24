import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PolicyRegistrationPage from './pages/PolicyRegistrationPage';
import PolicySearchPage from './pages/PolicySearchPage';
import PremiumPaymentPage from './pages/PremiumPaymentPage';

export const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true };

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/policies/register"
        element={(
          <ProtectedRoute>
            <PolicyRegistrationPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/policies/payments"
        element={(
          <ProtectedRoute>
            <PremiumPaymentPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/policies/search"
        element={(
          <ProtectedRoute>
            <PolicySearchPage />
          </ProtectedRoute>
        )}
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={routerFuture}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
