import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes, routerFuture } from '../../App';
import { AuthProvider } from '../../auth/AuthContext';
import { writeSession } from '../../auth/session';
import { fetchRegistrationDetails, registerPolicy } from '../../api/dashboardApi';
import { todayIso } from '../../utils/format';

jest.mock('../../api/authApi');
jest.mock('../../api/dashboardApi');

const TERM_PRODUCT = {
  productId: 1,
  productCode: 'HD-TERM-001',
  policyName: 'HealthDekho Secure Term',
  policyType: 'TERM',
  termMonths: 240,
  sumInsured: 5000000.0,
  premiumFrequency: 'MONTHLY',
  premiumAmount: 1250.0,
};

function details(startDate, maturityDate) {
  return {
    customerName: 'Gokul',
    dateOfBirth: '1990-04-15',
    email: 'gokul@gmail.com',
    phone: '9000000002',
    ...TERM_PRODUCT,
    startDate,
    maturityDate,
    totalPremiumPayable: 300000.0,
    numberOfInstallments: 240,
  };
}

function apiError(status, message) {
  return Object.assign(new Error(message), { response: { status, data: { message } } });
}

function futureIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function renderRegistration(state = { product: TERM_PRODUCT }) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[{ pathname: '/policies/register', state }]} future={routerFuture}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );
}


async function waitForRegistrationDetails() {
  const customerSection = await screen.findByRole(
    'region',
    { name: 'Customer Details' },
  );

  await waitFor(() => {
    expect(
      within(customerSection).getByText('15-04-1990'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole(
        'button',
        { name: 'Register Policy' },
      ),
    ).toBeEnabled();
  });

  return customerSection;
}

describe('PolicyRegistrationPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.resetAllMocks();
    writeSession({
      accessToken: 'jwt-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      customer: { customerId: 1, fullName: 'Gokul', email: 'gokul@gmail.com' },
    });
    fetchRegistrationDetails.mockImplementation((productId, startDate) =>
      Promise.resolve(details(startDate, '2046-11-19')));
  });

  test('pre-populates customer, product and calculated policy values', async () => {
    renderRegistration();

    const customerSection = await waitForRegistrationDetails();
    expect(fetchRegistrationDetails).toHaveBeenCalledWith(1, todayIso());
    expect(within(customerSection).getByText('15-04-1990')).toBeInTheDocument();
    expect(within(customerSection).getByText('gokul@gmail.com')).toBeInTheDocument();
    expect(within(customerSection).getByText('9000000002')).toBeInTheDocument();
    expect(screen.getByText('HealthDekho Secure Term')).toBeInTheDocument();
    expect(screen.getByText('Term')).toBeInTheDocument();
    expect(screen.getByText('240 months (20 years)')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('₹1,250.00')).toBeInTheDocument();
    expect(screen.getByText('₹50,00,000.00')).toBeInTheDocument();
    expect(screen.getByText('19-11-2046')).toBeInTheDocument();
    expect(screen.getByText('₹3,00,000.00')).toBeInTheDocument();
    expect(screen.getByLabelText('Policy Start Date')).toHaveValue(todayIso());
    expect(screen.getByRole('button', { name: 'Register Policy' })).toBeEnabled();
  });

  test('recalculates values when the start date changes', async () => {
    const newStart = futureIso(10);
    fetchRegistrationDetails.mockImplementation((productId, startDate) =>
      Promise.resolve(details(startDate, startDate === newStart ? '2046-12-31' : '2046-11-19')));
    renderRegistration();
    await screen.findByText('19-11-2046');

    fireEvent.change(screen.getByLabelText('Policy Start Date'), { target: { value: newStart } });

    expect(await screen.findByText('31-12-2046')).toBeInTheDocument();
    expect(fetchRegistrationDetails).toHaveBeenLastCalledWith(1, newStart);
  });

  test('validates that the start date is present and not in the past', async () => {
    renderRegistration();
    await waitForRegistrationDetails();
    const input = screen.getByLabelText('Policy Start Date');

    fireEvent.change(input, { target: { value: '2020-01-01' } });
    expect(screen.getByText('Policy start date cannot be in the past.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register Policy' })).toBeDisabled();

    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByText('Policy start date is required.')).toBeInTheDocument();
    expect(fetchRegistrationDetails).toHaveBeenCalledTimes(1);
    expect(registerPolicy).not.toHaveBeenCalled();
  });

  test('registers the policy and displays the confirmation with the policy identifier', async () => {
    registerPolicy.mockResolvedValue({
      policyNumber: 'HDP-2026-0001',
      policyName: 'HealthDekho Secure Term',
      startDate: todayIso(),
      maturityDate: '2046-11-19',
      totalPremiumPayable: 300000.0,
      numberOfInstallments: 240,
      status: 'ACTIVE',
      message: 'Policy registered successfully. Your policy identifier is HDP-2026-0001.',
    });
    renderRegistration();
    await waitForRegistrationDetails();

    userEvent.click(screen.getByRole('button', { name: 'Register Policy' }));

    expect(await screen.findByRole('heading', { name: 'Registration Successful' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Policy registered successfully. Your policy identifier is HDP-2026-0001.',
    );
    expect(screen.getByText('HDP-2026-0001')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(registerPolicy).toHaveBeenCalledWith({ productId: 1, startDate: todayIso(), recommendationItemId: null });
  });

  test('shows the duplicate registration error', async () => {
    registerPolicy.mockRejectedValue(apiError(409, 'You have already registered a policy for HealthDekho Secure Term.'));
    renderRegistration();
    await waitForRegistrationDetails();

    userEvent.click(screen.getByRole('button', { name: 'Register Policy' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You have already registered a policy for HealthDekho Secure Term.',
    );
    expect(screen.queryByRole('heading', { name: 'Registration Successful' })).not.toBeInTheDocument();
  });

  test('shows the eligibility error returned by the server', async () => {
    registerPolicy.mockRejectedValue(apiError(422,
      'You are not eligible for HealthDekho Secure Term. Entry age must be between 18 and 60 years (your age on the start date: 61).'));
    renderRegistration();
    await waitForRegistrationDetails();

    userEvent.click(screen.getByRole('button', { name: 'Register Policy' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Entry age must be between 18 and 60 years');
  });

  test('shows a fallback message when registration fails unexpectedly', async () => {
    registerPolicy.mockRejectedValue(new Error('Network Error'));
    renderRegistration();
    await waitForRegistrationDetails();

    userEvent.click(screen.getByRole('button', { name: 'Register Policy' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to register the policy. Please try again.');
  });

  test('shows an error and disables submission when details cannot be loaded', async () => {
    fetchRegistrationDetails.mockRejectedValue(apiError(422, 'The selected insurance product is no longer available.'));
    renderRegistration();

    expect(await screen.findByRole('alert')).toHaveTextContent('The selected insurance product is no longer available.');
    expect(screen.getByRole('button', { name: 'Register Policy' })).toBeDisabled();
  });
});


