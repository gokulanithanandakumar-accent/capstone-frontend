import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email, password) {
  const errors = {};
  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Email must be a valid email address';
  }
  if (!password) {
    errors.password = 'Password is required';
  }
  return errors;
}

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');
    const errors = validate(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      if (error?.response?.status === 401) {
        setAuthError('Invalid email or password');
      } else {
        setAuthError(extractErrorMessage(error, 'Unable to sign in right now. Please try again later.'));
      }
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <form className="card login-card" onSubmit={handleSubmit} noValidate>
        <h1>HealthDekho</h1>
        <p className="subtitle">Customer Login</p>

        {authError && (
          <div className="alert alert-error" role="alert">
            {authError}
          </div>
        )}

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
        />
        {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(fieldErrors.password)}
        />
        {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </main>
  );
}
