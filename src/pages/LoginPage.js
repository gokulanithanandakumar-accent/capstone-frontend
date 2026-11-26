import { useState } from 'react';
import {
  Navigate,
  useNavigate,
} from 'react-router-dom';

import { extractErrorMessage } from '../api/client';
import { registerCustomer } from '../api/authApi';
import { useAuth } from '../auth/AuthContext';
import { todayIso } from '../utils/format';

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_PATTERN =
  /^[0-9+() -]{7,20}$/;

function validateLogin(email, password) {
  const errors = {};

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email =
      'Email must be a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return errors;
}

function validateRegistration(form) {
  const errors = {};

  if (!form.fullName.trim()) {
    errors.fullName =
      'Full name is required';
  } else if (form.fullName.trim().length < 2) {
    errors.fullName =
      'Full name must contain at least 2 characters';
  }

  if (!form.email.trim()) {
    errors.email = 'Email is required';
  } else if (
    !EMAIL_PATTERN.test(form.email.trim())
  ) {
    errors.email =
      'Email must be a valid email address';
  }

  if (!form.dateOfBirth) {
    errors.dateOfBirth =
      'Date of birth is required';
  } else if (
    form.dateOfBirth > todayIso()
  ) {
    errors.dateOfBirth =
      'Date of birth cannot be in the future';
  }

  if (
    form.phone.trim() &&
    !PHONE_PATTERN.test(form.phone.trim())
  ) {
    errors.phone =
      'Enter a valid phone number';
  }

  if (!form.password) {
    errors.password =
      'Password is required';
  } else if (form.password.length < 8) {
    errors.password =
      'Password must contain at least 8 characters';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword =
      'Confirm your password';
  } else if (
    form.password !== form.confirmPassword
  ) {
    errors.confirmPassword =
      'Passwords do not match';
  }

  return errors;
}

const EMPTY_REGISTRATION = {
  fullName: '',
  email: '',
  dateOfBirth: '',
  phone: '',
  password: '',
  confirmPassword: '',
};

export default function LoginPage() {
  const {
    isAuthenticated,
    login,
  } = useAuth();

  const navigate = useNavigate();

  const [mode, setMode] =
    useState('login');

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    registration,
    setRegistration,
  ] = useState(
    EMPTY_REGISTRATION,
  );

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState({});

  const [
    authError,
    setAuthError,
  ] = useState('');

  const [
    successMessage,
    setSuccessMessage,
  ] = useState('');

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  if (isAuthenticated) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setFieldErrors({});
    setAuthError('');
    setSuccessMessage('');
    setSubmitting(false);
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setAuthError('');
    setSuccessMessage('');

    const errors =
      validateLogin(
        email,
        password,
      );

    setFieldErrors(errors);

    if (
      Object.keys(errors).length > 0
    ) {
      return;
    }

    setSubmitting(true);

    try {
      await login(
        email.trim(),
        password,
      );

      navigate(
        '/dashboard',
        { replace: true },
      );
    } catch (error) {
      if (
        error?.response?.status === 401
      ) {
        setAuthError(
          'Invalid email or password',
        );
      } else {
        setAuthError(
          extractErrorMessage(
            error,
            'Unable to sign in right now. Please try again later.',
          ),
        );
      }

      setSubmitting(false);
    }
  };

  const handleRegister =
    async (event) => {

      event.preventDefault();

      setAuthError('');
      setSuccessMessage('');

      const errors =
        validateRegistration(
          registration,
        );

      setFieldErrors(errors);

      if (
        Object.keys(errors).length > 0
      ) {
        return;
      }

      setSubmitting(true);

      try {
        const response =
          await registerCustomer({
            fullName:
              registration.fullName.trim(),

            email:
              registration.email
                .trim()
                .toLowerCase(),

            dateOfBirth:
              registration.dateOfBirth,

            phone:
              registration.phone.trim() ||
              null,

            password:
              registration.password,
          });

        setEmail(
          registration.email
            .trim()
            .toLowerCase(),
        );

        setPassword('');

        setRegistration(
          EMPTY_REGISTRATION,
        );

        setFieldErrors({});
        setAuthError('');
        setMode('login');

        setSuccessMessage(
          response?.message ||
          'Registration successful. You can now sign in.',
        );
      } catch (error) {
        setAuthError(
          extractErrorMessage(
            error,
            'Unable to create your account. Please try again.',
          ),
        );
      } finally {
        setSubmitting(false);
      }
    };

  const updateRegistration =
    (event) => {

      const {
        name,
        value,
      } = event.target;

      setRegistration(
        (current) => ({
          ...current,
          [name]: value,
        }),
      );

      setFieldErrors(
        (current) => ({
          ...current,
          [name]: '',
        }),
      );

      setAuthError('');
    };

  return (
    <main className="login-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div
            className="auth-brand-icon"
            aria-hidden="true"
          >
            ◆
          </div>

          <h1>HealthDekho</h1>

          <p>
            Secure Today.
            Healthier Tomorrow.
          </p>
        </div>

        <div
          className="auth-toggle"
          role="tablist"
          aria-label="Authentication mode"
        >
          <button
            type="button"
            role="tab"
            aria-selected={
              mode === 'login'
            }
            className={
              mode === 'login'
                ? 'auth-toggle-button auth-toggle-button-active'
                : 'auth-toggle-button'
            }
            onClick={() =>
              changeMode('login')
            }
          >
            Login
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={
              mode === 'register'
            }
            className={
              mode === 'register'
                ? 'auth-toggle-button auth-toggle-button-active'
                : 'auth-toggle-button'
            }
            onClick={() =>
              changeMode('register')
            }
          >
            Register
          </button>
        </div>

        {successMessage && (
          <div
            className="alert alert-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {authError && (
          <div
            className="alert alert-error"
            role="alert"
          >
            {authError}
          </div>
        )}

        {mode === 'login' ? (
          <form
            className="auth-form"
            onSubmit={handleLogin}
            noValidate
          >
            <div className="auth-form-heading">
              <h2>
                Welcome back
              </h2>

              <p>
                Sign in to manage your
                HealthDekho policies.
              </p>
            </div>

            <label htmlFor="login-email">
              Email

              <input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => {
                  setEmail(
                    event.target.value,
                  );

                  setFieldErrors(
                    (current) => ({
                      ...current,
                      email: '',
                    }),
                  );

                  setAuthError('');
                }}
                aria-invalid={Boolean(
                  fieldErrors.email,
                )}
              />

              {fieldErrors.email && (
                <span className="field-error">
                  {fieldErrors.email}
                </span>
              )}
            </label>

            <label htmlFor="login-password">
              Password

              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(
                    event.target.value,
                  );

                  setFieldErrors(
                    (current) => ({
                      ...current,
                      password: '',
                    }),
                  );

                  setAuthError('');
                }}
                aria-invalid={Boolean(
                  fieldErrors.password,
                )}
              />

              {fieldErrors.password && (
                <span className="field-error">
                  {fieldErrors.password}
                </span>
              )}
            </label>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={submitting}
            >
              {submitting
                ? 'Signing in...'
                : 'Login'}
            </button>
          </form>
        ) : (
          <form
            className="auth-form"
            onSubmit={handleRegister}
            noValidate
          >
            <div className="auth-form-heading">
              <h2>
                Create your account
              </h2>

              <p>
                Register to explore and
                manage HealthDekho coverage.
              </p>
            </div>

            <div className="auth-register-grid">
              <label
                htmlFor="register-name"
                className="auth-full-width"
              >
                Full Name

                <input
                  id="register-name"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  value={
                    registration.fullName
                  }
                  onChange={
                    updateRegistration
                  }
                  maxLength={100}
                  aria-invalid={Boolean(
                    fieldErrors.fullName,
                  )}
                />

                {fieldErrors.fullName && (
                  <span className="field-error">
                    {
                      fieldErrors.fullName
                    }
                  </span>
                )}
              </label>

              <label htmlFor="register-dob">
                Date of Birth

                <input
                  id="register-dob"
                  name="dateOfBirth"
                  type="date"
                  max={todayIso()}
                  value={
                    registration.dateOfBirth
                  }
                  onChange={
                    updateRegistration
                  }
                  aria-invalid={Boolean(
                    fieldErrors.dateOfBirth,
                  )}
                />

                {fieldErrors.dateOfBirth && (
                  <span className="field-error">
                    {
                      fieldErrors.dateOfBirth
                    }
                  </span>
                )}
              </label>

              <label htmlFor="register-phone">
                Phone

                <input
                  id="register-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. 9876543210"
                  value={
                    registration.phone
                  }
                  onChange={
                    updateRegistration
                  }
                  aria-invalid={Boolean(
                    fieldErrors.phone,
                  )}
                />

                {fieldErrors.phone && (
                  <span className="field-error">
                    {
                      fieldErrors.phone
                    }
                  </span>
                )}
              </label>

              <label
                htmlFor="register-email"
                className="auth-full-width"
              >
                Email

                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={
                    registration.email
                  }
                  onChange={
                    updateRegistration
                  }
                  aria-invalid={Boolean(
                    fieldErrors.email,
                  )}
                />

                {fieldErrors.email && (
                  <span className="field-error">
                    {
                      fieldErrors.email
                    }
                  </span>
                )}
              </label>

              <label htmlFor="register-password">
                Password

                <input
                  id="register-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={
                    registration.password
                  }
                  onChange={
                    updateRegistration
                  }
                  aria-invalid={Boolean(
                    fieldErrors.password,
                  )}
                />

                {fieldErrors.password && (
                  <span className="field-error">
                    {
                      fieldErrors.password
                    }
                  </span>
                )}
              </label>

              <label htmlFor="register-confirm-password">
                Confirm Password

                <input
                  id="register-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={
                    registration.confirmPassword
                  }
                  onChange={
                    updateRegistration
                  }
                  aria-invalid={Boolean(
                    fieldErrors.confirmPassword,
                  )}
                />

                {fieldErrors.confirmPassword && (
                  <span className="field-error">
                    {
                      fieldErrors.confirmPassword
                    }
                  </span>
                )}
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={submitting}
            >
              {submitting
                ? 'Creating Account...'
                : 'Create Account'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
