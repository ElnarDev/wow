export function validRange(minimum, maximum) {
  return minimum === null || maximum === null || minimum <= maximum;
}

export function parseOptionalInteger(value) {
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}
