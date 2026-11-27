import { render, screen } from '@testing-library/react';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';
import ProtectedRoute from '../../auth/ProtectedRoute';
import { useAuth } from '../../auth/AuthContext';

jest.mock('../../auth/AuthContext');

function renderRoute() {
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/login"
          element={<div>Login destination</div>}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Protected dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  test('FE-AUTH-12 permits authenticated customer', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
    });

    renderRoute();

    expect(
      screen.getByText('Protected dashboard'),
    ).toBeInTheDocument();
  });

  test('FE-AUTH-13 redirects unauthenticated customer', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
    });

    renderRoute();

    expect(
      screen.getByText('Login destination'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Protected dashboard'),
    ).not.toBeInTheDocument();
  });
});