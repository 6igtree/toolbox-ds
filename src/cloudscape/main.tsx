import { useMemo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@cloudscape-design/global-styles/index.css';
import { I18nProvider } from '@cloudscape-design/components/i18n';
import messages from '@cloudscape-design/components/i18n/messages/all.ja';
import Alert from '@cloudscape-design/components/alert';
import AppLayout from '@cloudscape-design/components/app-layout';
import Box from '@cloudscape-design/components/box';
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
import Toggle from '@cloudscape-design/components/toggle';
import TopNavigation from '@cloudscape-design/components/top-navigation';
import {
  SAMPLES, TOOLS, UIS, convertDatetime, convertJson, currentTool, decodeUrl, encodeUrl, href, parseUrl, timeZones,
  useToolState, type Result,
} from '../shared/app.ts';

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
            {tool.id === 'json' ? <JsonTool /> : tool.id === 'datetime' ? <DatetimeTool /> : <UrlTool />}
          </ContentLayout>
        }
      />
    </I18nProvider>
  );
}

// 入力欄・設定・結果の並びは全ツール共通
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
    <ColumnLayout columns={2}>
      <Container header={<Header variant="h2" actions={
        <SpaceBetween direction="horizontal" size="xs">
          <Button onClick={() => onInput(sample)}>サンプル</Button>
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
      sample={SAMPLES.json(s)} input={s.input} onInput={(input) => set({ input })} placeholder='{"key": "value"}'
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
      sample={SAMPLES.datetime(s)} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
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
      sample={SAMPLES.url(s)} input={s.input} onInput={(input) => set({ input })} placeholder="https://example.com/path?q=1"
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

createRoot(document.getElementById('root')!).render(<App />);
