import { formatCurrency, formatDate, formatEnum, formatTerm } from '../../utils/format';

describe('format utils', () => {
  test('formats currency in INR', () => {
    expect(formatCurrency(1250)).toBe('₹1,250.00');
    expect(formatCurrency('5000000.00')).toBe('₹50,00,000.00');
    expect(formatCurrency(null)).toBe('-');
  });

  test('formats policy term in months with years when exact', () => {
    expect(formatTerm(240)).toBe('240 months (20 years)');
    expect(formatTerm(12)).toBe('12 months (1 year)');
    expect(formatTerm(18)).toBe('18 months');
    expect(formatTerm(null)).toBe('-');
  });

  test('formats ISO dates as dd-MM-yyyy', () => {
    expect(formatDate('2026-11-20')).toBe('20-11-2026');
    expect(formatDate(undefined)).toBe('-');
  });

  test('formats enum values for display', () => {
    expect(formatEnum('HALF_YEARLY')).toBe('Half-Yearly');
    expect(formatEnum('MONTHLY')).toBe('Monthly');
    expect(formatEnum('')).toBe('-');
  });
});

