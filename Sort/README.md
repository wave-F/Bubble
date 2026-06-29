# 染色泡泡 (Sort)

网格染色统一玩法：捏碎泡泡给四邻染色，机制泡泡沿箭头方向传播颜色。

## 目录结构

```
Sort/
├── index.html              # 游戏入口（开发）
├── assets/                 # 图片、音频资源
├── src/                    # 游戏源码
│   ├── main.js             # 主入口
│   ├── config/levels.json  # 关卡数据（关卡编辑器维护）
│   ├── systems/            # 玩法系统
│   └── ...
├── tools/
│   ├── level-editor/       # 关卡编辑器
│   └── bubble-debug/       # 泡泡材质调试
├── scripts/                # 构建与开发服务器
├── ios/                    # Capacitor iOS 工程
├── vendor/haptic/          # iOS 触觉插件（预留）
├── docs/                   # 文档
└── _archive/               # 归档：旧文档、演示工程、废弃脚本
```

## 常用命令

```bash
npm run dev              # http://localhost:4173
npm run build:web        # 输出到 www/（Capacitor）
npm run cap:sync:ios     # 构建并同步到 iOS
```

## 开发地址

- 游戏：`/`
- 关卡编辑器：`/tools/level-editor/`（兼容 `/level-editor.html`）
- 材质调试：`/tools/bubble-debug/`（兼容 `/bubble-debug.html`）