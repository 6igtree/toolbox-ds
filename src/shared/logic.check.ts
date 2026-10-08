// node src/shared/logic.check.ts
import assert from 'node:assert/strict';
import { convertDatetime, convertJson, decodeUrl, encodeUrl, parseUrl } from './logic.ts';

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
