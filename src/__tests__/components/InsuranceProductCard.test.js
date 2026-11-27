import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InsuranceProductCard from '../../components/InsuranceProductCard';

const PRODUCT = {
  productId: 1,
  productCode: 'HD-TERM-001',
  policyName: 'Secure Term',
  policyType: 'TERM',
  termMonths: 240,
  sumInsured: 5000000,
  premiumFrequency: 'MONTHLY',
  premiumAmount: 1250,
};

describe('InsuranceProductCard', () => {
  test('FE-COMP-01 renders product information', () => {
    render(
      <InsuranceProductCard
        product={PRODUCT}
        onRegister={jest.fn()}
      />,
    );

    expect(
      screen.getByText('Secure Term'),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/HD-TERM-001/),
    ).toBeInTheDocument();

    expect(
      screen.getByText('240 months (20 years)'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('₹50,00,000.00'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('₹1,250.00'),
    ).toBeInTheDocument();
  });

  test('FE-COMP-02 displays recommended badge', () => {
    render(
      <InsuranceProductCard
        product={PRODUCT}
        onRegister={jest.fn()}
        recommended
      />,
    );

    expect(
      screen.getByText('Recommended'),
    ).toBeInTheDocument();
  });

  test('FE-COMP-03 expands and hides details', async () => {
    render(
      <InsuranceProductCard
        product={PRODUCT}
        onRegister={jest.fn()}
      />,
    );

    const button = screen.getByRole('button', {
      name: 'View Details',
    });

    expect(button).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    await userEvent.click(button);

    expect(
      screen.getByRole('button', {
        name: 'Hide Details',
      }),
    ).toHaveAttribute('aria-expanded', 'true');

    expect(
      screen.getByText('Premium Amount'),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Hide Details',
      }),
    );

    expect(
      screen.queryByText('Premium Amount'),
    ).not.toBeInTheDocument();
  });

  test('FE-COMP-04 invokes registration handler', async () => {
    const onRegister = jest.fn();

    render(
      <InsuranceProductCard
        product={PRODUCT}
        onRegister={onRegister}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', {
        name: /Register Now/i,
      }),
    );

    expect(onRegister).toHaveBeenCalledWith(PRODUCT);
  });
});