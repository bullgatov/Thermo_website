/** US phone (NANP): 10 digits, optional leading country code 1. */

function normalizeUsPhoneDigits(phone) {
  var d = String(phone || "").replace(/\D/g, "");
  if (d.length === 11 && d.charAt(0) === "1") {
    return d.slice(1);
  }
  return d;
}

function isValidUsPhone(phone) {
  var d = normalizeUsPhoneDigits(phone);
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(d);
}

function formatUsPhone(phone) {
  var d = normalizeUsPhoneDigits(phone);
  if (d.length !== 10) {
    return String(phone || "").trim();
  }
  return (
    "(" +
    d.slice(0, 3) +
    ") " +
    d.slice(3, 6) +
    "-" +
    d.slice(6)
  );
}

module.exports = {
  normalizeUsPhoneDigits: normalizeUsPhoneDigits,
  isValidUsPhone: isValidUsPhone,
  formatUsPhone: formatUsPhone,
};
