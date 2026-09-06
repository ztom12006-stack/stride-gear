'use client';
import { useEffect, useRef, useState } from 'react';
import type { Worker } from 'tesseract.js';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Upload,
  FileSpreadsheet,
  ScanText,
  Plus,
  Check,
  LoaderCircle,
  ChevronLeft,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { PhotoEditor } from './gear-photo';
import { uploadGearImage } from '@/lib/images';
import { categories, sports, today, type Gear } from '@/lib/model';
import {
  blankDraft,
  columnLabels,
  detectColumns,
  parseDelimited,
  tableDrafts,
  textDrafts,
  draftErrors,
  duplicateDraft,
  draftsToGear,
  type ColumnKey,
  type OrderDraft,
} from '@/lib/order-import';
type SheetData = {
  name: string;
  rows: string[][];
  images: Record<number, File>;
};
function Pick({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (s: string) => void;
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => v !== null && onChange(v)}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export default function OrderImporter({
  open,
  onClose,
  gear,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  gear: Gear[];
  onImport: (items: Gear[]) => Promise<boolean>;
}) {
  const [step, setStep] = useState<'source' | 'mapping' | 'review'>('source'),
    [text, setText] = useState(''),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(''),
    [error, setError] = useState(''),
    [drafts, setDrafts] = useState<OrderDraft[]>([]),
    [sheets, setSheets] = useState<SheetData[]>([]),
    [sheetIndex, setSheetIndex] = useState(0),
    [columns, setColumns] = useState(() => detectColumns([])),
    [priceMode, setPriceMode] = useState<'unit' | 'total'>('total'),
    [imageFiles, setImageFiles] = useState<Record<string, File>>({}),
    [photoBusy, setPhotoBusy] = useState(false);
  const worker = useRef<Worker | null>(null),
    cancelled = useRef(false);
  const current = sheets[sheetIndex];
  const selected = drafts.filter((d) => d.selected);
  const count = selected.reduce((n, d) => n + d.quantity, 0);
  const bad = selected.some((d) => draftErrors(d).length > 0);
  const duplicates = drafts.filter((d) => duplicateDraft(d, gear));
  useEffect(
    () => () => {
      cancelled.current = true;
      void worker.current?.terminate();
    },
    [],
  );
  function update(key: string, field: keyof OrderDraft, value: unknown) {
    setDrafts((old) =>
      old.map((d) =>
        d.key === key
          ? {
              ...d,
              [field]: value,
              ...(field === 'price' || field === 'quantity'
                ? { lineTotal: undefined }
                : {}),
            }
          : d,
      ),
    );
  }
  function review(next: OrderDraft[]) {
    setDrafts(next.map((d) => ({ ...d, selected: !duplicateDraft(d, gear) })));
    setError('');
    setStep('review');
  }
  async function recognize(file: File) {
    setError('');
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError('请选择 10 MB 以内的 JPG、PNG 或 WebP 截图。');
      return;
    }
    setBusy(true);
    cancelled.current = false;
    try {
      setProgress('正在准备中英文识别，首次加载可能需要一些时间…');
      const { createWorker } = await import('tesseract.js');
      const instance = await createWorker(['chi_sim', 'eng'], 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr',
        langPath: '/ocr',
        workerBlobURL: false,
        logger: (m) => {
          if (m.status === 'recognizing text')
            setProgress(`识别文字 ${Math.round(m.progress * 100)}%`);
        },
      });
      worker.current = instance;
      if (cancelled.current) {
        await instance.terminate();
        return;
      }
      const result = await instance.recognize(file);
      if (!cancelled.current) {
        setText(result.data.text);
        setProgress('识别完成，请核对下方文字，再提取装备。');
        if (!result.data.text.trim())
          setError('没有识别出文字，请换一张清晰截图，或直接粘贴订单文字。');
      }
    } catch {
      if (!cancelled.current)
        setError('截图识别未完成，请重试或粘贴订单文字。');
    } finally {
      await worker.current?.terminate();
      worker.current = null;
      setBusy(false);
    }
  }
  async function readFile(file: File) {
    setError('');
    if (file.size > 10 * 1024 * 1024) {
      setError('文件请小于 10 MB。');
      return;
    }
    setBusy(true);
    setProgress('正在读取订单表格…');
    try {
      let result: SheetData[] = [];
      if (/\.(csv|tsv)$/i.test(file.name)) {
        const bytes = await file.arrayBuffer();
        let raw = new TextDecoder('utf-8').decode(bytes);
        if (raw.includes('\uFFFD'))
          raw = new TextDecoder('gb18030').decode(bytes);
        result = [
          {
            name: file.name,
            rows: parseDelimited(
              raw,
              /\.tsv$/i.test(file.name) ? '\t' : undefined,
            ),
            images: {},
          },
        ];
      } else if (/\.xlsx$/i.test(file.name)) {
        const Excel = await import('exceljs');
        const book = new Excel.Workbook();
        await book.xlsx.load(await file.arrayBuffer());
        result = book.worksheets
          .map((ws) => {
            const rows: string[][] = [];
            if (ws.rowCount > 1001 || ws.columnCount > 80)
              throw Error('单张表最多支持 1,000 条订单和 80 列，请分批导入。');
            ws.eachRow({ includeEmpty: true }, (row) => {
              const cells: string[] = [];
              for (let i = 1; i <= ws.columnCount; i++) {
                const cell = row.getCell(i);
                cells.push(
                  cell.value instanceof Date
                    ? cell.value.toISOString().slice(0, 10)
                    : cell.text,
                );
              }
              rows.push(cells);
            });
            const images: Record<number, File> = {};
            for (const entry of ws.getImages()) {
              const image = book.getImage(Number(entry.imageId));
              if (image?.buffer && ['jpeg', 'png'].includes(image.extension)) {
                const bytes = new Uint8Array(
                  image.buffer as unknown as ArrayBuffer,
                );
                images[Math.floor(entry.range.tl.nativeRow)] = new File(
                  [bytes],
                  `gear.${image.extension}`,
                  { type: 'image/' + image.extension },
                );
              }
            }
            return { name: ws.name, rows, images };
          })
          .filter((s) => s.rows.some((r) => r.some(Boolean)));
      } else
        throw Error(
          '请上传 .xlsx、.csv 或 .tsv 文件；旧版 .xls 请先另存为 .xlsx。',
        );
      if (!result.length || !result[0].rows.length)
        throw Error('文件中没有可读取的订单。');
      result = result.map((s) => {
        const head = s.rows.findIndex(
          (r, i) => i < 10 && detectColumns(r).name >= 0,
        );
        const start = head < 0 ? 0 : head;
        return {
          ...s,
          rows: s.rows.slice(start),
          images: Object.fromEntries(
            Object.entries(s.images).map(([r, f]) => [
              Number(r) - start - 1,
              f,
            ]),
          ),
        };
      });
      if (result.some((s) => s.rows.length > 1001))
        throw Error('每次最多导入 1,000 条订单，请分批上传。');
      setSheets(result);
      setSheetIndex(0);
      setColumns(detectColumns(result[0].rows[0]));
      setPriceMode(
        /单价|单件/.test(
          result[0].rows[0][detectColumns(result[0].rows[0]).price] || '',
        )
          ? 'unit'
          : 'total',
      );
      setStep('mapping');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function mapped() {
    if (!current) return;
    const next = tableDrafts(
      current.rows.slice(1),
      columns,
      '订单表格',
      priceMode,
    );
    const files: Record<string, File> = {};
    next.forEach((d, i) => {
      const row = d.sourceRow ?? i;
      if (current.images[row]) files[d.key] = current.images[row];
    });
    setImageFiles(files);
    review(next);
  }
  async function finish() {
    setError('');
    if (!selected.length || bad || busy || photoBusy) return;
    if (gear.length + count > 1000) {
      setError('装备库最多支持 1,000 件，请减少本次选择数量。');
      return;
    }
    const keys = new Set<string>();
    for (const d of selected) {
      const k = [
        d.orderId,
        d.name.trim().toLowerCase(),
        d.size.trim().toLowerCase(),
      ].join('|');
      if (d.orderId && keys.has(k)) {
        setError(
          '本批次有重复的订单、名称和尺码，请取消重复条目，或合并数量。',
        );
        return;
      }
      keys.add(k);
    }
    setBusy(true);
    try {
      setProgress('正在保存装备…');
      const ready = [];
      for (const d of selected) {
        ready.push(
          imageFiles[d.key] && !d.image
            ? { ...d, image: await uploadGearImage(imageFiles[d.key]) }
            : d,
        );
      }
      if (await onImport(draftsToGear(ready))) {
        onClose();
      } else setError('装备未保存成功，请保留此窗口并重试。');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy && !photoBusy) onClose();
      }}
    >
      <DialogContent
        className="import-dialog"
        showCloseButton={!busy && !photoBusy}
      >
        <DialogTitle>从订单导入装备</DialogTitle>
        <DialogDescription>读取资料 → 核对信息 → 批量入库</DialogDescription>
        <div className="import-stepper">
          {[
            ['source', '01 选择资料'],
            ['mapping', '02 识别字段'],
            ['review', '03 核对入库'],
          ].map(([s, label]) => (
            <span key={s} className={step === s ? 'active' : ''}>
              {label}
            </span>
          ))}
        </div>
        {error && (
          <div className="import-error" role="alert">
            <AlertCircle size={17} />
            {error}
          </div>
        )}
        {step === 'source' && (
          <Tabs defaultValue="screenshot">
            <TabsList>
              <TabsTrigger value="screenshot">截图 / 文字</TabsTrigger>
              <TabsTrigger value="sheet">Excel / CSV</TabsTrigger>
            </TabsList>
            <TabsContent value="screenshot">
              <label className="order-upload">
                <ScanText size={28} />
                <b>上传订单截图</b>
                <span>中英文识别 · JPG / PNG / WebP</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.files?.[0]) void recognize(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              <p className="import-help">
                截图在当前浏览器内识别。可直接粘贴订单文字；每件商品用空行分开，金额填写单件实付。
              </p>
              <textarea
                aria-label="订单文字"
                className="order-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={busy}
                placeholder={
                  '商品名称：速干跑步短袖\n品牌：你的品牌\n单价：129.00\n下单日期：2026-09-01\n尺码：M\n订单编号：可选'
                }
              />
              <button
                className="primary"
                disabled={busy || !text.trim()}
                onClick={() => review(textDrafts(text))}
              >
                <ScanText size={16} />
                提取装备信息
              </button>
            </TabsContent>
            <TabsContent value="sheet">
              <label className="order-upload">
                <FileSpreadsheet size={28} />
                <b>上传订单表格</b>
                <span>.xlsx / .csv / .tsv · 最多 1,000 条</span>
                <input
                  type="file"
                  accept=".xlsx,.csv,.tsv"
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.files?.[0]) void readFile(e.target.files[0]);
                    e.target.value = '';
                  }}
                />
              </label>
              <p className="import-help">
                支持选择工作表、匹配不同平台列名和读取 Excel
                内嵌商品图片。日期、单件实付金额缺失时，可在入库前补充。
              </p>
              <a className="template-link" href="/order-template.csv" download>
                下载订单导入模板 ↓
              </a>
            </TabsContent>
          </Tabs>
        )}
        {step === 'mapping' && current && (
          <>
            <div className="mapping-top">
              <label>
                工作表
                <Pick
                  value={String(sheetIndex)}
                  label="工作表"
                  options={sheets.map((s, i) => ({
                    value: String(i),
                    label: s.name,
                  }))}
                  onChange={(v) => {
                    setSheetIndex(Number(v));
                    setColumns(detectColumns(sheets[Number(v)].rows[0]));
                  }}
                />
              </label>
              <label>
                金额口径
                <Pick
                  value={priceMode}
                  label="金额口径"
                  options={[
                    { value: 'total', label: '每行实付总额（按数量平分）' },
                    { value: 'unit', label: '单件实付金额' },
                  ]}
                  onChange={(v) => setPriceMode(v as 'unit' | 'total')}
                />
              </label>
            </div>
            <div className="column-mapping">
              {Object.entries(columnLabels).map(([key, label]) => (
                <label key={key}>
                  {label}
                  {key === 'name' && ' *'}
                  <Pick
                    value={String(columns[key as ColumnKey])}
                    label={label + '对应列'}
                    options={[
                      { value: '-1', label: '不导入此列' },
                      ...current.rows[0].map((h, i) => ({
                        value: String(i),
                        label: h || `第 ${i + 1} 列`,
                      })),
                    ]}
                    onChange={(v) =>
                      setColumns({ ...columns, [key]: Number(v) })
                    }
                  />
                  <small>
                    {columns[key as ColumnKey] >= 0
                      ? current.rows[1]?.[columns[key as ColumnKey]] ||
                        '首行为空'
                      : '稍后可手动补充'}
                  </small>
                </label>
              ))}
            </div>
            <p className="import-help">
              检测到 {current.rows.length - 1}{' '}
              条数据。不要把整笔多商品订单的总金额作为每一行商品金额，需先分摊优惠及运费。
            </p>
            <div className="import-actions">
              <button className="outline" onClick={() => setStep('source')}>
                <ChevronLeft size={15} />
                返回
              </button>
              <button
                className="primary"
                disabled={columns.name < 0}
                onClick={mapped}
              >
                预览并核对
              </button>
            </div>
          </>
        )}
        {step === 'review' && (
          <>
            <div className="review-summary">
              <div>
                <b>
                  {selected.length} 条已选 · {count} 件装备
                </b>
                <p>
                  合计 ¥
                  {selected
                    .reduce(
                      (s, d) =>
                        s +
                        (d.lineTotal ?? (Number(d.price) || 0) * d.quantity),
                      0,
                    )
                    .toFixed(2)}
                </p>
              </div>
              <button
                className="outline"
                disabled={busy}
                onClick={() => setDrafts([...drafts, blankDraft()])}
              >
                <Plus size={16} />
                补充商品
              </button>
            </div>
            {duplicates.length > 0 && (
              <p className="duplicate-notice">
                {duplicates.length}{' '}
                条与装备库中的订单、名称和尺码相同，已默认取消勾选；确需重复入库时可重新勾选。
              </p>
            )}
            <div className="order-drafts">
              {drafts.map((d, index) => (
                <article
                  className={'order-draft ' + (!d.selected ? 'unselected' : '')}
                  key={d.key}
                >
                  <div className="draft-heading">
                    <label className="check-label">
                      <Checkbox
                        checked={d.selected}
                        disabled={busy}
                        onCheckedChange={(v) => update(d.key, 'selected', !!v)}
                      />
                      <b>商品 {index + 1}</b>
                    </label>
                    <span>
                      {duplicateDraft(d, gear)
                        ? '疑似重复'
                        : draftErrors(d).length
                          ? '待补充'
                          : '可入库'}
                    </span>
                    <button
                      type="button"
                      className="outline"
                      disabled={busy}
                      aria-label={`移除商品 ${index + 1}`}
                      onClick={() =>
                        setDrafts((old) => old.filter((x) => x.key !== d.key))
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <fieldset disabled={busy}>
                    <div className="draft-fields">
                      <label className="wide">
                        商品名称
                        <input
                          value={d.name}
                          onChange={(e) =>
                            update(d.key, 'name', e.target.value)
                          }
                          maxLength={200}
                        />
                      </label>
                      <label>
                        单件实付 / 元
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={d.price}
                          onChange={(e) =>
                            update(d.key, 'price', e.target.value)
                          }
                        />
                      </label>
                      <label>
                        数量
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={d.quantity}
                          onChange={(e) =>
                            update(d.key, 'quantity', Number(e.target.value))
                          }
                        />
                      </label>
                      <label>
                        购买日期
                        <input
                          type="date"
                          max={today()}
                          value={d.date}
                          onChange={(e) =>
                            update(d.key, 'date', e.target.value)
                          }
                        />
                      </label>
                      <label>
                        尺码
                        <input
                          value={d.size}
                          onChange={(e) =>
                            update(d.key, 'size', e.target.value)
                          }
                        />
                      </label>
                      <label>
                        品牌
                        <input
                          value={d.brand}
                          onChange={(e) =>
                            update(d.key, 'brand', e.target.value)
                          }
                        />
                      </label>
                      <label>
                        订单编号
                        <input
                          value={d.orderId}
                          onChange={(e) =>
                            update(d.key, 'orderId', e.target.value)
                          }
                        />
                      </label>
                      <label>
                        运动项目
                        <Pick
                          value={d.sport}
                          label={`商品 ${index + 1} 运动项目`}
                          options={sports.map((s) => ({ value: s, label: s }))}
                          onChange={(v) => update(d.key, 'sport', v)}
                        />
                      </label>
                      <label>
                        装备类型
                        <Pick
                          value={d.category}
                          label={`商品 ${index + 1} 装备类型`}
                          options={categories.map((s) => ({
                            value: s,
                            label: s,
                          }))}
                          onChange={(v) => update(d.key, 'category', v)}
                        />
                      </label>
                    </div>
                    <div className="draft-image">
                      <PhotoEditor
                        value={d.image}
                        onChange={(v) => update(d.key, 'image', v)}
                        onBusy={setPhotoBusy}
                      />
                      {imageFiles[d.key] && !d.image && (
                        <div>
                          <PendingPhoto file={imageFiles[d.key]} />
                          <p className="import-help">
                            Excel 内嵌商品图片，确认入库时保存。
                          </p>
                        </div>
                      )}
                      <label className="image-url-field">
                        或填写图片链接
                        <input
                          type="url"
                          value={d.image.startsWith('/api/') ? '' : d.image}
                          placeholder="https://…"
                          onChange={(e) =>
                            update(d.key, 'image', e.target.value)
                          }
                        />
                      </label>
                    </div>
                  </fieldset>
                  {d.selected && draftErrors(d).length > 0 && (
                    <p className="form-error">{draftErrors(d).join(' · ')}</p>
                  )}
                  {d.lineTotal !== undefined && d.quantity > 1 && (
                    <p className="draft-warning">
                      原行实付 ¥{d.lineTotal.toFixed(2)}
                      ，分摊尾差自动分配到前几件；修改单价或数量后按修改值计算。
                    </p>
                  )}
                  {d.warnings.map((w) => (
                    <p className="draft-warning" key={w}>
                      {w}
                    </p>
                  ))}
                </article>
              ))}
            </div>
            <div className="import-actions">
              <button
                className="outline"
                disabled={busy || photoBusy}
                onClick={() => setStep(current ? 'mapping' : 'source')}
              >
                <ChevronLeft size={15} />
                返回识别
              </button>
              <button
                className="primary"
                disabled={busy || photoBusy || bad || !count}
                onClick={finish}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Check size={16} />
                )}
                确认导入 {count} 件装备
              </button>
            </div>
          </>
        )}
        {progress && (
          <p className="import-progress" role="status">
            {busy && <LoaderCircle className="spin" size={15} />} {progress}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PendingPhoto({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const value = URL.createObjectURL(file);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return url ? (
    <img className="embedded-preview" src={url} alt="Excel 内嵌商品图片预览" />
  ) : null;
}
