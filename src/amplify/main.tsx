import { useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import '@aws-amplify/ui-react/styles.css';
import {
  Alert, Badge, Breadcrumbs, Button, Card, CheckboxField, Flex, Grid, Heading, Link, Menu, MenuItem, SelectField, SwitchField, Table,
  TableBody, TableCell, TableHead, TableRow, Text, TextAreaField, TextField, ThemeProvider, ToggleButton, ToggleButtonGroup, View,
} from '@aws-amplify/ui-react';
import {
  convertBase64, countText, decodeJwt, defaultTimeZone, JWT_STATUS, DELIMITERS, PREVIEW_ROWS, REGEX_FLAGS, REGEX_SAMPLE_PATTERN, SAMPLES,
  TOOLS, UIS, convertCsv, convertDatetime, convertJson, copy, currentTool, decodeUrl, encodeUrl, gridRows, groupsText, href, parseUrl,
  testRegex, timeZones, toggleFlag, useToolState, type Result,
} from '../shared/app.ts';
import { Highlight } from '../shared/Highlight.tsx';

const tool = currentTool();
// Amplify のトークンは CSS 変数で配られる。等幅フォントのトークンはない
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const v = (name: string) => `var(--amplify-${name})`;
const muted = { color: v('colors-font-tertiary') };

function App() {
  return (
    <ThemeProvider>
      <Flex as="header" alignItems="center" gap="small" padding="small medium" backgroundColor={v('colors-background-primary')}
        style={{ borderBottom: `1px solid ${v('colors-border-secondary')}` }}>
        <Link href={href('amplify', 'json')} flex="1" fontWeight="bold" fontSize="large" color={v('colors-font-primary')} style={{ textDecoration: 'none' }}>
          Toolbox
        </Link>
        <Menu menuAlign="end" trigger={<Button size="small" aria-label="デザインシステムを切り替え">Amplify UI ▾</Button>}>
          {UIS.map((u) => (
            <MenuItem key={u.id} isDisabled={u.id === 'amplify'} onClick={() => location.assign(href(u.id, tool.id))}>{u.label}</MenuItem>
          ))}
        </Menu>
      </Flex>
      <Flex direction={{ base: 'column', medium: 'row' }} gap="0" minHeight="calc(100vh - 57px)" backgroundColor={v('colors-background-secondary')}>
        <View as="nav" aria-label="ツール" width={{ base: '100%', medium: '220px' }} padding="medium small" backgroundColor={v('colors-background-primary')}
          style={{ flexShrink: 0, borderRight: `1px solid ${v('colors-border-secondary')}` }}>
          <Flex direction={{ base: 'row', medium: 'column' }} gap="xxs" wrap="wrap">
            {TOOLS.map((t) => (
              <Link key={t.id} href={href('amplify', t.id)} aria-current={t.id === tool.id ? 'page' : undefined}
                padding="xs small" borderRadius="small"
                color={t.id === tool.id ? v('colors-font-active') : v('colors-font-primary')}
                backgroundColor={t.id === tool.id ? v('colors-brand-primary-10') : undefined}
                fontWeight={t.id === tool.id ? 'bold' : 'normal'}
                style={{ textDecoration: 'none' }}>
                {t.label}
              </Link>
            ))}
          </Flex>
        </View>
        <Flex as="main" direction="column" gap="medium" padding="large" flex="1" minWidth="0">
          <Breadcrumbs items={[{ label: 'Toolbox', href: href('amplify', 'json') }, { label: tool.label }]} />
          <View>
            <Heading level={3}>{tool.label}</Heading>
            <Text style={muted}>{tool.description}</Text>
          </View>
          {{ json: <JsonTool />, datetime: <DatetimeTool />, url: <UrlTool />, regex: <RegexTool />, csv: <CsvTool />, jwt: <JwtTool />, base64: <Base64Tool />, count: <CountTool /> }[tool.id]}
        </Flex>
      </Flex>
    </ThemeProvider>
  );
}

// Amplify にトーストはないので、ボタンの表示を一時的に変えて伝える
function CopyButton({ text, label = 'コピー', size = 'small' }: { text: string; label?: string; size?: 'small' }) {
  const [state, setState] = useState<'idle' | 'done' | 'fail'>('idle');
  return (
    <Button size={size} onClick={async () => {
      setState((await copy(text)) ? 'done' : 'fail');
      setTimeout(() => setState('idle'), 2000);
    }}>
      {state === 'done' ? 'コピーしました' : state === 'fail' ? 'コピーできませんでした' : label}
    </Button>
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
    <Grid templateColumns={{ base: '1fr', large: '1fr 1fr' }} gap="medium" alignItems="start">
      <Card variation="elevated">
        <Flex direction="column" gap="medium">
          <Flex justifyContent="space-between" alignItems="center">
            <Heading level={5}>入力</Heading>
            <Flex gap="xs">
              <Button size="small" onClick={onSample}>サンプル</Button>
              <Button size="small" onClick={() => onInput('')} isDisabled={!input}>クリア</Button>
            </Flex>
          </Flex>
          <TextAreaField label="入力" rows={12} value={input} onChange={(e) => onInput(e.target.value)} placeholder={placeholder}
            spellCheck={false} inputStyles={{ fontFamily: MONO }} />
          {settings}
        </Flex>
      </Card>
      <Card variation="elevated">
        <Flex direction="column" gap="medium">
          <Flex justifyContent="space-between" alignItems="center" minHeight="2rem">
            <Heading level={5}>結果</Heading>
            {copyText !== undefined && <CopyButton text={copyText} />}
          </Flex>
          {result === null ? (
            <Text style={muted}>入力すると結果がここに表示されます</Text>
          ) : result.ok ? (
            result.value
          ) : (
            <Alert variation="error" heading="変換できません">{result.error}</Alert>
          )}
        </Flex>
      </Card>
    </Grid>
  );
}

const Pre = ({ children }: { children: string }) => (
  <View as="pre" margin="0" padding="small" overflow="auto" maxHeight="32rem" fontSize="small"
    backgroundColor={v('colors-background-tertiary')} borderRadius="small" style={{ fontFamily: MONO }}>
    {children}
  </View>
);

function Pairs({ items }: { items: { label: string; value: string; copyable?: boolean }[] }) {
  return (
    <Flex as="dl" direction="column" gap="small" margin="0">
      {items.map((i) => (
        <View key={i.label}>
          <Text as="dt" fontSize="small" style={muted}>{i.label}</Text>
          <Flex as="dd" margin="0" alignItems="center" gap="xs">
            <Text as="span" style={{ fontFamily: MONO, wordBreak: 'break-all' }}>{i.value}</Text>
            {i.copyable && <CopyButton text={i.value} />}
          </Flex>
        </View>
      ))}
    </Flex>
  );
}

// ToggleButtonGroup の排他モードが Amplify のセグメント切り替え
function Choice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <View>
      <Text fontSize="small" marginBottom="xxs">{label}</Text>
      <ToggleButtonGroup size="small" isExclusive isSelectionRequired value={value} onChange={(x) => onChange(x as T)} aria-label={label}>
        {options.map(([val, text]) => <ToggleButton key={val} value={val}>{text}</ToggleButton>)}
      </ToggleButtonGroup>
    </View>
  );
}

function SimpleTable({ label, headers, rows }: { label: string; headers: string[]; rows: ReactNode[][] }) {
  return (
    <View overflow="auto">
      {/* caption は表の下に出るので、見出しとして上に置く */}
      <Heading level={6} marginBottom="xs">{label}</Heading>
      <Table size="small" variation="striped" highlightOnHover aria-label={label}>
        <TableHead><TableRow>{headers.map((h, i) => <TableCell as="th" key={i} style={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}</TableRow></TableHead>
        <TableBody>
          {rows.map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>)}
        </TableBody>
      </Table>
    </View>
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
        <Flex gap="large" wrap="wrap">
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
  const zones = useMemo(timeZones, []);
  const r = s.input.trim() ? convertDatetime(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.datetime(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <Flex direction="column" gap="medium">
            {r.value.warning && <Alert variation="warning">{r.value.warning}</Alert>}
            <Pairs items={[
              { label: `日時（${s.timeZone}）`, value: r.value.local, copyable: true },
              { label: 'ISO 8601（UTC）', value: r.value.iso, copyable: true },
              { label: 'Unix 時刻（秒）', value: r.value.seconds, copyable: true },
              { label: 'Unix 時刻（ミリ秒）', value: r.value.millis, copyable: true },
            ]} />
          </Flex>
        ),
      } : r)}
      settings={
        <>
          <View><Button size="small" onClick={() => set({ input: String(s.unit === 's' ? Math.floor(Date.now() / 1000) : Date.now()) })}>現在時刻</Button></View>
          <Choice label="数値の単位" value={s.unit} onChange={(unit) => set({ unit })} options={[['s', '秒'], ['ms', 'ミリ秒']]} />
          <SelectField label="タイムゾーン" descriptiveText="結果の表示と、オフセットのない日時の解釈に使います"
            value={s.timeZone} options={zones} onChange={(e) => set({ timeZone: e.target.value })} />
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
            <Flex direction="column" gap="medium">
              <Pairs items={parsed.value.fields} />
              {parsed.value.query.length === 0 ? (
                <Text style={muted}>クエリパラメーターはありません</Text>
              ) : (
                <SimpleTable label={`クエリパラメーター（${parsed.value.query.length}）`} headers={['キー', '値（デコード済み）']}
                  rows={parsed.value.query.map((q) => [q.key, q.value || <Text as="span" style={muted}>（空）</Text>])} />
              )}
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
            <CheckboxField name="plusAsSpace" label="「+」を空白として扱う" checked={s.plusAsSpace} onChange={(e) => set({ plusAsSpace: e.target.checked })} />
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
          <Flex direction="column" gap="medium">
            <Highlight segments={r.value.segments}
              style={{ fontFamily: MONO, fontSize: 13, padding: 12, background: v('colors-background-tertiary'), borderRadius: v('radii-small') }}
              markStyle={{ background: v('colors-yellow-20'), color: 'inherit' }} />
            {r.value.matches.length === 0 ? (
              <Text style={muted}>一致する箇所はありません</Text>
            ) : (
              <SimpleTable label={`一致（${r.value.matches.length}${r.value.truncated ? '+' : ''}）`} headers={['#', '位置', '一致した文字列', 'グループ']}
                rows={r.value.matches.map((m, i) => [i + 1, m.index, <Text as="span" style={{ fontFamily: MONO, wordBreak: 'break-all' }}>{m.text || '（空）'}</Text>, groupsText(m.groups) || '-'])} />
            )}
          </Flex>
        ),
      } : r)}
      settings={
        <>
          <TextField label="正規表現" descriptiveText="/ で囲まずに書きます" value={s.pattern} onChange={(e) => set({ pattern: e.target.value })}
            placeholder="\d+" spellCheck={false} inputStyles={{ fontFamily: MONO }} />
          <View>
            <Text fontSize="small" marginBottom="xxs">フラグ</Text>
            <Flex wrap="wrap" gap="small">
              {REGEX_FLAGS.map((f) => (
                <CheckboxField key={f.flag} name={`flag-${f.flag}`} label={f.label} checked={s.flags.includes(f.flag)}
                  onChange={() => set({ flags: toggleFlag(s.flags, f.flag) })} />
              ))}
            </Flex>
          </View>
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
          <Flex direction="column" gap="medium">
            {r.value.grid.rows.length > PREVIEW_ROWS && <Text fontSize="small" style={muted}>先頭 {PREVIEW_ROWS} 行を表示しています</Text>}
            <SimpleTable label={`表（${r.value.grid.rows.length} 行）`} headers={r.value.grid.columns} rows={gridRows(r.value.grid.rows).map((row) => row.cells)} />
            <Pre>{r.value.text}</Pre>
          </Flex>
        ),
      } : r)}
      settings={
        <>
          <Flex gap="large" wrap="wrap">
            <Choice label="変換" value={s.mode} onChange={(mode) => set({ mode })} options={[['csv2json', 'CSV → JSON'], ['json2csv', 'JSON → CSV']]} />
            <Choice label="区切り文字" value={s.delimiter} onChange={(delimiter) => set({ delimiter })} options={DELIMITERS} />
          </Flex>
          <CheckboxField name="header" label="1 行目を見出しにする" checked={s.header} onChange={(e) => set({ header: e.target.checked })} />
        </>
      }
    />
  );
}

const JWT_BADGE = { success: 'success', error: 'error', warning: 'warning', info: 'info' } as const;

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
          <Flex direction="column" gap="medium">
            <View><Badge size="large" variation={JWT_BADGE[JWT_STATUS[r.value.status].tone]}>{JWT_STATUS[r.value.status].label}</Badge></View>
            {r.value.times.length > 0 && <Pairs items={r.value.times.map((t) => ({ label: t.label, value: `${t.local}（${t.relative}）` }))} />}
            <Heading level={6}>ヘッダー</Heading>
            <Pre>{r.value.header}</Pre>
            <Heading level={6}>ペイロード</Heading>
            <Pre>{r.value.payload}</Pre>
          </Flex>
        ),
      } : r)}
      settings={<Text fontSize="small" style={muted}>署名は検証しません。トークンはブラウザの外に送信されません。</Text>}
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
            <View>
              <SwitchField label="URL-safe" isChecked={s.urlSafe} onChange={(e) => set({ urlSafe: e.target.checked })} />
              <Text fontSize="small" style={muted}>+ / を - _ に置き換え、末尾の = を省きます</Text>
            </View>
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
          <Grid templateColumns="repeat(auto-fill, minmax(160px, 1fr))" gap="small">
            {countText(s.input).map((c) => (
              <Card key={c.label} variation="outlined" padding="small">
                <Text fontSize="small" style={muted}>{c.label}</Text>
                <Heading level={4}>{c.value.toLocaleString()}</Heading>
                {c.hint && <Text fontSize="xs" style={muted}>{c.hint}</Text>}
              </Card>
            ))}
          </Grid>
        ),
      } : null}
      settings={null}
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
