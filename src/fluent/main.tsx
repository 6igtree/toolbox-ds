import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Badge, Body1, Button, Card, CardHeader, Checkbox, Combobox, Input, Field, FluentProvider, Hamburger, Menu, MenuButton, MenuItemRadio,
  MenuList, MenuPopover, MenuTrigger, MessageBar, MessageBarBody, MessageBarTitle, NavDrawer, NavDrawerBody, NavItem, Option,
  Radio, RadioGroup, Subtitle2, Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow, Textarea, Title3, Toast,
  ToastTitle, Toaster, makeStyles, tokens, useId, useToastController, webLightTheme,
} from '@fluentui/react-components';
import {
  ArrowSwap24Regular, Braces24Regular, Clock24Regular, Copy20Regular, Key24Regular, Link24Regular, Search24Regular, Table24Regular,
  TextWordCount24Regular, Wrench24Regular,
} from '@fluentui/react-icons';
import {
  convertBase64, countText, decodeJwt, defaultTimeZone, JWT_STATUS, DELIMITERS, PREVIEW_ROWS, REGEX_FLAGS, REGEX_SAMPLE_PATTERN, SAMPLES, TOOLS, UIS, convertCsv, convertDatetime, convertJson, copy,
  currentTool, decodeUrl, encodeUrl, gridRows, groupsText, href, parseUrl, testRegex, timeZones, toggleFlag, useToolState,
  type Result,
} from '../shared/app.ts';
import { Highlight } from '../shared/Highlight.tsx';

const tool = currentTool();
const ICONS = { json: <Braces24Regular />, datetime: <Clock24Regular />, url: <Link24Regular />, regex: <Search24Regular />, csv: <Table24Regular />, jwt: <Key24Regular />, base64: <ArrowSwap24Regular />, count: <TextWordCount24Regular /> };

const useStyles = makeStyles({
  header: {
    display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS,
    height: '48px', padding: `0 ${tokens.spacingHorizontalM}`,
    backgroundColor: tokens.colorBrandBackground, color: tokens.colorNeutralForegroundOnBrand,
  },
  brand: { display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS, flex: 1, color: 'inherit', textDecoration: 'none' },
  body: { display: 'flex', minHeight: 'calc(100vh - 48px)', backgroundColor: tokens.colorNeutralBackground2 },
  main: { flex: 1, minWidth: 0, padding: tokens.spacingHorizontalXXL, display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: tokens.spacingHorizontalL, alignItems: 'start' },
  stack: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  muted: { color: tokens.colorNeutralForeground3 },
  pre: {
    margin: 0, padding: tokens.spacingHorizontalM, overflow: 'auto', maxHeight: '32rem',
    fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200,
    backgroundColor: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusMedium,
  },
  mono: { fontFamily: tokens.fontFamilyMonospace, wordBreak: 'break-all' },
  pairs: { margin: 0, display: 'grid', gap: tokens.spacingVerticalM },
  scroll: { overflowX: 'auto' },
});

// 狭い画面ではナビを重ねて表示する（Fluent の NavDrawer の作法）
function useNarrow() {
  const mq = useMemo(() => matchMedia('(max-width: 768px)'), []);
  const [narrow, setNarrow] = useState(mq.matches);
  useEffect(() => {
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [mq]);
  return narrow;
}

function App() {
  const s = useStyles();
  const narrow = useNarrow();
  const [open, setOpen] = useState(!narrow);
  useEffect(() => setOpen(!narrow), [narrow]);
  return (
    <FluentProvider theme={webLightTheme}>
      <header className={s.header}>
        <Hamburger appearance="transparent" style={{ color: 'inherit' }} onClick={() => setOpen(!open)} aria-expanded={open} title="ナビゲーション" />
        <a className={s.brand} href={href('fluent', 'json')}>
          <Wrench24Regular />
          <Subtitle2>Toolbox</Subtitle2>
        </a>
        <Menu checkedValues={{ ui: ['fluent'] }}>
          <MenuTrigger disableButtonEnhancement>
            <MenuButton appearance="transparent" style={{ color: 'inherit' }} aria-label="デザインシステムを切り替え">Fluent 2</MenuButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              {UIS.map((u) => (
                <MenuItemRadio key={u.id} name="ui" value={u.id} onClick={() => location.assign(href(u.id, tool.id))}>{u.label}</MenuItemRadio>
              ))}
            </MenuList>
          </MenuPopover>
        </Menu>
      </header>
      <div className={s.body}>
        <NavDrawer open={open} type={narrow ? 'overlay' : 'inline'} onOpenChange={(_, d) => setOpen(d.open)} selectedValue={tool.id}>
          <NavDrawerBody>
            {TOOLS.map((t) => <NavItem key={t.id} value={t.id} href={href('fluent', t.id)} icon={ICONS[t.id]}>{t.label}</NavItem>)}
          </NavDrawerBody>
        </NavDrawer>
        <main className={s.main}>
          <div>
            <Title3 as="h1" block>{tool.label}</Title3>
            <Body1 className={s.muted}>{tool.description}</Body1>
          </div>
          {{ json: <JsonTool />, datetime: <DatetimeTool />, url: <UrlTool />, regex: <RegexTool />, csv: <CsvTool />, jwt: <JwtTool />, base64: <Base64Tool />, count: <CountTool /> }[tool.id]}
        </main>
      </div>
    </FluentProvider>
  );
}

function useCopy() {
  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);
  const toaster = <Toaster toasterId={toasterId} position="bottom-end" />;
  const run = async (text: string) => {
    const ok = await copy(text);
    dispatchToast(<Toast><ToastTitle>{ok ? 'コピーしました' : 'コピーできませんでした'}</ToastTitle></Toast>, { intent: ok ? 'success' : 'error' });
  };
  return [toaster, run] as const;
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
  const s = useStyles();
  const [toaster, run] = useCopy();
  return (
    <div className={s.grid}>
      {toaster}
      <Card>
        <CardHeader header={<Subtitle2 as="h2">入力</Subtitle2>} action={
          <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
            <Button onClick={() => onSample()}>サンプル</Button>
            <Button onClick={() => onInput('')} disabled={!input}>クリア</Button>
          </div>
        } />
        <div className={s.stack}>
          <Field label="入力">
            <Textarea value={input} onChange={(_, d) => onInput(d.value)} placeholder={placeholder} rows={12} spellCheck={false}
              textarea={{ style: { fontFamily: tokens.fontFamilyMonospace } }} />
          </Field>
          {settings}
        </div>
      </Card>
      <Card>
        <CardHeader header={<Subtitle2 as="h2">結果</Subtitle2>} action={copyText !== undefined
          ? <Button icon={<Copy20Regular />} onClick={() => run(copyText)}>コピー</Button>
          : undefined} />
        {result === null ? (
          <Body1 className={s.muted}>入力すると結果がここに表示されます</Body1>
        ) : result.ok ? (
          result.value
        ) : (
          <MessageBar intent="error" layout="multiline">
            <MessageBarBody><MessageBarTitle>変換できません</MessageBarTitle>{result.error}</MessageBarBody>
          </MessageBar>
        )}
      </Card>
    </div>
  );
}

function Pre({ children }: { children: string }) {
  return <pre className={useStyles().pre}>{children}</pre>;
}

function Pairs({ items }: { items: { label: string; value: string; copyable?: boolean }[] }) {
  const s = useStyles();
  const [toaster, run] = useCopy();
  return (
    <dl className={s.pairs}>
      {toaster}
      {items.map((i) => (
        <div key={i.label}>
          <dt className={s.muted}>{i.label}</dt>
          <dd style={{ margin: 0, display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalXS }}>
            <Body1 className={s.mono}>{i.value}</Body1>
            {i.copyable && <Button size="small" appearance="subtle" icon={<Copy20Regular />} aria-label={`${i.label}をコピー`} onClick={() => run(i.value)} />}
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
    <Field label={label}>
      <RadioGroup layout="horizontal" value={value} onChange={(_, d) => onChange(d.value as T)}>
        {options.map(([v, text]) => <Radio key={v} value={v} label={text} />)}
      </RadioGroup>
    </Field>
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
        <>
          <Choice label="出力" value={s.mode} onChange={(mode) => set({ mode })} options={[['format', '整形'], ['minify', '圧縮']]} />
          {s.mode === 'format' && (
            <Choice label="インデント" value={s.indent} onChange={(indent) => set({ indent })}
              options={[['2', '2 スペース'], ['4', '4 スペース'], ['tab', 'タブ']]} />
          )}
        </>
      }
    />
  );
}

function DatetimeTool() {
  const [s, set] = useToolState('datetime');
  const st = useStyles();
  const zones = useMemo(timeZones, []);
  const [query, setQuery] = useState<string | null>(null);
  const shown = query === null ? zones : zones.filter((z) => z.toLowerCase().includes(query.toLowerCase()));
  const r = s.input.trim() ? convertDatetime(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.datetime(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="1790000000 または 2026-10-08 12:34:56"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <div className={st.stack}>
            {r.value.warning && <MessageBar intent="warning"><MessageBarBody>{r.value.warning}</MessageBarBody></MessageBar>}
            <Pairs items={[
              { label: `日時（${s.timeZone}）`, value: r.value.local, copyable: true },
              { label: 'ISO 8601（UTC）', value: r.value.iso, copyable: true },
              { label: 'Unix 時刻（秒）', value: r.value.seconds, copyable: true },
              { label: 'Unix 時刻（ミリ秒）', value: r.value.millis, copyable: true },
            ]} />
          </div>
        ),
      } : r)}
      settings={
        <>
          <div><Button onClick={() => set({ input: String(s.unit === 's' ? Math.floor(Date.now() / 1000) : Date.now()) })}>現在時刻</Button></div>
          <Choice label="数値の単位" value={s.unit} onChange={(unit) => set({ unit })} options={[['s', '秒'], ['ms', 'ミリ秒']]} />
          <Field label="タイムゾーン" hint="結果の表示と、オフセットのない日時の解釈に使います">
            <Combobox
              value={query ?? s.timeZone}
              selectedOptions={[s.timeZone]}
              onChange={(e) => setQuery(e.target.value)}
              onOptionSelect={(_, d) => { if (d.optionValue) set({ timeZone: d.optionValue }); setQuery(null); }}
              onBlur={() => setQuery(null)}
            >
              {shown.map((z) => <Option key={z} value={z}>{z}</Option>)}
            </Combobox>
          </Field>
        </>
      }
    />
  );
}

function UrlTool() {
  const [s, set] = useToolState('url');
  const st = useStyles();
  const text = s.input.trim() ? s.input : null;
  const parsed = text !== null && s.mode === 'parse' ? parseUrl(text) : null;
  const coded = text !== null && s.mode !== 'parse' ? (s.mode === 'encode' ? encodeUrl(text) : decodeUrl(text, s.plusAsSpace)) : null;
  const result: Result<ReactNode> | null = parsed
    ? parsed.ok
      ? {
          ok: true,
          value: (
            <div className={st.stack}>
              <Pairs items={parsed.value.fields} />
              <Subtitle2 as="h3">クエリパラメーター（{parsed.value.query.length}）</Subtitle2>
              {parsed.value.query.length === 0 ? (
                <Body1 className={st.muted}>クエリパラメーターはありません</Body1>
              ) : (
                <Table size="small" aria-label="クエリパラメーター">
                  <TableHeader>
                    <TableRow><TableHeaderCell>キー</TableHeaderCell><TableHeaderCell>値（デコード済み）</TableHeaderCell></TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.value.query.map((q, i) => (
                      <TableRow key={i}>
                        <TableCell>{q.key}</TableCell>
                        <TableCell>{q.value || <span className={st.muted}>（空）</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
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
            <Checkbox checked={s.plusAsSpace} onChange={(_, d) => set({ plusAsSpace: !!d.checked })} label="「+」を空白として扱う" />
          )}
        </>
      }
    />
  );
}

function RegexTool() {
  const [s, set] = useToolState('regex');
  const st = useStyles();
  const r = s.input && s.pattern ? testRegex(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.regex(s), pattern: REGEX_SAMPLE_PATTERN })}
      input={s.input} onInput={(input) => set({ input })} placeholder="照合する文字列"
      result={r && (r.ok ? {
        ok: true,
        value: (
          <div className={st.stack}>
            <Highlight segments={r.value.segments}
              style={{ fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200, padding: tokens.spacingHorizontalM, background: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusMedium }}
              markStyle={{ background: tokens.colorPaletteYellowBackground2, color: 'inherit' }} />
            <Subtitle2 as="h3">一致（{r.value.matches.length}{r.value.truncated ? '+' : ''}）</Subtitle2>
            {r.value.matches.length === 0 ? (
              <Body1 className={st.muted}>一致する箇所はありません</Body1>
            ) : (
              <div className={st.scroll}>
                <Table size="small" aria-label="一致">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell style={{ width: 40 }}>#</TableHeaderCell><TableHeaderCell style={{ width: 56 }}>位置</TableHeaderCell>
                      <TableHeaderCell>一致した文字列</TableHeaderCell><TableHeaderCell>グループ</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.value.matches.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell><TableCell>{m.index}</TableCell>
                        <TableCell><span className={st.mono}>{m.text || '（空）'}</span></TableCell>
                        <TableCell>{groupsText(m.groups) || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ),
      } : r)}
      settings={
        <>
          <Field label="正規表現" hint="/ で囲まずに書きます">
            <Input value={s.pattern} onChange={(_, d) => set({ pattern: d.value })} placeholder="\\d+" spellCheck={false}
              input={{ style: { fontFamily: tokens.fontFamilyMonospace } }} />
          </Field>
          <Field label="フラグ">
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
              {REGEX_FLAGS.map((f) => (
                <Checkbox key={f.flag} checked={s.flags.includes(f.flag)} onChange={() => set({ flags: toggleFlag(s.flags, f.flag) })} label={f.label} />
              ))}
            </div>
          </Field>
        </>
      }
    />
  );
}

function CsvTool() {
  const [s, set] = useToolState('csv');
  const st = useStyles();
  const r = s.input.trim() ? convertCsv(s.input, s) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.csv(s) })} input={s.input} onInput={(input) => set({ input })}
      placeholder={s.mode === 'csv2json' ? 'name,age\nアリス,30' : '[{"name": "アリス", "age": 30}]'}
      copyText={r?.ok ? r.value.text : undefined}
      result={r && (r.ok ? {
        ok: true,
        value: (
          <div className={st.stack}>
            <Subtitle2 as="h3">表（{r.value.grid.rows.length} 行）</Subtitle2>
            {r.value.grid.rows.length > PREVIEW_ROWS && <Body1 className={st.muted}>先頭 {PREVIEW_ROWS} 行を表示しています</Body1>}
            <div className={st.scroll}>
              <Table size="small" aria-label="変換結果の表">
                <TableHeader>
                  <TableRow>{r.value.grid.columns.map((c, i) => <TableHeaderCell key={i}>{c}</TableHeaderCell>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {gridRows(r.value.grid.rows).map((row) => (
                    <TableRow key={row.id}>{row.cells.map((v, i) => <TableCell key={i}>{v}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pre>{r.value.text}</Pre>
          </div>
        ),
      } : r)}
      settings={
        <>
          <Choice label="変換" value={s.mode} onChange={(mode) => set({ mode })} options={[['csv2json', 'CSV → JSON'], ['json2csv', 'JSON → CSV']]} />
          <Choice label="区切り文字" value={s.delimiter} onChange={(delimiter) => set({ delimiter })} options={DELIMITERS} />
          <Checkbox checked={s.header} onChange={(_, d) => set({ header: !!d.checked })} label="1 行目を見出しにする" />
        </>
      }
    />
  );
}

const JWT_BADGE = { success: 'success', error: 'danger', warning: 'warning', info: 'informative' } as const;

function JwtTool() {
  const [s, set] = useToolState('jwt');
  const st = useStyles();
  const r = s.input.trim() ? decodeJwt(s.input, defaultTimeZone()) : null;
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.jwt(s) })} input={s.input} onInput={(input) => set({ input })}
      placeholder="eyJhbGciOi…（先頭の Bearer は付けたままで構いません）"
      copyText={r?.ok ? r.value.payload : undefined}
      result={r && (r.ok ? {
        ok: true,
        value: (
          <div className={st.stack}>
            <div><Badge size="large" appearance="tint" color={JWT_BADGE[JWT_STATUS[r.value.status].tone]}>{JWT_STATUS[r.value.status].label}</Badge></div>
            {r.value.times.length > 0 && <Pairs items={r.value.times.map((t) => ({ label: t.label, value: `${t.local}（${t.relative}）` }))} />}
            <Subtitle2 as="h3">ヘッダー</Subtitle2>
            <Pre>{r.value.header}</Pre>
            <Subtitle2 as="h3">ペイロード</Subtitle2>
            <Pre>{r.value.payload}</Pre>
          </div>
        ),
      } : r)}
      settings={<Caption1Muted>署名は検証しません。トークンはブラウザの外に送信されません。</Caption1Muted>}
    />
  );
}

function Caption1Muted({ children }: { children: ReactNode }) {
  return <Body1 className={useStyles().muted} style={{ fontSize: tokens.fontSizeBase200 }}>{children}</Body1>;
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
            <Field hint="+ / を - _ に置き換え、末尾の = を省きます">
              <Checkbox checked={s.urlSafe} onChange={(_, d) => set({ urlSafe: !!d.checked })} label="URL-safe" />
            </Field>
          )}
        </>
      }
    />
  );
}

function CountTool() {
  const [s, set] = useToolState('count');
  const st = useStyles();
  return (
    <Layout
      onSample={() => set({ input: SAMPLES.count(s) })} input={s.input} onInput={(input) => set({ input })} placeholder="数える文字列"
      result={s.input ? {
        ok: true,
        value: (
          <dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: tokens.spacingVerticalL }}>
            {countText(s.input).map((c) => (
              <div key={c.label}>
                <dt className={st.muted}>{c.label}</dt>
                <dd style={{ margin: 0 }}>
                  <Title3 as="span" block>{c.value.toLocaleString()}</Title3>
                  {c.hint && <Caption1Muted>{c.hint}</Caption1Muted>}
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
