import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AuthProvider,
  useAuth,
} from '../../auth/AuthContext';
import { login as loginRequest } from '../../api/authApi';
import {
  clearSession,
  readSession,
} from '../../auth/session';

jest.mock('../../api/authApi');
jest.mock('../../auth/session');

function Consumer() {
  const {
    isAuthenticated,
    customer,
    login,
    logout,
  } = useAuth();

  return (
    <div>
      <span data-testid="authenticated">
        {String(isAuthenticated)}
      </span>

      <span data-testid="customer">
        {customer?.fullName ?? 'none'}
      </span>

      <button
        type="button"
        onClick={() =>
          login('demo@gmail.com', 'Pasword@123')
        }
      >
        Sign in
      </button>

      <button
        type="button"
        onClick={logout}
      >
        Sign out
      </button>
    </div>
  );
}

function InvalidConsumer() {
  useAuth();
  return null;
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    readSession.mockReturnValue(null);
  });

  test('FE-AUTH-07 starts unauthenticated', () => {
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(
      screen.getByTestId('authenticated'),
    ).toHaveTextContent('false');

    expect(
      screen.getByTestId('customer'),
    ).toHaveTextContent('none');
  });

  test('FE-AUTH-08 restores saved session', () => {
    readSession.mockReturnValue({
      accessToken: 'saved-token',
      customer: {
        customerId: 1,
        fullName: 'Saved Customer',
      },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    expect(
      screen.getByTestId('authenticated'),
    ).toHaveTextContent('true');

    expect(
      screen.getByTestId('customer'),
    ).toHaveTextContent('Saved Customer');
  });

  

  test('FE-AUTH-10 signs out and clears session', async () => {
    readSession.mockReturnValue({
      accessToken: 'saved-token',
      customer: {
        fullName: 'Demo Customer',
      },
    });

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Sign out',
      }),
    );

    expect(clearSession).toHaveBeenCalled();

    expect(
      screen.getByTestId('authenticated'),
    ).toHaveTextContent('false');
  });

  test('FE-AUTH-11 rejects use outside provider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() =>
      render(<InvalidConsumer />),
    ).toThrow(
      'useAuth must be used within an AuthProvider',
    );

    consoleError.mockRestore();
  });
});
