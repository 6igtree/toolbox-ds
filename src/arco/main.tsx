import '@arco-design/web-react/es/_util/react-19-adapter';
import { useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@arco-design/web-react/dist/css/arco.css';
import {
  Alert, Breadcrumb, Button, Card, Checkbox, ConfigProvider, Descriptions, Dropdown, Empty, Form, Grid, Input, Layout as ArcoLayout, Menu,
  Message, Radio, Select, Space, Statistic, Table, Tag, Typography,
} from '@arco-design/web-react';
import jaJP from '@arco-design/web-react/es/locale/ja-JP';
import {
  IconClockCircle, IconCode, IconCopy, IconDown, IconFontColors, IconLink, IconLock, IconNav, IconSearch, IconSwap, IconTool,
} from '@arco-design/web-react/icon';
import {
  convertBase64, countText, decodeJwt, defaultTimeZone, JWT_STATUS, DELIMITERS, PREVIEW_ROWS, REGEX_FLAGS, REGEX_SAMPLE_PATTERN, SAMPLES,
  TOOLS, UIS, convertCsv, convertDatetime, convertJson, copy, currentTool, decodeUrl, encodeUrl, gridRows, groupsText, href, parseUrl,
  testRegex, timeZones, useToolState, type Result,
} from '../shared/app.ts';
import { Highlight } from '../shared/Highlight.tsx';

const tool = currentTool();
const ICONS = {
  json: <IconCode />, datetime: <IconClockCircle />, url: <IconLink />, regex: <IconSearch />, csv: <IconNav />,
  jwt: <IconLock />, base64: <IconSwap />, count: <IconFontColors />,
};
const { Title, Text } = Typography;
const { Row, Col } = Grid;
const MONO = "Menlo, Consolas, 'Courier New', monospace";
const MUTED = 'var(--color-text-3)';

function App() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <ArcoLayout style={{ minHeight: '100vh' }}>
      <ArcoLayout.Header style={{
        display: 'flex', alignItems: 'center', gap: 12, height: 60, padding: '0 20px',
        background: 'var(--color-bg-2)', borderBottom: '1px solid var(--color-border)',
      }}>
        <a href={href('arco', 'json')} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, color: 'var(--color-text-1)', fontSize: 18, fontWeight: 600, textDecoration: 'none' }}>
          <IconTool style={{ color: 'rgb(var(--primary-6))' }} /> Toolbox
        </a>
        <Dropdown
          position="br"
          droplist={
            <Menu selectedKeys={['arco']}>
              {UIS.map((u) => <Menu.Item key={u.id} onClick={() => location.assign(href(u.id, tool.id))}>{u.label}</Menu.Item>)}
            </Menu>
          }
        >
          <Button type="text" aria-label="デザインシステムを切り替え">Arco Design <IconDown /></Button>
        </Dropdown>
      </ArcoLayout.Header>
      <ArcoLayout>
        <ArcoLayout.Sider width={220} breakpoint="lg" collapsible collapsed={collapsed} onCollapse={setCollapsed} collapsedWidth={56}>
          <Menu selectedKeys={[tool.id]} style={{ height: '100%' }}>
            {TOOLS.map((t) => (
              <Menu.Item key={t.id} onClick={() => location.assign(href('arco', t.id))}>{ICONS[t.id]}{t.label}</Menu.Item>
            ))}
          </Menu>
        </ArcoLayout.Sider>
        <ArcoLayout.Content style={{ padding: '16px 24px 24px', minWidth: 0, background: 'var(--color-fill-2)' }}>
          <Breadcrumb>
            <Breadcrumb.Item key="top" href={href('arco', 'json')}>Toolbox</Breadcrumb.Item>
            <Breadcrumb.Item key="tool">{tool.label}</Breadcrumb.Item>
          </Breadcrumb>
          <Title heading={4} style={{ marginTop: 16, marginBottom: 4 }}>{tool.label}</Title>
          <Text type="secondary">{tool.description}</Text>
          <div style={{ marginTop: 20 }}>
            {{ json: <JsonTool />, datetime: <DatetimeTool />, url: <UrlTool />, regex: <RegexTool />, csv: <CsvTool />, jwt: <JwtTool />, base64: <Base64Tool />, count: <CountTool /> }[tool.id]}
          </div>
        </ArcoLayout.Content>
      </ArcoLayout>
    </ArcoLayout>
  );
}

async function copyWithMessage(text: string) {
  if (await copy(text)) Message.success('コピーしました');
  else Message.error('コピーできませんでした');
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
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}>
        <Card title="入力" bordered={false} extra={
          <Space>
            <Button onClick={onSample}>サンプル</Button>
            <Button onClick={() => onInput('')} disabled={!input}>クリア</Button>
          </Space>
        }>
          <Form layout="vertical">
            {/* field を付けると Form が値を管理し、value が無視される */}
            <Form.Item label="入力">
              <Input.TextArea id="tool-input" value={input} onChange={onInput} placeholder={placeholder}
                autoSize={{ minRows: 12, maxRows: 24 }} spellCheck={false} style={{ fontFamily: MONO }} />
            </Form.Item>
            {settings}
          </Form>
        </Card>
      </Col>
      <Col xs={24} xl={12}>
        <Card title="結果" bordered={false} extra={copyText !== undefined &&
          <Button icon={<IconCopy />} onClick={() => copyWithMessage(copyText)}>コピー</Button>
        }>
          {result === null ? (
            <Empty description="入力すると結果がここに表示されます" />
          ) : result.ok ? (
            result.value
          ) : (
            <Alert type="error" title="変換できません" content={result.error} />
          )}
        </Card>
      </Col>
    </Row>
  );
}

const Pre = ({ children }: { children: string }) => (
  <pre style={{
    margin: 0, padding: 12, overflow: 'auto', maxHeight: '32rem', fontFamily: MONO, fontSize: 13,
    background: 'var(--color-fill-2)', borderRadius: 'var(--border-radius-medium)',
  }}>{children}</pre>
);

// Radio.Group の button 型が Arco のセグメント切り替え
function Choice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <Form.Item label={label}>
      <Radio.Group type="button" value={value} onChange={onChange} options={options.map(([v, l]) => ({ value: v, label: l }))} />
    </Form.Item>
  );
}

const descData = (items: { label: string; value: ReactNode }[]) => items.map((i) => ({ label: i.label, value: i.value }));

function JsonTool() {
  const [s, set] = useToolState('json');
  const r = s.input.trim() ? convertJson(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.json(s) })} input={s.input} onInput={(input) => set({ input })} placeholder='{"key": "value"}'
      copyText={r?.ok ? r.value : undefined}
      result={r && (r.ok ? { ok: true, value: <Pre>{r.value}</Pre> } : r)}
      settings={
        <Space size="large" wrap align="start">
          <Choice label="出力" value={s.mode} onChange={(mode) => set({ mode })} options={[['format', '整形'], ['minify', '圧縮']]} />
          {s.mode === 'format' && (
            <Choice label="インデント" value={s.indent} onChange={(indent) => set({ indent })}
              options={[['2', '2 スペース'], ['4', '4 スペース'], ['tab', 'タブ']]} />
          )}
        </Space>
      }
    />
  );
}

function DatetimeTool() {
  const [s, set] = useToolState('datetime');
  const zones = useMemo(() => timeZones().map((z) => ({ value: z, label: z })), []);
  const r = s.input.trim() ? convertDatetime(s.input, s) : null;
  const item = (label: string, value: string) => ({
    label, value: <Text copyable={{ text: value }} style={{ fontFamily: MONO }}>{value}</Text>,
  });
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.datetime(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <Space direction="vertical" size="medium" style={{ width: '100%' }}>
            {r.value.warning && <Alert type="warning" content={r.value.warning} />}
            <Descriptions column={1} border size="small" data={[
              item(`日時（${s.timeZone}）`, r.value.local),
              item('ISO 8601（UTC）', r.value.iso),
              item('Unix 時刻（秒）', r.value.seconds),
              item('Unix 時刻（ミリ秒）', r.value.millis),
            ]} />
          </Space>
        ),
      } : r)}
      settings={
        <>
          <Form.Item>
            <Button onClick={() => set({ input: String(s.unit === 's' ? Math.floor(Date.now() / 1000) : Date.now()) })}>現在時刻</Button>
          </Form.Item>
          <Choice label="数値の単位" value={s.unit} onChange={(unit) => set({ unit })} options={[['s', '秒'], ['ms', 'ミリ秒']]} />
          <Form.Item label="タイムゾーン" extra="結果の表示と、オフセットのない日時の解釈に使います" style={{ marginBottom: 0 }}>
            <Select showSearch value={s.timeZone} options={zones} onChange={(timeZone: string) => set({ timeZone })} />
          </Form.Item>
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
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Descriptions column={1} border size="small"
                data={descData(parsed.value.fields.map((f) => ({ label: f.label, value: <Text style={{ fontFamily: MONO, wordBreak: 'break-all' }}>{f.value}</Text> })))} />
              <Text bold>クエリパラメーター（{parsed.value.query.length}）</Text>
              <Table
                size="small"
                pagination={false}
                rowKey="id"
                data={parsed.value.query.map((q, i) => ({ id: i, ...q }))}
                columns={[
                  { title: 'キー', dataIndex: 'key' },
                  { title: '値（デコード済み）', dataIndex: 'value', render: (v: string) => v || <Text type="secondary">（空）</Text> },
                ]}
                noDataElement={<Empty description="クエリパラメーターはありません" />}
              />
            </Space>
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
            <Checkbox checked={s.plusAsSpace} onChange={(plusAsSpace) => set({ plusAsSpace })}>「+」を空白として扱う</Checkbox>
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
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Highlight segments={r.value.segments}
              style={{ fontFamily: MONO, fontSize: 13, padding: 12, background: 'var(--color-fill-2)', borderRadius: 'var(--border-radius-medium)' }}
              markStyle={{ background: 'rgb(var(--orange-2))', boxShadow: '0 0 0 1px rgb(var(--orange-4))', color: 'inherit' }} />
            <Text bold>一致（{r.value.matches.length}{r.value.truncated ? '+' : ''}）</Text>
            <Table
              size="small"
              pagination={false}
              rowKey="n"
              scroll={{ x: 'max-content' }}
              data={r.value.matches.map((m, i) => ({ n: i + 1, ...m }))}
              columns={[
                { title: '#', dataIndex: 'n', width: 48 },
                { title: '位置', dataIndex: 'index', width: 64 },
                { title: '一致した文字列', dataIndex: 'text', render: (v: string) => <Text code>{v || '（空）'}</Text> },
                { title: 'グループ', dataIndex: 'groups', render: (g: Parameters<typeof groupsText>[0]) => groupsText(g) || '-' },
              ]}
              noDataElement={<Empty description="一致する箇所はありません" />}
            />
          </Space>
        ),
      } : r)}
      settings={
        <>
          <Form.Item label="正規表現" extra="/ で囲まずに書きます">
            <Input value={s.pattern} onChange={(pattern) => set({ pattern })} placeholder="\d+" spellCheck={false} style={{ fontFamily: MONO }} />
          </Form.Item>
          <Form.Item label="フラグ" style={{ marginBottom: 0 }}>
            <Checkbox.Group
              value={[...s.flags]}
              onChange={(v: string[]) => set({ flags: REGEX_FLAGS.map((f) => f.flag).filter((f) => v.includes(f)).join('') })}
              options={REGEX_FLAGS.map((f) => ({ value: f.flag, label: f.label }))}
            />
          </Form.Item>
        </>
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
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Text bold>表（{r.value.grid.rows.length} 行）{r.value.grid.rows.length > PREVIEW_ROWS && <Text type="secondary"> 先頭 {PREVIEW_ROWS} 行を表示</Text>}</Text>
            <Table
              size="small"
              border
              pagination={false}
              rowKey="id"
              scroll={{ x: 'max-content' }}
              data={gridRows(r.value.grid.rows)}
              columns={r.value.grid.columns.map((c, i) => ({ title: c, key: String(i), render: (_: unknown, row: { cells: string[] }) => row.cells[i] }))}
            />
            <Pre>{r.value.text}</Pre>
          </Space>
        ),
      } : r)}
      settings={
        <>
          <Space size="large" wrap align="start">
            <Choice label="変換" value={s.mode} onChange={(mode) => set({ mode })} options={[['csv2json', 'CSV → JSON'], ['json2csv', 'JSON → CSV']]} />
            <Choice label="区切り文字" value={s.delimiter} onChange={(delimiter) => set({ delimiter })} options={DELIMITERS} />
          </Space>
          <Checkbox checked={s.header} onChange={(header) => set({ header })}>1 行目を見出しにする</Checkbox>
        </>
      }
    />
  );
}

const JWT_TAG = { success: 'green', error: 'red', warning: 'orange', info: 'arcoblue' } as const;

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
          <Space direction="vertical" size="medium" style={{ width: '100%' }}>
            <Tag size="large" color={JWT_TAG[JWT_STATUS[r.value.status].tone]}>{JWT_STATUS[r.value.status].label}</Tag>
            {r.value.times.length > 0 && (
              <Descriptions column={1} border size="small"
                data={r.value.times.map((t) => ({ label: t.label, value: <>{t.local}<Text type="secondary">（{t.relative}）</Text></> }))} />
            )}
            <Text bold>ヘッダー</Text>
            <Pre>{r.value.header}</Pre>
            <Text bold>ペイロード</Text>
            <Pre>{r.value.payload}</Pre>
          </Space>
        ),
      } : r)}
      settings={<Text type="secondary">署名は検証しません。トークンはブラウザの外に送信されません。</Text>}
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
            <Form.Item extra="+ / を - _ に置き換え、末尾の = を省きます" style={{ marginBottom: 0 }}>
              <Checkbox checked={s.urlSafe} onChange={(urlSafe) => set({ urlSafe })}>URL-safe</Checkbox>
            </Form.Item>
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
          <Row gutter={[16, 24]}>
            {countText(s.input).map((c) => (
              <Col key={c.label} xs={12} md={8} xl={12} xxl={8}>
                <Statistic title={c.label} value={c.value} groupSeparator />
                {c.hint && <Text style={{ fontSize: 12, color: MUTED, display: 'block' }}>{c.hint}</Text>}
              </Col>
            ))}
          </Row>
        ),
      } : null}
      settings={null}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <ConfigProvider locale={jaJP}>
    <App />
  </ConfigProvider>,
);
