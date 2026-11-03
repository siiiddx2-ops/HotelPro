export const toDateInputValue = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export const normalizeDateInput = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) || toDateInputValue(date) !== value ? '' : value;
};

export const addDaysToDateInput = (value, days) => {
  const date = normalizeDateInput(value) ? new Date(`${value}T12:00:00`) : new Date();
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
};

export const formatDate = (value) => {
  if (!value) return '';
  const dateValue = typeof value === 'string' ? value.slice(0, 10) : toDateInputValue(new Date(value));
  const normalized = normalizeDateInput(dateValue);
  if (!normalized) return 'Invalid date';
  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString();
};
