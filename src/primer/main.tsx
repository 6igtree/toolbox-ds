import { useId, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@primer/primitives/dist/css/primitives.css';
import '@primer/primitives/dist/css/functional/themes/light.css';
import {
  ActionList, ActionMenu, Banner, BaseStyles, Label, Button, Checkbox, CheckboxGroup, FormControl, IconButton, NavList, PageHeader,
  PageLayout, SegmentedControl, Select, Stack, Text, TextInput, Textarea, ThemeProvider,
} from '@primer/react';
import { DataTable, Table } from '@primer/react/experimental';
import { CheckIcon, CopyIcon, ToolsIcon } from '@primer/octicons-react';
import {
  convertBase64, countText, decodeJwt, defaultTimeZone, JWT_STATUS, DELIMITERS, PREVIEW_ROWS, REGEX_FLAGS, REGEX_SAMPLE_PATTERN, SAMPLES, TOOLS, UIS, convertCsv, convertDatetime, convertJson, copy,
  currentTool, decodeUrl, encodeUrl, gridRows, groupsText, href, parseUrl, testRegex, timeZones, toggleFlag, useToolState,
  type Result,
} from '../shared/app.ts';
import { Highlight } from '../shared/Highlight.tsx';

const tool = currentTool();

function App() {
  return (
    <ThemeProvider colorMode="light">
      <BaseStyles>
        {/* ログイン後の github.com に近い明るいヘッダー。Primer React に該当部品がないので tokens で組む */}
        <header style={{
          display: 'flex', alignItems: 'center', gap: 'var(--base-size-8)',
          padding: 'var(--base-size-16)',
          background: 'var(--bgColor-inset)',
          borderBottom: 'var(--borderWidth-thin) solid var(--borderColor-muted)',
        }}>
          <a href={href('primer', 'json')} aria-label="Toolbox" style={{ display: 'flex', color: 'var(--fgColor-default)' }}>
            <ToolsIcon size={32} />
          </a>
          <nav aria-label="現在地" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 'var(--base-size-4)' }}>
            <a href={href('primer', 'json')} style={crumb}>Toolbox</a>
            <Text style={{ color: 'var(--fgColor-muted)' }}>/</Text>
            <a href={href('primer', tool.id)} aria-current="page" style={{ ...crumb, fontWeight: 'var(--base-text-weight-semibold)' }}>{tool.label}</a>
          </nav>
          <ActionMenu>
            <ActionMenu.Button aria-label="デザインシステムを切り替え">Primer</ActionMenu.Button>
            <ActionMenu.Overlay align="end">
              <ActionList selectionVariant="single">
                {UIS.map((u) => (
                  <ActionList.LinkItem key={u.id} href={href(u.id, tool.id)} active={u.id === 'primer'}>{u.label}</ActionList.LinkItem>
                ))}
              </ActionList>
            </ActionMenu.Overlay>
          </ActionMenu>
        </header>
        <PageLayout>
          <PageLayout.Pane position="start" aria-label="ツール">
            <NavList>
              {TOOLS.map((t) => (
                <NavList.Item key={t.id} href={href('primer', t.id)} aria-current={t.id === tool.id ? 'page' : undefined}>
                  {t.label}
                </NavList.Item>
              ))}
            </NavList>
          </PageLayout.Pane>
          <PageLayout.Content>
            <PageHeader>
              <PageHeader.TitleArea><PageHeader.Title as="h1">{tool.label}</PageHeader.Title></PageHeader.TitleArea>
              <PageHeader.Description><Text style={{ color: 'var(--fgColor-muted)' }}>{tool.description}</Text></PageHeader.Description>
            </PageHeader>
            <div style={{ marginTop: 'var(--base-size-24)' }}>
              {{ json: <JsonTool />, datetime: <DatetimeTool />, url: <UrlTool />, regex: <RegexTool />, csv: <CsvTool />, jwt: <JwtTool />, base64: <Base64Tool />, count: <CountTool /> }[tool.id]}
            </div>
          </PageLayout.Content>
        </PageLayout>
      </BaseStyles>
    </ThemeProvider>
  );
}

const crumb = {
  padding: 'var(--base-size-4) var(--base-size-8)', borderRadius: 'var(--borderRadius-medium)',
  color: 'var(--fgColor-default)', textDecoration: 'none', whiteSpace: 'nowrap' as const,
};
const box = {
  flex: 1,
  minWidth: 0,
  border: 'var(--borderWidth-thin) solid var(--borderColor-default)',
  borderRadius: 'var(--borderRadius-medium)',
};
const boxHeader = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--base-size-8)',
  padding: 'var(--base-size-8) var(--base-size-16)',
  background: 'var(--bgColor-muted)',
  borderBottom: 'var(--borderWidth-thin) solid var(--borderColor-default)',
  borderRadius: 'var(--borderRadius-medium) var(--borderRadius-medium) 0 0',
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const onClick = async () => {
    if (await copy(text)) {
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    }
  };
  if (label) return <IconButton size="small" variant="invisible" icon={done ? CheckIcon : CopyIcon} aria-label={done ? 'コピーしました' : `${label}をコピー`} onClick={onClick} />;
  return <Button size="small" leadingVisual={done ? CheckIcon : CopyIcon} onClick={onClick}>{done ? 'コピーしました' : 'コピー'}</Button>;
}

// SegmentedControl は FormControl に入らないので、見出しを aria-labelledby で結ぶ
function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div>
      <Text as="div" id={id} weight="semibold" size="medium" style={{ marginBottom: 'var(--base-size-4)' }}>{label}</Text>
      <SegmentedControl aria-labelledby={id} onChange={(i) => onChange(options[i][0])}>
        {options.map(([v, text]) => <SegmentedControl.Button key={v} selected={v === value}>{text}</SegmentedControl.Button>)}
      </SegmentedControl>
    </div>
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
    <Stack direction={{ narrow: 'vertical', regular: 'horizontal' }} gap="normal">
      <section style={box} aria-label="入力">
        <div style={boxHeader}>
          <Text weight="semibold">入力</Text>
          <Stack direction="horizontal" gap="condensed">
            <Button size="small" onClick={() => onSample()}>サンプル</Button>
            <Button size="small" onClick={() => onInput('')} disabled={!input}>クリア</Button>
          </Stack>
        </div>
        <Stack padding="normal" gap="normal">
          <FormControl>
            <FormControl.Label>入力</FormControl.Label>
            <Textarea block rows={12} value={input} onChange={(e) => onInput(e.target.value)} placeholder={placeholder} spellCheck={false}
              style={{ fontFamily: 'var(--fontStack-monospace)' }} />
          </FormControl>
          {settings}
        </Stack>
      </section>
      <section style={box} aria-label="結果">
        <div style={boxHeader}>
          <Text weight="semibold">結果</Text>
          {copyText !== undefined && <CopyButton text={copyText} />}
        </div>
        <Stack padding="normal">
          {result === null ? (
            <Text style={{ color: 'var(--fgColor-muted)' }}>入力すると結果がここに表示されます</Text>
          ) : result.ok ? (
            result.value
          ) : (
            <Banner variant="critical" title="変換できません" description={result.error} hideTitle={false} />
          )}
        </Stack>
      </section>
    </Stack>
  );
}

const Pre = ({ children }: { children: string }) => (
  <pre style={{
    margin: 0, padding: 'var(--base-size-16)', overflow: 'auto', maxHeight: '32rem',
    font: 'var(--text-codeBlock-shorthand)', background: 'var(--bgColor-muted)', borderRadius: 'var(--borderRadius-medium)',
  }}>{children}</pre>
);

function Pairs({ items }: { items: { label: string; value: string; copyable?: boolean }[] }) {
  return (
    <dl style={{ margin: 0, display: 'grid', gap: 'var(--base-size-12)' }}>
      {items.map((i) => (
        <div key={i.label}>
          <Text as="dt" size="small" style={{ color: 'var(--fgColor-muted)' }}>{i.label}</Text>
          <dd style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--base-size-4)' }}>
            <code style={{ font: 'var(--text-codeInline-shorthand)', wordBreak: 'break-all' }}>{i.value}</code>
            {i.copyable && <CopyButton text={i.value} label={i.label} />}
          </dd>
        </div>
      ))}
    </dl>
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
        <Stack direction="horizontal" gap="normal" wrap="wrap">
          <Segmented label="出力" value={s.mode} onChange={(mode) => set({ mode })} options={[['format', '整形'], ['minify', '圧縮']]} />
          {s.mode === 'format' && (
            <Segmented label="インデント" value={s.indent} onChange={(indent) => set({ indent })}
              options={[['2', '2 スペース'], ['4', '4 スペース'], ['tab', 'タブ']]} />
          )}
        </Stack>
      }
    />
  );
}

function DatetimeTool() {
  const [s, set] = useToolState('datetime');
  const zones = useMemo(timeZones, []);
  const r = s.input.trim() ? convertDatetime(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.datetime(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <Stack gap="normal">
            {r.value.warning && <Banner variant="warning" title="単位の確認" description={r.value.warning} />}
            <Pairs items={[
              { label: `日時（${s.timeZone}）`, value: r.value.local, copyable: true },
              { label: 'ISO 8601（UTC）', value: r.value.iso, copyable: true },
              { label: 'Unix 時刻（秒）', value: r.value.seconds, copyable: true },
              { label: 'Unix 時刻（ミリ秒）', value: r.value.millis, copyable: true },
            ]} />
          </Stack>
        ),
      } : r)}
      settings={
        <Stack gap="normal">
          <div>
            <Button onClick={() => set({ input: String(s.unit === 's' ? Math.floor(Date.now() / 1000) : Date.now()) })}>現在時刻</Button>
          </div>
          <Segmented label="数値の単位" value={s.unit} onChange={(unit) => set({ unit })} options={[['s', '秒'], ['ms', 'ミリ秒']]} />
          <FormControl>
            <FormControl.Label>タイムゾーン</FormControl.Label>
            <Select value={s.timeZone} onChange={(e) => set({ timeZone: e.target.value })}>
              {zones.map((z) => <Select.Option key={z} value={z}>{z}</Select.Option>)}
            </Select>
            <FormControl.Caption>結果の表示と、オフセットのない日時の解釈に使います</FormControl.Caption>
          </FormControl>
        </Stack>
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
            <Stack gap="spacious">
              <Pairs items={parsed.value.fields} />
              <Table.Container>
                <Table.Title as="h2" id="query-title">クエリパラメーター（{parsed.value.query.length}）</Table.Title>
                {parsed.value.query.length === 0 ? (
                  <Text style={{ color: 'var(--fgColor-muted)' }}>クエリパラメーターはありません</Text>
                ) : (
                  <DataTable
                    aria-labelledby="query-title"
                    data={parsed.value.query.map((q, i) => ({ id: i, ...q }))}
                    columns={[
                      { header: 'キー', field: 'key', rowHeader: true },
                      { header: '値（デコード済み）', field: 'value', renderCell: (q) => q.value || <Text style={{ color: 'var(--fgColor-muted)' }}>（空）</Text> },
                    ]}
                  />
                )}
              </Table.Container>
            </Stack>
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
        <Stack gap="normal">
          <Segmented label="操作" value={s.mode} onChange={(mode) => set({ mode })}
            options={[['parse', '分解'], ['encode', 'エンコード'], ['decode', 'デコード']]} />
          {s.mode === 'decode' && (
            <FormControl>
              <Checkbox checked={s.plusAsSpace} onChange={(e) => set({ plusAsSpace: e.target.checked })} />
              <FormControl.Label>「+」を空白として扱う</FormControl.Label>
            </FormControl>
          )}
        </Stack>
      }
    />
  );
}

const muted = { color: 'var(--fgColor-muted)' };

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
          <Stack gap="normal">
            <Highlight segments={r.value.segments}
              style={{ font: 'var(--text-codeBlock-shorthand)', padding: 'var(--base-size-16)', background: 'var(--bgColor-muted)', borderRadius: 'var(--borderRadius-medium)' }}
              markStyle={{ background: 'var(--bgColor-attention-muted)', boxShadow: '0 0 0 1px var(--borderColor-attention-emphasis)', color: 'inherit' }} />
            <Table.Container>
              <Table.Title as="h2" id="match-title">一致（{r.value.matches.length}{r.value.truncated ? '+' : ''}）</Table.Title>
              {r.value.matches.length === 0 ? (
                <Text style={muted}>一致する箇所はありません</Text>
              ) : (
                <DataTable
                  aria-labelledby="match-title"
                  data={r.value.matches.map((m, i) => ({ id: i + 1, ...m }))}
                  columns={[
                    { header: '#', field: 'id', rowHeader: true, width: 'auto' },
                    { header: '位置', field: 'index', width: 'auto' },
                    { header: '一致した文字列', field: 'text', width: 'growCollapse', renderCell: (m) => <code style={{ font: 'var(--text-codeInline-shorthand)', wordBreak: 'break-all' }}>{m.text || '（空）'}</code> },
                    { header: 'グループ', field: 'groups', width: 'growCollapse', renderCell: (m) => <span style={{ wordBreak: 'break-all' }}>{groupsText(m.groups) || '-'}</span> },
                  ]}
                />
              )}
            </Table.Container>
          </Stack>
        ),
      } : r)}
      settings={
        <Stack gap="normal">
          <FormControl>
            <FormControl.Label>正規表現</FormControl.Label>
            <TextInput block value={s.pattern} onChange={(e) => set({ pattern: e.target.value })} placeholder="\\d+" spellCheck={false}
              style={{ fontFamily: 'var(--fontStack-monospace)' }} />
            <FormControl.Caption>/ で囲まずに書きます</FormControl.Caption>
          </FormControl>
          <CheckboxGroup>
            <CheckboxGroup.Label>フラグ</CheckboxGroup.Label>
            {REGEX_FLAGS.map((f) => (
              <FormControl key={f.flag}>
                <Checkbox checked={s.flags.includes(f.flag)} onChange={() => set({ flags: toggleFlag(s.flags, f.flag) })} />
                <FormControl.Label>{f.label}</FormControl.Label>
              </FormControl>
            ))}
          </CheckboxGroup>
        </Stack>
      }
    />
  );
}

function CsvTool() {
  const [s, set] = useToolState('csv');
  const r = s.input.trim() ? convertCsv(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.csv(s) })} input={s.input} onInput={(input) => set({ input })}
      placeholder={s.mode === 'csv2json' ? 'name,age\nアリス,30' : '[{"name": "アリス", "age": 30}]'}
      copyText={r?.ok ? r.value.text : undefined}
      result={r && (r.ok ? {
        ok: true,
        value: (
          <Stack gap="normal">
            <Table.Container>
              <Table.Title as="h2" id="grid-title">表（{r.value.grid.rows.length} 行）</Table.Title>
              {r.value.grid.rows.length > PREVIEW_ROWS && <Table.Subtitle as="p" id="grid-sub">先頭 {PREVIEW_ROWS} 行を表示しています</Table.Subtitle>}
              <DataTable
                aria-labelledby="grid-title"
                data={gridRows(r.value.grid.rows)}
                columns={r.value.grid.columns.map((c, i) => ({ id: String(i), header: c, renderCell: (row: { cells: string[] }) => row.cells[i] }))}
              />
            </Table.Container>
            <Pre>{r.value.text}</Pre>
          </Stack>
        ),
      } : r)}
      settings={
        <Stack gap="normal">
          <Stack direction="horizontal" gap="normal" wrap="wrap">
            <Segmented label="変換" value={s.mode} onChange={(mode) => set({ mode })} options={[['csv2json', 'CSV → JSON'], ['json2csv', 'JSON → CSV']]} />
            <Segmented label="区切り文字" value={s.delimiter} onChange={(delimiter) => set({ delimiter })} options={DELIMITERS} />
          </Stack>
          <FormControl>
            <Checkbox checked={s.header} onChange={(e) => set({ header: e.target.checked })} />
            <FormControl.Label>1 行目を見出しにする</FormControl.Label>
          </FormControl>
        </Stack>
      }
    />
  );
}

const JWT_LABEL = { success: 'success', error: 'danger', warning: 'attention', info: 'accent' } as const;

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
          <Stack gap="normal">
            <div><Label size="large" variant={JWT_LABEL[JWT_STATUS[r.value.status].tone]}>{JWT_STATUS[r.value.status].label}</Label></div>
            {r.value.times.length > 0 && <Pairs items={r.value.times.map((t) => ({ label: t.label, value: `${t.local}（${t.relative}）` }))} />}
            <div><Text as="div" weight="semibold" style={{ marginBottom: 'var(--base-size-4)' }}>ヘッダー</Text><Pre>{r.value.header}</Pre></div>
            <div><Text as="div" weight="semibold" style={{ marginBottom: 'var(--base-size-4)' }}>ペイロード</Text><Pre>{r.value.payload}</Pre></div>
          </Stack>
        ),
      } : r)}
      settings={<Text size="small" style={muted}>署名は検証しません。トークンはブラウザの外に送信されません。</Text>}
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
        <Stack gap="normal">
          <Segmented label="操作" value={s.mode} onChange={(mode) => set({ mode })} options={[['encode', 'エンコード'], ['decode', 'デコード']]} />
          {s.mode === 'encode' && (
            <FormControl>
              <Checkbox checked={s.urlSafe} onChange={(e) => set({ urlSafe: e.target.checked })} />
              <FormControl.Label>URL-safe</FormControl.Label>
              <FormControl.Caption>+ / を - _ に置き換え、末尾の = を省きます</FormControl.Caption>
            </FormControl>
          )}
        </Stack>
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
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--base-size-16)' }}>
            {countText(s.input).map((c) => (
              <div key={c.label}>
                <Text as="dt" size="small" style={muted}>{c.label}</Text>
                <dd style={{ margin: 0 }}>
                  <Text as="div" size="large" weight="semibold" style={{ fontSize: 'var(--text-title-size-medium)' }}>{c.value.toLocaleString()}</Text>
                  {c.hint && <Text as="div" size="small" style={muted}>{c.hint}</Text>}
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
