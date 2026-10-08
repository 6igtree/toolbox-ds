import { useId, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@primer/primitives/dist/css/primitives.css';
import '@primer/primitives/dist/css/functional/themes/light.css';
import {
  ActionList, ActionMenu, Banner, BaseStyles, Button, Checkbox, FormControl, IconButton, NavList, PageHeader,
  PageLayout, SegmentedControl, Select, Stack, Text, Textarea, ThemeProvider,
} from '@primer/react';
import { DataTable, Table } from '@primer/react/experimental';
import { CheckIcon, CopyIcon, ToolsIcon } from '@primer/octicons-react';
import {
  SAMPLES, TOOLS, UIS, convertDatetime, convertJson, copy, currentTool, decodeUrl, encodeUrl, href, parseUrl, timeZones,
  useToolState, type Result,
} from '../shared/app.ts';

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
              {tool.id === 'json' ? <JsonTool /> : tool.id === 'datetime' ? <DatetimeTool /> : <UrlTool />}
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

function Layout({ sample, input, onInput, placeholder, settings, result, copyText }: {
  sample: string;
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
            <Button size="small" onClick={() => onInput(sample)}>サンプル</Button>
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
      sample={SAMPLES.json(s)} input={s.input} onInput={(input) => set({ input })} placeholder='{"key": "value"}'
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
      sample={SAMPLES.datetime(s)} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
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
      sample={SAMPLES.url(s)} input={s.input} onInput={(input) => set({ input })} placeholder="https://example.com/path?q=1"
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

createRoot(document.getElementById('root')!).render(<App />);
