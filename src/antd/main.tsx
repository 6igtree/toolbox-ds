import { useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Alert, App as AntApp, Breadcrumb, Button, Card, Checkbox, Col, ConfigProvider, Descriptions, Dropdown, Empty, Flex, Form, Input,
  Layout as AntLayout, Menu, Row, Segmented, Select, Statistic, Table, Typography, theme,
} from 'antd';
import ja_JP from 'antd/locale/ja_JP';
import {
  ClockCircleOutlined, CodeOutlined, CopyOutlined, DownOutlined, FontSizeOutlined, KeyOutlined, LinkOutlined, SearchOutlined, SwapOutlined,
  TableOutlined, ToolOutlined,
} from '@ant-design/icons';
import {
  convertBase64, countText, decodeJwt, defaultTimeZone, JWT_STATUS, DELIMITERS, PREVIEW_ROWS, REGEX_FLAGS, REGEX_SAMPLE_PATTERN, SAMPLES, TOOLS, UIS, convertCsv, convertDatetime, convertJson, copy,
  currentTool, decodeUrl, encodeUrl, gridRows, groupsText, href, parseUrl, testRegex, timeZones, useToolState,
  type Result,
} from '../shared/app.ts';
import { Highlight } from '../shared/Highlight.tsx';

const tool = currentTool();
const ICONS = { json: <CodeOutlined />, datetime: <ClockCircleOutlined />, url: <LinkOutlined />, regex: <SearchOutlined />, csv: <TableOutlined />, jwt: <KeyOutlined />, base64: <SwapOutlined />, count: <FontSizeOutlined /> };
const { Title, Text } = Typography;
const MONO = "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace"; // antd の token にも等幅の指定がある

function App() {
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <AntLayout.Header style={{ display: 'flex', alignItems: 'center', gap: 12, paddingInline: 24 }}>
        <a href={href('antd', 'json')} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, color: '#fff', fontSize: 18, fontWeight: 600 }}>
          <ToolOutlined /> Toolbox
        </a>
        <Dropdown
          menu={{
            selectable: true,
            selectedKeys: ['antd'],
            items: UIS.map((u) => ({ key: u.id, label: <a href={href(u.id, tool.id)}>{u.label}</a> })),
          }}
        >
          <Button type="text" style={{ color: '#fff' }} aria-label="デザインシステムを切り替え">
            Ant Design <DownOutlined />
          </Button>
        </Dropdown>
      </AntLayout.Header>
      <AntLayout>
        <AntLayout.Sider width={220} breakpoint="md" collapsedWidth={56} collapsed={collapsed} onCollapse={setCollapsed}
          style={{ background: token.colorBgContainer }}>
          <Menu
            mode="inline"
            selectedKeys={[tool.id]}
            style={{ height: '100%', borderInlineEnd: 0 }}
            items={TOOLS.map((t) => ({ key: t.id, icon: ICONS[t.id], label: <a href={href('antd', t.id)}>{t.label}</a> }))}
          />
        </AntLayout.Sider>
        <AntLayout.Content style={{ padding: '16px 24px 24px', minWidth: 0 }}>
          <Breadcrumb items={[{ title: <a href={href('antd', 'json')}>Toolbox</a> }, { title: tool.label }]} />
          <Title level={3} style={{ marginTop: 16, marginBottom: 4 }}>{tool.label}</Title>
          <Text type="secondary">{tool.description}</Text>
          <div style={{ marginTop: 24 }}>
            {{ json: <JsonTool />, datetime: <DatetimeTool />, url: <UrlTool />, regex: <RegexTool />, csv: <CsvTool />, jwt: <JwtTool />, base64: <Base64Tool />, count: <CountTool /> }[tool.id]}
          </div>
        </AntLayout.Content>
      </AntLayout>
    </AntLayout>
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
  const { message } = AntApp.useApp();
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={12}>
        <Card title="入力" extra={
          <Flex gap={8}>
            <Button onClick={() => onSample()}>サンプル</Button>
            <Button onClick={() => onInput('')} disabled={!input}>クリア</Button>
          </Flex>
        }>
          <Form layout="vertical" component="div">
            <Form.Item label="入力" htmlFor="tool-input">
              <Input.TextArea id="tool-input" value={input} onChange={(e) => onInput(e.target.value)} placeholder={placeholder}
                rows={12} spellCheck={false} style={{ fontFamily: MONO }} />
            </Form.Item>
            {settings}
          </Form>
        </Card>
      </Col>
      <Col xs={24} xl={12}>
        <Card title="結果" extra={copyText !== undefined &&
          <Button icon={<CopyOutlined />} onClick={async () => (await copy(copyText)) ? message.success('コピーしました') : message.error('コピーできませんでした')}>
            コピー
          </Button>
        }>
          {result === null ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="入力すると結果がここに表示されます" />
          ) : result.ok ? (
            result.value
          ) : (
            <Alert type="error" showIcon title="変換できません" description={result.error} />
          )}
        </Card>
      </Col>
    </Row>
  );
}

const Pre = ({ children }: { children: string }) => {
  const { token } = theme.useToken();
  return (
    <pre style={{
      margin: 0, padding: 12, overflow: 'auto', maxHeight: '32rem', fontFamily: MONO, fontSize: 13,
      background: token.colorFillTertiary, borderRadius: token.borderRadius,
    }}>{children}</pre>
  );
};

function Choice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <Form.Item label={label}>
      <Segmented<T> value={value} onChange={onChange} options={options.map(([v, l]) => ({ value: v, label: l }))} />
    </Form.Item>
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
        <Flex gap={24} wrap>
          <Choice label="出力" value={s.mode} onChange={(mode) => set({ mode })} options={[['format', '整形'], ['minify', '圧縮']]} />
          {s.mode === 'format' && (
            <Choice label="インデント" value={s.indent} onChange={(indent) => set({ indent })}
              options={[['2', '2 スペース'], ['4', '4 スペース'], ['tab', 'タブ']]} />
          )}
        </Flex>
      }
    />
  );
}

function DatetimeTool() {
  const [s, set] = useToolState('datetime');
  const zones = useMemo(() => timeZones().map((z) => ({ value: z, label: z })), []);
  const r = s.input.trim() ? convertDatetime(s.input, s) : null;
  const item = (label: string, value: string) => ({
    key: label, label, children: <Text copyable={{ tooltips: ['コピー', 'コピーしました'] }} style={{ fontFamily: MONO }}>{value}</Text>,
  });
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.datetime(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <Flex vertical gap={12}>
            {r.value.warning && <Alert type="warning" showIcon title={r.value.warning} />}
            <Descriptions column={1} bordered size="small" items={[
              item(`日時（${s.timeZone}）`, r.value.local),
              item('ISO 8601（UTC）', r.value.iso),
              item('Unix 時刻（秒）', r.value.seconds),
              item('Unix 時刻（ミリ秒）', r.value.millis),
            ]} />
          </Flex>
        ),
      } : r)}
      settings={
        <>
          <Form.Item>
            <Button onClick={() => set({ input: String(s.unit === 's' ? Math.floor(Date.now() / 1000) : Date.now()) })}>現在時刻</Button>
          </Form.Item>
          <Choice label="数値の単位" value={s.unit} onChange={(unit) => set({ unit })} options={[['s', '秒'], ['ms', 'ミリ秒']]} />
          <Form.Item label="タイムゾーン" htmlFor="tz" extra="結果の表示と、オフセットのない日時の解釈に使います" style={{ marginBottom: 0 }}>
            <Select id="tz" showSearch value={s.timeZone} options={zones} onChange={(timeZone) => set({ timeZone })} />
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
            <Flex vertical gap={16}>
              <Descriptions column={1} bordered size="small"
                items={parsed.value.fields.map((f) => ({ key: f.label, label: f.label, children: <Text style={{ fontFamily: MONO, wordBreak: 'break-all' }}>{f.value}</Text> }))} />
              <Table
                size="small"
                pagination={false}
                rowKey="id"
                title={() => <Text strong>クエリパラメーター（{parsed.value.query.length}）</Text>}
                dataSource={parsed.value.query.map((q, i) => ({ id: i, ...q }))}
                columns={[
                  { title: 'キー', dataIndex: 'key' },
                  { title: '値（デコード済み）', dataIndex: 'value', render: (v: string) => v || <Text type="secondary">（空）</Text> },
                ]}
                locale={{ emptyText: 'クエリパラメーターはありません' }}
              />
            </Flex>
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
            <Checkbox checked={s.plusAsSpace} onChange={(e) => set({ plusAsSpace: e.target.checked })}>「+」を空白として扱う</Checkbox>
          )}
        </>
      }
    />
  );
}

function RegexTool() {
  const [s, set] = useToolState('regex');
  const { token } = theme.useToken();
  const r = s.input && s.pattern ? testRegex(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.regex(s), pattern: REGEX_SAMPLE_PATTERN })}
      input={s.input} onInput={(input) => set({ input })} placeholder="照合する文字列"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <Flex vertical gap={16}>
            <Highlight segments={r.value.segments}
              style={{ fontFamily: MONO, fontSize: 13, padding: 12, background: token.colorFillTertiary, borderRadius: token.borderRadius }}
              markStyle={{ background: token.colorWarningBg, boxShadow: `0 0 0 1px ${token.colorWarningBorder}`, color: 'inherit' }} />
            <Table
              size="small"
              pagination={false}
              rowKey="n"
              scroll={{ x: 'max-content' }}
              title={() => <Text strong>一致（{r.value.matches.length}{r.value.truncated ? '+' : ''}）</Text>}
              dataSource={r.value.matches.map((m, i) => ({ n: i + 1, ...m }))}
              columns={[
                { title: '#', dataIndex: 'n', width: 48 },
                { title: '位置', dataIndex: 'index', width: 64 },
                { title: '一致した文字列', dataIndex: 'text', render: (v: string) => <Text code>{v || '（空）'}</Text> },
                { title: 'グループ', dataIndex: 'groups', render: (g: Parameters<typeof groupsText>[0]) => groupsText(g) || '-' },
              ]}
              locale={{ emptyText: '一致する箇所はありません' }}
            />
          </Flex>
        ),
      } : r)}
      settings={
        <>
          <Form.Item label="正規表現" htmlFor="pattern" extra="/ で囲まずに書きます">
            <Input id="pattern" value={s.pattern} onChange={(e) => set({ pattern: e.target.value })} placeholder="\\d+" spellCheck={false}
              style={{ fontFamily: MONO }} />
          </Form.Item>
          <Form.Item label="フラグ" style={{ marginBottom: 0 }}>
            <Checkbox.Group
              value={[...s.flags]}
              onChange={(v) => set({ flags: REGEX_FLAGS.map((f) => f.flag).filter((f) => v.includes(f)).join('') })}
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
          <Flex vertical gap={16}>
            <Table
              size="small"
              bordered
              pagination={false}
              rowKey="id"
              scroll={{ x: 'max-content' }}
              title={() => (
                <Text strong>表（{r.value.grid.rows.length} 行）{r.value.grid.rows.length > PREVIEW_ROWS && <Text type="secondary"> 先頭 {PREVIEW_ROWS} 行を表示</Text>}</Text>
              )}
              dataSource={gridRows(r.value.grid.rows)}
              columns={r.value.grid.columns.map((c, i) => ({ title: c, key: String(i), render: (_: unknown, row: { cells: string[] }) => row.cells[i] }))}
            />
            <Pre>{r.value.text}</Pre>
          </Flex>
        ),
      } : r)}
      settings={
        <>
          <Flex gap={24} wrap>
            <Choice label="変換" value={s.mode} onChange={(mode) => set({ mode })} options={[['csv2json', 'CSV → JSON'], ['json2csv', 'JSON → CSV']]} />
            <Choice label="区切り文字" value={s.delimiter} onChange={(delimiter) => set({ delimiter })} options={DELIMITERS} />
          </Flex>
          <Checkbox checked={s.header} onChange={(e) => set({ header: e.target.checked })}>1 行目を見出しにする</Checkbox>
        </>
      }
    />
  );
}

const JWT_ALERT = { success: 'success', error: 'error', warning: 'warning', info: 'info' } as const;

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
          <Flex vertical gap={12}>
            <Alert type={JWT_ALERT[JWT_STATUS[r.value.status].tone]} showIcon title={JWT_STATUS[r.value.status].label} />
            {r.value.times.length > 0 && (
              <Descriptions column={1} bordered size="small"
                items={r.value.times.map((t) => ({ key: t.claim, label: t.label, children: <>{t.local}<Text type="secondary">（{t.relative}）</Text></> }))} />
            )}
            <Text strong>ヘッダー</Text>
            <Pre>{r.value.header}</Pre>
            <Text strong>ペイロード</Text>
            <Pre>{r.value.payload}</Pre>
          </Flex>
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
              <Checkbox checked={s.urlSafe} onChange={(e) => set({ urlSafe: e.target.checked })}>URL-safe</Checkbox>
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
                <Statistic title={c.label} value={c.value} />
                {c.hint && <Text type="secondary" style={{ fontSize: 12 }}>{c.hint}</Text>}
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
  <ConfigProvider locale={ja_JP}>
    <AntApp>
      <App />
    </AntApp>
  </ConfigProvider>,
);
