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

## 自动抠图与换装

照片使用 U²-Net 的轻量 U2NetP 模型在浏览器本地分割，保留透明 PNG，白色卡片展示。
已经包含透明背景的图片直接保留透明度。抠图失败会保留原有装备图片，可重试或选择原图。
模型从 rembg 的公开固定发行版取得，构建时校验其 MD5；ONNX Runtime Web 运行文件从锁定的依赖中复制。
模型和运行时随 GitHub Pages 同源发布，用户照片不会发送到模型下载服务。
首次使用需要下载推理资源。轻量模型不等同于苹果的主体识别，复杂背景可能需要重拍或使用现成透明 PNG。
人物是原创 SVG 平面装扮娃娃，实物图按装备类别分层叠放，可调整位置与大小，并随人物配置保存。
这是搭配示意，不进行真实人体形变或尺码预测。旧数据无需迁移，缺少 outfit 字段时使用基础穿搭。

资源出处：U²-Net (https://github.com/xuebinqin/U-2-Net, Apache-2.0)，rembg 模型分发 (https://github.com/danielgatis/rembg)，ONNX Runtime 1.22.0 (https://github.com/microsoft/onnxruntime, MIT)。许可证与运行时第三方声明位于 public/cutout。

## 浏览与角色视图

我的装备采用横向条目，手机上图片与信息在首行、成本统计在次行。穿搭实验室默认显示原创程序建模的 3D 运动角色，可拖动旋转（键盘左右方向键旋转、Home 回正面），提供独立的照片换装视图。3D 使用基础运动服版型显示配色与体型；照片换装保留具体装备的透明图片、位置和大小配置，不把照片宣称为真实三维服装。3D 依赖 WebGL，不支持时可使用照片换装。
