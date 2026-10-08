# toolbox-ds

JSON 整形・日時/Unix 時刻変換・URL 解析の小さなツール集を、複数のデザインシステムで実装した比較用アプリ。

| URL | デザインシステム |
|---|---|
| `/cloudscape/<tool>` | Cloudscape（AWS） |
| `/primer/<tool>` | Primer（GitHub） |
| `/semi/<tool>` | Semi Design（ByteDance / Douyin） |

`<tool>` は `json` / `datetime` / `url`。

```sh
pnpm install
pnpm dev      # http://localhost:5190（/ はUI選択）
pnpm check    # 変換ロジックの検証 + 型チェック
pnpm build && pnpm preview
```

## 構成

- `src/shared/` … 変換処理（`logic.ts`）、ツール一覧・ルーティング・sessionStorage 保存（`app.ts`）。全 UI 共通
- `src/<ui>/main.tsx` … UI だけ。各ライブラリの部品をそのまま使う（共通の Button などは作らない）
- `<ui>/index.html` … UI ごとの HTML。読み込む CSS はその UI のものだけ

UI の切り替えはページの再読み込みで行う。CSS が混ざらないようにするため。入力と設定は `toolbox:v1:<tool>` に入力のたびに保存し、別の UI でも同じキーから復元する。

`/<ui>/<tool>` を `/<ui>/index.html` に向ける処理は、開発時は `vite.config.ts` のミドルウェア、本番は `vercel.json` の rewrites で行う。

## 依存まわりの注意

- Semi は React 19 用の `@douyinfe/semi-ui-19` を使い、先頭で `react19-adapter` を import する（Toast などの命令的 API のため）
- Semi の CSS は各コンポーネントの JS が読み込む。`dist/css/semi.min.css` は exports に無いので import できない
- Semi の既定ロケールは中国語。`LocaleProvider` で `ja_JP` を渡す
- Primer v38 は CSS Modules 同梱。primitives（トークン）とテーマの CSS は自分で import する
