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
