import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes, routerFuture } from '../App';
import { AuthProvider } from '../auth/AuthContext';
import { writeSession } from '../auth/session';
import { fetchAvailableProducts, fetchMyPolicies, fetchPolicyPremiums, payPremiums } from '../api/dashboardApi';

jest.mock('../api/authApi');
jest.mock('../api/dashboardApi');

function installment(overrides) {
  return {
    scheduledAmount: 1250.0,
    paidAmount: 0,
    penaltyPaid: 0,
    applicablePenalty: 0,
    selectable: true,
    ...overrides,
  };
}

function premiumDetails(overrides = {}) {
  return {
    policy: {
      policyNumber: 'HDP-2026-0001',
      customerName: 'Gokul',
      policyName: 'HealthDekho Secure Term',
      termMonths: 240,
      startDate: '2026-11-20',
      maturityDate: '2046-11-19',
      premiumFrequency: 'MONTHLY',
      policyStatus: 'ACTIVE',
      totalPremiumPayable: 300000.0,
      totalPremiumPaid: 1750.0,
      totalRemainingPremium: 298250.0,
      totalPenaltyPaid: 0,
    },
    installments: [
      installment({
        installmentId: 4001, installmentNumber: 1, premiumPeriod: '2026-11', dueDate: '2026-11-20',
        gracePeriodEndDate: '2026-12-20', paidAmount: 1250.0, outstandingPremium: 0, amountDue: 0,
        paymentStatus: 'PAID', selectable: false,
      }),
      installment({
        installmentId: 4002, installmentNumber: 2, premiumPeriod: '2026-12', dueDate: '2026-12-20',
        gracePeriodEndDate: '2027-01-20', paidAmount: 500.0, outstandingPremium: 750.0, applicablePenalty: 75.0,
        amountDue: 825.0, paymentStatus: 'OVERDUE',
      }),
      installment({
        installmentId: 4003, installmentNumber: 3, premiumPeriod: '2027-01', dueDate: '2027-01-20',
        gracePeriodEndDate: '2027-02-20', outstandingPremium: 1250.0, amountDue: 1250.0, paymentStatus: 'PENDING',
      }),
    ],
    payments: [
      {
        transactionReference: 'TXN-HD-000001', installmentNumber: 1, paymentDate: '2026-11-18',
        amountPaid: 1250.0, penaltyAmount: 0, paymentMethod: 'UPI',
      },
    ],
    ...overrides,
  };
}

function apiError(status, message) {
  return Object.assign(new Error(message), { response: { status, data: { message } } });
}

function renderPayments(path = '/policies/payments') {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]} future={routerFuture}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('PremiumPaymentPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.resetAllMocks();
    writeSession({
      accessToken: 'jwt-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      customer: { customerId: 1, fullName: 'Gokul', email: 'gokul@gmail.com' },
    });
  });

  test('requires a policy identifier before searching', () => {
    renderPayments();

    userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByText('Policy identifier is required.')).toBeInTheDocument();
    expect(fetchPolicyPremiums).not.toHaveBeenCalled();
  });

  test('searches a policy and shows summary, schedule and history', async () => {
    fetchPolicyPremiums.mockResolvedValue(premiumDetails());
    renderPayments();

    userEvent.type(screen.getByLabelText('Policy Identifier'), ' HDP-2026-0001 ');
    userEvent.click(screen.getByRole('button', { name: 'Search' }));

    const schedule = await screen.findByRole('table', { name: 'Premium installment schedule' });
    expect(fetchPolicyPremiums).toHaveBeenCalledWith('HDP-2026-0001');
    const summary = screen.getByRole('region', { name: 'Policy Summary' });
    expect(summary).toHaveTextContent('Gokul');
    expect(summary).toHaveTextContent('240 months (20 years)');
    expect(summary).toHaveTextContent('₹3,00,000.00');
    expect(summary).toHaveTextContent('₹1,750.00');
    expect(summary).toHaveTextContent('₹2,98,250.00');

    const rows = within(schedule).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Paid');
    expect(rows[2]).toHaveTextContent('Overdue');
    expect(rows[2]).toHaveTextContent('20-01-2027');
    expect(rows[2]).toHaveTextContent('₹825.00');
    expect(rows[3]).toHaveTextContent('Pending');
    expect(screen.getByLabelText('Select installment 1')).toBeDisabled();
    expect(screen.getByLabelText('Select installment 2')).toBeEnabled();

    const history = screen.getByRole('table', { name: 'Payment history' });
    expect(history).toHaveTextContent('TXN-HD-000001');
  });

  test('loads the policy from the query string', async () => {
    fetchPolicyPremiums.mockResolvedValue(premiumDetails());
    renderPayments('/policies/payments?policyNumber=HDP-2026-0001');

    expect(await screen.findByRole('table', { name: 'Premium installment schedule' })).toBeInTheDocument();
    expect(screen.getByLabelText('Policy Identifier')).toHaveValue('HDP-2026-0001');
  });

  test('shows not found error for an unknown policy', async () => {
    fetchPolicyPremiums.mockRejectedValue(apiError(404, 'No policy found with identifier HDP-0000-0000.'));
    renderPayments('/policies/payments?policyNumber=HDP-0000-0000');

    expect(await screen.findByRole('alert')).toHaveTextContent('No policy found with identifier HDP-0000-0000.');
    expect(screen.queryByRole('table', { name: 'Premium installment schedule' })).not.toBeInTheDocument();
  });

  test('pays selected installments including partial payment and reloads the schedule', async () => {
    fetchPolicyPremiums.mockResolvedValue(premiumDetails());
    payPremiums.mockResolvedValue({
      policyNumber: 'HDP-2026-0001',
      paymentDate: '2027-01-25',
      receipts: [
        { transactionReference: 'TXN-HD-000004', installmentNumber: 2, amountPaid: 825.0, penaltyAmount: 75.0, remainingOutstanding: 0, paymentStatus: 'PAID' },
        { transactionReference: 'TXN-HD-000005', installmentNumber: 3, amountPaid: 500.0, penaltyAmount: 0, remainingOutstanding: 750.0, paymentStatus: 'PARTIALLY_PAID' },
      ],
      totalAmountPaid: 1325.0,
      totalPenaltyAmount: 75.0,
      policyStatus: 'ACTIVE',
      message: 'Payment successful. 2 installment(s) updated.',
    });
    renderPayments('/policies/payments?policyNumber=HDP-2026-0001');
    await screen.findByRole('table', { name: 'Premium installment schedule' });

    userEvent.click(screen.getByLabelText('Select installment 2'));
    expect(screen.getByLabelText('Amount for installment 2')).toHaveValue('825.00');
    userEvent.click(screen.getByLabelText('Select installment 3'));
    const amount3 = screen.getByLabelText('Amount for installment 3');
    userEvent.clear(amount3);
    userEvent.type(amount3, '500');
    expect(screen.getByText(/Selected installments: 2/)).toHaveTextContent('₹1,325.00');
    userEvent.selectOptions(screen.getByLabelText('Payment Method'), 'UPI');
    userEvent.click(screen.getByRole('button', { name: 'Pay Premium' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Payment successful. 2 installment(s) updated.');
    expect(payPremiums).toHaveBeenCalledWith('HDP-2026-0001', {
      paymentMethod: 'UPI',
      payments: [{ installmentId: 4002, amount: 825 }, { installmentId: 4003, amount: 500 }],
    });
    const receipts = screen.getByRole('table', { name: 'Payment receipts' });
    expect(receipts).toHaveTextContent('TXN-HD-000004');
    expect(receipts).toHaveTextContent('Partially-Paid');
    await waitFor(() => expect(fetchPolicyPremiums).toHaveBeenCalledTimes(2));
  });

  test('validates selection, payment method and amounts before paying', async () => {
    fetchPolicyPremiums.mockResolvedValue(premiumDetails());
    renderPayments('/policies/payments?policyNumber=HDP-2026-0001');
    await screen.findByRole('table', { name: 'Premium installment schedule' });

    userEvent.click(screen.getByRole('button', { name: 'Pay Premium' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Select at least one installment to pay.');

    userEvent.click(screen.getByLabelText('Select installment 2'));
    const amount = screen.getByLabelText('Amount for installment 2');
    userEvent.clear(amount);
    userEvent.type(amount, '900');
    expect(screen.getByText('Amount cannot exceed the amount due of ₹825.00.')).toBeInTheDocument();
    userEvent.clear(amount);
    userEvent.type(amount, '0');
    expect(screen.getByText('Amount must be greater than zero.')).toBeInTheDocument();
    userEvent.clear(amount);
    userEvent.type(amount, '10.555');
    expect(screen.getByText('Enter a valid amount with up to 2 decimal places.')).toBeInTheDocument();

    userEvent.click(screen.getByRole('button', { name: 'Pay Premium' }));
    expect(screen.getByText('Payment method is required.')).toBeInTheDocument();
    expect(payPremiums).not.toHaveBeenCalled();
  });

  test.each([
    [409, 'Installment 2 has already been paid.'],
    [422, 'Payment of 50.00 for installment 2 must cover at least the late payment penalty of 75.00.'],
  ])('shows backend error %s when payment is rejected', async (status, message) => {
    fetchPolicyPremiums.mockResolvedValue(premiumDetails());
    payPremiums.mockRejectedValue(apiError(status, message));
    renderPayments('/policies/payments?policyNumber=HDP-2026-0001');
    await screen.findByRole('table', { name: 'Premium installment schedule' });

    userEvent.click(screen.getByLabelText('Select installment 2'));
    userEvent.selectOptions(screen.getByLabelText('Payment Method'), 'CARD');
    userEvent.click(screen.getByRole('button', { name: 'Pay Premium' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  test('dashboard header links to premium payments', async () => {
    fetchMyPolicies.mockResolvedValue([]);
    fetchAvailableProducts.mockResolvedValue([]);
    renderPayments('/dashboard');

    userEvent.click(await screen.findByRole('link', { name: 'Premium Payments' }));

    expect(screen.getByRole('heading', { name: 'Premium Payments' })).toBeInTheDocument();
  });
});