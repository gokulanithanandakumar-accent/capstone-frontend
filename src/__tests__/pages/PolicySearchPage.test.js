import { validateCriteria } from '../../pages/PolicySearchPage';

describe('PolicySearchPage criteria validation', () => {

  test('allows customer name search', () => {
    const result = validateCriteria({
      customerName: 'Aarav Sharma',
      policyNumber: '',
      dateOfBirth: '',
    });

    expect(result.criteria).toEqual({
      customerName: 'Aarav Sharma',
    });

    expect(result.formError).toBeUndefined();
  });

  test('allows policy identifier search', () => {
    const result = validateCriteria({
      customerName: '',
      policyNumber: 'HDP-2026-0001',
      dateOfBirth: '',
    });

    expect(result.criteria).toEqual({
      policyNumber: 'HDP-2026-0001',
    });
  });

  test('allows policy identifier and DOB search', () => {
    const result = validateCriteria({
      customerName: '',
      policyNumber: 'HDP-2026-0001',
      dateOfBirth: '1990-04-15',
    });

    expect(result.criteria).toEqual({
      policyNumber: 'HDP-2026-0001',
      dateOfBirth: '1990-04-15',
    });
  });

  test('rejects DOB alone', () => {
    const result = validateCriteria({
      customerName: '',
      policyNumber: '',
      dateOfBirth: '1990-04-15',
    });

    expect(result.criteria).toBeUndefined();

    expect(result.formError).toBe(
      'Date of Birth can only be used together with Policy Identifier.',
    );
  });

  test('rejects customer name plus DOB', () => {
    const result = validateCriteria({
      customerName: 'Aarav Sharma',
      policyNumber: '',
      dateOfBirth: '1990-04-15',
    });

    expect(result.criteria).toBeUndefined();
  });

  test('rejects customer name plus policy identifier', () => {
    const result = validateCriteria({
      customerName: 'Aarav Sharma',
      policyNumber: 'HDP-2026-0001',
      dateOfBirth: '',
    });

    expect(result.criteria).toBeUndefined();
  });

  test('rejects all three fields together', () => {
    const result = validateCriteria({
      customerName: 'Aarav Sharma',
      policyNumber: 'HDP-2026-0001',
      dateOfBirth: '1990-04-15',
    });

    expect(result.criteria).toBeUndefined();
  });

  test('rejects invalid customer name', () => {
    const result = validateCriteria({
      customerName: '@@@',
      policyNumber: '',
      dateOfBirth: '',
    });

    expect(result.errors.customerName).toBeDefined();
  });

  test('rejects invalid policy identifier', () => {
    const result = validateCriteria({
      customerName: '',
      policyNumber: 'HDP@123',
      dateOfBirth: '',
    });

    expect(result.errors.policyNumber).toBeDefined();
  });
});

