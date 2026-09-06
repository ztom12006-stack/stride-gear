# STRIDE · 运动装备管家

纯 GitHub Pages 版本，不使用 ChatGPT 托管、数据库或图片存储。

## 功能与保存方式

装备管理与图片、运动月历和周期统计、成本分摊、穿搭实验室、订单截图 OCR / 文字 / Excel / CSV 导入。
记录及压缩后的图片存入当前浏览器的 IndexedDB。每位访客独立保存，无需登录，不跨设备自动同步。
页面支持导出与恢复 JSON 备份（包含装备图片）。清理站点数据或隐私浏览结束可能导致数据丢失，请定期备份。
旧网站的记录不会自动迁移到新域名；本仓库不包含个人记录或订单数据。

## 本地运行与检查

需要 Node.js 24。

```sh
npm ci
npm run dev:pages
npm run typecheck
npm test
npm run build:pages
```

构建结果位于 `dist-pages/`，路径前缀为 `/stride-gear/`。

## GitHub Pages 发布

在仓库 Settings → Pages → Build and deployment 中将 Source 设为 GitHub Actions。
工作流 `Deploy GitHub Pages` 会在 main 更新时检查并发布，也支持 Actions 页面手动 Run workflow。
启用并成功发布后，网址为 https://ztom12006-stack.github.io/stride-gear/ 。
GitHub Free 需要公开仓库才能使用 Pages；私有仓库需要支持 Pages 的付费套餐。
旧 Workers 代码保留用于历史兼容，Pages 构建不会打包或调用旧数据库、API 或托管服务。

## 图片及识别资源

`public/gear-reference` 为 Unsplash 授权的品类实拍参考，不代表示例装备的真实型号：

- 跑鞋：mostafa mahmoudi https://unsplash.com/photos/W_uDEmTq0po
- T 恤：Haryo Setyadi https://unsplash.com/photos/acn5ERAeSb4
- 短裤：Zakaria Issaad https://unsplash.com/photos/GKl-JWZmTSg
- 背包：Alice Donovan Rouse https://unsplash.com/photos/z9F_yK4Nmf8
- 许可：https://unsplash.com/license

穿搭参考：INFECTED Store / Pexels，https://www.pexels.com/photo/28774702/ 。
`public/ocr` 包含 Tesseract.js worker、Tesseract.js-core 及 eng / chi_sim 识别模型，对应许可证随源码保留。
