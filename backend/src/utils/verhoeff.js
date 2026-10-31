/*
 * utils/verhoeff.js
 * Implements the Verhoeff checksum algorithm used by UIDAI to validate the
 * 12th digit of an Aadhaar number. Exports verhoeffValidate (check) and
 * verhoeffGenerate (produce check digit for a given 11-digit base).
 */

// Verhoeff algorithm — validates Aadhaar checksum digit.
// Does NOT verify that an Aadhaar exists or belongs to anyone.

const d = [ // multiplication table (dihedral group D5)
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

const p = [ // permutation table
  [0,1,2,3,4,5,6,7,8,9],
  [1,5,7,6,2,8,3,0,9,4],
  [5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],
  [9,4,5,3,1,2,6,8,7,0],
  [4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],
  [7,0,4,6,9,1,3,2,5,8],
];

const inv = [0,4,3,2,1,5,6,7,8,9]; // inverse table

function verhoeffValidate(number) {
  const raw = String(number).split('').map(Number);
  if (raw.some(isNaN)) return false;
  const digits = raw.reverse(); // Verhoeff processes digits right-to-left
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]]; // combine multiplication, permutation, and running check
  }
  return c === 0; // valid if accumulated check value reaches zero
}

function verhoeffGenerate(number) {
  const digits = String(number).split('').reverse().map(Number);
  digits.unshift(0);
  let c = 0;
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]];
  }
  return inv[c];
}

module.exports = { verhoeffValidate, verhoeffGenerate };
