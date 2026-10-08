import { useEffect, useState } from 'react';
import { defaultTimeZone, type DatetimeSettings, type JsonSettings, type UrlSettings } from './logic.ts';

export * from './logic.ts';

export const UIS = [
  { id: 'cloudscape', label: 'Cloudscape' },
  { id: 'primer', label: 'Primer' },
  { id: 'semi', label: 'Semi Design' },
] as const;
export type UiId = (typeof UIS)[number]['id'];

export const TOOLS = [
  { id: 'json', label: 'JSON 整形', description: 'JSON を整形・圧縮し、構文エラーの位置を表示します。' },
  { id: 'datetime', label: '日時・Unix 時刻', description: 'Unix 時刻と日時を相互に変換します。' },
  { id: 'url', label: 'URL 解析', description: 'URL を分解し、パーセントエンコード・デコードを行います。' },
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
};

const DEFAULTS: { [K in ToolId]: () => ToolState[K] } = {
  json: () => ({ input: '', mode: 'format', indent: '2' }),
  datetime: () => ({ input: '', unit: 's', timeZone: defaultTimeZone() }),
  url: () => ({ input: '', mode: 'parse', plusAsSpace: true }),
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
};

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
