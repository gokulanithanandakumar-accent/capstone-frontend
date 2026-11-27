import apiClient from '../../api/client';
import {
  fetchCurrentCustomer,
  login,
  registerCustomer,
} from '../../api/authApi';

jest.mock('../../api/client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('FE-API-01 sends login credentials', async () => {
    const response = {
      accessToken: 'jwt-token',
      customerId: 1,
    };

    apiClient.post.mockResolvedValue({ data: response });

    await expect(
      login('demo@gmail.com', 'Pasword@123'),
    ).resolves.toEqual(response);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/login',
      {
        email: 'demo@gmail.com',
        password: 'Pasword@123',
      },
    );
  });

  test('FE-API-02 registers a customer', async () => {
    const payload = {
      fullName: 'Demo Customer',
      email: 'demo@gmail.com',
      dateOfBirth: '1990-04-15',
      phone: '9876543210',
      password: 'Pasword@123',
    };

    apiClient.post.mockResolvedValue({
      data: { message: 'Registered' },
    });

    await expect(
      registerCustomer(payload),
    ).resolves.toEqual({ message: 'Registered' });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/register',
      payload,
    );
  });

  test('FE-API-03 retrieves current customer', async () => {
    apiClient.get.mockResolvedValue({
      data: {
        customerId: 1,
        fullName: 'Demo Customer',
      },
    });

    await expect(fetchCurrentCustomer()).resolves.toEqual({
      customerId: 1,
      fullName: 'Demo Customer',
    });

    expect(apiClient.get).toHaveBeenCalledWith(
      '/customers/me',
    );
  });
});