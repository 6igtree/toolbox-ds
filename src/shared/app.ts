import { useEffect, useState } from 'react';
import {
  convertBase64, defaultTimeZone, type Base64Settings, type CsvSettings, type DatetimeSettings, type JsonSettings, type RegexSettings,
  type UrlSettings,
} from './logic.ts';

export * from './logic.ts';

import type { UiId } from './uis.ts';
export * from './uis.ts';

export const TOOLS = [
  { id: 'json', label: 'JSON 整形', description: 'JSON を整形・圧縮し、構文エラーの位置を表示します。' },
  { id: 'datetime', label: '日時・Unix 時刻', description: 'Unix 時刻と日時を相互に変換します。' },
  { id: 'url', label: 'URL 解析', description: 'URL を分解し、パーセントエンコード・デコードを行います。' },
  { id: 'regex', label: '正規表現テスター', description: 'JavaScript の正規表現で、一致する箇所とキャプチャグループを確認します。' },
  { id: 'csv', label: 'CSV ↔ JSON', description: 'CSV と JSON を相互に変換し、表で確認します。' },
  { id: 'jwt', label: 'JWT デコード', description: 'JWT のヘッダーとペイロードを読み、有効期限を確認します。署名は検証しません。' },
  { id: 'base64', label: 'Base64', description: 'UTF-8 の文字列を Base64 にエンコード・デコードします。' },
  { id: 'count', label: '文字数カウント', description: '文字数・バイト数・行数・全角半角の数を数えます。' },
] as const;
export type ToolId = (typeof TOOLS)[number]['id'];

// URL は /<ui>/<tool>。不明なツールは JSON に寄せる
export function currentTool(): (typeof TOOLS)[number] {
  const id = location.pathname.split('/')[2];
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) history.replaceState(null, '', href(location.pathname.split('/')[1] as UiId, 'json'));
  return tool ?? TOOLS[0];
}

export const href = (ui: UiId, tool: ToolId) => `/${ui}/${tool}`;

// 入力と設定はツールごとに 1 キー。UI をまたいで同じキーを読むので切り替えても引き継がれる
export type ToolState = {
  json: { input: string } & JsonSettings;
  datetime: { input: string } & DatetimeSettings;
  url: { input: string } & UrlSettings;
  regex: { input: string } & RegexSettings;
  csv: { input: string } & CsvSettings;
  jwt: { input: string };
  base64: { input: string } & Base64Settings;
  count: { input: string };
};

const DEFAULTS: { [K in ToolId]: () => ToolState[K] } = {
  json: () => ({ input: '', mode: 'format', indent: '2' }),
  datetime: () => ({ input: '', unit: 's', timeZone: defaultTimeZone() }),
  url: () => ({ input: '', mode: 'parse', plusAsSpace: true }),
  regex: () => ({ input: '', pattern: '', flags: 'g' }),
  csv: () => ({ input: '', mode: 'csv2json', delimiter: ',', header: true }),
  jwt: () => ({ input: '' }),
  base64: () => ({ input: '', mode: 'encode', urlSafe: false }),
  count: () => ({ input: '' }),
};

export const SAMPLES: { [K in ToolId]: (s: ToolState[K]) => string } = {
  json: () => '{"name":"toolbox","version":1,"tags":["json","format"],"nested":{"ok":true,"value":null}}',
  datetime: (s) => (s.unit === 's' ? '1790000000' : '1790000000123'),
  url: (s) =>
    s.mode === 'decode'
      ? 'q%3D%E6%9D%B1%E4%BA%AC+%E3%82%BF%E3%83%AF%E3%83%BC%26lang%3Dja'
      : s.mode === 'encode'
        ? 'q=東京 タワー&lang=ja'
        : 'https://example.com:8080/search/results?q=%E6%9D%B1%E4%BA%AC&page=2&tag=a&tag=b#top',
  regex: () => '問い合わせ: support@example.com\n営業: sales@example.co.jp\n個人: taro.yamada@mail.example.org',
  csv: (s) =>
    s.mode === 'json2csv'
      ? '[{"name":"アリス","role":"エンジニア","tags":["go","ts"]},{"name":"ボブ","role":"デザイナー, リード"}]'
      : ['name,role,joined', 'アリス,エンジニア,2024-04-01', '"ボブ","デザイナー, リード",2025-10-01', 'キャロル,PM,'].join('\n').replaceAll(',', s.delimiter),
  jwt: () => sampleJwt(),
  base64: (s) => (s.mode === 'encode' ? 'こんにちは、Toolbox!' : s.urlSafe ? '44GT44KT44Gr44Gh44Gv44CBVG9vbGJveCE' : '44GT44KT44Gr44Gh44Gv44CBVG9vbGJveCE='),
  count: () => '吾輩は猫である。名前はまだ無い。\nWhere was I born? 👨‍👩‍👧 ｶﾀｶﾅ',
};

// 期限が「今から 1 時間後」の JWT。署名部分はダミー
function sampleJwt() {
  const b64 = (o: object) => (convertBase64(JSON.stringify(o), { mode: 'encode', urlSafe: true }) as { value: string }).value;
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: 'user-123', name: '山田太郎', roles: ['admin'], iat: now - 300, exp: now + 3600 };
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.ZHVtbXktc2lnbmF0dXJl`;
}

// サンプル入力に合う正規表現。入力と一緒に入れないと何も一致しない
export const REGEX_SAMPLE_PATTERN = '(?<user>[\\w.+-]+)@(?<domain>[\\w-]+(?:\\.[\\w-]+)+)';

const key = (tool: ToolId) => `toolbox:v1:${tool}`;

export function useToolState<K extends ToolId>(tool: K) {
  const [state, setState] = useState<ToolState[K]>(() => {
    try {
      const raw = sessionStorage.getItem(key(tool));
      if (raw) return { ...DEFAULTS[tool](), ...JSON.parse(raw) };
    } catch {}
    return DEFAULTS[tool]();
  });
  // 入力のたびに保存する。容量超過やストレージ無効でも画面は動かす
  useEffect(() => {
    try {
      sessionStorage.setItem(key(tool), JSON.stringify(state));
    } catch {}
  }, [tool, state]);
  const update = (patch: Partial<ToolState[K]>) => setState((s) => ({ ...s, ...patch }));
  return [state, update] as const;
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const toggleFlag = (flags: string, f: string) => (flags.includes(f) ? flags.replace(f, '') : flags + f);

export const DELIMITERS: [CsvSettings['delimiter'], string][] = [[',', 'カンマ'], ['\t', 'タブ'], [';', 'セミコロン']];

// ponytail: 表のプレビューは先頭だけ。全件の表示が要るなら各 DS のページングか仮想スクロールを使う
export const PREVIEW_ROWS = 100;

// 表の行。各 DS のテーブルは行 ID を要求するものが多いので id を振る
export const gridRows = (rows: string[][]) => rows.slice(0, PREVIEW_ROWS).map((cells, id) => ({ id, cells }));

export const groupsText = (groups: { name: string; value: string | undefined }[]) =>
  groups.map((g) => `${g.name}: ${g.value ?? '（なし）'}`).join('、');
