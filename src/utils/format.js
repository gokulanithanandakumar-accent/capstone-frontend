const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return currencyFormatter.format(Number(value));
}

export function formatTerm(termMonths) {
  if (!termMonths) {
    return '-';
  }
  const label = `${termMonths} ${termMonths === 1 ? 'month' : 'months'}`;
  if (termMonths % 12 === 0) {
    const years = termMonths / 12;
    return `${label} (${years} ${years === 1 ? 'year' : 'years'})`;
  }
  return label;
}

export function formatDate(isoDate) {
  if (!isoDate) {
    return '-';
  }
  const [year, month, day] = isoDate.split('-');
  return `${day}-${month}-${year}`;
}

/** Today's local date as yyyy-MM-dd, comparable with date input values. */
export function todayIso() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatEnum(value) {
  if (!value) {
    return '-';
  }
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('-');
}
