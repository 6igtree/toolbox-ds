import { useMemo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@cloudscape-design/global-styles/index.css';
import { I18nProvider } from '@cloudscape-design/components/i18n';
import messages from '@cloudscape-design/components/i18n/messages/all.ja';
import Alert from '@cloudscape-design/components/alert';
import AppLayout from '@cloudscape-design/components/app-layout';
import Box from '@cloudscape-design/components/box';
import Checkbox from '@cloudscape-design/components/checkbox';
import Input from '@cloudscape-design/components/input';
import BreadcrumbGroup from '@cloudscape-design/components/breadcrumb-group';
import Button from '@cloudscape-design/components/button';
import ColumnLayout from '@cloudscape-design/components/column-layout';
import Container from '@cloudscape-design/components/container';
import ContentLayout from '@cloudscape-design/components/content-layout';
import CopyToClipboard from '@cloudscape-design/components/copy-to-clipboard';
import FormField from '@cloudscape-design/components/form-field';
import Header from '@cloudscape-design/components/header';
import KeyValuePairs from '@cloudscape-design/components/key-value-pairs';
import SegmentedControl from '@cloudscape-design/components/segmented-control';
import Select from '@cloudscape-design/components/select';
import SideNavigation from '@cloudscape-design/components/side-navigation';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import Textarea from '@cloudscape-design/components/textarea';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import Toggle from '@cloudscape-design/components/toggle';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import {
  convertBase64, countText, decodeJwt, defaultTimeZone, JWT_STATUS, DELIMITERS, PREVIEW_ROWS, REGEX_FLAGS, REGEX_SAMPLE_PATTERN, SAMPLES, TOOLS, UIS, convertCsv, convertDatetime, convertJson,
  currentTool, decodeUrl, encodeUrl, gridRows, groupsText, href, parseUrl, testRegex, timeZones, toggleFlag, useToolState,
  type Result,
} from '../shared/app.ts';
import { Highlight } from '../shared/Highlight.tsx';

const tool = currentTool();

function App() {
  return (
    <I18nProvider locale="ja" messages={[messages]}>
      <div id="top-nav" style={{ position: 'sticky', top: 0, zIndex: 1002 }}>
        <TopNavigation
          identity={{ href: '/', title: 'Toolbox' }}
          utilities={[
            {
              type: 'menu-dropdown',
              text: 'Cloudscape',
              description: 'デザインシステムを切り替え',
              items: UIS.map((u) => ({ id: u.id, text: u.label, href: href(u.id, tool.id), disabled: u.id === 'cloudscape' })),
            },
          ]}
        />
      </div>
      <AppLayout
        headerSelector="#top-nav"
        toolsHide
        breadcrumbs={
          <BreadcrumbGroup items={[
            { text: 'Toolbox', href: href('cloudscape', 'json') },
            { text: tool.label, href: href('cloudscape', tool.id) },
          ]} />
        }
        navigation={
          <SideNavigation
            header={{ text: 'Toolbox', href: href('cloudscape', 'json') }}
            activeHref={href('cloudscape', tool.id)}
            items={TOOLS.map((t) => ({ type: 'link', text: t.label, href: href('cloudscape', t.id) }))}
          />
        }
        content={
          <ContentLayout header={<Header variant="h1" description={tool.description}>{tool.label}</Header>}>
            {{ json: <JsonTool />, datetime: <DatetimeTool />, url: <UrlTool />, regex: <RegexTool />, csv: <CsvTool />, jwt: <JwtTool />, base64: <Base64Tool />, count: <CountTool /> }[tool.id]}
          </ContentLayout>
        }
      />
    </I18nProvider>
  );
}

// 入力欄・設定・結果の並びは全ツール共通
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
    <ColumnLayout columns={2}>
      <Container header={<Header variant="h2" actions={
        <SpaceBetween direction="horizontal" size="xs">
          <Button onClick={() => onSample()}>サンプル</Button>
          <Button onClick={() => onInput('')} disabled={!input}>クリア</Button>
        </SpaceBetween>
      }>入力</Header>}>
        <SpaceBetween size="l">
          <FormField label="入力" stretch>
            <Textarea value={input} onChange={(e) => onInput(e.detail.value)} placeholder={placeholder} rows={12} spellcheck={false} />
          </FormField>
          {settings}
        </SpaceBetween>
      </Container>
      <Container header={<Header variant="h2" actions={copyText !== undefined &&
        <CopyToClipboard variant="button" textToCopy={copyText} copyButtonText="コピー" copySuccessText="コピーしました" copyErrorText="コピーできませんでした" />
      }>結果</Header>}>
        {result === null ? (
          <Box color="text-status-inactive">入力すると結果がここに表示されます</Box>
        ) : result.ok ? (
          result.value
        ) : (
          <Alert type="error" header="変換できません">{result.error}</Alert>
        )}
      </Container>
    </ColumnLayout>
  );
}

const Pre = ({ children }: { children: string }) => (
  <div style={{ overflow: 'auto', maxHeight: '32rem' }}><Box variant="pre">{children}</Box></div>
);

function JsonTool() {
  const [s, set] = useToolState('json');
  const r = s.input.trim() ? convertJson(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.json(s) })} input={s.input} onInput={(input) => set({ input })} placeholder='{"key": "value"}'
      copyText={r?.ok ? r.value : undefined}
      result={r && (r.ok ? { ok: true, value: <Pre>{r.value}</Pre> } : r)}
      settings={
        <SpaceBetween size="m" direction="horizontal">
          <FormField label="出力">
            <SegmentedControl selectedId={s.mode} onChange={(e) => set({ mode: e.detail.selectedId as 'format' })}
              options={[{ id: 'format', text: '整形' }, { id: 'minify', text: '圧縮' }]} />
          </FormField>
          {s.mode === 'format' && (
            <FormField label="インデント">
              <SegmentedControl selectedId={s.indent} onChange={(e) => set({ indent: e.detail.selectedId as '2' })}
                options={[{ id: '2', text: '2 スペース' }, { id: '4', text: '4 スペース' }, { id: 'tab', text: 'タブ' }]} />
            </FormField>
          )}
        </SpaceBetween>
      }
    />
  );
}

function DatetimeTool() {
  const [s, set] = useToolState('datetime');
  const zones = useMemo(() => timeZones().map((z) => ({ value: z, label: z })), []);
  const r = s.input.trim() ? convertDatetime(s.input, s) : null;
  const pair = (label: string, value: string) => ({
    label,
    value: <CopyToClipboard variant="inline" textToCopy={value} copySuccessText="コピーしました" copyErrorText="コピーできませんでした" />,
  });
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.datetime(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <SpaceBetween size="m">
            {r.value.warning && <Alert type="warning">{r.value.warning}</Alert>}
            <KeyValuePairs columns={1} items={[
              pair(`日時（${s.timeZone}）`, r.value.local),
              pair('ISO 8601（UTC）', r.value.iso),
              pair('Unix 時刻（秒）', r.value.seconds),
              pair('Unix 時刻（ミリ秒）', r.value.millis),
            ]} />
          </SpaceBetween>
        ),
      } : r)}
      settings={
        <SpaceBetween size="m">
          <Button onClick={() => set({ input: String(s.unit === 's' ? Math.floor(Date.now() / 1000) : Date.now()) })}>現在時刻</Button>
          <FormField label="数値の単位" description="数字だけの入力を Unix 時刻として扱うときの単位">
            <SegmentedControl selectedId={s.unit} onChange={(e) => set({ unit: e.detail.selectedId as 's' })}
              options={[{ id: 's', text: '秒' }, { id: 'ms', text: 'ミリ秒' }]} />
          </FormField>
          <FormField label="タイムゾーン" description="結果の表示と、オフセットのない日時の解釈に使います">
            <Select selectedOption={{ value: s.timeZone, label: s.timeZone }} options={zones} filteringType="auto"
              onChange={(e) => set({ timeZone: e.detail.selectedOption.value! })} />
          </FormField>
        </SpaceBetween>
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
            <SpaceBetween size="l">
              <KeyValuePairs columns={2} items={parsed.value.fields.map((f) => ({ label: f.label, value: f.value }))} />
              <Table
                variant="embedded"
                header={<Header variant="h3" counter={`(${parsed.value.query.length})`}>クエリパラメーター</Header>}
                items={parsed.value.query}
                columnDefinitions={[
                  { id: 'key', header: 'キー', cell: (q) => q.key },
                  { id: 'value', header: '値（デコード済み）', cell: (q) => q.value || <Box color="text-status-inactive">（空）</Box> },
                ]}
                empty={<Box textAlign="center" color="inherit">クエリパラメーターはありません</Box>}
              />
            </SpaceBetween>
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
        <SpaceBetween size="m">
          <FormField label="操作">
            <SegmentedControl selectedId={s.mode} onChange={(e) => set({ mode: e.detail.selectedId as 'parse' })}
              options={[{ id: 'parse', text: '分解' }, { id: 'encode', text: 'エンコード' }, { id: 'decode', text: 'デコード' }]} />
          </FormField>
          {s.mode === 'decode' && (
            <Toggle checked={s.plusAsSpace} onChange={(e) => set({ plusAsSpace: e.detail.checked })}>「+」を空白として扱う</Toggle>
          )}
        </SpaceBetween>
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
          <SpaceBetween size="l">
            <Highlight segments={r.value.segments} style={{ fontFamily: 'Monaco, Menlo, Consolas, monospace', fontSize: 14 }}
              markStyle={{ background: '#ffe347', color: 'inherit' }} />
            <Table
              variant="embedded"
              wrapLines
              header={<Header variant="h3" counter={`(${r.value.matches.length}${r.value.truncated ? '+' : ''})`}>一致</Header>}
              items={r.value.matches}
              columnDefinitions={[
                { id: 'n', header: '#', cell: (m) => r.value.matches.indexOf(m) + 1 },
                { id: 'index', header: '位置', cell: (m) => m.index },
                { id: 'text', header: '一致した文字列', cell: (m) => <Box variant="code">{m.text || '（空）'}</Box> },
                { id: 'groups', header: 'グループ', cell: (m) => groupsText(m.groups) || '-' },
              ]}
              empty={<Box textAlign="center" color="inherit">一致する箇所はありません</Box>}
            />
          </SpaceBetween>
        ),
      } : r)}
      settings={
        <SpaceBetween size="m">
          <FormField label="正規表現" description="/ で囲まずに書きます">
            <Input value={s.pattern} onChange={(e) => set({ pattern: e.detail.value })} placeholder="\\d+" spellcheck={false} />
          </FormField>
          <FormField label="フラグ">
            <SpaceBetween direction="horizontal" size="m">
              {REGEX_FLAGS.map((f) => (
                <Checkbox key={f.flag} checked={s.flags.includes(f.flag)} onChange={() => set({ flags: toggleFlag(s.flags, f.flag) })}>{f.label}</Checkbox>
              ))}
            </SpaceBetween>
          </FormField>
        </SpaceBetween>
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
          <SpaceBetween size="l">
            <Table
              variant="embedded"
              wrapLines
              header={<Header variant="h3" counter={`(${r.value.grid.rows.length})`}
                description={r.value.grid.rows.length > PREVIEW_ROWS ? `先頭 ${PREVIEW_ROWS} 行を表示しています` : undefined}>表</Header>}
              items={gridRows(r.value.grid.rows)}
              columnDefinitions={r.value.grid.columns.map((c, i) => ({ id: String(i), header: c, cell: (row: { cells: string[] }) => row.cells[i] }))}
              empty={<Box textAlign="center" color="inherit">行がありません</Box>}
            />
            <Pre>{r.value.text}</Pre>
          </SpaceBetween>
        ),
      } : r)}
      settings={
        <SpaceBetween size="m" direction="horizontal">
          <FormField label="変換">
            <SegmentedControl selectedId={s.mode} onChange={(e) => set({ mode: e.detail.selectedId as 'csv2json' })}
              options={[{ id: 'csv2json', text: 'CSV → JSON' }, { id: 'json2csv', text: 'JSON → CSV' }]} />
          </FormField>
          <FormField label="区切り文字">
            <SegmentedControl selectedId={s.delimiter} onChange={(e) => set({ delimiter: e.detail.selectedId as ',' })}
              options={DELIMITERS.map(([id, text]) => ({ id, text }))} />
          </FormField>
          <FormField label="見出し">
            <Checkbox checked={s.header} onChange={(e) => set({ header: e.detail.checked })}>1 行目を見出しにする</Checkbox>
          </FormField>
        </SpaceBetween>
      }
    />
  );
}

const JWT_TONE = { success: 'success', error: 'error', warning: 'warning', info: 'info' } as const;

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
          <SpaceBetween size="l">
            <StatusIndicator type={JWT_TONE[JWT_STATUS[r.value.status].tone]}>{JWT_STATUS[r.value.status].label}</StatusIndicator>
            {r.value.times.length > 0 && (
              <KeyValuePairs columns={1} items={r.value.times.map((t) => ({ label: t.label, value: `${t.local}（${t.relative}）` }))} />
            )}
            <SpaceBetween size="xs"><Box variant="awsui-key-label">ヘッダー</Box><Pre>{r.value.header}</Pre></SpaceBetween>
            <SpaceBetween size="xs"><Box variant="awsui-key-label">ペイロード</Box><Pre>{r.value.payload}</Pre></SpaceBetween>
          </SpaceBetween>
        ),
      } : r)}
      settings={<Box color="text-body-secondary" fontSize="body-s">署名は検証しません。トークンはブラウザの外に送信されません。</Box>}
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
        <SpaceBetween size="m">
          <FormField label="操作">
            <SegmentedControl selectedId={s.mode} onChange={(e) => set({ mode: e.detail.selectedId as 'encode' })}
              options={[{ id: 'encode', text: 'エンコード' }, { id: 'decode', text: 'デコード' }]} />
          </FormField>
          {s.mode === 'encode' && (
            <Toggle checked={s.urlSafe} onChange={(e) => set({ urlSafe: e.detail.checked })} description="+ / を - _ に置き換え、末尾の = を省きます">
              URL-safe
            </Toggle>
          )}
        </SpaceBetween>
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
          <KeyValuePairs columns={2} items={countText(s.input).map((c) => ({
            label: c.label,
            value: <><Box variant="h2" tagOverride="span">{c.value.toLocaleString()}</Box>{c.hint && <Box variant="small" display="block">{c.hint}</Box>}</>,
          }))} />
        ),
      } : null}
      settings={null}
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
