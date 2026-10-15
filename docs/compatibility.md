# 兼容性与验证

目标：DeepSeek Harness 0.2.0-rc.2，Node.js 22+。

- 模型身份取自公开的会话级 ModelDirectory。
- 插件以不可见标记绑定当前输入框的 standardControls，并适配原生模型标签。rc.2 插槽的 display:contents 包装已纳入构建产物回归。
- 未匹配的控件保留原生显示；禁用与卸载恢复原节点。
- 已在 macOS 桌面 DSH 实测原生模型按钮、菜单和设置页；其他系统未实测。
- 升级宿主后须重新核验控件结构，不能仅靠 TypeScript 检查认定兼容。

运行 `npm run check` 检查精确依赖、类型、构建、Node 测试与 Chromium 浏览器夹具。夹具不是额外的 DSH 实例，不读取账号或会话。
