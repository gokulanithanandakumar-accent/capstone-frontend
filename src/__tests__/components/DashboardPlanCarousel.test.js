import {
  render,
  screen,
} from '@testing-library/react';

import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';

import { MemoryRouter } from 'react-router-dom';

import DashboardPlanCarousel from '../../components/DashboardPlanCarousel';

jest.mock('react-router-dom', () => {
  const actual = jest.requireActual(
    'react-router-dom',
  );

  return {
    ...actual,
    useNavigate: jest.fn(),
  };
});

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

  test('FE-COMP-05 returns nothing for empty plans', () => {
  const { container } = render(
    <MemoryRouter>
      <DashboardPlanCarousel
        products={[]}
        loading={false}
        error=""
      />
    </MemoryRouter>,
  );

  expect(container).toBeEmptyDOMElement();
});

test('FE-COMP-06 navigates to registration', async () => {
  const navigate = jest.fn();
  useNavigate.mockReturnValue(navigate);

  renderCarousel();

  await userEvent.click(
    screen.getAllByRole('button', {
      name: /Register/i,
    })[0],
  );

  expect(navigate).toHaveBeenCalledWith(
    '/policies/register',
    {
      state: {
        product: expect.objectContaining({
          policyName: expect.any(String),
        }),
      },
    },
  );
});

test('FE-COMP-07 moves between plans', async () => {
  Element.prototype.scrollIntoView = jest.fn();

  renderCarousel();

  await userEvent.click(
    screen.getByRole('button', {
      name: 'Next insurance plan',
    }),
  );

  expect(
    Element.prototype.scrollIntoView,
  ).toHaveBeenCalled();
});

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

