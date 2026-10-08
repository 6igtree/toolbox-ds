// 全 UI 共通の変換処理。UI 側はここの結果を表示するだけ

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// ---------- JSON ----------

export type JsonSettings = { mode: 'format' | 'minify'; indent: '2' | '4' | 'tab' };

export function convertJson(input: string, s: JsonSettings): Result<string> {
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch (e) {
    return { ok: false, error: jsonErrorMessage(input, e as Error) };
  }
  if (s.mode === 'minify') return { ok: true, value: JSON.stringify(data) };
  return { ok: true, value: JSON.stringify(data, null, s.indent === 'tab' ? '\t' : Number(s.indent)) };
}

// エンジンごとに文言が違うので、位置だけは自前で「行・列」に揃える
function jsonErrorMessage(input: string, e: Error): string {
  const pos = e.message.match(/position (\d+)/)?.[1];
  if (pos === undefined) return e.message;
  const before = input.slice(0, Number(pos));
  const line = before.split('\n').length;
  const col = Number(pos) - before.lastIndexOf('\n');
  return `${line} 行 ${col} 列目で構文エラー: ${e.message.replace(/ in JSON at position \d+.*$/, '')}`;
}

// ---------- 日時 ----------

export type DatetimeSettings = { unit: 's' | 'ms'; timeZone: string };
export type DatetimeOutput = { seconds: string; millis: string; iso: string; local: string; warning?: string };

const MAX_MS = 8.64e15; // Date が扱える範囲

export function timeZones(): string[] {
  const list = Intl.supportedValuesOf('timeZone');
  return list.includes('UTC') ? list : ['UTC', ...list];
}

export const defaultTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// 数字だけなら Unix 時刻、それ以外は日時文字列（オフセットなしは選択中のタイムゾーンの時刻とみなす）
export function convertDatetime(input: string, s: DatetimeSettings): Result<DatetimeOutput> {
  const text = input.trim();
  let ms: number;
  let warning: string | undefined;
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    ms = s.unit === 's' ? Number(text) * 1000 : Number(text);
    const digits = text.replace(/^-|\..*$/g, '').length;
    if (s.unit === 's' && digits >= 13) warning = '桁数からするとミリ秒の値かもしれません';
    if (s.unit === 'ms' && digits <= 10) warning = '桁数からすると秒の値かもしれません';
  } else {
    const parsed = parseDatetime(text, s.timeZone);
    if (parsed === null) return { ok: false, error: '日時として解釈できません（例: 2026-10-08 12:34:56、2026-10-08T03:34:56Z）' };
    ms = parsed;
  }
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS) return { ok: false, error: '扱える範囲（±約 27 万年）を超えています' };
  ms = Math.floor(ms);
  return {
    ok: true,
    value: {
      seconds: String(Math.floor(ms / 1000)),
      millis: String(ms),
      iso: new Date(ms).toISOString(),
      local: formatInZone(ms, s.timeZone),
      warning,
    },
  };
}

const DATETIME_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;

function parseDatetime(text: string, timeZone: string): number | null {
  const m = text.match(DATETIME_RE);
  if (!m) return null;
  const [, y, mo, d, h = '0', mi = '0', sec = '0', frac = '0', offset] = m;
  const n = [y, mo, d, h, mi, sec].map(Number);
  const wall = Date.UTC(n[0], n[1] - 1, n[2], n[3], n[4], n[5], Number(frac.padEnd(3, '0')));
  // 2026-02-31 や 25:00 は Date が繰り上げてしまうので弾く
  const back = new Date(wall);
  if (back.getUTCFullYear() !== n[0] || back.getUTCMonth() !== n[1] - 1 || back.getUTCDate() !== n[2] || back.getUTCHours() !== n[3] || back.getUTCMinutes() !== n[4] || back.getUTCSeconds() !== n[5]) return null;
  if (offset) {
    if (offset.toUpperCase() === 'Z') return wall;
    const [, sign, oh, om] = offset.match(/([+-])(\d{2}):?(\d{2})/)!;
    return wall - (sign === '-' ? -1 : 1) * (Number(oh) * 60 + Number(om)) * 60_000;
  }
  // 壁時計時刻 → UTC。夏時間の境目に備えて 1 回補正する
  let utc = wall - zoneOffset(wall, timeZone);
  utc = wall - zoneOffset(utc, timeZone);
  return utc;
}

function zoneParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { y: get('year'), mo: get('month'), d: get('day'), h: get('hour'), mi: get('minute'), s: get('second') };
}

// その瞬間の timeZone の UTC からのずれ（ms）
function zoneOffset(ms: number, timeZone: string): number {
  const p = zoneParts(ms, timeZone);
  const asUtc = Date.UTC(Number(p.y), Number(p.mo) - 1, Number(p.d), Number(p.h), Number(p.mi), Number(p.s));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

function formatInZone(ms: number, timeZone: string): string {
  const p = zoneParts(ms, timeZone);
  const off = zoneOffset(ms, timeZone) / 60_000;
  const abs = Math.abs(off);
  const sign = off < 0 ? '-' : '+';
  const msPart = String(((ms % 1000) + 1000) % 1000).padStart(3, '0');
  return `${p.y}-${p.mo}-${p.d} ${p.h}:${p.mi}:${p.s}.${msPart} ${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

// ---------- URL ----------

export type UrlSettings = { mode: 'parse' | 'encode' | 'decode'; plusAsSpace: boolean };
export type UrlParts = { fields: { label: string; value: string }[]; query: { key: string; value: string }[] };

export function parseUrl(input: string): Result<UrlParts> {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return { ok: false, error: 'URL として解釈できません（https:// から始まる完全な URL を入力してください）' };
  }
  const fields = [
    { label: 'プロトコル', value: u.protocol },
    { label: 'ユーザー名', value: u.username },
    { label: 'パスワード', value: u.password },
    { label: 'ホスト', value: u.hostname },
    { label: 'ポート', value: u.port },
    { label: 'パス', value: u.pathname },
    { label: 'クエリ', value: u.search },
    { label: 'フラグメント', value: u.hash },
    { label: 'オリジン', value: u.origin },
  ].filter((f) => f.value !== '');
  return { ok: true, value: { fields, query: [...u.searchParams].map(([key, value]) => ({ key, value })) } };
}

export function encodeUrl(input: string): Result<string> {
  try {
    return { ok: true, value: encodeURIComponent(input) };
  } catch {
    return { ok: false, error: '不正な文字（対になっていないサロゲート）が含まれています' };
  }
}

export function decodeUrl(input: string, plusAsSpace: boolean): Result<string> {
  try {
    return { ok: true, value: decodeURIComponent(plusAsSpace ? input.replaceAll('+', ' ') : input) };
  } catch {
    return { ok: false, error: '不正なパーセントエンコードが含まれています（% の後に 16 進数 2 桁が必要です）' };
  }
}

// ---------- 正規表現 ----------

export type RegexSettings = { pattern: string; flags: string };
export type RegexMatch = { index: number; text: string; groups: { name: string; value: string | undefined }[] };
export type RegexOutput = { matches: RegexMatch[]; segments: { text: string; match: boolean }[]; truncated: boolean };

export const REGEX_FLAGS = [
  { flag: 'g', label: 'すべて（g）' },
  { flag: 'i', label: '大文字小文字を無視（i）' },
  { flag: 'm', label: '複数行（m）' },
  { flag: 's', label: '. が改行に一致（s）' },
  { flag: 'u', label: 'Unicode（u）' },
] as const;

const MAX_MATCHES = 1000;

// ponytail: 正規表現はメインスレッドで実行する。破滅的バックトラックでタブが固まりうる。困ったら Worker + タイムアウトに移す
export function testRegex(text: string, s: RegexSettings): Result<RegexOutput> {
  let re: RegExp;
  try {
    re = new RegExp(s.pattern, s.flags.includes('g') ? s.flags : s.flags + 'g');
  } catch (e) {
    return { ok: false, error: `正規表現が不正です: ${(e as Error).message.replace(/^Invalid regular expression: /, '')}` };
  }
  const matches: RegexMatch[] = [];
  for (const m of text.matchAll(re)) {
    const named = m.groups ? Object.keys(m.groups) : [];
    matches.push({
      index: m.index,
      text: m[0],
      groups: m.slice(1).map((value, i) => ({ name: named[i] ?? String(i + 1), value })),
    });
    if (matches.length === MAX_MATCHES || !s.flags.includes('g')) break;
  }
  const segments: RegexOutput['segments'] = [];
  let pos = 0;
  for (const m of matches) {
    if (m.text === '') continue; // 空一致は強調しようがないので一覧にだけ出す
    if (m.index > pos) segments.push({ text: text.slice(pos, m.index), match: false });
    segments.push({ text: m.text, match: true });
    pos = m.index + m.text.length;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), match: false });
  return { ok: true, value: { matches, segments, truncated: matches.length === MAX_MATCHES } };
}

// ---------- CSV ↔ JSON ----------

export type CsvSettings = { mode: 'csv2json' | 'json2csv'; delimiter: ',' | '\t' | ';'; header: boolean };
export type Grid = { columns: string[]; rows: string[][] };
export type CsvOutput = { text: string; grid: Grid };

// RFC 4180: "" で囲めば区切り文字・改行・"" を含められる
export function parseCsv(text: string, delimiter: string): Result<string[][]> {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (quoted) return { ok: false, error: '閉じていない " があります' };
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return { ok: true, value: rows };
}

const cell = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

export function convertCsv(input: string, s: CsvSettings): Result<CsvOutput> {
  if (s.mode === 'csv2json') {
    const parsed = parseCsv(input, s.delimiter);
    if (!parsed.ok) return parsed;
    const rows = parsed.value;
    const width = rows.reduce((w, r) => Math.max(w, r.length), 0); // spread だと数十万行でスタックが溢れる
    const columns = s.header ? rows[0].map((h, i) => h || `列${i + 1}`) : Array.from({ length: width }, (_, i) => `列${i + 1}`);
    const body = s.header ? rows.slice(1) : rows;
    const data = s.header ? body.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? '']))) : body;
    return { ok: true, value: { text: JSON.stringify(data, null, 2), grid: { columns, rows: body.map((r) => columns.map((_, i) => r[i] ?? '')) } } };
  }
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch (e) {
    return { ok: false, error: `JSON として解釈できません: ${(e as Error).message}` };
  }
  if (!Array.isArray(data) || data.length === 0) return { ok: false, error: '1 件以上の要素を持つ配列を入力してください（例: [{"name": "a"}]）' };
  const objects = data.every((d) => d !== null && typeof d === 'object' && !Array.isArray(d));
  const columns = objects
    ? [...new Set(data.flatMap((d) => Object.keys(d)))]
    : Array.from({ length: data.reduce((w: number, d) => Math.max(w, Array.isArray(d) ? d.length : 1), 0) }, (_, i) => `列${i + 1}`);
  const rows = data.map((d) => (objects ? columns.map((c) => cell(d[c])) : Array.isArray(d) ? columns.map((_, i) => cell(d[i])) : [cell(d)]));
  const quote = (v: string) => (/[",\r\n]/.test(v) || v.includes(s.delimiter) ? `"${v.replaceAll('"', '""')}"` : v);
  const lines = [...(s.header ? [columns] : []), ...rows].map((r) => r.map(quote).join(s.delimiter));
  return { ok: true, value: { text: lines.join('\n'), grid: { columns, rows } } };
}

// ---------- Base64 ----------

export type Base64Settings = { mode: 'encode' | 'decode'; urlSafe: boolean };

const bytesToBase64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

export function base64ToBytes(text: string): Uint8Array | null {
  const t = text.replace(/\s+/g, '').replaceAll('-', '+').replaceAll('_', '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(t) || t.replace(/=+$/, '').length % 4 === 1) return null;
  try {
    return Uint8Array.from(atob(t.padEnd(Math.ceil(t.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

export function convertBase64(input: string, s: Base64Settings): Result<string> {
  if (s.mode === 'encode') {
    const b64 = bytesToBase64(new TextEncoder().encode(input));
    return { ok: true, value: s.urlSafe ? b64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '') : b64 };
  }
  const bytes = base64ToBytes(input);
  if (!bytes) return { ok: false, error: 'Base64 として解釈できません（使える文字は A–Z a–z 0–9 + / と末尾の =。URL-safe の - _ も可）' };
  try {
    return { ok: true, value: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error: `UTF-8 の文字列ではありません（${bytes.length} バイトのバイナリデータの可能性があります）` };
  }
}

// ---------- JWT ----------

export type JwtTime = { claim: 'exp' | 'iat' | 'nbf'; label: string; local: string; relative: string };
export type JwtOutput = {
  header: string;
  payload: string;
  times: JwtTime[];
  status: 'valid' | 'expired' | 'notYet' | 'noExp';
};

const CLAIM_LABEL = { exp: '有効期限（exp）', nbf: '有効開始（nbf）', iat: '発行日時（iat）' } as const;

export function relativeTime(ms: number, now: number): string {
  const rtf = new Intl.RelativeTimeFormat('ja', { numeric: 'auto' });
  const sec = Math.round((ms - now) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [unit, size] of units) if (Math.abs(sec) >= size) return rtf.format(Math.trunc(sec / size), unit);
  return rtf.format(sec, 'second');
}

// 署名は検証しない（鍵がないとできない）。中身を読むだけ
export function decodeJwt(input: string, timeZone: string, now = Date.now()): Result<JwtOutput> {
  const parts = input.trim().replace(/^Bearer\s+/i, '').split('.');
  if (parts.length !== 3) return { ok: false, error: `JWT は「.」で区切られた 3 つの部分からなります（今は ${parts.length} つ）` };
  const part = (i: number, name: string): Result<Record<string, unknown>> => {
    const bytes = base64ToBytes(parts[i]);
    if (!bytes) return { ok: false, error: `${name}が Base64URL として解釈できません` };
    try {
      const v = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error();
      return { ok: true, value: v };
    } catch {
      return { ok: false, error: `${name}が JSON オブジェクトではありません` };
    }
  };
  const header = part(0, 'ヘッダー');
  if (!header.ok) return header;
  const payload = part(1, 'ペイロード');
  if (!payload.ok) return payload;
  const times: JwtTime[] = [];
  for (const claim of ['exp', 'nbf', 'iat'] as const) {
    const v = payload.value[claim];
    if (typeof v !== 'number' || !Number.isFinite(v) || Math.abs(v * 1000) > MAX_MS) continue;
    times.push({ claim, label: CLAIM_LABEL[claim], local: formatInZone(v * 1000, timeZone), relative: relativeTime(v * 1000, now) });
  }
  const exp = payload.value.exp, nbf = payload.value.nbf;
  const status = typeof nbf === 'number' && nbf * 1000 > now ? 'notYet'
    : typeof exp !== 'number' ? 'noExp'
    : exp * 1000 <= now ? 'expired' : 'valid';
  return { ok: true, value: { header: JSON.stringify(header.value, null, 2), payload: JSON.stringify(payload.value, null, 2), times, status } };
}

export const JWT_STATUS = {
  valid: { label: '有効期限内', tone: 'success' },
  expired: { label: '期限切れ', tone: 'error' },
  notYet: { label: 'まだ有効になっていません（nbf より前）', tone: 'warning' },
  noExp: { label: '有効期限（exp）がありません', tone: 'info' },
} as const;

// ---------- 文字数カウント ----------

export type CountItem = { label: string; value: number; hint?: string };

// ponytail: 全角／半角は「ASCII と半角カナ以外は全角」の近似。East Asian Width の曖昧幅（Ambiguous）は区別しない
export function countText(text: string): CountItem[] {
  const graphemes = [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(text)].map((g) => g.segment);
  // 全角・半角は見た目の 1 文字単位で数える（ZWJ でつないだ絵文字を 1 文字にするため）
  const half = graphemes.filter((g) => /^[\x20-\x7e｡-ﾟ]/.test(g)).length;
  const control = graphemes.filter((g) => /^[\x00-\x1f\x7f]/.test(g)).length;
  return [
    { label: '文字数', value: graphemes.length, hint: '見た目の 1 文字を 1 と数える（絵文字の組み合わせも 1）' },
    { label: '空白・改行を除く文字数', value: graphemes.filter((g) => !/^\s+$/.test(g)).length },
    { label: '行数', value: text === '' ? 0 : text.split(/\r\n|\r|\n/).length },
    { label: 'UTF-8 のバイト数', value: new TextEncoder().encode(text).length },
    { label: 'UTF-16 の長さ', value: text.length, hint: 'JavaScript の length。DB やフォームの上限でよく使われる' },
    { label: 'コードポイント数', value: [...text].length },
    { label: '全角文字', value: graphemes.length - half - control },
    { label: '半角文字', value: half },
  ];
}
