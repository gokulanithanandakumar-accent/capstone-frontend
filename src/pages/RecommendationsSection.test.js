import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes, routerFuture } from '../App';
import { AuthProvider } from '../auth/AuthContext';
import { writeSession } from '../auth/session';
import {
  fetchAvailableProducts,
  fetchMyPolicies,
  fetchRegistrationDetails,
  generateRecommendations,
  registerPolicy,
} from '../api/dashboardApi';
import { todayIso } from '../utils/format';

jest.mock('../api/authApi');
jest.mock('../api/dashboardApi');

const HEALTH_PRODUCT = {
  productId: 2,
  productCode: 'HD-HEALTH-001',
  policyName: 'HealthDekho Family Health',
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

const RECOMMENDATION_RESPONSE = {
  recommendationRequestId: 10,
  calculatedAge: 36,
  recommendations: [
    {
      recommendationItemId: 101,
      rankOrder: 1,
      ...HEALTH_PRODUCT,
      recommendationReason: 'Matches the goal of comprehensive family health protection.',
      suitability: 'HIGH',
    },
    {
      recommendationItemId: 102,
      rankOrder: 2,
      ...SAVINGS_PRODUCT,
      recommendationReason: 'Supports disciplined long-term savings.',
      suitability: 'MEDIUM',
    },
  ],
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

async function openForm() {
  userEvent.click(await screen.findByRole('button', { name: 'Get AI Recommendations' }));
  return screen.getByRole('form', { name: 'Recommendation preferences' });
}

describe('AI policy recommendations', () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.resetAllMocks();
    writeSession({
      accessToken: 'jwt-token',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      customer: { customerId: 1, fullName: 'Goutham', email: 'goutham@gmail.com' },
    });
    fetchMyPolicies.mockResolvedValue([]);
    fetchAvailableProducts.mockResolvedValue([HEALTH_PRODUCT, SAVINGS_PRODUCT]);
  });

  test('offers insurance types derived from available products', async () => {
    renderDashboard();
    await screen.findByRole('table', { name: 'Available insurance policies' });
    await openForm();

    const options = within(screen.getByLabelText('Insurance Type')).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['Any', 'Health', 'Savings']);
  });

  test('requires at least one input before calling the API', async () => {
    renderDashboard();
    await openForm();

    userEvent.click(screen.getByRole('button', { name: 'Generate Recommendations' }));

    expect(await screen.findByText('Please provide at least one input to generate recommendations.')).toBeInTheDocument();
    expect(generateRecommendations).not.toHaveBeenCalled();
  });

  test('rejects a future date of birth', async () => {
    renderDashboard();
    await openForm();

    userEvent.type(screen.getByLabelText('Date of Birth'), '2999-01-01');
    userEvent.click(screen.getByRole('button', { name: 'Generate Recommendations' }));

    expect(await screen.findByText('Date of birth cannot be in the future.')).toBeInTheDocument();
    expect(generateRecommendations).not.toHaveBeenCalled();
  });

  test('sends the provided inputs and displays recommendations in a table', async () => {
    generateRecommendations.mockResolvedValue(RECOMMENDATION_RESPONSE);
    renderDashboard();
    await screen.findByRole('table', { name: 'Available insurance policies' });
    await openForm();

    userEvent.type(screen.getByLabelText('Date of Birth'), '1990-04-15');
    userEvent.type(screen.getByLabelText('Insurance Goals and Preferences'), '  Family health cover  ');
    userEvent.selectOptions(screen.getByLabelText('Insurance Type'), 'HEALTH');
    userEvent.click(screen.getByRole('button', { name: 'Generate Recommendations' }));

    const table = await screen.findByRole('table', { name: 'Recommended insurance policies' });
    expect(generateRecommendations).toHaveBeenCalledWith({
      dateOfBirth: '1990-04-15',
      insuranceGoals: 'Family health cover',
      preferredTerm: null,
      preferredPolicyType: 'HEALTH',
    });
    const headers = within(table).getAllByRole('columnheader').map((th) => th.textContent);
    expect(headers).toEqual([
      'Product Code', 'Policy Name', 'Policy Type', 'Policy Term', 'Sum Insured', 'Premium Frequency',
      'Premium Amount', 'Recommendation Reason', 'Suitability', 'Action',
    ]);
    const firstRow = within(table).getAllByRole('row')[1];
    expect(firstRow).toHaveTextContent('HD-HEALTH-001');
    expect(firstRow).toHaveTextContent('12 months (1 year)');
    expect(firstRow).toHaveTextContent('₹10,00,000.00');
    expect(firstRow).toHaveTextContent('Matches the goal of comprehensive family health protection.');
    expect(firstRow).toHaveTextContent('High');
    expect(within(table).getAllByRole('button', { name: /Register recommended/ })).toHaveLength(2);
    expect(screen.getByText('36 years')).toBeInTheDocument();
  });

  test('Register on a recommendation opens registration and links the recommendation item', async () => {
    generateRecommendations.mockResolvedValue(RECOMMENDATION_RESPONSE);
    fetchRegistrationDetails.mockImplementation((productId, startDate) => Promise.resolve({
      customerName: 'Goutham',
      dateOfBirth: '1990-04-15',
      email: 'goutham@gmail.com',
      phone: '9000000003',
      ...SAVINGS_PRODUCT,
      productId,
      startDate,
      maturityDate: '2036-11-23',
      totalPremiumPayable: 300000.0,
      numberOfInstallments: 40,
    }));
    registerPolicy.mockResolvedValue({
      policyNumber: 'HDP-2026-0002',
      policyName: 'HealthDekho Smart Savings',
      startDate: todayIso(),
      maturityDate: '2036-11-23',
      totalPremiumPayable: 300000.0,
      numberOfInstallments: 40,
      status: 'ACTIVE',
      message: 'Policy registered successfully. Your policy identifier is HDP-2026-0002.',
    });
    renderDashboard();
    await openForm();

    userEvent.type(screen.getByLabelText('Preferred Policy Term'), '10 years');
    userEvent.click(screen.getByRole('button', { name: 'Generate Recommendations' }));
    userEvent.click(await screen.findByRole('button', { name: 'Register recommended HealthDekho Smart Savings' }));

    expect(await screen.findByRole('heading', { name: 'Policy Registration' })).toBeInTheDocument();
    expect(screen.getByText('Selected from your AI recommendations.')).toBeInTheDocument();
    expect(screen.getByText('HD-SAV-001')).toBeInTheDocument();
    expect(screen.getByText('HealthDekho Smart Savings')).toBeInTheDocument();
    expect(screen.getByText('120 months (10 years)')).toBeInTheDocument();
    expect(screen.getByText('₹7,500.00')).toBeInTheDocument();

    expect(await screen.findByText('goutham@gmail.com')).toBeInTheDocument();
    userEvent.click(screen.getByRole('button', { name: 'Register Policy' }));

    expect(await screen.findByText('Policy registered successfully. Your policy identifier is HDP-2026-0002.'))
      .toBeInTheDocument();
    expect(registerPolicy).toHaveBeenCalledWith({ productId: 3, startDate: todayIso(), recommendationItemId: 102 });
  });

  test('shows a message when no recommendation is returned', async () => {
    generateRecommendations.mockResolvedValue({ recommendationRequestId: null, calculatedAge: 70, recommendations: [] });
    renderDashboard();
    await openForm();

    userEvent.type(screen.getByLabelText('Date of Birth'), '1956-01-01');
    userEvent.click(screen.getByRole('button', { name: 'Generate Recommendations' }));

    expect(
      await screen.findByText('No eligible insurance products could be recommended for you at the moment.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Recommended insurance policies' })).not.toBeInTheDocument();
  });

  test('shows the server error message when the AI service is unavailable', async () => {
    generateRecommendations.mockRejectedValue({
      response: { status: 503, data: { message: 'AI recommendations are currently unavailable. Please try again later.' } },
    });
    renderDashboard();
    await openForm();

    userEvent.type(screen.getByLabelText('Insurance Goals and Preferences'), 'Retirement savings');
    userEvent.click(screen.getByRole('button', { name: 'Generate Recommendations' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'AI recommendations are currently unavailable. Please try again later.',
    );
  });
});
