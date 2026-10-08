import '@douyinfe/semi-ui-19/react19-adapter';
import { useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Banner, Button, Card, Checkbox, Col, Descriptions, Dropdown, Empty, Form, Layout as SemiLayout, LocaleProvider, Nav,
  RadioGroup, Radio, Row, Select, Space, Table, TextArea, Toast, Typography,
} from '@douyinfe/semi-ui-19';
import ja_JP from '@douyinfe/semi-ui-19/lib/es/locale/source/ja_JP';
import { IconChevronDown, IconClock, IconCode, IconCopy, IconLink } from '@douyinfe/semi-icons';
import {
  SAMPLES, TOOLS, UIS, convertDatetime, convertJson, copy, currentTool, decodeUrl, encodeUrl, href, parseUrl, timeZones,
  useToolState, type Result,
} from '../shared/app.ts';

const tool = currentTool();
const ICONS = { json: <IconCode />, datetime: <IconClock />, url: <IconLink /> };
const { Title, Text } = Typography;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'; // Semi に等幅フォントのトークンはない

function App() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <LocaleProvider locale={ja_JP}>
      <SemiLayout style={{ minHeight: '100vh' }}>
        <SemiLayout.Header>
          <Nav
            mode="horizontal"
            header={{ text: 'Toolbox', link: '/' }}
            footer={
              <Dropdown
                position="bottomRight"
                render={
                  <Dropdown.Menu>
                    {UIS.map((u) => (
                      <Dropdown.Item key={u.id} active={u.id === 'semi'} onClick={() => location.assign(href(u.id, tool.id))}>{u.label}</Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                }
              >
                <Button theme="borderless" type="tertiary" icon={<IconChevronDown />} iconPosition="right" aria-label="デザインシステムを切り替え">
                  Semi Design
                </Button>
              </Dropdown>
            }
          />
        </SemiLayout.Header>
        <SemiLayout>
          <SemiLayout.Sider breakpoint={['md']} onBreakpoint={(_, match) => setCollapsed(!match)}>
            <Nav
              style={{ height: '100%' }}
              isCollapsed={collapsed}
              selectedKeys={[tool.id]}
              items={TOOLS.map((t) => ({ itemKey: t.id, text: t.label, icon: ICONS[t.id], link: href('semi', t.id) }))}
              footer={{ collapseButton: true }}
              onCollapseChange={setCollapsed}
            />
          </SemiLayout.Sider>
          <SemiLayout.Content style={{ padding: 24, background: 'var(--semi-color-bg-0)', minWidth: 0 }}>
            <Title heading={3}>{tool.label}</Title>
            <Text type="tertiary">{tool.description}</Text>
            <div style={{ marginTop: 24 }}>
              {tool.id === 'json' ? <JsonTool /> : tool.id === 'datetime' ? <DatetimeTool /> : <UrlTool />}
            </div>
          </SemiLayout.Content>
        </SemiLayout>
      </SemiLayout>
    </LocaleProvider>
  );
}

async function copyWithToast(text: string) {
  if (await copy(text)) Toast.success('コピーしました');
  else Toast.error('コピーできませんでした');
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
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title="入力" headerExtraContent={
          <Space>
            <Button onClick={() => onInput(sample)}>サンプル</Button>
            <Button onClick={() => onInput('')} disabled={!input}>クリア</Button>
          </Space>
        }>
          <Form.Label text="入力" name="tool-input" style={{ display: 'block' }} />
          <TextArea id="tool-input" value={input} onChange={onInput} placeholder={placeholder} rows={12} spellCheck={false} />
          <div style={{ marginTop: 16 }}>{settings}</div>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="結果" headerExtraContent={copyText !== undefined &&
          <Button icon={<IconCopy />} onClick={() => copyWithToast(copyText)}>コピー</Button>
        }>
          {result === null ? (
            <Empty description="入力すると結果がここに表示されます" />
          ) : result.ok ? (
            result.value
          ) : (
            <Banner type="danger" fullMode={false} closeIcon={null} title="変換できません" description={result.error} />
          )}
        </Card>
      </Col>
    </Row>
  );
}

const Pre = ({ children }: { children: string }) => (
  <pre style={{
    margin: 0, padding: 12, overflow: 'auto', maxHeight: '32rem', fontSize: 13, fontFamily: MONO,
    background: 'var(--semi-color-fill-0)', borderRadius: 'var(--semi-border-radius-medium)',
  }}>{children}</pre>
);

// RadioGroup の button 型が Semi のセグメント切り替え
function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Form.Label text={label} style={{ display: 'block' }} />
      <RadioGroup type="button" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map(([v, text]) => <Radio key={v} value={v}>{text}</Radio>)}
      </RadioGroup>
    </div>
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
        <Space wrap align="start" spacing="loose">
          <Segmented label="出力" value={s.mode} onChange={(mode) => set({ mode })} options={[['format', '整形'], ['minify', '圧縮']]} />
          {s.mode === 'format' && (
            <Segmented label="インデント" value={s.indent} onChange={(indent) => set({ indent })}
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
  const pair = (key: string, value: string) => ({ key, value: <Text copyable={{ successTip: 'コピーしました' }} style={{ fontFamily: MONO }}>{value}</Text> });
  return (
    <Layout
      sample={SAMPLES.datetime(s)} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <>
            {r.value.warning && <Banner type="warning" fullMode={false} closeIcon={null} description={r.value.warning} style={{ marginBottom: 12 }} />}
            <Descriptions data={[
              pair(`日時（${s.timeZone}）`, r.value.local),
              pair('ISO 8601（UTC）', r.value.iso),
              pair('Unix 時刻（秒）', r.value.seconds),
              pair('Unix 時刻（ミリ秒）', r.value.millis),
            ]} />
          </>
        ),
      } : r)}
      settings={
        <>
          <Button style={{ marginBottom: 12 }} onClick={() => set({ input: String(s.unit === 's' ? Math.floor(Date.now() / 1000) : Date.now()) })}>現在時刻</Button>
          <Segmented label="数値の単位" value={s.unit} onChange={(unit) => set({ unit })} options={[['s', '秒'], ['ms', 'ミリ秒']]} />
          <Form.Label text="タイムゾーン" name="tz" style={{ display: 'block' }} />
          <Select id="tz" filter value={s.timeZone} optionList={zones} onChange={(v) => set({ timeZone: v as string })} style={{ width: '100%' }} />
          <Text type="tertiary" size="small">結果の表示と、オフセットのない日時の解釈に使います</Text>
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
              <Descriptions data={parsed.value.fields.map((f) => ({ key: f.label, value: <Text style={{ fontFamily: MONO, wordBreak: 'break-all' }}>{f.value}</Text> }))} />
              <Title heading={6} style={{ margin: '16px 0 8px' }}>クエリパラメーター（{parsed.value.query.length}）</Title>
              <Table
                size="small"
                pagination={false}
                rowKey="id"
                dataSource={parsed.value.query.map((q, i) => ({ id: i, ...q }))}
                columns={[
                  { title: 'キー', dataIndex: 'key' },
                  { title: '値（デコード済み）', dataIndex: 'value', render: (v: string) => v || <Text type="tertiary">（空）</Text> },
                ]}
                empty="クエリパラメーターはありません"
              />
            </>
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
        <>
          <Segmented label="操作" value={s.mode} onChange={(mode) => set({ mode })}
            options={[['parse', '分解'], ['encode', 'エンコード'], ['decode', 'デコード']]} />
          {s.mode === 'decode' && (
            <Checkbox checked={s.plusAsSpace} onChange={(e) => set({ plusAsSpace: !!e.target.checked })}>「+」を空白として扱う</Checkbox>
          )}
        </>
      }
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
