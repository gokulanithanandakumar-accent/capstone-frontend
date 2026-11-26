import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import { MemoryRouter } from 'react-router-dom';

import AvailablePoliciesPage from '../../pages/AvailablePoliciesPage';
import { fetchAvailableProducts } from '../../api/dashboardApi';

jest.mock('../../api/dashboardApi');

jest.mock('../../components/AppShell', () => {
  return function MockShell({ children }) {
    return <div>{children}</div>;
  };
});

const PRODUCTS = [
  {
    productId: 1,
    productCode: 'HD-TERM-001',
    policyName: 'Secure Term',
    policyType: 'TERM',
    termMonths: 240,
    sumInsured: 5000000,
    premiumFrequency: 'MONTHLY',
    premiumAmount: 1250,
  },
  {
    productId: 2,
    productCode: 'HD-HEALTH-001',
    policyName: 'Family Health',
    policyType: 'HEALTH',
    termMonths: 12,
    sumInsured: 1000000,
    premiumFrequency: 'YEARLY',
    premiumAmount: 18000,
  },
];

function renderPage() {
  render(
    <MemoryRouter>
      <AvailablePoliciesPage />
    </MemoryRouter>,
  );
}

describe('AvailablePoliciesPage', () => {

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('loads available insurance products', async () => {
    fetchAvailableProducts.mockResolvedValue(PRODUCTS);

    renderPage();

    expect(
      await screen.findByText('Secure Term'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Family Health'),
    ).toBeInTheDocument();

    expect(fetchAvailableProducts)
      .toHaveBeenCalledTimes(1);
  });

  test('filters products by search text', async () => {
    fetchAvailableProducts.mockResolvedValue(PRODUCTS);

    renderPage();

    await screen.findByText('Secure Term');

    fireEvent.change(
      screen.getByPlaceholderText(
        'Search by policy name, type or product code',
      ),
      {
        target: {
          value: 'health',
        },
      },
    );

    expect(
      screen.getByText('Family Health'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Secure Term'),
    ).not.toBeInTheDocument();
  });

  test('filters products by policy type and clears filters', async () => {
    fetchAvailableProducts.mockResolvedValue(PRODUCTS);

    renderPage();

    await screen.findByText('Secure Term');

    fireEvent.change(
      screen.getByRole('combobox'),
      {
        target: {
          value: 'TERM',
        },
      },
    );

    expect(
      screen.getByText('Secure Term'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Family Health'),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole(
        'button',
        { name: 'Clear Filters' },
      ),
    );

    expect(
      screen.getByText('Family Health'),
    ).toBeInTheDocument();
  });

  test('shows API error', async () => {
    fetchAvailableProducts.mockRejectedValue({
      response: {
        data: {
          message: 'Products unavailable.',
        },
      },
    });

    renderPage();

    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent(
      'Products unavailable.',
    );
  });

  test('shows empty state', async () => {
    fetchAvailableProducts.mockResolvedValue([]);

    renderPage();

    expect(
      await screen.findByText(
        'No available insurance policies',
      ),
    ).toBeInTheDocument();
  });
});

