import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@react-spectrum/s2/page.css';
import {
  ActionButton, Breadcrumb, Breadcrumbs, Button, ButtonGroup, Cell, Checkbox, CheckboxGroup, Column, ComboBox, ComboBoxItem, Content, Heading,
  InlineAlert, Menu, MenuItem, MenuTrigger, Provider, Row, SegmentedControl, StatusLight, Switch, SegmentedControlItem, SideNav, SideNavItem,
  SideNavItemContent, SideNavItemLink, TableBody, TableHeader, TableView, Text, TextArea, TextField, ToastContainer, ToastQueue,
} from '@react-spectrum/s2';
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown';
import Copy from '@react-spectrum/s2/icons/Copy';
import Tools from '@react-spectrum/s2/icons/Tools';
import {
  convertBase64, countText, decodeJwt, defaultTimeZone, JWT_STATUS, DELIMITERS, PREVIEW_ROWS, REGEX_FLAGS, REGEX_SAMPLE_PATTERN, SAMPLES, TOOLS, UIS, convertCsv, convertDatetime, convertJson, copy,
  currentTool, decodeUrl, encodeUrl, gridRows, groupsText, href, parseUrl, testRegex, timeZones, useToolState,
  type Result,
} from '../shared/app.ts';
import { Highlight } from '../shared/Highlight.tsx';

const tool = currentTool();
// S2 のレイアウト用 style マクロはビルドプラグインが要るので、配置だけはインラインで組む
const MONO = "'Source Code Pro', ui-monospace, Menlo, monospace";
const panel: CSSProperties = {
  flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16, padding: 24,
  background: 'var(--s2-container-bg)', borderRadius: 16, boxShadow: '0 1px 4px rgb(0 0 0 / 0.12)',
};
const muted: CSSProperties = { color: 'rgb(110 110 110)' };

async function copyWithToast(text: string) {
  if (await copy(text)) ToastQueue.positive('コピーしました', { timeout: 3000 });
  else ToastQueue.negative('コピーできませんでした', { timeout: 5000 });
}

function App() {
  return (
    <Provider colorScheme="light" locale="ja-JP" background="layer-1" UNSAFE_style={{ minHeight: '100vh' }}>
      <ToastContainer />
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'var(--s2-container-bg)', borderBottom: '1px solid rgb(225 225 225)' }}>
        <a href={href('spectrum', 'json')} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, color: 'inherit', textDecoration: 'none' }}>
          <Tools />
          <Heading level={1} UNSAFE_style={{ margin: 0, fontSize: 18 }}>Toolbox</Heading>
        </a>
        <MenuTrigger>
          <ActionButton isQuiet aria-label="デザインシステムを切り替え"><Text>Spectrum 2</Text><ChevronDown /></ActionButton>
          <Menu selectionMode="single" selectedKeys={['spectrum']}>
            {UIS.map((u) => <MenuItem key={u.id} id={u.id} href={href(u.id, tool.id)}>{u.label}</MenuItem>)}
          </Menu>
        </MenuTrigger>
      </header>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        <nav className="side" style={{ padding: '16px 8px', background: 'var(--s2-container-bg)' }}>
          <SideNav aria-label="ツール" selectedRoute={href('spectrum', tool.id)}>
            {TOOLS.map((t) => (
              <SideNavItem key={t.id} id={t.id} textValue={t.label} href={href('spectrum', t.id)}>
                <SideNavItemContent><SideNavItemLink>{t.label}</SideNavItemLink></SideNavItemContent>
              </SideNavItem>
            ))}
          </SideNav>
        </nav>
        <main style={{ flex: '1 1 480px', minWidth: 0, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Breadcrumbs は親の残り高さまで伸びるので div で包む */}
          <div>
            <Breadcrumbs>
              <Breadcrumb href={href('spectrum', 'json')}>Toolbox</Breadcrumb>
              <Breadcrumb>{tool.label}</Breadcrumb>
            </Breadcrumbs>
          </div>
          <div>
            <Heading level={2} UNSAFE_style={{ margin: 0, fontSize: 28 }}>{tool.label}</Heading>
            <Text UNSAFE_style={muted}>{tool.description}</Text>
          </div>
          {{ json: <JsonTool />, datetime: <DatetimeTool />, url: <UrlTool />, regex: <RegexTool />, csv: <CsvTool />, jwt: <JwtTool />, base64: <Base64Tool />, count: <CountTool /> }[tool.id]}
        </main>
      </div>
    </Provider>
  );
}

function Layout({ onSample, input, onInput, placeholder, settings, result, copyText }: {
  onSample: () => void;
  input: string;
  onInput: (v: string) => void;
  placeholder: string;
  settings: ReactNode;
  result: Result<ReactNode> | null;
  copyText?: string;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      <section style={panel} aria-labelledby="h-input">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <Heading level={3} id="h-input" UNSAFE_style={{ margin: 0 }}>入力</Heading>
          <ButtonGroup>
            <Button variant="secondary" onPress={() => onSample()}>サンプル</Button>
            <Button variant="secondary" onPress={() => onInput('')} isDisabled={!input}>クリア</Button>
          </ButtonGroup>
        </div>
        <TextArea label="入力" value={input} onChange={onInput} placeholder={placeholder} spellCheck="false"
          UNSAFE_style={{ width: '100%' }} />
        {settings}
      </section>
      <section style={panel} aria-labelledby="h-result">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 32 }}>
          <Heading level={3} id="h-result" UNSAFE_style={{ margin: 0 }}>結果</Heading>
          {copyText !== undefined && <Button variant="secondary" onPress={() => copyWithToast(copyText)}><Copy /><Text>コピー</Text></Button>}
        </div>
        {result === null ? (
          <Text UNSAFE_style={muted}>入力すると結果がここに表示されます</Text>
        ) : result.ok ? (
          result.value
        ) : (
          <InlineAlert variant="negative"><Heading>変換できません</Heading><Content>{result.error}</Content></InlineAlert>
        )}
      </section>
    </div>
  );
}

const Pre = ({ children }: { children: string }) => (
  <pre style={{ margin: 0, padding: 16, overflow: 'auto', maxHeight: '32rem', fontFamily: MONO, fontSize: 13, background: 'rgb(243 243 243)', borderRadius: 8 }}>
    {children}
  </pre>
);

function Pairs({ items }: { items: { label: string; value: string; copyable?: boolean }[] }) {
  return (
    <dl style={{ margin: 0, display: 'grid', gap: 12 }}>
      {items.map((i) => (
        <div key={i.label}>
          <dt><Text UNSAFE_style={{ ...muted, fontSize: 12 }}>{i.label}</Text></dt>
          <dd style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: MONO, wordBreak: 'break-all' }}>{i.value}</span>
            {i.copyable && <ActionButton isQuiet size="S" aria-label={`${i.label}をコピー`} onPress={() => copyWithToast(i.value)}><Copy /></ActionButton>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <div>
      <Text UNSAFE_style={{ display: 'block', fontSize: 12, marginBottom: 4, ...muted }}>{label}</Text>
      <SegmentedControl aria-label={label} selectedKey={value} onSelectionChange={(k) => onChange(k as T)}>
        {options.map(([v, text]) => <SegmentedControlItem key={v} id={v}>{text}</SegmentedControlItem>)}
      </SegmentedControl>
    </div>
  );
}

function JsonTool() {
  const [s, set] = useToolState('json');
  const r = s.input.trim() ? convertJson(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.json(s) })} input={s.input} onInput={(input) => set({ input })} placeholder='{"key": "value"}'
      copyText={r?.ok ? r.value : undefined}
      result={r && (r.ok ? { ok: true, value: <Pre>{r.value}</Pre> } : r)}
      settings={
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          <Choice label="出力" value={s.mode} onChange={(mode) => set({ mode })} options={[['format', '整形'], ['minify', '圧縮']]} />
          {s.mode === 'format' && (
            <Choice label="インデント" value={s.indent} onChange={(indent) => set({ indent })}
              options={[['2', '2 スペース'], ['4', '4 スペース'], ['tab', 'タブ']]} />
          )}
        </div>
      }
    />
  );
}

function DatetimeTool() {
  const [s, set] = useToolState('datetime');
  const zones = useMemo(() => timeZones().map((z) => ({ id: z })), []);
  const r = s.input.trim() ? convertDatetime(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.datetime(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <>
            {r.value.warning && <InlineAlert variant="notice"><Content>{r.value.warning}</Content></InlineAlert>}
            <Pairs items={[
              { label: `日時（${s.timeZone}）`, value: r.value.local, copyable: true },
              { label: 'ISO 8601（UTC）', value: r.value.iso, copyable: true },
              { label: 'Unix 時刻（秒）', value: r.value.seconds, copyable: true },
              { label: 'Unix 時刻（ミリ秒）', value: r.value.millis, copyable: true },
            ]} />
          </>
        ),
      } : r)}
      settings={
        <>
          <div><Button variant="secondary" onPress={() => set({ input: String(s.unit === 's' ? Math.floor(Date.now() / 1000) : Date.now()) })}>現在時刻</Button></div>
          <Choice label="数値の単位" value={s.unit} onChange={(unit) => set({ unit })} options={[['s', '秒'], ['ms', 'ミリ秒']]} />
          <ComboBox
            label="タイムゾーン"
            description="結果の表示と、オフセットのない日時の解釈に使います"
            defaultItems={zones}
            selectedKey={s.timeZone}
            onSelectionChange={(k) => k && set({ timeZone: String(k) })}
            UNSAFE_style={{ width: '100%' }}
          >
            {(z) => <ComboBoxItem id={z.id}>{z.id}</ComboBoxItem>}
          </ComboBox>
        </>
      }
    />
  );
}

function UrlTool() {
  const [s, set] = useToolState('url');
  const text = s.input.trim() ? s.input : null;
  const parsed = text !== null && s.mode === 'parse' ? parseUrl(text) : null;
  const coded = text !== null && s.mode !== 'parse' ? (s.mode === 'encode' ? encodeUrl(text) : decodeUrl(text, s.plusAsSpace)) : null;
  const result: Result<ReactNode> | null = parsed
    ? parsed.ok
      ? {
          ok: true,
          value: (
            <>
              <Pairs items={parsed.value.fields} />
              <Heading level={4} UNSAFE_style={{ margin: 0 }}>クエリパラメーター（{parsed.value.query.length}）</Heading>
              <TableView aria-label="クエリパラメーター" density="compact" overflowMode="wrap">
                <TableHeader>
                  <Column isRowHeader>キー</Column>
                  <Column>値（デコード済み）</Column>
                </TableHeader>
                <TableBody items={parsed.value.query.map((q, i) => ({ id: i, name: q.key, value: q.value }))} renderEmptyState={() => 'クエリパラメーターはありません'}>
                  {(q) => (
                    <Row>
                      <Cell>{q.name}</Cell>
                      <Cell>{q.value || '（空）'}</Cell>
                    </Row>
                  )}
                </TableBody>
              </TableView>
            </>
          ),
        }
      : parsed
    : coded && (coded.ok ? { ok: true, value: <Pre>{coded.value}</Pre> } : coded);
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.url(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="https://example.com/path?q=1"
      copyText={coded?.ok ? coded.value : undefined}
      result={result}
      settings={
        <>
          <Choice label="操作" value={s.mode} onChange={(mode) => set({ mode })}
            options={[['parse', '分解'], ['encode', 'エンコード'], ['decode', 'デコード']]} />
          {s.mode === 'decode' && (
            <Checkbox isSelected={s.plusAsSpace} onChange={(plusAsSpace) => set({ plusAsSpace })}>「+」を空白として扱う</Checkbox>
          )}
        </>
      }
    />
  );
}

function RegexTool() {
  const [s, set] = useToolState('regex');
  const r = s.input && s.pattern ? testRegex(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.regex(s), pattern: REGEX_SAMPLE_PATTERN })}
      input={s.input} onInput={(input) => set({ input })} placeholder="照合する文字列"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <>
            <Highlight segments={r.value.segments}
              style={{ fontFamily: MONO, fontSize: 13, padding: 16, background: 'rgb(243 243 243)', borderRadius: 8 }}
              markStyle={{ background: 'rgb(255 226 46)', color: 'inherit' }} />
            <Heading level={4} UNSAFE_style={{ margin: 0 }}>一致（{r.value.matches.length}{r.value.truncated ? '+' : ''}）</Heading>
            <TableView aria-label="一致" density="compact" overflowMode="wrap">
              <TableHeader>
                <Column isRowHeader width={48}>#</Column>
                <Column width={64}>位置</Column>
                <Column>一致した文字列</Column>
                <Column>グループ</Column>
              </TableHeader>
              <TableBody items={r.value.matches.map((m, i) => ({ id: i + 1, index: m.index, text: m.text, groups: m.groups }))}
                renderEmptyState={() => '一致する箇所はありません'}>
                {(m) => (
                  <Row>
                    <Cell>{m.id}</Cell>
                    <Cell>{m.index}</Cell>
                    <Cell>{m.text || '（空）'}</Cell>
                    <Cell>{groupsText(m.groups) || '-'}</Cell>
                  </Row>
                )}
              </TableBody>
            </TableView>
          </>
        ),
      } : r)}
      settings={
        <>
          <TextField label="正規表現" description="/ で囲まずに書きます" value={s.pattern} onChange={(pattern) => set({ pattern })}
            placeholder="\\d+" UNSAFE_style={{ width: '100%' }} />
          <CheckboxGroup label="フラグ" orientation="horizontal" value={[...s.flags]}
            onChange={(v) => set({ flags: REGEX_FLAGS.map((f) => f.flag).filter((f) => v.includes(f)).join('') })}>
            {REGEX_FLAGS.map((f) => <Checkbox key={f.flag} value={f.flag}>{f.label}</Checkbox>)}
          </CheckboxGroup>
        </>
      }
    />
  );
}

function CsvTool() {
  const [s, set] = useToolState('csv');
  const r = s.input.trim() ? convertCsv(s.input, s) : null;
  // 列数が入力次第なので、TableView の columns を使った動的な組み方にする
  const columns = r?.ok ? r.value.grid.columns.map((name, i) => ({ id: `c${i}`, i, name })) : []; // ID に 0 を使うと列が認識されない
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.csv(s) })} input={s.input} onInput={(input) => set({ input })}
      placeholder={s.mode === 'csv2json' ? 'name,age\nアリス,30' : '[{"name": "アリス", "age": 30}]'}
      copyText={r?.ok ? r.value.text : undefined}
      result={r && (r.ok ? {
        ok: true,
        value: (
          <>
            <Heading level={4} UNSAFE_style={{ margin: 0 }}>表（{r.value.grid.rows.length} 行）</Heading>
            {r.value.grid.rows.length > PREVIEW_ROWS && <Text UNSAFE_style={muted}>先頭 {PREVIEW_ROWS} 行を表示しています</Text>}
            <TableView aria-label="変換結果の表" density="compact" overflowMode="wrap" UNSAFE_style={{ maxHeight: 400 }}>
              <TableHeader columns={columns}>
                {(c) => <Column id={c.id} isRowHeader={c.i === 0}>{c.name}</Column>}
              </TableHeader>
              <TableBody items={gridRows(r.value.grid.rows)}>
                {(row) => <Row columns={columns}>{(c) => <Cell>{row.cells[c.i]}</Cell>}</Row>}
              </TableBody>
            </TableView>
            <Pre>{r.value.text}</Pre>
          </>
        ),
      } : r)}
      settings={
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
            <Choice label="変換" value={s.mode} onChange={(mode) => set({ mode })} options={[['csv2json', 'CSV → JSON'], ['json2csv', 'JSON → CSV']]} />
            <Choice label="区切り文字" value={s.delimiter} onChange={(delimiter) => set({ delimiter })} options={DELIMITERS} />
          </div>
          <Checkbox isSelected={s.header} onChange={(header) => set({ header })}>1 行目を見出しにする</Checkbox>
        </>
      }
    />
  );
}

const JWT_LIGHT = { success: 'positive', error: 'negative', warning: 'notice', info: 'informative' } as const;

function JwtTool() {
  const [s, set] = useToolState('jwt');
  const r = s.input.trim() ? decodeJwt(s.input, defaultTimeZone()) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.jwt(s) })} input={s.input} onInput={(input) => set({ input })}
      placeholder="eyJhbGciOi…（先頭の Bearer は付けたままで構いません）"
      copyText={r?.ok ? r.value.payload : undefined}
      result={r && (r.ok ? {
        ok: true,
        value: (
          <>
            <StatusLight variant={JWT_LIGHT[JWT_STATUS[r.value.status].tone]}>{JWT_STATUS[r.value.status].label}</StatusLight>
            {r.value.times.length > 0 && <Pairs items={r.value.times.map((t) => ({ label: t.label, value: `${t.local}（${t.relative}）` }))} />}
            <Heading level={4} UNSAFE_style={{ margin: 0 }}>ヘッダー</Heading>
            <Pre>{r.value.header}</Pre>
            <Heading level={4} UNSAFE_style={{ margin: 0 }}>ペイロード</Heading>
            <Pre>{r.value.payload}</Pre>
          </>
        ),
      } : r)}
      settings={<Text UNSAFE_style={{ ...muted, fontSize: 12 }}>署名は検証しません。トークンはブラウザの外に送信されません。</Text>}
    />
  );
}

function Base64Tool() {
  const [s, set] = useToolState('base64');
  const r = s.input ? convertBase64(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.base64(s) })} input={s.input} onInput={(input) => set({ input })}
      placeholder={s.mode === 'encode' ? 'エンコードする文字列' : 'デコードする Base64'}
      copyText={r?.ok ? r.value : undefined}
      result={r && (r.ok ? { ok: true, value: <Pre>{r.value}</Pre> } : r)}
      settings={
        <>
          <Choice label="操作" value={s.mode} onChange={(mode) => set({ mode })} options={[['encode', 'エンコード'], ['decode', 'デコード']]} />
          {s.mode === 'encode' && (
            <div>
              <Switch isSelected={s.urlSafe} onChange={(urlSafe) => set({ urlSafe })}>URL-safe</Switch>
              <Text UNSAFE_style={{ ...muted, display: 'block', fontSize: 12 }}>+ / を - _ に置き換え、末尾の = を省きます</Text>
            </div>
          )}
        </>
      }
    />
  );
}

function CountTool() {
  const [s, set] = useToolState('count');
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.count(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="数える文字列"
      result={s.input ? {
        ok: true,
        value: (
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
            {countText(s.input).map((c) => (
              <div key={c.label}>
                <dt><Text UNSAFE_style={{ ...muted, fontSize: 12 }}>{c.label}</Text></dt>
                <dd style={{ margin: 0 }}>
                  <Heading level={4} UNSAFE_style={{ margin: 0, fontSize: 24 }}>{c.value.toLocaleString()}</Heading>
                  {c.hint && <Text UNSAFE_style={{ ...muted, fontSize: 12 }}>{c.hint}</Text>}
                </dd>
              </div>
            ))}
          </dl>
        ),
      } : null}
      settings={null}
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
