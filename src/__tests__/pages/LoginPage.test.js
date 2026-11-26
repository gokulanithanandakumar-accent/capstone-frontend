import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';

import userEvent from '@testing-library/user-event';

import { MemoryRouter } from 'react-router-dom';

import LoginPage from '../../pages/LoginPage';
import { useAuth } from '../../auth/AuthContext';
import { registerCustomer } from '../../api/authApi';

jest.mock('../../auth/AuthContext');
jest.mock('../../api/authApi');

function renderPage() {
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {

  const login = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    useAuth.mockReturnValue({
      isAuthenticated: false,
      login,
    });
  });

  test('validates empty login form', async () => {
    renderPage();

    fireEvent.click(
      screen.getByRole(
        'button',
        { name: 'Login' },
      ),
    );

    expect(
      screen.getByText('Email is required'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Password is required'),
    ).toBeInTheDocument();

    expect(login).not.toHaveBeenCalled();
  });

  test('switches between login and registration', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole(
        'tab',
        { name: 'Register' },
      ),
    );

    expect(
      screen.getByRole(
        'heading',
        { name: 'Create your account' },
      ),
    ).toBeInTheDocument();
  });

  test('rejects password mismatch', () => {
    renderPage();

    fireEvent.click(
      screen.getByRole(
        'tab',
        { name: 'Register' },
      ),
    );

    fireEvent.change(
      screen.getByLabelText('Full Name'),
      { target: { value: 'Aarav Sharma' } },
    );

    fireEvent.change(
      screen.getByLabelText('Date of Birth'),
      { target: { value: '1990-04-15' } },
    );

    fireEvent.change(
      screen.getByLabelText('Email'),
      {
        target: {
          value: 'aarav@example.com',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText('Password'),
      {
        target: {
          value: 'Password@123',
        },
      },
    );

    fireEvent.change(
      screen.getByLabelText('Confirm Password'),
      {
        target: {
          value: 'Different@123',
        },
      },
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        { name: 'Create Account' },
      ),
    );

    expect(
      screen.getByText('Passwords do not match'),
    ).toBeInTheDocument();

    expect(registerCustomer)
      .not.toHaveBeenCalled();
  });

  test('registers valid customer', async () => {
    registerCustomer.mockResolvedValue({
      message:
        'Registration successful. You can now sign in.',
    });

    renderPage();

    fireEvent.click(
      screen.getByRole(
        'tab',
        { name: 'Register' },
      ),
    );

    await userEvent.type(
      screen.getByLabelText('Full Name'),
      'Aarav Sharma',
    );

    fireEvent.change(
      screen.getByLabelText('Date of Birth'),
      {
        target: {
          value: '1990-04-15',
        },
      },
    );

    await userEvent.type(
      screen.getByLabelText('Email'),
      'aarav@example.com',
    );

    await userEvent.type(
      screen.getByLabelText('Phone'),
      '9876543210',
    );

    await userEvent.type(
      screen.getByLabelText('Password'),
      'Password@123',
    );

    await userEvent.type(
      screen.getByLabelText('Confirm Password'),
      'Password@123',
    );

    fireEvent.click(
      screen.getByRole(
        'button',
        { name: 'Create Account' },
      ),
    );

    expect(
      await screen.findByRole('status'),
    ).toHaveTextContent(
      'Registration successful',
    );

    expect(registerCustomer)
      .toHaveBeenCalledWith({
        fullName: 'Aarav Sharma',
        email: 'aarav@example.com',
        dateOfBirth: '1990-04-15',
        phone: '9876543210',
        password: 'Password@123',
      });
  });
});

