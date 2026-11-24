import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes, routerFuture } from '../App';
import { AuthProvider } from '../auth/AuthContext';
import { writeSession } from '../auth/session';
import { fetchAvailableProducts, fetchMyPolicies, searchPolicies } from '../api/dashboardApi';
import { validateCriteria } from './PolicySearchPage';

jest.mock('../api/authApi');
jest.mock('../api/dashboardApi');

function result(overrides = {}) {
  return {
    policyNumber: 'HDP-2026-0001',
    customerName: 'Yuvaraj',
    dateOfBirth: '1992-06-10',
    policyName: 'HealthDekho Secure Term',
    policyType: 'TERM',
    startDate: '2026-11-20',
    maturityDate: '2046-11-19',
    totalPremiumPayable: 300000.0,
    premiumPaymentStatus: 'PARTIALLY_PAID',
    totalPremiumPaid: 1750.0,
    remainingPremium: 298250.0,
    ...overrides,
  };
}

function searchResponse(results, overrides = {}) {
  return { results, page: 0, size: 10, totalElements: results.length, totalPages: results.length ? 1 : 0, ...overrides };
}

function apiError(status, message) {
  return Object.assign(new Error(message), { response: { status, data: { message } } });
}

function renderSearch(path = '/policies/search') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]} future={routerFuture}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );
}

const search = () => userEvent.click(screen.getByRole('button', { name: 'Search' }));
const setDateOfBirth = (value) => fireEvent.change(screen.getByLabelText('Date of Birth'), { target: { value } });

describe('PolicySearchPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.resetAllMocks();
    writeSession({
      accessToken: 'jwt-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      customer: { customerId: 1, fullName: 'Yuvaraj', email: 'yuvaraj@gmail.com' },
    });
  });

  test('searches by customer name and shows every spec column', async () => {
    searchPolicies.mockResolvedValue(searchResponse([result()]));
    renderSearch();

    userEvent.type(screen.getByLabelText('Customer Name'), '  Yuvaraj   K ');
    search();

    const table = await screen.findByRole('table', { name: 'Policy search results' });
    expect(searchPolicies).toHaveBeenCalledWith({ customerName: 'Yuvaraj K', page: 0, size: 10 });
    const headers = within(table).getAllByRole('columnheader').map((cell) => cell.textContent);
    expect(headers).toEqual([
      'Policy Identifier', 'Customer Name', 'Date of Birth', 'Policy Name', 'Policy Type', 'Policy Start Date',
      'Policy Maturity Date', 'Total Premium Payable', 'Premium Payment Status', 'Total Premium Paid',
      'Remaining Premium',
    ]);
    const row = within(table).getAllByRole('row')[1];
    expect(row).toHaveTextContent('HDP-2026-0001');
    expect(row).toHaveTextContent('10-06-1992');
    expect(row).toHaveTextContent('20-11-2026');
    expect(row).toHaveTextContent('19-11-2046');
    expect(row).toHaveTextContent('Partially-Paid');
    expect(row).toHaveTextContent('₹3,00,000.00');
    expect(row).toHaveTextContent('₹1,750.00');
    expect(row).toHaveTextContent('₹2,98,250.00');
    expect(screen.getByText('1 matching policy found.')).toBeInTheDocument();
  });

  test('searches by policy identifier alone', async () => {
    searchPolicies.mockResolvedValue(searchResponse([result()]));
    renderSearch();

    userEvent.type(screen.getByLabelText('Policy Identifier'), ' HDP-2026-0001 ');
    search();

    await screen.findByRole('table', { name: 'Policy search results' });
    expect(searchPolicies).toHaveBeenCalledWith({ policyNumber: 'HDP-2026-0001', page: 0, size: 10 });
  });

  test('searches by policy identifier and date of birth', async () => {
    searchPolicies.mockResolvedValue(searchResponse([result()]));
    renderSearch();

    userEvent.type(screen.getByLabelText('Policy Identifier'), 'HDP-2026-0001');
    setDateOfBirth('1992-06-10');
    search();

    await screen.findByRole('table', { name: 'Policy search results' });
    expect(searchPolicies).toHaveBeenCalledWith({
      policyNumber: 'HDP-2026-0001', dateOfBirth: '1992-06-10', page: 0, size: 10,
    });
  });

  test.each([
    [{}, 'Enter a Policy Identifier or Customer Name to search.'],
    [{ dateOfBirth: '1992-06-10' }, 'Date of Birth can only be used together with Policy Identifier.'],
    [{ customerName: 'Yuvaraj', dateOfBirth: '1992-06-10' }, 'Date of Birth can only be used together with Policy Identifier.'],
    [{ customerName: 'Yuvaraj', policyNumber: 'HDP-2026-0001' },
      'Search by Policy Identifier, Customer Name, or Policy Identifier and Date of Birth.'],
  ])('rejects unsupported combination %j', (input, message) => {
    renderSearch();

    if (input.customerName) userEvent.type(screen.getByLabelText('Customer Name'), input.customerName);
    if (input.policyNumber) userEvent.type(screen.getByLabelText('Policy Identifier'), input.policyNumber);
    if (input.dateOfBirth) setDateOfBirth(input.dateOfBirth);
    search();

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(searchPolicies).not.toHaveBeenCalled();
  });

  test('validates field formats before searching', () => {
    renderSearch();
    const nameInput = () => screen.getByLabelText(/^Customer Name/);

    userEvent.type(nameInput(), 'Y');
    search();
    expect(screen.getByText('Customer name must contain at least 2 characters.')).toBeInTheDocument();

    userEvent.clear(nameInput());
    userEvent.type(nameInput(), 'Yuva123');
    search();
    expect(screen.getByText('Customer name may contain only letters, spaces, apostrophes, periods and hyphens.'))
      .toBeInTheDocument();

    userEvent.clear(nameInput());
    userEvent.type(screen.getByLabelText('Policy Identifier'), 'HDP 2026/0001');
    search();
    expect(screen.getByText('Policy identifier may contain only letters, digits and hyphens.')).toBeInTheDocument();
    expect(searchPolicies).not.toHaveBeenCalled();
  });

  test('rejects a future date of birth', () => {
    expect(validateCriteria({ customerName: '', policyNumber: 'HDP-1', dateOfBirth: '2999-01-01' }).errors)
      .toEqual({ dateOfBirth: 'Date of birth cannot be in the future.' });
  });

  test('shows a message when no policies match', async () => {
    searchPolicies.mockResolvedValue(searchResponse([]));
    renderSearch();

    userEvent.type(screen.getByLabelText('Policy Identifier'), 'HDP-2026-9999');
    search();

    expect(await screen.findByText('No matching policies found.')).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Policy search results' })).not.toBeInTheDocument();
  });

  test('pages through results with the original criteria', async () => {
    searchPolicies
      .mockResolvedValueOnce(searchResponse([result()], { totalElements: 12, totalPages: 2 }))
      .mockResolvedValueOnce(searchResponse([result({ policyNumber: 'HDP-2026-0011' })],
        { page: 1, totalElements: 12, totalPages: 2 }));
    renderSearch();

    userEvent.type(screen.getByLabelText('Customer Name'), 'Yuvaraj');
    search();

    expect(await screen.findByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    userEvent.clear(screen.getByLabelText('Customer Name'));
    userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument();
    expect(searchPolicies).toHaveBeenLastCalledWith({ customerName: 'Yuvaraj', page: 1, size: 10 });
    expect(screen.getByText('HDP-2026-0011')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('shows the server error message', async () => {
    searchPolicies.mockRejectedValue(apiError(400, 'Customer name must contain at least 2 characters.'));
    renderSearch();

    userEvent.type(screen.getByLabelText('Customer Name'), 'Yuvaraj');
    search();

    expect(await screen.findByRole('alert')).toHaveTextContent('Customer name must contain at least 2 characters.');
  });

  test('clears criteria and results', async () => {
    searchPolicies.mockResolvedValue(searchResponse([result()]));
    renderSearch();

    userEvent.type(screen.getByLabelText('Customer Name'), 'Yuvaraj');
    search();
    await screen.findByRole('table', { name: 'Policy search results' });
    userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByLabelText('Customer Name')).toHaveValue('');
    expect(screen.queryByRole('table', { name: 'Policy search results' })).not.toBeInTheDocument();
  });

  test('is reachable from the dashboard', async () => {
    fetchMyPolicies.mockResolvedValue([]);
    fetchAvailableProducts.mockResolvedValue([]);
    renderSearch('/dashboard');

    userEvent.click(await screen.findByRole('link', { name: 'Search Policies' }));

    expect(screen.getByRole('heading', { name: 'Policy Search' })).toBeInTheDocument();
  });
});
