export type Expense = {
  id: string;
  name: string;
  amount: number;
  createdAt: string;
  dateKey: string;
};

export const STORAGE_KEY = 'everyday-ledger-expenses-v1';
export const THEME_KEY = 'daymark-theme-preference-v1';
export const QUICK_ADDS = [
  { name: 'Taxi', amount: 25 },
  { name: 'Coffee', amount: 35 },
  { name: 'Airtime', amount: 30 },
  { name: 'Lunch', amount: 65 },
] as const;

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export const CURRENCY_KEY = "daymark_currency_v1";
export const CURRENCIES = [
  { code: "ZAR", symbol: "R", locale: "en-ZA", label: "ZAR (R)" },
  { code: "USD", symbol: "$", locale: "en-US", label: "USD ($)" },
  { code: "EUR", symbol: "€", locale: "de-DE", label: "EUR (€)" },
  { code: "GBP", symbol: "£", locale: "en-GB", label: "GBP (£)" },
  { code: "KES", symbol: "KSh", locale: "en-KE", label: "KES (KSh)" },
  { code: "NGN", symbol: "₦", locale: "en-NG", label: "NGN (₦)" },
  { code: "BWP", symbol: "P", locale: "en-BW", label: "BWP (P)" },
  { code: "NAD", symbol: "N$", locale: "en-NA", label: "NAD (N$)" },
  { code: "INR", symbol: "₹", locale: "en-IN", label: "INR (₹)" },
] as const;
export function getCurrency() {
  try {
    const code = localStorage.getItem(CURRENCY_KEY);
    return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
  } catch { return CURRENCIES[0]; }
}
export function formatRand(amount: number): string {
  const c = getCurrency();
  const formatted = new Intl.NumberFormat(c.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return `${c.symbol} ${formatted}`;
}

export function formatDate(dateKey: string, options: Intl.DateTimeFormatOptions = {
  weekday: 'long', day: 'numeric', month: 'long',
}) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-ZA', options).format(new Date(year, month - 1, day));
}

export function readExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Expense =>
      item && typeof item.id === 'string' && typeof item.name === 'string' &&
      typeof item.amount === 'number' && Number.isFinite(item.amount) &&
      typeof item.createdAt === 'string' && typeof item.dateKey === 'string',
    );
  } catch {
    return [];
  }
}

export function normalizeName(name: string) {
  return name.trim().toLocaleLowerCase('en-ZA').replace(/\s+/g, ' ');
}

export function downloadCsv(expenses: Expense[]) {
  const totals = new Map<string, number>();
  expenses.forEach(({ dateKey, amount }) => totals.set(dateKey, (totals.get(dateKey) ?? 0) + amount));
  const rows = [
    ['Date', 'Time', 'Item', 'Amount (ZAR)', 'Day total (ZAR)'],
    ...[...expenses].sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.createdAt.localeCompare(b.createdAt))
      .map((item) => [item.dateKey, new Intl.DateTimeFormat('en-ZA', { hour: '2-digit', minute: '2-digit' }).format(new Date(item.createdAt)), item.name, item.amount.toFixed(2), (totals.get(item.dateKey) ?? 0).toFixed(2)]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  saveBlob(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }), 'daymark-expenses.csv');
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function xmlEscape(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function columnName(index: number) {
  let value = index + 1;
  let name = '';
  while (value) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
  }
  return (crc ^ -1) >>> 0;
}

function zipStore(files: { name: string; content: string }[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const put16 = (view: DataView, at: number, value: number) => view.setUint16(at, value, true);
  const put32 = (view: DataView, at: number, value: number) => view.setUint32(at, value, true);
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.content);
    const crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    const lv = new DataView(local.buffer);
    put32(lv, 0, 0x04034b50); put16(lv, 4, 20); put16(lv, 6, 0); put16(lv, 8, 0);
    put16(lv, 10, 0); put16(lv, 12, 0); put32(lv, 14, crc); put32(lv, 18, data.length);
    put32(lv, 22, data.length); put16(lv, 26, name.length); put16(lv, 28, 0);
    local.set(name, 30); local.set(data, 30 + name.length);
    localParts.push(local);
    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    put32(cv, 0, 0x02014b50); put16(cv, 4, 20); put16(cv, 6, 20); put16(cv, 8, 0); put16(cv, 10, 0);
    put16(cv, 12, 0); put16(cv, 14, 0); put32(cv, 16, crc); put32(cv, 20, data.length); put32(cv, 24, data.length);
    put16(cv, 28, name.length); put16(cv, 30, 0); put16(cv, 32, 0); put16(cv, 34, 0); put16(cv, 36, 0);
    put32(cv, 38, 0); put32(cv, 42, offset); central.set(name, 46);
    centralParts.push(central);
    offset += local.length;
  }
  const centralLength = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  put32(ev, 0, 0x06054b50); put16(ev, 4, 0); put16(ev, 6, 0); put16(ev, 8, files.length);
  put16(ev, 10, files.length); put32(ev, 12, centralLength); put32(ev, 16, offset); put16(ev, 20, 0);
  const parts = [...localParts, ...centralParts, end];
  const archive = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let cursor = 0;
  parts.forEach((part) => {
    archive.set(part, cursor);
    cursor += part.length;
  });
  return new Blob([archive.buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadExcel(expenses: Expense[]) {
  const totals = new Map<string, number>();
  expenses.forEach(({ dateKey, amount }) => totals.set(dateKey, (totals.get(dateKey) ?? 0) + amount));
  const data = [
    ['Date', 'Time', 'Item', 'Amount (ZAR)', 'Day total (ZAR)'],
    ...[...expenses].sort((a, b) => a.dateKey.localeCompare(b.dateKey) || a.createdAt.localeCompare(b.createdAt))
      .map((expense) => [expense.dateKey, new Intl.DateTimeFormat('en-ZA', { hour: '2-digit', minute: '2-digit' }).format(new Date(expense.createdAt)), expense.name, expense.amount, totals.get(expense.dateKey) ?? 0]),
  ];
  const rows = data.map((row, ri) => `<row r="${ri + 1}">${row.map((value, ci) => {
    const ref = `${columnName(ci)}${ri + 1}`;
    return typeof value === 'number'
      ? `<c r="${ref}"><v>${value}</v></c>`
      : `<c r="${ref}" t="inlineStr"><is><t>${xmlEscape(String(value))}</t></is></c>`;
  }).join('')}</row>`).join('');
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
  const files = [
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Daymark expenses" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: 'xl/worksheets/sheet1.xml', content: worksheet },
  ];
  saveBlob(zipStore(files), 'daymark-expenses.xlsx');
}
