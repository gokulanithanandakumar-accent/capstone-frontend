import {
  createPolicySearchCriteria,
  detectPolicySearchType,
} from '../../utils/policySearch';

describe('policySearch utilities', () => {
  test('detects policy identifier', () => {
    expect(
      detectPolicySearchType('HDP-2026-0001'),
    ).toEqual({
      type: 'policyNumber',
      value: 'HDP-2026-0001',
    });
  });

  test('detects ISO date before policy identifier', () => {
    expect(
      detectPolicySearchType('1990-04-15'),
    ).toEqual({
      type: 'dateOfBirth',
      value: '1990-04-15',
    });
  });

  test('detects and normalizes customer name', () => {
    expect(
      detectPolicySearchType('  Aarav    Sharma  '),
    ).toEqual({
      type: 'customerName',
      value: 'Aarav Sharma',
    });
  });

  test('rejects empty and malformed search', () => {
    expect(
      detectPolicySearchType(''),
    ).toBeNull();

    expect(
      detectPolicySearchType('@@@'),
    ).toBeNull();
  });

  test('creates correct query criteria', () => {
    expect(
      createPolicySearchCriteria('HDP-2026-0001'),
    ).toEqual({
      policyNumber: 'HDP-2026-0001',
    });

    expect(
      createPolicySearchCriteria('Aarav Sharma'),
    ).toEqual({
      customerName: 'Aarav Sharma',
    });
  });
});

