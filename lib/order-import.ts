import { categories, sports, today, type Gear } from './model.ts';
import { validImageUrl } from './images.ts';
export type OrderDraft = {
  key: string;
  selected: boolean;
  name: string;
  brand: string;
  sport: string;
  category: string;
  price: string;
  date: string;
  size: string;
  color: string;
  image: string;
  orderId: string;
  quantity: number;
  source: string;
  warnings: string[];
  sourceRow?: number;
  lineTotal?: number;
};
export type ColumnKey =
  | 'name'
  | 'brand'
  | 'price'
  | 'date'
  | 'size'
  | 'orderId'
  | 'quantity'
  | 'image'
  | 'sport'
  | 'category';
export const columnLabels: Record<ColumnKey, string> = {
  name: '商品名称',
  brand: '品牌',
  price: '实付金额',
  date: '下单日期',
  size: '尺码',
  orderId: '订单编号',
  quantity: '数量',
  image: '图片链接',
  sport: '运动项目',
  category: '装备类型',
};
const aliases: Record<ColumnKey, string[]> = {
  name: [
    '商品名称',
    '商品标题',
    '商品信息',
    '宝贝名称',
    '产品名称',
    '名称',
    'title',
    'name',
    'product',
  ],
  brand: ['品牌', 'brand'],
  price: [
    '单件实付',
    '实付金额',
    '实付款',
    '买家实付金额',
    '商品实付',
    '实付',
    '支付金额',
    '单价',
    'price',
    'amount',
  ],
  date: [
    '订单付款时间',
    '支付时间',
    '付款时间',
    '订单创建时间',
    '下单时间',
    '下单日期',
    '购买日期',
    '日期',
    'date',
  ],
  size: ['尺码', '规格', '商品属性', '销售属性', 'size'],
  orderId: [
    '订单编号',
    '订单号',
    '子订单编号',
    '主订单编号',
    'orderid',
    'order',
  ],
  quantity: ['购买数量', '宝贝数量', '商品数量', '数量', 'quantity', 'qty'],
  image: ['图片链接', '商品图片', '图片', 'image', 'imageurl'],
  sport: ['运动项目', '运动', 'sport'],
  category: ['装备类型', '品类', 'category'],
};
const clean = (v: string) =>
  v
    .replace(/^\uFEFF/, '')
    .replace(/[\s_\-（）()]/g, '')
    .toLowerCase();
export function detectColumns(headers: string[]): Record<ColumnKey, number> {
  return Object.fromEntries(
    Object.entries(aliases).map(([key, names]) => [
      key,
      headers.findIndex((h) => names.some((n) => clean(h) === clean(n))),
    ]),
  ) as Record<ColumnKey, number>;
}
export function parseDelimited(text: string, delimiter?: string): string[][] {
  text = text.replace(/^\uFEFF/, '');
  const first = text.split(/\r?\n/)[0] || '';
  const sep = delimiter || (first.includes('\t') ? '\t' : ',');
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (quoted) throw Error('CSV 引号未闭合，请检查文件。');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function normalizeDate(value: string): string {
  const normalized = value
    .trim()
    .replace(/[年/.]/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '');
  const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return '';
  const s = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  const d = new Date(s + 'T12:00:00Z');
  return !Number.isNaN(+d) && d.toISOString().slice(0, 10) === s ? s : '';
}
export function priceValue(value: string): string {
  const s = value.replace(/[¥￥,，元\s]/g, '');
  return /^\d+(\.\d{1,2})?$/.test(s) ? s : '';
}
function inferred(name: string) {
  return {
    category: /鞋|sneaker|shoe/i.test(name)
      ? '鞋履'
      : /裤|shorts|pants/i.test(name)
        ? '下装'
        : /衣|衫|短袖|长袖|夹克|背心|shirt|top/i.test(name)
          ? '上装'
          : '装备',
    sport: /跑|running/i.test(name)
      ? '跑步'
      : /骑|cycling/i.test(name)
        ? '骑行'
        : /徒步|登山|户外|hiking/i.test(name)
          ? '徒步'
          : /网球|tennis/i.test(name)
            ? '网球'
            : /健身|训练|training/i.test(name)
              ? '健身'
              : '其他',
  };
}
export function blankDraft(): OrderDraft {
  return {
    key: crypto.randomUUID(),
    selected: true,
    name: '',
    brand: '',
    sport: '其他',
    category: '装备',
    price: '',
    date: '',
    size: '',
    color: '#b6d2ce',
    image: '',
    orderId: '',
    quantity: 1,
    source: '订单文字',
    warnings: [],
  };
}
export function tableDrafts(
  rows: string[][],
  columns: Record<ColumnKey, number>,
  source: string,
  priceMode: 'unit' | 'total',
  imageRows: Record<number, string> = {},
): OrderDraft[] {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.some(Boolean))
    .map(({ row, index }) => {
      const get = (k: ColumnKey) =>
        columns[k] >= 0 ? row[columns[k]] || '' : '';
      const draft = blankDraft(),
        name = get('name'),
        inf = inferred(name),
        qty = Number(get('quantity') || 1),
        amount = priceValue(get('price'));
      const quantity = Number.isInteger(qty) && qty > 0 && qty <= 100 ? qty : 0;
      return {
        ...draft,
        sourceRow: index,
        lineTotal:
          priceMode === 'total' && amount !== '' ? Number(amount) : undefined,
        name,
        brand: get('brand'),
        sport: sports.includes(get('sport')) ? get('sport') : inf.sport,
        category: categories.includes(get('category'))
          ? get('category')
          : inf.category,
        price:
          amount !== '' && quantity
            ? priceMode === 'total'
              ? (Number(amount) / quantity).toFixed(2)
              : amount
            : '',
        date: normalizeDate(get('date')),
        size: get('size'),
        orderId: get('orderId'),
        quantity,
        image: imageRows[index] || get('image'),
        source,
        warnings: [
          ...(get('quantity') && !quantity ? ['数量无效'] : []),
          ...(priceMode === 'total' && quantity > 1
            ? ['行实付已按数量平分，请确认单件金额']
            : []),
          ...(!get('sport') || !get('category')
            ? ['运动项目与类型为关键词推测，请确认']
            : []),
        ],
      };
    });
}
export function textDrafts(text: string, source = '订单文字'): OrderDraft[] {
  text = text.replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g, '$1');
  const nameStarts = [
    ...text.matchAll(/^(?:商品名称|商品标题|宝贝名称|产品名称|名称)\s*[:：]/gm),
  ].map((m) => m.index);
  const preamble = nameStarts.length ? text.slice(0, nameStarts[0]) : '';
  const blocks =
    nameStarts.length > 1
      ? nameStarts.map(
          (start, i) =>
            preamble + text.slice(start, nameStarts[i + 1] ?? text.length),
        )
      : [text.trim()];
  return blocks
    .filter((b) => b.trim())
    .map((block) => {
      const d = blankDraft(),
        lines = block
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean);
      const get = (labels: string[]) => {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          for (const label of labels) {
            if (line === label && lines[i + 1]) return lines[i + 1];
            const m = line.match(
              new RegExp('^' + label + '\\s*(?:[:：]\\s*|\\s+)(.+)$', 'i'),
            );
            if (m) return m[1];
          }
        }
        return '';
      };
      const name =
        get(aliases.name) ||
        lines.find(
          (l) =>
            l.length > 3 &&
            !/订单|实付|合计|运费|收货|地址|电话|支付|快递|交易|卖家|买家|金额|价格|尺码|规格|数量|日期|时间|^\d+$/.test(
              l,
            ),
        ) ||
        '';
      const inf = inferred(name);
      const price = priceValue(get(['单件实付', '单价', ...aliases.price])),
        date = normalizeDate(
          get(aliases.date) ||
            block.match(/\d{4}[年/.-]\d{1,2}[月/.-]\d{1,2}日?/)?.[0] ||
            '',
        );
      const qty = Number(get(aliases.quantity) || 1);
      return {
        ...d,
        name,
        brand: get(aliases.brand),
        sport: inf.sport,
        category: inf.category,
        price,
        date,
        orderId: get(aliases.orderId).replace(/\s/g, ''),
        size: get(aliases.size),
        quantity: Number.isInteger(qty) && qty >= 1 && qty <= 100 ? qty : 0,
        image: get(aliases.image),
        source,
        warnings: [
          '文字识别结果需核对；金额应为单件实付。多商品订单请分别添加条目。',
        ],
      };
    })
    .slice(0, 100);
}
export function draftErrors(d: OrderDraft) {
  const errors = [];
  if (!d.name.trim()) errors.push('缺少商品名称');
  if (
    d.name.length > 200 ||
    d.brand.length > 200 ||
    d.size.length > 200 ||
    d.orderId.length > 200
  )
    errors.push('字段长度超出限制');
  if (!normalizeDate(d.date) || d.date > today())
    errors.push('补全有效购买日期');
  if (priceValue(d.price) === '' || Number(d.price) > 10000000)
    errors.push('补全有效单件实付金额');
  if (!Number.isInteger(d.quantity) || d.quantity < 1 || d.quantity > 100)
    errors.push('数量应为 1–100');
  if (!validImageUrl(d.image)) errors.push('图片需为 HTTPS 链接或已上传图片');
  return errors;
}
export function orderKey(
  orderId: string,
  name: string,
  size: string,
  index: number,
) {
  return [
    orderId,
    name.trim().toLowerCase(),
    size.trim().toLowerCase(),
    index,
  ].join('|');
}
export function duplicateDraft(d: OrderDraft, gear: Gear[]) {
  return (
    !!d.orderId &&
    gear.some(
      (g) =>
        g.orderId === d.orderId &&
        g.name.trim().toLowerCase() === d.name.trim().toLowerCase() &&
        g.size.trim().toLowerCase() === d.size.trim().toLowerCase(),
    )
  );
}
export function draftsToGear(drafts: OrderDraft[]): Gear[] {
  return drafts
    .filter((d) => d.selected)
    .flatMap((d) =>
      Array.from({ length: d.quantity }, (_, index) => ({
        id: crypto.randomUUID(),
        name: d.name.trim(),
        brand: d.brand.trim(),
        sport: d.sport,
        category: d.category,
        price:
          d.lineTotal === undefined
            ? Number(d.price)
            : (Math.floor(Math.round(d.lineTotal * 100) / d.quantity) +
                (index < Math.round(d.lineTotal * 100) % d.quantity ? 1 : 0)) /
              100,
        date: d.date,
        size: d.size.trim(),
        color: d.color,
        image: d.image,
        archived: false,
        orderId: d.orderId.trim(),
        source: d.source,
        importKey: d.orderId
          ? orderKey(d.orderId, d.name, d.size, index).slice(0, 200)
          : undefined,
      })),
    );
}
