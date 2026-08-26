// lib/auth.js
function isValidNeracaPin(pin) {
  const expected = process.env.NERACA_PIN;
  if (!expected) return false; // belum diatur di .env.local → tolak semua demi aman
  return String(pin || "") === String(expected);
}

module.exports = { isValidNeracaPin };