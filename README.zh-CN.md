# Subloom

[English](README.md) · [简体中文](README.zh-CN.md)

在 Obsidian 中管理订阅，所有记录都保存在普通 Markdown 笔记里。Subloom 将定期付款预测、已核实的付款日期和提醒汇集到一个仪表盘中。

[中文手册](https://jasonshelter0.github.io/zh-cn/subloom/) · [English manual](https://jasonshelter0.github.io/subloom/) · [个人网站](https://jasonshelter0.github.io/zh-cn/) · [Website in English](https://jasonshelter0.github.io/) · [下载 0.1.0](https://github.com/jasonshelter0/obsidian-subloom/releases/tag/0.1.0)

## 功能

- 扫描整个仓库，通过 `record_type: subscription` 或 `subscription` / `subscription/...` 标签识别订阅笔记。
- 按本地日历日期预测每周、每月和每年的扣费，并按币种分别显示月度费用估算。
- 按订阅状态、分类、付款方式和续订方式搜索与筛选。
- 将付款方式笔记关联到订阅，查看每种付款方式对应的服务。
- 将已核实的付款写入原笔记，确认后暂停或恢复订阅。
- 查看即将到来的扣费和待核实的付款，将提醒推迟一天，或标记为已知悉。

Subloom 在本地运行，无需 Dataview、Tasks、Reminder 或云服务。应用内提醒仅在 Obsidian 打开时显示。计划中的续订属于预测；只有在你核实扣款并记录后，付款才会被确认为成功。

## 安装 0.1.0

需要 **Obsidian 1.12.0 或更新版本**。

1. 从 [0.1.0 发布页面](https://github.com/jasonshelter0/obsidian-subloom/releases/tag/0.1.0)下载三个文件：[main.js](https://github.com/jasonshelter0/obsidian-subloom/releases/download/0.1.0/main.js)、[manifest.json](https://github.com/jasonshelter0/obsidian-subloom/releases/download/0.1.0/manifest.json) 和 [styles.css](https://github.com/jasonshelter0/obsidian-subloom/releases/download/0.1.0/styles.css)。
2. 创建 `<你的仓库>/.obsidian/plugins/subloom/` 文件夹，将这三个文件放进去。
3. 重新加载 Obsidian，打开**设置 → 第三方插件（Community plugins）**，必要时关闭受限模式，然后启用 **Subloom**。
4. 点击侧边栏图标，或运行 **Subloom: Open Subscription Dashboard**（打开订阅仪表盘）命令。

## 创建第一个订阅

运行 **Subloom: Add Subscription**（添加订阅），在 `Subloom/` 文件夹中创建笔记；也可以在仓库任意位置的笔记中添加以下 YAML 属性：

```yaml
---
record_type: subscription
service: 示例服务
subscription_start: 2026-10-01
billing_cycle: monthly
billing_interval: 1
amount: 12
currency: USD
auto_renew: true
remind_before: 3
subscription_lifecycle: active
---
```

确认扣款成功后，使用 **Record payment**（记录付款）。对话框会将 `last_payment_date`、`paid_through` 和 `verification_status` 写入原笔记。`paid_through` 不包含当天：`2026-11-01` 表示服务有效期在 11 月 1 日开始时结束。设置 `auto_renew: true` 并不表示付款已成功，也不会确认服务有效期。

可以在单独的测试仓库中体验[演示笔记](sample-vault/)。示例包含分散在十个文件夹中的订阅、嵌套标签、共用的付款方式，以及一个用于测试的失效付款方式链接。

## 文档

- [使用手册](https://jasonshelter0.github.io/zh-cn/subloom/)：安装、示例、仪表盘操作、提醒与故障排查。
- [数据结构（英文）](docs/DATA_SCHEMA.md)：支持的字段及其含义。
- [架构说明（英文）](docs/ARCHITECTURE.md)：索引、周期计算和视图。
- [测试计划（英文）](docs/TEST_PLAN.md)：在 Obsidian 中进行的手动检查。
- [报告问题或提出功能建议](https://github.com/jasonshelter0/obsidian-subloom/issues)。

## 开发

```bash
npm install
npm test
npm run build
```

`npm test` 运行领域逻辑测试；`npm run build` 执行类型检查并打包插件。安装时需要的文件是 `main.js`、`manifest.json` 和 `styles.css`。开发和手动检查时可使用演示笔记。
