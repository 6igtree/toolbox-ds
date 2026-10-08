import '@douyinfe/semi-ui-19/react19-adapter';
import { useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Banner, Button, Card, Checkbox, CheckboxGroup, Col, Descriptions, Dropdown, Empty, Form, Layout as SemiLayout, LocaleProvider, Nav,
  Input, RadioGroup, Radio, Row, Select, Space, Table, Tag, TextArea, Toast, Typography,
} from '@douyinfe/semi-ui-19';
import ja_JP from '@douyinfe/semi-ui-19/lib/es/locale/source/ja_JP';
import { IconChevronDown, IconClock, IconCode, IconCopy, IconFont, IconGridView, IconKey, IconLink, IconRefresh2, IconSearch } from '@douyinfe/semi-icons';
import {
  convertBase64, countText, decodeJwt, defaultTimeZone, JWT_STATUS, DELIMITERS, PREVIEW_ROWS, REGEX_FLAGS, REGEX_SAMPLE_PATTERN, SAMPLES, TOOLS, UIS, convertCsv, convertDatetime, convertJson, copy,
  currentTool, decodeUrl, encodeUrl, gridRows, groupsText, href, parseUrl, testRegex, timeZones, toggleFlag, useToolState,
  type Result,
} from '../shared/app.ts';
import { Highlight } from '../shared/Highlight.tsx';

const tool = currentTool();
const ICONS = { json: <IconCode />, datetime: <IconClock />, url: <IconLink />, regex: <IconSearch />, csv: <IconGridView />, jwt: <IconKey />, base64: <IconRefresh2 />, count: <IconFont /> };
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
              {{ json: <JsonTool />, datetime: <DatetimeTool />, url: <UrlTool />, regex: <RegexTool />, csv: <CsvTool />, jwt: <JwtTool />, base64: <Base64Tool />, count: <CountTool /> }[tool.id]}
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
      <Col xs={24} lg={12}>
        <Card title="入力" headerExtraContent={
          <Space>
            <Button onClick={() => onSample()}>サンプル</Button>
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
      onSample={() => set({ input: SAMPLES.json(s) })} input={s.input} onInput={(input) => set({ input })} placeholder='{"key": "value"}'
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
      onSample={() => set({ input: SAMPLES.datetime(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
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
      onSample={() => set({ input: SAMPLES.url(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="https://example.com/path?q=1"
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
              style={{ fontFamily: MONO, fontSize: 13, padding: 12, background: 'var(--semi-color-fill-0)', borderRadius: 'var(--semi-border-radius-medium)' }}
              markStyle={{ background: 'var(--semi-color-warning-light-active)', color: 'inherit' }} />
            <Title heading={6} style={{ margin: '16px 0 8px' }}>一致（{r.value.matches.length}{r.value.truncated ? '+' : ''}）</Title>
            <Table
              size="small"
              pagination={false}
              rowKey="n"
              scroll={{ x: 'max-content' }}
              dataSource={r.value.matches.map((m, i) => ({ n: i + 1, ...m }))}
              columns={[
                { title: '#', dataIndex: 'n', width: 48 },
                { title: '位置', dataIndex: 'index', width: 64 },
                { title: '一致した文字列', dataIndex: 'text', render: (v: string) => <Text style={{ fontFamily: MONO }}>{v || '（空）'}</Text> },
                { title: 'グループ', dataIndex: 'groups', render: (g: Parameters<typeof groupsText>[0]) => groupsText(g) || '-' },
              ]}
              empty="一致する箇所はありません"
            />
          </>
        ),
      } : r)}
      settings={
        <>
          <Form.Label text="正規表現" name="pattern" style={{ display: 'block' }} />
          <Input id="pattern" value={s.pattern} onChange={(pattern) => set({ pattern })} placeholder="\\d+" style={{ fontFamily: MONO }} />
          <Text type="tertiary" size="small">/ で囲まずに書きます</Text>
          <Form.Label text="フラグ" style={{ display: 'block', marginTop: 12 }} />
          <CheckboxGroup direction="horizontal" value={[...s.flags]} aria-label="フラグ"
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
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.csv(s) })} input={s.input} onInput={(input) => set({ input })}
      placeholder={s.mode === 'csv2json' ? 'name,age\nアリス,30' : '[{"name": "アリス", "age": 30}]'}
      copyText={r?.ok ? r.value.text : undefined}
      result={r && (r.ok ? {
        ok: true,
        value: (
          <>
            <Title heading={6} style={{ marginBottom: 8 }}>表（{r.value.grid.rows.length} 行）</Title>
            {r.value.grid.rows.length > PREVIEW_ROWS && <Text type="tertiary" size="small">先頭 {PREVIEW_ROWS} 行を表示しています</Text>}
            <Table
              size="small"
              pagination={false}
              rowKey="id"
              dataSource={gridRows(r.value.grid.rows)}
              columns={r.value.grid.columns.map((c, i) => ({ title: c, key: String(i), render: (_: unknown, row: { cells: string[] }) => row.cells[i] }))}
              style={{ marginBottom: 16 }}
            />
            <Pre>{r.value.text}</Pre>
          </>
        ),
      } : r)}
      settings={
        <>
          <Space wrap align="start" spacing="loose">
            <Segmented label="変換" value={s.mode} onChange={(mode) => set({ mode })} options={[['csv2json', 'CSV → JSON'], ['json2csv', 'JSON → CSV']]} />
            <Segmented label="区切り文字" value={s.delimiter} onChange={(delimiter) => set({ delimiter })} options={DELIMITERS} />
          </Space>
          <Checkbox checked={s.header} onChange={(e) => set({ header: !!e.target.checked })}>1 行目を見出しにする</Checkbox>
        </>
      }
    />
  );
}

const JWT_TAG = { success: 'green', error: 'red', warning: 'orange', info: 'blue' } as const;

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
            <Tag size="large" color={JWT_TAG[JWT_STATUS[r.value.status].tone]} style={{ marginBottom: 12 }}>{JWT_STATUS[r.value.status].label}</Tag>
            {r.value.times.length > 0 && <Descriptions data={r.value.times.map((t) => ({ key: t.label, value: `${t.local}（${t.relative}）` }))} />}
            <Title heading={6} style={{ margin: '12px 0 8px' }}>ヘッダー</Title>
            <Pre>{r.value.header}</Pre>
            <Title heading={6} style={{ margin: '12px 0 8px' }}>ペイロード</Title>
            <Pre>{r.value.payload}</Pre>
          </>
        ),
      } : r)}
      settings={<Text type="tertiary" size="small">署名は検証しません。トークンはブラウザの外に送信されません。</Text>}
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
          <Segmented label="操作" value={s.mode} onChange={(mode) => set({ mode })} options={[['encode', 'エンコード'], ['decode', 'デコード']]} />
          {s.mode === 'encode' && (
            <Checkbox checked={s.urlSafe} onChange={(e) => set({ urlSafe: !!e.target.checked })} extra="+ / を - _ に置き換え、末尾の = を省きます">
              URL-safe
            </Checkbox>
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
          <Descriptions
            align="left"
            data={countText(s.input).map((c) => ({
              key: c.label,
              value: <><Text strong style={{ fontSize: 18 }}>{c.value.toLocaleString()}</Text>{c.hint && <Text type="tertiary" size="small" style={{ display: 'block' }}>{c.hint}</Text>}</>,
            }))}
          />
        ),
      } : null}
      settings={null}
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
