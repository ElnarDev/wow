export function integerParam(searchParams, name) {
  const raw = searchParams.get(name);
  if (raw === null || raw === '') return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export function positiveIntegerParam(searchParams, name) {
  const value = integerParam(searchParams, name);
  return value !== null && value > 0 ? value : null;
}

export function integerListParam(searchParams, name, { positive = false, limit } = {}) {
  const values = (searchParams.get(name) ?? '')
    .split(',')
    .filter(Boolean)
    .map(Number)
    .filter((value) => Number.isSafeInteger(value) && (!positive || value > 0));
  const unique = [...new Set(values)];
  return limit ? unique.slice(0, limit) : unique;
}

export function boundedIntegerParam(searchParams, name, { minimum, maximum, fallback }) {
  const value = integerParam(searchParams, name) ?? fallback;
  return Math.min(maximum, Math.max(minimum, value));
}
