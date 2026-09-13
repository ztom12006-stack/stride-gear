import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';
import { mutateState, readState } from './state-store.mjs';

const sports = ['跑步', '健身', '骑行', '徒步', '网球', '其他'];
const categories = ['鞋履', '上装', '下装', '装备'];
const today = () => new Date().toISOString().slice(0, 10);
const id = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const list = (items) => items.map((item) => ({ id: item.id, name: item.name, sport: item.sport, category: item.category, brand: item.brand, archived: item.archived, price: item.price }));
const result = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value });
const fail = (message) => ({ content: [{ type: 'text', text: message }], isError: true });
const isSport = (value) => sports.includes(value);
const isCategory = (value) => categories.includes(value);

const server = new McpServer(
  { name: 'stride-gear', version: '0.2.0' },
  { instructions: '管理本机 STRIDE 运动装备库。读取工具可直接使用；写入工具会改动本机 SQLite 数据，先概述将要新增或修改的内容。不要删除装备，使用 archive_gear 归档。图片仅保存在本机装备数据中，不要把图片内容发送到外部。' },
);

server.registerTool('get_gear_library', {
  description: '读取本机装备库，可按运动项目和归档状态筛选。',
  inputSchema: { sport: z.string().optional(), includeArchived: z.boolean().optional() },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
}, async ({ sport, includeArchived = false }) => {
  const state = readState().state;
  return result({ gear: list(state.gear.filter((item) => (!sport || item.sport === sport) && (includeArchived || !item.archived))), count: state.gear.length });
});

server.registerTool('get_activity_summary', {
  description: '读取运动次数、时长、里程和最近记录。',
  inputSchema: { sport: z.string().optional(), limit: z.number().int().min(1).max(50).optional() },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
}, async ({ sport, limit = 10 }) => {
  const state = readState().state;
  const workouts = state.workouts.filter((item) => !sport || item.sport === sport);
  return result({ count: workouts.length, minutes: workouts.reduce((sum, item) => sum + item.minutes, 0), km: workouts.reduce((sum, item) => sum + item.km, 0), recent: [...workouts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit) });
});

server.registerTool('create_gear', {
  description: '将一件装备加入本机装备库。',
  inputSchema: { name: z.string().min(1).max(200), brand: z.string().max(200).optional(), sport: z.string(), category: z.string(), price: z.number().min(0).max(10000000), date: z.string().optional(), size: z.string().max(200).optional(), color: z.string().optional() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
}, async (input) => {
  if (!isSport(input.sport) || !isCategory(input.category)) return fail('运动项目或装备品类不支持。');
  const gear = { id: id('gear'), name: input.name.trim(), brand: input.brand?.trim() || '未填写品牌', sport: input.sport, category: input.category, price: input.price, date: input.date || today(), size: input.size?.trim() || '未填写尺码', color: input.color || '#879f74', archived: false };
  mutateState((state) => state.gear.push(gear));
  return result({ created: gear });
});

server.registerTool('update_gear', {
  description: '更新一件已有装备的名称、品牌、价格、尺码、颜色或运动分类。',
  inputSchema: { id: z.string(), name: z.string().min(1).max(200).optional(), brand: z.string().max(200).optional(), sport: z.string().optional(), category: z.string().optional(), price: z.number().min(0).max(10000000).optional(), date: z.string().optional(), size: z.string().max(200).optional(), color: z.string().optional() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
}, async (input) => {
  if ((input.sport && !isSport(input.sport)) || (input.category && !isCategory(input.category))) return fail('运动项目或装备品类不支持。');
  let updated;
  try {
    mutateState((state) => {
      const gear = state.gear.find((item) => item.id === input.id);
      if (!gear) throw new Error('未找到这件装备。');
      for (const key of ['name', 'brand', 'sport', 'category', 'price', 'date', 'size', 'color']) if (input[key] !== undefined) gear[key] = typeof input[key] === 'string' ? input[key].trim() : input[key];
      updated = gear;
    });
  } catch (error) { return fail(error.message); }
  return result({ updated });
});

server.registerTool('archive_gear', {
  description: '归档一件装备；保留它的历史运动记录与成本统计。',
  inputSchema: { id: z.string(), archived: z.boolean().optional() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
}, async ({ id: gearId, archived = true }) => {
  let gear;
  try {
    mutateState((state) => { gear = state.gear.find((item) => item.id === gearId); if (!gear) throw new Error('未找到这件装备。'); gear.archived = archived; });
  } catch (error) { return fail(error.message); }
  return result({ archived: gear });
});

server.registerTool('record_workout', {
  description: '记录一次运动，并关联本机装备。',
  inputSchema: { sport: z.string(), minutes: z.number().int().min(1).max(1440), km: z.number().min(0).max(1000).optional(), date: z.string().optional(), gearIds: z.array(z.string()).max(100).optional() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
}, async (input) => {
  if (!isSport(input.sport)) return fail('运动项目不支持。');
  let workout;
  try {
    mutateState((state) => {
      const gearIds = input.gearIds || [];
      if (!gearIds.every((gearId) => state.gear.some((item) => item.id === gearId))) throw new Error('有装备编号不在当前装备库中。');
      workout = { id: id('workout'), sport: input.sport, minutes: input.minutes, km: input.km || 0, date: input.date || today(), gear: gearIds };
      state.workouts.push(workout);
    });
  } catch (error) { return fail(error.message); }
  return result({ recorded: workout });
});

server.registerTool('save_outfit', {
  description: '把一组装备保存为可复用的运动套装。',
  inputSchema: { name: z.string().min(1).max(200), sport: z.string(), gearIds: z.array(z.string()).min(1).max(100), note: z.string().max(200).optional() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
}, async (input) => {
  if (!isSport(input.sport)) return fail('运动项目不支持。');
  let outfit;
  try {
    mutateState((state) => {
      if (!input.gearIds.every((gearId) => state.gear.some((item) => item.id === gearId))) throw new Error('有装备编号不在当前装备库中。');
      outfit = { id: id('outfit'), name: input.name.trim(), sport: input.sport, gear: [...new Set(input.gearIds)], note: input.note?.trim() || undefined, createdAt: today(), updatedAt: today() };
      state.outfits = [...(state.outfits || []), outfit];
    });
  } catch (error) { return fail(error.message); }
  return result({ saved: outfit });
});

server.registerTool('get_saved_outfits', {
  description: '读取已保存的运动套装及其关联装备。',
  inputSchema: {},
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
}, async () => {
  const state = readState().state;
  return result({ outfits: (state.outfits || []).map((outfit) => ({ ...outfit, items: outfit.gear.map((gearId) => state.gear.find((item) => item.id === gearId)).filter(Boolean).map((item) => ({ id: item.id, name: item.name, category: item.category })) })) });
});

await server.connect(new StdioServerTransport());
