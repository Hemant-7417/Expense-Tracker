/** Parse decimal string to integer paise (no parseFloat). */
function decimalStringToCents(str) {
  const s = String(str).trim().replace(/,/g, "");
  if (!s) return NaN;
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const m = body.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return NaN;
  let rupees = parseInt(m[1], 10);
  const frac = m[2] || "";
  let paise = 0;
  if (frac.length > 0) {
    const d1 = frac[0] || "0";
    const d2 = frac[1] || "0";
    const d3 = frac[2] || "0";
    paise = parseInt(d1, 10) * 10 + parseInt(d2, 10);
    if (parseInt(d3, 10) >= 5) paise += 1;
    if (paise >= 100) {
      rupees += 1;
      paise = 0;
    }
  }
  const total = rupees * 100 + paise;
  return neg ? -total : total;
}

function toCents(amount) {
  if (amount === "" || amount == null) return 0;
  if (typeof amount === "string") {
    const c = decimalStringToCents(amount);
    return Number.isFinite(c) ? c : 0;
  }
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  const c = decimalStringToCents(n.toFixed(2));
  return Number.isFinite(c) ? c : 0;
}

function fromCents(cents) {
  return cents / 100;
}

function roundMoney(amount) {
  return fromCents(toCents(amount));
}

function parseMoney(value) {
  if (value === "" || value == null) return NaN;
  if (typeof value === "string") {
    const c = decimalStringToCents(value);
    return Number.isFinite(c) ? fromCents(c) : NaN;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return fromCents(toCents(n));
}

function sumMoney(amounts) {
  let cents = 0;
  for (const a of amounts) cents += toCents(a);
  return fromCents(cents);
}

function subtractMoney(a, b) {
  return fromCents(toCents(a) - toCents(b));
}

module.exports = {
  roundMoney,
  parseMoney,
  sumMoney,
  subtractMoney,
  toCents,
  fromCents,
  decimalStringToCents,
};
