import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes, routerFuture } from '../App';
import { AuthProvider } from '../auth/AuthContext';
import { login } from '../api/authApi';
import { fetchAvailableProducts, fetchMyPolicies } from '../api/dashboardApi';

jest.mock('../api/authApi');
jest.mock('../api/dashboardApi');

function renderAt(path) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]} future={routerFuture}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.resetAllMocks();
    fetchMyPolicies.mockResolvedValue([]);
    fetchAvailableProducts.mockResolvedValue([]);
  });

  test('shows validation errors when fields are empty', async () => {
    renderAt('/login');
    userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  test('shows validation error for invalid email format', async () => {
    renderAt('/login');
    userEvent.type(screen.getByLabelText('Email'), 'not-an-email');
    userEvent.type(screen.getByLabelText('Password'), 'secret');
    userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Email must be a valid email address')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  test('redirects to the dashboard on successful login', async () => {
    login.mockResolvedValue({
      accessToken: 'jwt-token',
      tokenType: 'Bearer',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      customerId: 1,
      fullName: 'Gokul',
      email: 'gokul@gmail.com',
    });
    renderAt('/login');

    userEvent.type(screen.getByLabelText('Email'), 'gokul@gmail.com');
    userEvent.type(screen.getByLabelText('Password'), 'Gokul@123');
    userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Welcome, Gokul')).toBeInTheDocument();
    expect(login).toHaveBeenCalledWith('gokul@gmail.com', 'Gokul@123');
  });

  test('shows an authentication error for invalid credentials', async () => {
    login.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password' } } });
    renderAt('/login');

    userEvent.type(screen.getByLabelText('Email'), 'gokul@gmail.com');
    userEvent.type(screen.getByLabelText('Password'), 'wrong');
    userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.queryByText(/Welcome/)).not.toBeInTheDocument();
  });

  test('shows a generic error when the server is unreachable', async () => {
    login.mockRejectedValue(new Error('Network Error'));
    renderAt('/login');

    userEvent.type(screen.getByLabelText('Email'), 'gokul@gmail.com');
    userEvent.type(screen.getByLabelText('Password'), 'Gokul@123');
    userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in right now');
  });

  test('disables the button while signing in', async () => {
    login.mockReturnValue(new Promise(() => {}));
    renderAt('/login');

    userEvent.type(screen.getByLabelText('Email'), 'gokul@gmail.com');
    userEvent.type(screen.getByLabelText('Password'), 'Gokul@123');
    userEvent.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled());
  });
});

describe('ProtectedRoute', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.resetAllMocks();
  });

  test('redirects unauthenticated users from dashboard to login', () => {
    renderAt('/dashboard');
    expect(screen.getByText('Customer Login')).toBeInTheDocument();
    expect(fetchMyPolicies).not.toHaveBeenCalled();
  });

  test('redirects unauthenticated users from registration to login', () => {
    renderAt('/policies/register');
    expect(screen.getByText('Customer Login')).toBeInTheDocument();
  });
});
