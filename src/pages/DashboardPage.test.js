import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes, routerFuture } from '../App';
import { AuthProvider } from '../auth/AuthContext';
import { writeSession } from '../auth/session';
import { fetchAvailableProducts, fetchMyPolicies, fetchRegistrationDetails } from '../api/dashboardApi';
import { todayIso } from '../utils/format';

jest.mock('../api/authApi');
jest.mock('../api/dashboardApi');

const POLICY = {
  policyNumber: 'HDP-2026-0001',
  policyName: 'HealthDekho Secure Term',
  policyType: 'TERM',
  termMonths: 240,
  startDate: '2026-11-20',
  maturityDate: '2046-11-19',
  premiumFrequency: 'MONTHLY',
  premiumAmount: 1250.0,
  sumInsured: 5000000.0,
  status: 'ACTIVE',
};

const HEALTH_PRODUCT = {
  productId: 2,
  productCode: 'HD-HEALTH-001',
  policyName: 'HealthDekho Family Health Shield',
  policyType: 'HEALTH',
  termMonths: 12,
  sumInsured: 1000000.0,
  premiumFrequency: 'YEARLY',
  premiumAmount: 18000.0,
};

const SAVINGS_PRODUCT = {
  productId: 3,
  productCode: 'HD-SAV-001',
  policyName: 'HealthDekho Smart Savings',
  policyType: 'SAVINGS',
  termMonths: 120,
  sumInsured: 1500000.0,
  premiumFrequency: 'QUARTERLY',
  premiumAmount: 7500.0,
};

function renderDashboard() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard']} future={routerFuture}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.resetAllMocks();
    writeSession({
      accessToken: 'jwt-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      customer: { customerId: 1, fullName: 'Gokul', email: 'gokul@gmail.com' },
    });
  });

  test('displays the registered policies of the logged-in customer in a table', async () => {
    fetchMyPolicies.mockResolvedValue([POLICY]);
    fetchAvailableProducts.mockResolvedValue([]);
    renderDashboard();

    const table = await screen.findByRole('table', { name: 'My insurance policies' });
    const headers = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual([
      'Policy Identifier', 'Policy Name', 'Policy Type', 'Policy Term', 'Policy Start Date',
      'Policy Maturity Date', 'Premium Frequency', 'Premium Amount', 'Sum Insured', 'Policy Status', 'Action',
    ]);
    const row = within(table).getAllByRole('row')[1];
    expect(row).toHaveTextContent('HDP-2026-0001');
    expect(row).toHaveTextContent('HealthDekho Secure Term');
    expect(row).toHaveTextContent('240 months (20 years)');
    expect(row).toHaveTextContent('20-11-2026');
    expect(row).toHaveTextContent('19-11-2046');
    expect(row).toHaveTextContent('Monthly');
    expect(row).toHaveTextContent('₹1,250.00');
    expect(row).toHaveTextContent('₹50,00,000.00');
    expect(row).toHaveTextContent('Active');
    expect(screen.getByText('Welcome, Gokul')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Pay premium for HDP-2026-0001' }))
      .toHaveAttribute('href', '/policies/payments?policyNumber=HDP-2026-0001');
  });

  test('shows a message when the customer has not registered any policy', async () => {
    fetchMyPolicies.mockResolvedValue([]);
    fetchAvailableProducts.mockResolvedValue([HEALTH_PRODUCT]);
    renderDashboard();

    expect(await screen.findByText('You have not registered any insurance policy yet.')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'My insurance policies' })).not.toBeInTheDocument();
  });

  test('displays available products with a Register button for each', async () => {
    fetchMyPolicies.mockResolvedValue([POLICY]);
    fetchAvailableProducts.mockResolvedValue([HEALTH_PRODUCT, SAVINGS_PRODUCT]);
    renderDashboard();

    const table = await screen.findByRole('table', { name: 'Available insurance policies' });
    const headers = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual([
      'Product Code', 'Policy Name', 'Policy Type', 'Policy Term', 'Sum Insured',
      'Premium Frequency', 'Premium Amount', 'Action',
    ]);
    expect(within(table).getAllByRole('button', { name: /Register/ })).toHaveLength(2);
    expect(within(table).getByText('HD-HEALTH-001')).toBeInTheDocument();
    expect(within(table).getByText('HD-SAV-001')).toBeInTheDocument();
    expect(within(table).queryByText('HD-TERM-001')).not.toBeInTheDocument();
  });

  test('shows a message when no products are available', async () => {
    fetchMyPolicies.mockResolvedValue([POLICY]);
    fetchAvailableProducts.mockResolvedValue([]);
    renderDashboard();

    expect(
      await screen.findByText('There are no additional insurance policies available for you at the moment.'),
    ).toBeInTheDocument();
  });

  test('navigates to registration with the selected product pre-populated', async () => {
    fetchMyPolicies.mockResolvedValue([]);
    fetchAvailableProducts.mockResolvedValue([HEALTH_PRODUCT, SAVINGS_PRODUCT]);
    fetchRegistrationDetails.mockReturnValue(new Promise(() => {}));
    renderDashboard();

    userEvent.click(await screen.findByRole('button', { name: 'Register HealthDekho Smart Savings' }));

    expect(await screen.findByRole('heading', { name: 'Policy Registration' })).toBeInTheDocument();
    expect(fetchRegistrationDetails).toHaveBeenCalledWith(3, todayIso());
    expect(screen.getByText('HD-SAV-001')).toBeInTheDocument();
    expect(screen.getByText('HealthDekho Smart Savings')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
    expect(screen.getByText('120 months (10 years)')).toBeInTheDocument();
    expect(screen.getByText('₹15,00,000.00')).toBeInTheDocument();
    expect(screen.getByText('Quarterly')).toBeInTheDocument();
    expect(screen.getByText('₹7,500.00')).toBeInTheDocument();
  });

  test('shows error messages when data cannot be loaded', async () => {
    fetchMyPolicies.mockRejectedValue({ response: { status: 500, data: { message: 'Server unavailable' } } });
    fetchAvailableProducts.mockRejectedValue(new Error('Network Error'));
    renderDashboard();

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.map((a) => a.textContent)).toEqual(
      expect.arrayContaining(['Server unavailable', 'Unable to load available insurance policies.']),
    );
  });

  test('logout clears the session and returns to login', async () => {
    fetchMyPolicies.mockResolvedValue([]);
    fetchAvailableProducts.mockResolvedValue([]);
    renderDashboard();

    userEvent.click(screen.getByRole('button', { name: 'Logout' }));

    expect(await screen.findByText('Customer Login')).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
  });

  test('registration page without a selected product returns to dashboard', async () => {
    fetchMyPolicies.mockResolvedValue([]);
    fetchAvailableProducts.mockResolvedValue([]);
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/policies/register']} future={routerFuture}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByText('Welcome, Gokul')).toBeInTheDocument();
  });
});
