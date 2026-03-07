function isString(value, errorMessage = 'Expected a string') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(errorMessage);
  }
  return value.trim();
}

function isNumber(value, errorMessage = 'Expected a number') {
  const n = Number(value);
  if (Number.isNaN(n)) throw new Error(errorMessage);
  return n;
}

function isUuid(value, errorMessage = 'Expected a valid UUID') {
  if (typeof value !== 'string') throw new Error(errorMessage);
  const v = value.trim();
  // UUID v4 pattern (accept generic UUIDs)
  const re = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
  if (!re.test(v)) throw new Error(errorMessage);
  return v;
}

function isNonNegative(value, errorMessage = 'Expected a non-negative number') {
  const n = isNumber(value, errorMessage);
  if (n < 0) throw new Error(errorMessage);
  return n;
}

function isEnum(value, allowed, errorMessage = 'Invalidenum value') {
  if (!allowed.includes(value)) throw new Error(errorMessage);
  return value;
}

function requireFields(obj, fields) {
  for (const f of fields) {
    if (!(f in obj)) throw new Error(`Missing field: ${f}`);
  }
}

function safeJSON(str) {
  try { return JSON.parse(str); } catch (_) { return null; }
}

module.exports = {
  isString,
  isNumber,
  isUuid,
  isNonNegative,
  isEnum,
  requireFields,
  safeJSON,
};