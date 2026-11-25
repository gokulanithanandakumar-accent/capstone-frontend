export const POLICY_NUMBER_PATTERN =
  /^[A-Za-z0-9-]+$/;

export const DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

export const NAME_PATTERN =
  /^[\p{L} .'-]+$/u;

export function detectPolicySearchType(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  /*
   * Check DOB first because a date also contains
   * digits and hyphens and could otherwise be
   * classified as a policy number.
   */
  if (DATE_PATTERN.test(trimmed)) {
    return {
      type: 'dateOfBirth',
      value: trimmed,
    };
  }

  if (
    POLICY_NUMBER_PATTERN.test(trimmed) &&
    (
      trimmed.includes('-') ||
      /\d/.test(trimmed)
    )
  ) {
    return {
      type: 'policyNumber',
      value: trimmed,
    };
  }

  const normalizedName =
    trimmed.replace(/\s+/g, ' ');

  if (
    NAME_PATTERN.test(normalizedName) &&
    normalizedName.length >= 2 &&
    normalizedName.length <= 100
  ) {
    return {
      type: 'customerName',
      value: normalizedName,
    };
  }

  return null;
}

export function createPolicySearchCriteria(value) {
  const search =
    detectPolicySearchType(value);

  if (!search) {
    return null;
  }

  return {
    [search.type]: search.value,
  };
}