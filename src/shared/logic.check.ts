// node src/shared/logic.check.ts
import assert from 'node:assert/strict';
import { convertBase64, convertCsv, convertDatetime, convertJson, countText, decodeJwt, decodeUrl, encodeUrl, parseCsv, parseUrl, testRegex, type CsvSettings } from './logic.ts';

const fmt = { mode: 'format', indent: '2' } as const;
assert.deepEqual(convertJson('{"a":[1,2]}', fmt), { ok: true, value: '{\n  "a": [\n    1,\n    2\n  ]\n}' });
assert.deepEqual(convertJson('{ "a" : 1 }', { ...fmt, mode: 'minify' }), { ok: true, value: '{"a":1}' });
assert.deepEqual(convertJson('{"a":1}', { ...fmt, indent: 'tab' }), { ok: true, value: '{\n\t"a": 1\n}' });
const bad = convertJson('{\n  "a": 1,\n}', fmt);
assert.equal(bad.ok, false);
assert.match(!bad.ok ? bad.error : '', /^3 行 1 列目/);

const s = (unit: 's' | 'ms', timeZone = 'Asia/Tokyo') => ({ unit, timeZone });
const ok = <T,>(r: { ok: boolean; value?: T }) => (assert.equal(r.ok, true), r.value as T);

assert.equal(ok(convertDatetime('0', s('s'))).iso, '1970-01-01T00:00:00.000Z');
assert.equal(ok(convertDatetime('1790000000', s('s'))).local, '2026-09-21 23:13:20.000 +09:00');
assert.equal(ok(convertDatetime('1790000000123', s('ms'))).seconds, '1790000000');
assert.equal(ok(convertDatetime('-1', s('ms'))).seconds, '-1'); // 負は切り捨て方向
assert.equal(ok(convertDatetime('-1', s('ms'))).local, '1970-01-01 08:59:59.999 +09:00');
assert.match(ok(convertDatetime('1790000000123', s('s'))).warning ?? '', /ミリ秒/);
assert.match(ok(convertDatetime('1790000000', s('ms'))).warning ?? '', /秒/);
assert.equal(ok(convertDatetime('2026-10-08 12:00', s('s'))).iso, '2026-10-08T03:00:00.000Z'); // 選択 TZ の時刻
assert.equal(ok(convertDatetime('2026-10-08T12:00:00Z', s('s'))).iso, '2026-10-08T12:00:00.000Z');
assert.equal(ok(convertDatetime('2026-10-08T12:00:00-05:30', s('s'))).iso, '2026-10-08T17:30:00.000Z');
assert.equal(ok(convertDatetime('2026-10-08T12:00:00.5Z', s('s'))).millis, String(Date.UTC(2026, 9, 8, 12, 0, 0, 500)));
// 夏時間: ニューヨーク 2026-03-08 は 2:00 → 3:00、11-01 は 2:00 → 1:00
assert.equal(ok(convertDatetime('2026-07-01 12:00', s('s', 'America/New_York'))).iso, '2026-07-01T16:00:00.000Z');
assert.equal(ok(convertDatetime('2026-12-01 12:00', s('s', 'America/New_York'))).iso, '2026-12-01T17:00:00.000Z');
assert.equal(ok(convertDatetime('1783000000', s('s', 'America/New_York'))).local.slice(-6), '-04:00');
for (const t of ['2026-02-31', '2026-10-08 25:00', 'yesterday', '', '1e5']) assert.equal(convertDatetime(t, s('s')).ok, false, t);
assert.equal(convertDatetime('99999999999999999', s('s')).ok, false); // 範囲外

const p = parseUrl('https://user:pw@例え.jp:8080/a%20b?q=%E3%81%82&x=1+2&x=&empty#frag');
assert.equal(p.ok, true);
if (p.ok) {
  assert.deepEqual(p.value.query, [{ key: 'q', value: 'あ' }, { key: 'x', value: '1 2' }, { key: 'x', value: '' }, { key: 'empty', value: '' }]);
  assert.equal(p.value.fields.find((f) => f.label === 'ホスト')?.value, 'xn--r8jz45g.jp');
}
assert.equal(parseUrl('example.com/path').ok, false);
assert.deepEqual(encodeUrl('a b&c=あ/'), { ok: true, value: 'a%20b%26c%3D%E3%81%82%2F' });
assert.equal(encodeUrl('\uD800').ok, false);
assert.deepEqual(decodeUrl('a+b%20c', false), { ok: true, value: 'a+b c' });
assert.deepEqual(decodeUrl('a+b%20c', true), { ok: true, value: 'a b c' });
assert.equal(decodeUrl('100%', false).ok, false);
assert.equal(decodeUrl('%E3%81', false).ok, false); // 途中で切れた UTF-8

console.log('ok');

// 正規表現
const rx = (t: string, pattern: string, flags = 'g') => testRegex(t, { pattern, flags });
const r1 = rx('a1 b22 c333', '(?<l>[a-z])(\\d+)');
assert.ok(r1.ok);
if (r1.ok) {
  assert.deepEqual(r1.value.matches.map((m) => m.text), ['a1', 'b22', 'c333']);
  assert.deepEqual(r1.value.matches[1].groups, [{ name: 'l', value: 'b' }, { name: '2', value: '22' }]);
  assert.deepEqual(r1.value.segments.map((x) => x.match), [true, false, true, false, true]);
}
const once = rx('aaa', 'a', '');
assert.equal(once.ok && once.value.matches.length, 1); // g なしは最初の 1 件
const empty = rx('abc', 'x*');
assert.ok(empty.ok && empty.value.matches.length === 4 && empty.value.segments.length === 1); // 空一致でも無限ループしない
assert.equal(rx('ABC', 'b', 'gi').ok && (rx('ABC', 'b', 'gi') as { value: { matches: unknown[] } }).value.matches.length, 1);
assert.match(!rx('x', '(').ok ? (rx('x', '(') as { error: string }).error : '', /^正規表現が不正です/);
const many = rx('a'.repeat(5000), 'a');
assert.ok(many.ok && many.value.truncated && many.value.matches.length === 1000);

// CSV ↔ JSON
const csv = (input: string, p: Partial<CsvSettings> = {}) => convertCsv(input, { mode: 'csv2json', delimiter: ',', header: true, ...p });
assert.deepEqual(parseCsv('a,"b,""c""\nd",e\r\nf', ','), { ok: true, value: [['a', 'b,"c"\nd', 'e'], ['f']] });
assert.equal(parseCsv('"abc', ',').ok, false);
const c1 = csv('name,age\nアリス,30\nボブ,');
assert.ok(c1.ok);
if (c1.ok) {
  assert.deepEqual(JSON.parse(c1.value.text), [{ name: 'アリス', age: '30' }, { name: 'ボブ', age: '' }]);
  assert.deepEqual(c1.value.grid, { columns: ['name', 'age'], rows: [['アリス', '30'], ['ボブ', '']] });
}
const c2 = csv('1\t2\n3\t4', { delimiter: '\t', header: false });
assert.ok(c2.ok && c2.value.text === JSON.stringify([['1', '2'], ['3', '4']], null, 2));
const j1 = csv('[{"a":1,"b":"x,y"},{"a":null,"c":{"d":true}}]', { mode: 'json2csv' });
assert.deepEqual(j1, { ok: true, value: { text: 'a,b,c\n1,"x,y",\n,,"{""d"":true}"', grid: { columns: ['a', 'b', 'c'], rows: [['1', 'x,y', ''], ['', '', '{"d":true}']] } } });
assert.equal(csv('{"a":1}', { mode: 'json2csv' }).ok, false);
assert.equal(csv('[]', { mode: 'json2csv' }).ok, false);
assert.deepEqual(csv('[[1,2],[3]]', { mode: 'json2csv', header: false }), { ok: true, value: { text: '1,2\n3,', grid: { columns: ['列1', '列2'], rows: [['1', '2'], ['3', '']] } } });

console.log('ok (regex, csv)');

// Base64
const b64 = (input: string, p: Partial<{ mode: 'encode' | 'decode'; urlSafe: boolean }> = {}) => convertBase64(input, { mode: 'encode', urlSafe: false, ...p });
assert.deepEqual(b64('こんにちは'), { ok: true, value: '44GT44KT44Gr44Gh44Gv' });
assert.deepEqual(b64('?>?', { urlSafe: true }), { ok: true, value: 'Pz4_' }); // + / が - _ に、= は落とす
assert.deepEqual(b64('a', { urlSafe: true }), { ok: true, value: 'YQ' });
assert.deepEqual(b64('44GT44KT44Gr44Gh44Gv', { mode: 'decode' }), { ok: true, value: 'こんにちは' });
assert.deepEqual(b64('YQ', { mode: 'decode' }), { ok: true, value: 'a' }); // パディングなしも読む
assert.deepEqual(b64('Pz4_\n', { mode: 'decode' }), { ok: true, value: '?>?' });
assert.equal(b64('a', { mode: 'decode' }).ok, false); // 長さ % 4 === 1 はあり得ない
assert.equal(b64('ab!c', { mode: 'decode' }).ok, false);
assert.match((b64('/w==', { mode: 'decode' }) as { error: string }).error, /UTF-8 の文字列ではありません（1 バイト/);
const big = 'あ'.repeat(100000);
assert.equal((b64((b64(big) as { value: string }).value, { mode: 'decode' }) as { value: string }).value, big); // 大きい入力でもスタックが溢れない

// JWT
const enc = (o: object) => (convertBase64(JSON.stringify(o), { mode: 'encode', urlSafe: true }) as { value: string }).value;
const now = Date.UTC(2026, 9, 9, 0, 0, 0);
const tok = (p: object) => `${enc({ alg: 'HS256', typ: 'JWT' })}.${enc(p)}.sig`;
const jw = decodeJwt(`Bearer ${tok({ sub: '1', exp: now / 1000 + 3 * 3600, iat: now / 1000 - 2 * 86400 })}`, 'Asia/Tokyo', now);
assert.ok(jw.ok);
if (jw.ok) {
  assert.equal(jw.value.status, 'valid');
  assert.deepEqual(jw.value.times.map((t) => [t.claim, t.relative]), [['exp', '3 時間後'], ['iat', '一昨日']]);
  assert.equal(jw.value.times[0].local, '2026-10-09 12:00:00.000 +09:00');
  assert.equal(JSON.parse(jw.value.header).alg, 'HS256');
}
assert.equal((decodeJwt(tok({ exp: now / 1000 - 1 }), 'UTC', now) as { value: { status: string } }).value.status, 'expired');
assert.equal((decodeJwt(tok({ nbf: now / 1000 + 60, exp: now / 1000 + 120 }), 'UTC', now) as { value: { status: string } }).value.status, 'notYet');
assert.equal((decodeJwt(tok({ sub: 'x' }), 'UTC', now) as { value: { status: string } }).value.status, 'noExp');
assert.match((decodeJwt('a.b', 'UTC', now) as { error: string }).error, /今は 2 つ/);
assert.match((decodeJwt('!!.e30.x', 'UTC', now) as { error: string }).error, /^ヘッダーが Base64URL/);
assert.match((decodeJwt(`${enc({ a: 1 })}.${enc([1])}.x`, 'UTC', now) as { error: string }).error, /^ペイロードが JSON オブジェクトではありません/);

// 文字数
const cnt = (t: string) => Object.fromEntries(countText(t).map((c) => [c.label, c.value]));
assert.deepEqual(cnt(''), { '文字数': 0, '空白・改行を除く文字数': 0, '行数': 0, 'UTF-8 のバイト数': 0, 'UTF-16 の長さ': 0, 'コードポイント数': 0, '全角文字': 0, '半角文字': 0 });
const fam = '👨‍👩‍👧'; // ZWJ でつないだ 1 文字
assert.deepEqual(cnt(`aｱ漢 ${fam}\nb`), {
  '文字数': 7, '空白・改行を除く文字数': 5, '行数': 2, 'UTF-8 のバイト数': 1 + 3 + 3 + 1 + 18 + 1 + 1, 'UTF-16 の長さ': 14,
  'コードポイント数': 11, '全角文字': 2, '半角文字': 4, // 全角は「漢」と家族の絵文字
});

console.log('ok (base64, jwt, count)');
assert.equal(cnt('a\r\nb')['文字数'], 3); // CRLF は見た目の 1 文字
assert.equal(cnt('a\r\nb')['行数'], 2);
console.log('ok (count crlf)');
