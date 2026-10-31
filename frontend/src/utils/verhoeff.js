/*
 * utils/verhoeff.js
 * Client-side Verhoeff checksum implementation for instant Aadhaar format
 * feedback. The backend always re-validates — this is UX only and must never
 * be treated as an authoritative check.
 */

// Verhoeff algorithm — client-side pre-validation of Aadhaar checksum.
// Backend MUST also validate. This is UX only — never trust client-side alone.

const d = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,2,3,4,0,6,7,8,9,5],
  [2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],
  [7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];

const p = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,5,7,6,2,8,3,0,9,4],
  [5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],
  [4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],
  [7,0,4,6,9,1,3,2,5,8],
];

export function verhoeffValidate(number) {
  const digits = String(number).split('').reverse().map(Number); // process digits right-to-left per Verhoeff spec
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]]; // combine multiplication, permutation, and running check
  }
  return c === 0; // valid if accumulated check value reaches zero
}

export function validateAadhaarClient(value) {
  const cleaned = value.replace(/\s/g, ''); // strip spaces so XXXX XXXX XXXX display format is accepted
  if (!cleaned) return 'Aadhaar number is required';
  if (!/^\d+$/.test(cleaned)) return 'Aadhaar must contain only digits';
  if (cleaned.length !== 12) return `Must be exactly 12 digits (entered: ${cleaned.length})`;
  if (!verhoeffValidate(cleaned)) return 'Invalid Aadhaar number'; // Verhoeff checksum catches most typos client-side
  return null; // null means valid
}
