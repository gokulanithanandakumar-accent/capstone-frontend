import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./api/authApi');
jest.mock('./api/dashboardApi');

test('renders the login page for unauthenticated users', () => {
  sessionStorage.clear();
  window.history.pushState({}, '', '/');
  render(<App />);
  expect(screen.getByText('Customer Login')).toBeInTheDocument();
});
