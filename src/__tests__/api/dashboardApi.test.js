import apiClient from '../../api/client';
import {
  fetchAvailableProducts,
  fetchMyPolicies,
  fetchPolicyPremiums,
  fetchRegistrationDetails,
  generateRecommendations,
  payPremiums,
  registerPolicy,
  searchPolicies,
} from '../../api/dashboardApi';

jest.mock('../../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('dashboardApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('FE-API-04 fetches customer policies', async () => {
    apiClient.get.mockResolvedValue({ data: [{ policyNumber: 'HDP-1' }] });

    await expect(fetchMyPolicies()).resolves.toEqual([
      { policyNumber: 'HDP-1' },
    ]);

    expect(apiClient.get).toHaveBeenCalledWith('/policies/me');
  });

  test('FE-API-05 fetches available products', async () => {
    apiClient.get.mockResolvedValue({ data: [{ productId: 1 }] });

    await expect(fetchAvailableProducts()).resolves.toEqual([
      { productId: 1 },
    ]);

    expect(apiClient.get).toHaveBeenCalledWith(
      '/products/available',
    );
  });

  test('FE-API-06 generates recommendations', async () => {
    const payload = {
      dateOfBirth: '1990-04-15',
      preferredTerm: '10 years',
    };

    apiClient.post.mockResolvedValue({
      data: { recommendations: [] },
    });

    await expect(
      generateRecommendations(payload),
    ).resolves.toEqual({ recommendations: [] });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/recommendations',
      payload,
    );
  });

  test('FE-API-07 fetches registration details with date', async () => {
    apiClient.get.mockResolvedValue({ data: { productId: 1 } });

    await fetchRegistrationDetails(1, '2026-11-27');

    expect(apiClient.get).toHaveBeenCalledWith(
      '/policies/registration-details',
      {
        params: {
          productId: 1,
          startDate: '2026-11-27',
        },
      },
    );
  });

  test('FE-API-08 fetches registration details without date', async () => {
    apiClient.get.mockResolvedValue({ data: { productId: 1 } });

    await fetchRegistrationDetails(1);

    expect(apiClient.get).toHaveBeenCalledWith(
      '/policies/registration-details',
      {
        params: { productId: 1 },
      },
    );
  });

  test('FE-API-09 registers policy', async () => {
    const payload = {
      productId: 1,
      startDate: '2026-11-27',
    };

    apiClient.post.mockResolvedValue({
      data: { policyNumber: 'HDP-2026-0001' },
    });

    await registerPolicy(payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/policies',
      payload,
    );
  });

  test('FE-API-10 fetches encoded policy premiums', async () => {
    apiClient.get.mockResolvedValue({ data: { policy: {} } });

    await fetchPolicyPremiums('HDP 2026/0001');

    expect(apiClient.get).toHaveBeenCalledWith(
      '/policies/HDP%202026%2F0001/premiums',
    );
  });

  test('FE-API-11 searches policies with parameters', async () => {
    const params = {
      policyNumber: 'HDP-2026-0001',
      page: 0,
      size: 10,
    };

    apiClient.get.mockResolvedValue({ data: { results: [] } });

    await searchPolicies(params);

    expect(apiClient.get).toHaveBeenCalledWith(
      '/policies/search',
      { params },
    );
  });

  test('FE-API-12 submits premium payment', async () => {
    const payload = {
      paymentMethod: 'UPI',
      payments: [
        {
          installmentId: 1,
          amount: 500,
        },
      ],
    };

    apiClient.post.mockResolvedValue({
      data: { message: 'Payment successful' },
    });

    await payPremiums('HDP-2026-0001', payload);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/policies/HDP-2026-0001/premium-payments',
      payload,
    );
  });
});