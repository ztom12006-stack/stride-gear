# STRIDE · 运动装备管家

私人运动装备管理应用。线上访问：https://stride-kit-studio.ztom12006.chatgpt.site

## 功能

- 装备信息、实物图片、归档与使用记录
- 运动月历，按周/月/年查看次数、里程、时长及活跃天数
- 每日持有、每次使用、每公里成本
- 订单截图中英文 OCR、订单文字、Excel/CSV/TSV 导入
- 字段匹配、单件实付核对、数量拆分、重复订单提示、批量入库
- 风格化三维穿搭及身高体重、脸型调整

## 技术与数据

React 19、Vinext / Vite、Cloudflare Workers、D1、R2。
当前网站仅供所有者访问。D1 保存装备和运动记录，R2 保存装备图片。订单截图在浏览器内识别，不上传原始截图；用户确认后仅保存装备字段。
个人记录、订单、用户上传图片不进入 Git 仓库。数据库迁移一经发布不可改写。

## 本地运行

需要 Node.js >= 22.13。

```sh
npm ci
npm run db:generate
npm run build
npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_optimal_gwen_stacy.sql
npm run dev
```

访问开发服务输出的网址。请勿在已有数据库上重复执行建表 SQL。

```sh
npm run typecheck
npm test
npm run build
```

## 发布与维护

GitHub 用作源码版本管理；在线服务仍需能运行 Workers、D1 和 R2 的部署平台，不能仅用 GitHub Pages 承载。
现有 Sites 项目由 `.openai/hosting.json` 标识。更新后先运行检查，再保存源代码版本并发布到同一项目，以保留已有数据与网址。
GitHub 上的检查工作流只验证代码，不自动改变线上数据或访问权限。需要同步仓库时，请在 Codex 中连接 GitHub 并指定目标仓库。

## 图片及识别资源

`public/gear-reference` 为 Unsplash 授权的品类实拍参考，不代表示例装备的真实型号：

- 跑鞋：mostafa mahmoudi https://unsplash.com/photos/W_uDEmTq0po
- T 恤：Haryo Setyadi https://unsplash.com/photos/acn5ERAeSb4
- 短裤：Zakaria Issaad https://unsplash.com/photos/GKl-JWZmTSg
- 背包：Alice Donovan Rouse https://unsplash.com/photos/z9F_yK4Nmf8
- 许可：https://unsplash.com/license

穿搭参考：INFECTED Store / Pexels，https://www.pexels.com/photo/28774702/ 。
`public/ocr` 包含 Tesseract.js worker、Tesseract.js-core 及 eng / chi_sim 识别模型，对应许可证随源码保留。

