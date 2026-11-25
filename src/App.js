import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import PolicyRegistrationPage from './pages/PolicyRegistrationPage';
import PolicySearchPage from './pages/PolicySearchPage';
import PremiumPaymentPage from './pages/PremiumPaymentPage';
import RecommendationsPage from './pages/RecommendationPage';
import AvailablePoliciesPage from './pages/AvailablePoliciesPage';


export const routerFuture = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

function ProtectedPage({ children }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedPage>
            <DashboardPage />
          </ProtectedPage>
        }
      />

      <Route
  path="/policies/available"
  element={
    <ProtectedPage>
      <AvailablePoliciesPage />
    </ProtectedPage>
  }
/>

      <Route
        path="/recommendations"
        element={
          <ProtectedPage>
            <RecommendationsPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/policies/register"
        element={
          <ProtectedPage>
            <PolicyRegistrationPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/policies/payments"
        element={
          <ProtectedPage>
            <PremiumPaymentPage />
          </ProtectedPage>
        }
      />

      <Route
        path="/policies/search"
        element={
          <ProtectedPage>
            <PolicySearchPage />
          </ProtectedPage>
        }
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