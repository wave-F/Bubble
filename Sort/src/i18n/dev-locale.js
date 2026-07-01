const STORAGE_KEY = "fruit_dev_locale_v1";

const MESSAGES = {
  zh: {
    "index.debug.levelTestAria": "关卡测试工具",
    "index.debug.levelTestToggle": "测试关卡",
    "index.debug.selectLevel": "选择关卡",
    "index.debug.jumpLevel": "切换到该关",
    "index.debug.clearData": "清空数据",
    "index.debug.exportTuning": "导出调参 JSON",
    "index.debug.exportTuningOk": "已导出 {{n}} 项调参到 JSON 文件",
    "index.debug.exportTuningEmpty": "本地没有可导出的调参（请先在调试面板保存）",
    "index.debug.exportTuningClipboardOk": "已复制 {{n}} 项调参 JSON 到剪贴板，可粘贴给助手更新代码",
    "index.debug.exportTuningDownloadFallback": "无法写入剪贴板，已改为下载 JSON（{{n}} 项）",
    "index.debug.exportTuningClipboardFail": "导出失败，请重试",
    "index.debug.addCoins": "测试 +50 金币",
    "index.debug.clearConfirm": "清除关卡进度、金币和设置数据？",
    "index.debug.dataCleared": "已清除数据，从第一关重新开始。",
    "index.debug.coinsAdded": "测试：已增加 50 金币",
    "index.debug.levelSwitched": "测试模式：已切换到第 {{n}} 关",
    "index.debug.lightAria": "光源调试",
    "index.debug.lightToggle": "光源调试",
    "index.debug.lightTitle": "场景光源",
    "index.debug.lightAmbient": "环境光",
    "index.debug.lightKey": "主光",
    "index.debug.lightRim": "轮廓光",
    "index.debug.lightFill": "补光",
    "index.debug.lightEnvironment": "环境贴图",
    "index.debug.lightReset": "重置默认",
    "index.debug.popRingAria": "爆炸圆环调试",
    "index.debug.popRingToggle": "爆炸圆环",
    "index.debug.popRingTitle": "泡泡爆炸圆环",
    "index.debug.popRingEnabled": "弹出时显示圆环",
    "index.debug.popRingShape": "轮廓形状",
    "index.debug.popRingShapeRing": "圆环",
    "index.debug.popRingShapeCross": "十字",
    "index.debug.popRingShapeStar": "圆角四角星",
    "index.debug.popRingScaleStart": "起始缩放",
    "index.debug.popRingScaleEnd": "最大缩放",
    "index.debug.popRingInner": "圆环内径",
    "index.debug.popRingOuter": "圆环外径",
    "index.debug.popRingDuration": "时长（秒）",
    "index.debug.popRingOpacity": "峰值透明度",
    "index.debug.popRingLightness": "亮度提升",
    "index.debug.popRingReset": "重置默认",
    "index.debug.bubblePopAria": "邻格泡泡弹出调试",
    "index.debug.bubblePopToggle": "泡泡弹出",
    "index.debug.bubblePopTitle": "邻格闪光",
    "index.debug.bubblePopFlashWhite": "白色闪光",
    "index.debug.bubblePopFlashLight": "浅色泡泡闪光",
    "index.debug.bubblePopLightness": "亮度提升",
    "index.debug.bubblePopReset": "重置默认",
    "index.gameplay.restartAria": "重新开始",

    "bubble.pageTitle": "泡泡材质调试 - WebGPU",
    "bubble.title": "单泡泡调试面板 (WebGPU + TSL)",
    "bubble.subInfo": "按住泡泡施压，压到形变后会爆炸；颜色请用上方色块切换",
    "bubble.compat.webgpuHint": "WebGPU 初始化失败时会在这里提示",
    "bubble.compat.version": "调试页版本: {{tag}}",
    "bubble.compat.syncOk": "已同步到主游戏。返回后开局会自动应用。",
    "bubble.compat.syncOkRepo": "已同步到主游戏并写入代码（dev-tuning.defaults.json）。刷新主游戏后生效，记得提交 Git。",
    "bubble.compat.syncOkLocalOnly": "已同步到本地浏览器；写入代码失败：{{reason}}",
    "bubble.compat.syncFail": "同步失败：浏览器不允许写入本地存储。",
    "bubble.compat.exportTuningOk": "已导出 {{n}} 项调参到 JSON 文件",
    "bubble.compat.exportTuningEmpty": "本地没有可导出的调参",
    "bubble.compat.exportTuningClipboardOk": "已复制 {{n}} 项调参 JSON 到剪贴板",
    "bubble.compat.exportTuningDownloadFallback": "无法写入剪贴板，已改为下载 JSON",
    "bubble.compat.exportTuningClipboardFail": "导出失败，请重试",
    "bubble.compat.initFail": "初始化失败：浏览器可能不支持 WebGPU/WebGL2。",
    "bubble.panel.title": "参数调试面板",
    "bubble.panel.hint": "用于调单泡泡视觉，确认后再搬回游戏主界面。",
    "bubble.ctrl.transmission": "透射强度",
    "bubble.ctrl.roughness": "表面粗糙度",
    "bubble.ctrl.clearcoat": "镜面清漆",
    "bubble.ctrl.wobble": "表面抖动幅度",
    "bubble.ctrl.flow": "染料流动速度",
    "bubble.ctrl.dye": "染料对比度",
    "bubble.ctrl.edge": "边缘发光",
    "bubble.ctrl.iri": "虹彩强度",
    "bubble.ctrl.springTension": "弹性回弹",
    "bubble.ctrl.springDamping": "弹性阻尼",
    "bubble.ctrl.lightKey": "主光强度",
    "bubble.ctrl.lightAmbient": "环境光强度",
    "bubble.ctrl.popProgress": "爆炸动画进度",
    "bubble.press.title": "按压形变",
    "bubble.press.hint": "体积守恒压扁 + 触点凹陷（法线弯曲 + 粗糙度提升 + HDRI 反射）。拖动「按压预览」直接看效果。",
    "bubble.ctrl.pressPreview": "按压预览",
    "bubble.ctrl.pressFillRate": "按压蓄力速度",
    "bubble.ctrl.pressSpringMax": "整体压扁强度",
    "bubble.ctrl.pressContactStrength": "按压接触强度",
    "bubble.ctrl.pressCompress": "镜头方向压缩",
    "bubble.ctrl.pressExpand": "屏幕平面鼓胀",
    "bubble.ctrl.centerDentDepth": "中心凹陷深度",
    "bubble.ctrl.centerDentRadius": "中心凹陷半径",
    "bubble.ctrl.centerDentPower": "中心凹陷锐度",
    "bubble.ctrl.centerDentNormal": "凹陷法线弯曲",
    "bubble.ctrl.centerDentRoughness": "凹陷粗糙度提升",
    "bubble.toggle.dye": "内部染料流动",
    "bubble.toggle.edge": "边缘发光",
    "bubble.toggle.iri": "虹彩薄膜",
    "bubble.toggle.bomb": "炸弹泡泡模式",
    "bubble.btn.pop": "播放爆炸动画",
    "bubble.btn.previewArrowFlight": "预览飞行箭头",
    "bubble.ctrl.arrowOutlineScale": "箭头描边放大",
    "bubble.ctrl.arrowOutlineZ": "箭头描边 Z",
    "bubble.help.arrowFlight": "飞行预览：箭头在泡泡下方穿过；到达时目标泡泡会变色并弹跳（与游戏中穿刺一致）。",
    "bubble.btn.reset": "恢复默认参数",
    "bubble.btn.sync": "一键同步到主游戏",
    "bubble.btn.exportTuning": "导出调参 JSON",
    "bubble.btn.back": "返回主游戏",

    "editor.pageTitle": "染色关卡编辑器",
    "editor.heading": "染色关卡编辑器",
    "editor.subHtml": "点击格子涂抹颜色，导出带 <code>cells</code> 的固定布局。游戏会优先使用 <code>cells</code>，不再依赖 seed 洗牌。",
    "editor.section.params": "关卡参数",
    "editor.label.name": "名称",
    "editor.label.id": "ID",
    "editor.label.stepLimit": "步数上限",
    "editor.label.grid": "棋盘",
    "editor.label.difficulty": "难度",
    "editor.addLevel.open": "+ 新建关卡",
    "editor.addLevel.blank": "空白关卡",
    "editor.addLevel.generate": "生成关卡（同色过关）",
    "editor.generate.working": "正在生成关卡…",
    "editor.generate.workingLarge": "正在生成 5×5 关卡（后台求解，请稍候）…",
    "editor.generate.step.layout": "5×5：随机布局（{{count}} 色）…",
    "editor.generate.step.backward": "5×5：反向加难 {{current}}/{{total}}…",
    "editor.generate.step.certify": "5×5：计算最优步数…",
    "editor.generate.failed": "生成失败：未找到符合难度的可解布局，请改棋盘/难度后重试",
    "editor.generate.failedLarge": "5×5 生成超时：可改用 4×4、降低难度，或再试一次",
    "editor.generate.summary": "已生成：最优 {{optimal}} 步，步数上限 {{limit}}",
    "editor.section.brush": "画笔",
    "editor.btn.fillSeed": "用 seed 填充",
    "editor.btn.clear": "清空",
    "editor.btn.loadFile": "导入 JSON",
    "editor.section.board": "棋盘",
    "editor.btn.playtest": "试玩本关",
    "editor.btn.rerollGenerate": "重新生成",
    "editor.reroll.includeArrows": "重新生成时加入 1–3 个箭头泡泡（计入求解）",
    "editor.btn.solve": "计算最优步数",
    "editor.section.export": "导出",
    "editor.btn.save": "保存到关卡文件",
    "editor.btn.export": "更新 JSON 预览",
    "editor.btn.copy": "复制当前关卡",
    "editor.btn.download": "下载 levels.json",
    "editor.btn.saving": "保存中…",
    "editor.btn.saved": "已保存",
    "editor.btn.saveFail": "保存失败",
    "editor.btn.needDevServer": "需 dev 服务器",
    "editor.btn.copied": "已复制",
    "editor.btn.solving": "计算中…",
    "editor.save.title": "请用 npm run dev 启动开发服务器后再保存",
    "editor.stats.colors": "颜色分布：{{text}}",
    "editor.stats.none": "无",
    "editor.solve.timeout": "最优解：{{seconds}} 秒内未算完（5×5 可手试，或稍后再算）",
    "editor.solve.notFound": "最优解：未找到（40 步内无解）",
    "editor.solve.zero": "最优解：0 步（开局已同色）",
    "editor.solve.partial": "最优解：至少 {{steps}} 步（未还原完整路径）",
    "editor.solve.tight": "最优解：{{steps}} 步（当前上限 {{limit}}，偏紧）",
    "editor.solve.exact": "最优解：{{steps}} 步（与上限相同）",
    "editor.solve.margin": "最优解：{{steps}} 步（上限 {{limit}}，余量 +{{margin}}）",
    "editor.solve.computingLarge": "最优解：计算中（5×5，最多 {{seconds}} 秒）…",
    "editor.solve.computing": "最优解：计算中…",
    "editor.solve.failed": "最优解：计算失败（{{message}}）",
    "editor.save.failed": "保存失败：{{message}}（请用 npm run dev 启动服务器）",
    "editor.load.failed": "无法加载 {{url}}",
    "editor.color.0": "红",
    "editor.color.1": "橙",
    "editor.color.2": "绿",
    "editor.color.3": "蓝",
    "editor.color.4": "紫",
    "editor.color.5": "黄",
    "editor.color.6": "粉",
    "editor.color.7": "青",
    "editor.cell.title": "({{col}}, {{row}}) = {{name}}",
    "editor.palette.title": "{{id}}: {{name}}",

    "playtest.title": "试玩",
    "playtest.status.playing": "点击泡泡捏碎：自己消失，四邻染成源色",
    "playtest.status.win": "过关！剩余泡泡颜色已统一",
    "playtest.status.lose": "失败：步数用尽，颜色未统一",
    "playtest.status.previewDone": "解法预览完成：共 {{total}} 步",
    "playtest.status.preview": "解法预览：{{current}} / {{total}}",
    "playtest.steps": "剩余步数：{{remaining}} / {{limit}}",
    "playtest.optimal.timeout": "最优步数：超时未算完（可继续手玩）",
    "playtest.optimal.notFound": "最优步数：未找到解（40 步内）",
    "playtest.optimal.zero": "最优步数：0（开局已同色）",
    "playtest.optimal.noPath": "最优步数：{{steps}}（路径未就绪）",
    "playtest.optimal.steps": "最优步数：{{steps}}",
    "playtest.optimal.computing": "最优步数：计算中…",
    "playtest.levelTitle": "关卡 {{id}}",
    "playtest.cell.removed": "({{col}}, {{row}}) 已消除",
    "playtest.cell.color": "({{col}}, {{row}}) {{name}}",
    "playtest.btn.preview": "解法预览",
    "playtest.btn.previewPlay": "自动播放",
    "playtest.btn.previewStep": "下一步",
    "playtest.btn.previewStop": "停止预览",
    "playtest.btn.restart": "重来",
    "playtest.btn.close": "关闭",
    "playtest.closeAria": "关闭试玩",
    "playtest.dialogAria": "关卡试玩",
  },
  en: {
    "index.debug.levelTestAria": "Level test tools",
    "index.debug.levelTestToggle": "Test levels",
    "index.debug.selectLevel": "Select level",
    "index.debug.jumpLevel": "Jump to level",
    "index.debug.clearData": "Clear save data",
    "index.debug.exportTuning": "Export tuning JSON",
    "index.debug.exportTuningOk": "Exported {{n}} tuning keys to JSON",
    "index.debug.exportTuningEmpty": "No tuning in localStorage to export",
    "index.debug.exportTuningClipboardOk": "Copied {{n}} tuning keys as JSON — paste here to update code defaults",
    "index.debug.exportTuningDownloadFallback": "Clipboard blocked; downloaded JSON instead ({{n}} keys)",
    "index.debug.exportTuningClipboardFail": "Export failed — try again",
    "index.debug.addCoins": "Test +50 coins",
    "index.debug.clearConfirm": "Clear level progress, coins, and settings?",
    "index.debug.dataCleared": "Save data cleared. Restarting from level 1.",
    "index.debug.coinsAdded": "Test: +50 coins added",
    "index.debug.levelSwitched": "Test mode: switched to level {{n}}",
    "index.debug.lightAria": "Lighting debug",
    "index.debug.lightToggle": "Lighting",
    "index.debug.lightTitle": "Scene lights",
    "index.debug.lightAmbient": "Ambient",
    "index.debug.lightKey": "Key",
    "index.debug.lightRim": "Rim",
    "index.debug.lightFill": "Fill",
    "index.debug.lightEnvironment": "Environment map",
    "index.debug.lightReset": "Reset defaults",
    "index.debug.popRingAria": "Pop ring debug",
    "index.debug.popRingToggle": "Pop ring",
    "index.debug.popRingTitle": "Pop burst ring",
    "index.debug.popRingEnabled": "Show ring on pop",
    "index.debug.popRingShape": "Outline shape",
    "index.debug.popRingShapeRing": "Ring",
    "index.debug.popRingShapeCross": "Cross",
    "index.debug.popRingShapeStar": "Rounded star (4)",
    "index.debug.popRingScaleStart": "Scale start",
    "index.debug.popRingScaleEnd": "Scale end",
    "index.debug.popRingInner": "Ring inner",
    "index.debug.popRingOuter": "Ring outer",
    "index.debug.popRingDuration": "Duration (s)",
    "index.debug.popRingOpacity": "Opacity peak",
    "index.debug.popRingLightness": "Lightness +",
    "index.debug.popRingReset": "Reset defaults",
    "index.debug.bubblePopAria": "Bubble pop flash debug",
    "index.debug.bubblePopToggle": "Bubble pop",
    "index.debug.bubblePopTitle": "Neighbour pop flash",
    "index.debug.bubblePopFlashWhite": "White flash",
    "index.debug.bubblePopFlashLight": "Light bubble flash",
    "index.debug.bubblePopLightness": "Lightness +",
    "index.debug.bubblePopReset": "Reset defaults",
    "index.gameplay.restartAria": "Restart level",

    "bubble.pageTitle": "Bubble material debug - WebGPU",
    "bubble.title": "Single-bubble debug (WebGPU + TSL)",
    "bubble.subInfo": "Press and hold to deform; pops after enough pressure. Use swatches above to change color.",
    "bubble.compat.webgpuHint": "WebGPU init errors appear here",
    "bubble.compat.version": "Debug build: {{tag}}",
    "bubble.compat.syncOk": "Synced to main game. Start a round to apply.",
    "bubble.compat.syncOkRepo": "Synced to main game and written to code (dev-tuning.defaults.json). Refresh the game, then commit to Git.",
    "bubble.compat.syncOkLocalOnly": "Synced to browser only; failed to write code: {{reason}}",
    "bubble.compat.syncFail": "Sync failed: localStorage is blocked.",
    "bubble.compat.exportTuningOk": "Exported {{n}} tuning keys to JSON",
    "bubble.compat.exportTuningEmpty": "No tuning in localStorage to export",
    "bubble.compat.exportTuningClipboardOk": "Copied {{n}} tuning keys to clipboard",
    "bubble.compat.exportTuningDownloadFallback": "Clipboard blocked; downloaded JSON instead",
    "bubble.compat.exportTuningClipboardFail": "Export failed — try again",
    "bubble.compat.initFail": "Init failed: WebGPU/WebGL2 may be unavailable.",
    "bubble.panel.title": "Material tuning",
    "bubble.panel.hint": "Tune one bubble, then sync back to the main game.",
    "bubble.ctrl.transmission": "Transmission",
    "bubble.ctrl.roughness": "Roughness",
    "bubble.ctrl.clearcoat": "Clearcoat",
    "bubble.ctrl.wobble": "Surface wobble",
    "bubble.ctrl.flow": "Dye flow speed",
    "bubble.ctrl.dye": "Dye contrast",
    "bubble.ctrl.edge": "Edge glow",
    "bubble.ctrl.iri": "Iridescence",
    "bubble.ctrl.springTension": "Spring tension",
    "bubble.ctrl.springDamping": "Spring damping",
    "bubble.ctrl.lightKey": "Key light",
    "bubble.ctrl.lightAmbient": "Ambient light",
    "bubble.ctrl.popProgress": "Pop animation",
    "bubble.press.title": "Press deformation",
    "bubble.press.hint": "Volume-preserving squash + contact dent (normals, roughness, HDRI). Drag press preview to test.",
    "bubble.ctrl.pressPreview": "Press preview",
    "bubble.ctrl.pressFillRate": "Press fill rate",
    "bubble.ctrl.pressSpringMax": "Global squash",
    "bubble.ctrl.pressContactStrength": "Contact strength",
    "bubble.ctrl.pressCompress": "View-axis compress",
    "bubble.ctrl.pressExpand": "Screen-plane bulge",
    "bubble.ctrl.centerDentDepth": "Center dent depth",
    "bubble.ctrl.centerDentRadius": "Center dent radius",
    "bubble.ctrl.centerDentPower": "Center dent sharpness",
    "bubble.ctrl.centerDentNormal": "Dent normal bend",
    "bubble.ctrl.centerDentRoughness": "Dent roughness boost",
    "bubble.toggle.dye": "Internal dye flow",
    "bubble.toggle.edge": "Edge glow",
    "bubble.toggle.iri": "Thin-film iridescence",
    "bubble.toggle.bomb": "Bomb bubble mode",
    "bubble.btn.pop": "Play pop animation",
    "bubble.btn.previewArrowFlight": "Preview flying arrow",
    "bubble.ctrl.arrowOutlineScale": "Arrow outline scale",
    "bubble.ctrl.arrowOutlineZ": "Arrow outline Z",
    "bubble.help.arrowFlight": "Flight preview: arrow travels under bubbles; lane bubbles recolor and bounce on pierce (like in-game).",
    "bubble.btn.reset": "Reset defaults",
    "bubble.btn.sync": "Sync to main game",
    "bubble.btn.exportTuning": "Export tuning JSON",
    "bubble.btn.back": "Back to main game",

    "editor.pageTitle": "Color level editor",
    "editor.heading": "Color level editor",
    "editor.subHtml": "Paint cells and export fixed layouts with <code>cells</code>. The game prefers <code>cells</code> over seed shuffles.",
    "editor.section.params": "Level params",
    "editor.label.name": "Name",
    "editor.label.id": "ID",
    "editor.label.stepLimit": "Move limit",
    "editor.label.grid": "Grid",
    "editor.label.difficulty": "Difficulty",
    "editor.addLevel.open": "+ New level",
    "editor.addLevel.blank": "Blank level",
    "editor.addLevel.generate": "Generate (unify win)",
    "editor.generate.working": "Generating level…",
    "editor.generate.workingLarge": "Generating 5×5 (solver in background)…",
    "editor.generate.step.layout": "5×5: random layout ({{count}} colours)…",
    "editor.generate.step.backward": "5×5: backward step {{current}}/{{total}}…",
    "editor.generate.step.certify": "5×5: computing optimal moves…",
    "editor.generate.failed": "Generate failed: no solvable layout for this grid/difficulty. Try another size or difficulty.",
    "editor.generate.failedLarge": "5×5 timed out — try 4×4, lower difficulty, or retry.",
    "editor.generate.summary": "Generated: optimal {{optimal}} moves, limit {{limit}}",
    "editor.section.brush": "Brush",
    "editor.btn.fillSeed": "Fill from seed",
    "editor.btn.clear": "Clear",
    "editor.btn.loadFile": "Import JSON",
    "editor.section.board": "Board",
    "editor.btn.playtest": "Playtest level",
    "editor.btn.rerollGenerate": "Reroll layout",
    "editor.reroll.includeArrows": "Reroll with 1–3 arrow bubbles (solver-aware)",
    "editor.btn.solve": "Compute optimal moves",
    "editor.section.export": "Export",
    "editor.btn.save": "Save to levels file",
    "editor.btn.export": "Refresh JSON preview",
    "editor.btn.copy": "Copy current level",
    "editor.btn.download": "Download levels.json",
    "editor.btn.saving": "Saving…",
    "editor.btn.saved": "Saved",
    "editor.btn.saveFail": "Save failed",
    "editor.btn.needDevServer": "Needs dev server",
    "editor.btn.copied": "Copied",
    "editor.btn.solving": "Computing…",
    "editor.save.title": "Run npm run dev to enable save",
    "editor.stats.colors": "Color counts: {{text}}",
    "editor.stats.none": "none",
    "editor.solve.timeout": "Optimal: not finished in {{seconds}}s (try 5×5 manually)",
    "editor.solve.notFound": "Optimal: none within 40 moves",
    "editor.solve.zero": "Optimal: 0 moves (already unified)",
    "editor.solve.partial": "Optimal: at least {{steps}} moves (path incomplete)",
    "editor.solve.tight": "Optimal: {{steps}} moves (limit {{limit}}, tight)",
    "editor.solve.exact": "Optimal: {{steps}} moves (matches limit)",
    "editor.solve.margin": "Optimal: {{steps}} moves (limit {{limit}}, +{{margin}} margin)",
    "editor.solve.computingLarge": "Optimal: computing (5×5, up to {{seconds}}s)…",
    "editor.solve.computing": "Optimal: computing…",
    "editor.solve.failed": "Optimal: failed ({{message}})",
    "editor.save.failed": "Save failed: {{message}} (use npm run dev)",
    "editor.load.failed": "Could not load {{url}}",
    "editor.color.0": "Red",
    "editor.color.1": "Orange",
    "editor.color.2": "Green",
    "editor.color.3": "Blue",
    "editor.color.4": "Purple",
    "editor.color.5": "Yellow",
    "editor.color.6": "Pink",
    "editor.color.7": "Cyan",
    "editor.cell.title": "({{col}}, {{row}}) = {{name}}",
    "editor.palette.title": "{{id}}: {{name}}",

    "playtest.title": "Playtest",
    "playtest.status.playing": "Tap a bubble: it pops and dyes four neighbors",
    "playtest.status.win": "Cleared! All colors unified",
    "playtest.status.lose": "Failed: out of moves, colors differ",
    "playtest.status.previewDone": "Preview done: {{total}} moves",
    "playtest.status.preview": "Preview: {{current}} / {{total}}",
    "playtest.steps": "Moves left: {{remaining}} / {{limit}}",
    "playtest.optimal.timeout": "Optimal moves: timed out (keep playing)",
    "playtest.optimal.notFound": "Optimal moves: none within 40",
    "playtest.optimal.zero": "Optimal moves: 0 (start unified)",
    "playtest.optimal.noPath": "Optimal moves: {{steps}} (path pending)",
    "playtest.optimal.steps": "Optimal moves: {{steps}}",
    "playtest.optimal.computing": "Optimal moves: computing…",
    "playtest.levelTitle": "Level {{id}}",
    "playtest.cell.removed": "({{col}}, {{row}}) removed",
    "playtest.cell.color": "({{col}}, {{row}}) {{name}}",
    "playtest.btn.preview": "Solution preview",
    "playtest.btn.previewPlay": "Auto play",
    "playtest.btn.previewStep": "Next step",
    "playtest.btn.previewStop": "Stop preview",
    "playtest.btn.restart": "Restart",
    "playtest.btn.close": "Close",
    "playtest.closeAria": "Close playtest",
    "playtest.dialogAria": "Level playtest",
  },
};

const listeners = new Set();

function readStoredLocale() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

let currentLocale = typeof window !== "undefined" ? readStoredLocale() : "zh";

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  const next = locale === "en" ? "en" : "zh";
  if (next === currentLocale) return;
  currentLocale = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  setDocumentLang();
  for (const fn of listeners) fn(next);
}

export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, vars, locale = currentLocale) {
  const table = MESSAGES[locale] ?? MESSAGES.zh;
  let text = table[key] ?? MESSAGES.zh[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{{${name}}}`, String(value));
    }
  }
  return text;
}

export function setDocumentLang(locale = currentLocale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
  const titleKey = document.documentElement.dataset?.i18nTitle;
  if (titleKey) {
    document.title = t(titleKey, undefined, locale);
  }
}

function applyTextToElement(el, key) {
  const text = t(key);
  const input = el.querySelector("input, select, textarea");
  if (el.tagName === "LABEL" && input) {
    for (const node of [...el.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) el.removeChild(node);
    }
    el.insertBefore(document.createTextNode(text), input);
    return;
  }
  el.textContent = text;
}

export function applyDomI18n(root = document) {
  root.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key) el.innerHTML = t(key);
  });
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) applyTextToElement(el, key);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria");
    if (key) el.setAttribute("aria-label", t(key));
  });
}

export function mountLocaleToggle(anchorEl, { onChange } = {}) {
  if (!anchorEl) return;

  const bar = document.createElement("div");
  bar.className = "dev-locale-bar";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Language");

  const btnZh = document.createElement("button");
  btnZh.type = "button";
  btnZh.className = "dev-locale-btn";
  btnZh.textContent = "中文";
  btnZh.setAttribute("aria-pressed", "false");

  const btnEn = document.createElement("button");
  btnEn.type = "button";
  btnEn.className = "dev-locale-btn";
  btnEn.textContent = "EN";
  btnEn.setAttribute("aria-pressed", "false");

  function syncActive() {
    const isEn = currentLocale === "en";
    btnZh.classList.toggle("is-active", !isEn);
    btnEn.classList.toggle("is-active", isEn);
    btnZh.setAttribute("aria-pressed", String(!isEn));
    btnEn.setAttribute("aria-pressed", String(isEn));
  }

  function pick(locale) {
    setLocale(locale);
    applyDomI18n(document);
    syncActive();
    onChange?.(currentLocale);
  }

  btnZh.addEventListener("click", () => pick("zh"));
  btnEn.addEventListener("click", () => pick("en"));

  bar.append(btnZh, btnEn);
  anchorEl.appendChild(bar);
  syncActive();
}

export function colorName(colorId, fallbackName) {
  const key = `editor.color.${colorId}`;
  const translated = MESSAGES[currentLocale]?.[key];
  return translated ?? fallbackName ?? String(colorId);
}