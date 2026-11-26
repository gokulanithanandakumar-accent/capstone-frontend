import {
  render,
  screen,
} from '@testing-library/react';

import { MemoryRouter } from 'react-router-dom';

import DashboardPlanCarousel from '../../components/DashboardPlanCarousel';

const PRODUCTS = [
  {
    productId: 1,
    productCode: 'TERM-A',
    policyName: 'Expensive Term',
    policyType: 'TERM',
    premiumAmount: 2000,
    premiumFrequency: 'MONTHLY',
    sumInsured: 5000000,
    termMonths: 240,
  },
  {
    productId: 2,
    productCode: 'TERM-B',
    policyName: 'Affordable Term',
    policyType: 'TERM',
    premiumAmount: 1200,
    premiumFrequency: 'MONTHLY',
    sumInsured: 5000000,
    termMonths: 240,
  },
  {
    productId: 3,
    productCode: 'HEALTH-A',
    policyName: 'Health Plan',
    policyType: 'HEALTH',
    premiumAmount: 18000,
    premiumFrequency: 'YEARLY',
    sumInsured: 1000000,
    termMonths: 12,
  },
];

function renderCarousel(props = {}) {
  render(
    <MemoryRouter>
      <DashboardPlanCarousel
        products={PRODUCTS}
        loading={false}
        error=""
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('DashboardPlanCarousel', () => {

  test('shows cheapest product from each category', () => {
    renderCarousel();

    expect(
      screen.getByText('Affordable Term'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Health Plan'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Expensive Term'),
    ).not.toBeInTheDocument();
  });

  test('renders See All Plans link', () => {
    renderCarousel();

    expect(
      screen.getByRole(
        'link',
        { name: /See All Plans/i },
      ),
    ).toHaveAttribute(
      'href',
      '/policies/available',
    );
  });

  test('shows error state', () => {
    renderCarousel({
      products: [],
      error: 'Unable to load plans.',
    });

    expect(
      screen.getByRole('alert'),
    ).toHaveTextContent(
      'Unable to load plans.',
    );
  });

  test('renders loading skeletons', () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardPlanCarousel
          products={[]}
          loading
          error=""
        />
      </MemoryRouter>,
    );

    expect(
      container.querySelectorAll(
        '.dashboard-plan-skeleton',
      ),
    ).toHaveLength(3);
  });
});

