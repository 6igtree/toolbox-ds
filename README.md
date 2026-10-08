# toolbox-ds

JSON 整形・日時/Unix 時刻変換・URL 解析・正規表現テスター・CSV ↔ JSON・JWT デコード・Base64・文字数カウントの小さなツール集を、複数のデザインシステムで実装した比較用アプリ。

| URL | デザインシステム |
|---|---|
| `/cloudscape/<tool>` | Cloudscape（AWS） |
| `/primer/<tool>` | Primer（GitHub） |
| `/semi/<tool>` | Semi Design（ByteDance / Douyin） |
| `/fluent/<tool>` | Fluent 2（Microsoft） |
| `/antd/<tool>` | Ant Design（Alibaba） |
| `/spectrum/<tool>` | Spectrum 2（Adobe） |
| `/amplify/<tool>` | Amplify UI（AWS） |
| `/arco/<tool>` | Arco Design（ByteDance） |

`<tool>` は `json` / `datetime` / `url` / `regex` / `csv` / `jwt` / `base64` / `count`。

```sh
pnpm install
pnpm dev      # http://localhost:5190（/ はUI選択）
pnpm check    # 変換ロジックの検証 + 型チェック
pnpm build && pnpm preview
```

## 構成

- `src/shared/` … 変換処理（`logic.ts`）、ツール一覧・ルーティング・sessionStorage 保存（`app.ts`）、UI 一覧（`uis.ts`）。全 UI 共通
- `src/shared/Highlight.tsx` … 正規表現の一致箇所の強調。どの DS にも該当部品がないので共用し、色だけ各 DS から渡す
- `src/<ui>/main.tsx` … UI だけ。各ライブラリの部品をそのまま使う（共通の Button などは作らない）
- `<ui>/index.html` … UI ごとの HTML。読み込む CSS はその UI のものだけ

UI の切り替えはページの再読み込みで行う。CSS が混ざらないようにするため。入力と設定は `toolbox:v1:<tool>` に入力のたびに保存し、別の UI でも同じキーから復元する。

`/<ui>/<tool>` を `/<ui>/index.html` に向ける処理は、開発時は `vite.config.ts` のミドルウェア、本番は `vercel.json` の rewrites で行う。

ツールを足すときは `src/shared/logic.ts`（処理）と `app.ts`（一覧・初期値・サンプル）に入れ、6 つの `main.tsx` すべてに画面を書く。

UI を足すときは `src/shared/uis.ts`・`<ui>/index.html`・`src/<ui>/main.tsx`・`vercel.json` の正規表現・トップの `index.html` を更新する。今の構成は全 UI が React 19 で動く前提。React 18 でしか動かないライブラリは別アプリに分けて同じ配信先の下に置く。

## 依存まわりの注意

- Semi は React 19 用の `@douyinfe/semi-ui-19` を使い、先頭で `react19-adapter` を import する（Toast などの命令的 API のため）
- Semi の CSS は各コンポーネントの JS が読み込む。`dist/css/semi.min.css` は exports に無いので import できない
- Semi の既定ロケールは中国語。`LocaleProvider` で `ja_JP` を渡す
- Primer v38 は CSS Modules 同梱。primitives（トークン）とテーマの CSS は自分で import する
- Fluent 2 と Ant Design は CSS-in-JS なので CSS ファイルは出ない。どちらもグローバルリセットを持たないので `body { margin: 0 }` を HTML に書いている
- Spectrum 2（`@react-spectrum/s2`）は配置用の `style` マクロにビルドプラグインが要る。導入せず、配置はインラインスタイルで組んでいる。部品の CSS は各部品の JS が読み込む
- Spectrum 2 の `TableView` などのコレクションは、データの `key` プロパティを行の ID として使う。クエリ名を `key` のまま渡すと重複でぶつかる
- Spectrum 2 の `SideNav` は新しい部品で、公式の使用例がまだない。`SideNavItem` > `SideNavItemContent` > `SideNavItemLink` の順に組み、`selectedRoute` に現在の URL を渡す
- Arco は React 19 で `react-dom` から `createRoot` を取れないので、先頭で `@arco-design/web-react/es/_util/react-19-adapter` を import する（Message などの命令的 API のため）。開発時だけ `element.ref was removed in React 19` の警告が出る（Arco 内部の Tooltip などの実装による。本番ビルドでは出ない）
- Arco の `Form.Item` に `field` を付けると Form が値を管理し、入力欄の `value` が無視される。この app は Form の状態管理を使わないので `field` は付けない
- Semi と Arco の既定のフォントは中国語（PingFang SC）が先で、漢字が簡体字の字形・かなと別のフォントになる。各 HTML で日本語フォントを先に置いて上書きしている（Semi は部品ごとに font-family を持つので詳細度を上げている）
- Amplify UI は `aws-amplify`（バックエンド連携）を optional peer に持つが、UI 部品だけなら不要。依存の `@xstate/react` が React 19 を peer に含まず警告が出るが、使うのは Authenticator だけなので影響しない
- Amplify UI にはヘッダー・サイドナビ・トーストの部品がない。`Flex` / `View` / `Link` とトークン（`--amplify-*` の CSS 変数）で組み、コピーの通知はボタンの文言で出す
