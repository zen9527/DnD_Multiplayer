# DnD Offline Multiplayer - 重构设计方案

> **设计日期**: 2026-04-21  
> **状态**: ✅ 已批准  
> **技术栈**: Node.js + TypeScript + WebSocket (ws) + Vite + Zod

---

## 1. 项目概述

### 目标
完全重构现有的 DnD Offline Multiplayer 项目，解决以下问题：
- server.js 过于庞大（735 行），职责混乱
- 缺少类型安全，纯 JavaScript 实现
- 验证逻辑分散，前后端不统一
- 架构不够清晰，难以维护

### 技术栈
| 层级 | 技术选型 |
|------|----------|
| **运行时** | Node.js 18+ |
| **语言** | TypeScript 5.x |
| **后端框架** | Express + ws (WebSocket) |
| **前端构建** | Vite |
| **验证库** | Zod（前后端共享） |
| **包管理** | npm |

---

## 2. 架构设计

### 2.1 整体架构图

```
┌─────────────────────────────────────────┐
│          Frontend (Browser)             │
│  ┌──────────┐  ┌──────────┐            │
│  │   UI     │  │ WebSocket│            │
│  │  Layer   │◄─┤  Client  │            │
│  └────┬─────┘  └────┬─────┘            │
│       │             │                  │
│  ┌────▼─────────────▼──────┐           │
│  │   Shared Schemas (Zod)  │           │
│  └─────────────────────────┘           │
└─────────────────┬───────────────────────┘
                  │ WebSocket
┌─────────────────▼───────────────────────┐
│          Backend (Node.js)              │
│  ┌─────────────────────────────────┐   │
│  │     HTTP Server (Express)       │   │
│  └──────────────┬──────────────────┘   │
│  ┌──────────────▼──────────────────┐   │
│  │    WebSocket Manager            │   │
│  └──────────────┬──────────────────┘   │
│  ┌──────────────▼──────────────────┐   │
│  │   Message Handlers (拆分)       │   │
│  │  - game.ts | chat.ts | dice.ts  │   │
│  └──────────────┬──────────────────┘   │
│  ┌──────────────▼──────────────────┐   │
│  │    Game State Store             │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### 2.2 文件结构

```
C:\Users\Flex\Desktop\Codes\DnD/
├── src/                           # 后端源代码
│   ├── server.ts                  # 入口文件（仅启动服务器）
│   ├── types/
│   │   └── index.ts               # 共享类型定义
│   ├── schemas/
│   │   └── validation.ts          # Zod 验证模式
│   ├── websocket/
│   │   ├── manager.ts             # WebSocket 连接管理
│   │   └── handlers/              # 消息处理器（按功能拆分）
│   │       ├── game.ts            # 游戏创建/加入
│   │       ├── chat.ts            # 聊天消息
│   │       ├── dice.ts            # 骰子滚动
│   │       └── dm.ts              # DM 专属操作
│   ├── game/
│   │   ├── state.ts               # 游戏状态管理
│   │   └── store.ts               # 内存存储
│   └── utils/
│       └── id.ts                  # ID 生成工具
├── shared/                        # 前后端共享代码
│   └── types.ts                   # 从 src/types 导出
├── public/                        # 前端静态文件（Vite 构建输出）
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/                        # TypeScript 源代码
│       ├── app.ts
│       ├── websocket.ts
│       ├── game-state.ts
│       ├── dm-panel.ts
│       └── llm-client.ts
├── package.json
├── tsconfig.json                  # TypeScript 配置
├── vite.config.ts                 # Vite 配置
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-04-21-dnd-refactor-design.md  # 本文档
```

---

## 3. 核心模块设计

### 3.1 类型层 (`src/types/index.ts`)

**职责**: 定义所有共享 TypeScript 接口和类型

**关键类型**:
```typescript
export interface Player {
  id: string;
  name: string;
  characterName: string;
  isDM: boolean;
}

export interface Game {
  id: string;
  name: string;
  maxPlayers: number;
  players: Player[];
  chatHistory: ChatMessage[];
  npcs: NPC[];
  events: Event[];
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  characterName: string;
  content: string;
  type: 'text' | 'roll' | 'npc' | 'event';
  timestamp: number;
}

export interface NPC {
  id: string;
  name: string;
  description: string;
  role: 'friendly' | 'neutral' | 'hostile';
  createdBy: string;
  createdAt: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: number;
}

// WebSocket 消息类型
export type MessageType = 
  | 'CREATE_GAME'
  | 'JOIN_GAME'
  | 'CHAT_MESSAGE'
  | 'DICE_ROLL'
  | 'NPC_CREATE'
  | 'EVENT_CREATE'
  // ... 响应类型
  | 'GAME_CREATED'
  | 'PLAYER_JOINED';
```

### 3.2 验证层 (`src/schemas/validation.ts`)

**职责**: Zod schema 定义，前后端共享验证逻辑

**关键 Schema**:
```typescript
import { z } from 'zod';

export const createGameSchema = z.object({
  gameName: z.string().min(1).max(100),
  maxPlayers: z.number().int().min(2).max(8),
});

export const joinGameSchema = z.object({
  gameId: z.string(),
  playerName: z.string().min(1).max(50),
  characterName: z.string().min(1).max(100),
});

export const chatMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'roll', 'npc', 'event']).optional(),
});

export const diceRollSchema = z.object({
  diceType: z.enum([4, 6, 8, 10, 12, 20]).transform(Number),
  count: z.number().int().min(1).max(10),
  modifier: z.number().optional(),
});

export const npcSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  role: z.enum(['friendly', 'neutral', 'hostile']),
});

// 导出类型
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type JoinGameInput = z.infer<typeof joinGameSchema>;
```

### 3.3 WebSocket Manager (`src/websocket/manager.ts`)

**职责**: 管理 WebSocket 连接、重连、心跳

**核心功能**:
- 处理 WebSocket 连接/断开
- 消息路由到对应处理器
- 错误处理和日志记录
- 优雅关闭连接

**目标行数**: ~80 行

### 3.4 消息处理器 (`src/websocket/handlers/*.ts`)

| 文件 | 职责 | 处理的消息类型 |
|------|------|---------------|
| `game.ts` | 游戏生命周期管理 | CREATE_GAME, JOIN_GAME |
| `chat.ts` | 聊天功能 | CHAT_MESSAGE |
| `dice.ts` | 骰子滚动（服务器端） | DICE_ROLL |
| `dm.ts` | DM 专属操作 | NPC_CREATE, EVENT_CREATE |

**每个处理器目标**: <100 行，单一职责

### 3.5 游戏状态层 (`src/game/`)

#### `state.ts` - 单个游戏运行时状态
```typescript
export class GameState {
  private game: Game;
  
  constructor(gameData: Game);
  addPlayer(player: Player): void;
  removePlayer(playerId: string): void;
  addChatMessage(message: ChatMessage): void;
  // ...
}
```

#### `store.ts` - 全局游戏存储
```typescript
export class GameStore {
  private games: Map<string, GameState>;
  
  createGame(gameData: Omit<Game, 'id'>): GameState;
  getGame(gameId: string): GameState | undefined;
  deleteGame(gameId: string): void;
  // ...
}
```

---

## 4. 数据流设计

### 4.1 WebSocket 消息流程

```
客户端操作
    ↓
WebSocket Client.send({ type, payload })
    ↓
Server WebSocket Manager.on('message')
    ↓
Router → 对应 Handler (game/chat/dice/dm)
    ↓
Handler 验证 payload (Zod schema)
    ↓
Handler 更新 Game Store
    ↓
Handler broadcast 到所有客户端
    ↓
客户端 WebSocket Client.onmessage
    ↓
UI Layer 更新显示
```

### 4.2 关键消息示例

**创建游戏**:
```typescript
// 客户端发送
ws.send({
  type: 'CREATE_GAME',
  payload: { gameName: "Dragon's Lair", maxPlayers: 4 }
});

// 服务器响应
ws.onmessage = {
  type: 'GAME_CREATED',
  payload: { gameId: "abc123", game: {...} }
};
```

---

## 5. 关键改进对比

| 指标 | 原方案 (JavaScript) | 新方案 (TypeScript) |
|------|---------------------|---------------------|
| **server.js 行数** | 735 行 | ~100 行（仅启动） |
| **最大单文件行数** | 735 行 | <120 行 |
| **TypeScript 覆盖率** | 0% | 100% |
| **共享验证模式** | ❌ 自定义 JS | ✅ Zod |
| **编译时类型检查** | ❌ 无 | ✅ tsc --noEmit |
| **模块可测试性** | 🔴 困难 | 🟢 容易 |
| **IDE 支持** | 🟡 基础 | ✅ 完整提示 |

---

## 6. 实施步骤概览

### Phase 1: 项目初始化
- [ ] 创建目录结构
- [ ] 配置 TypeScript + Vite
- [ ] 安装依赖 (zod, ws, express)

### Phase 2: 核心基础设施
- [ ] 实现类型定义 (`src/types/index.ts`)
- [ ] 实现 Zod Schema (`src/schemas/validation.ts`)
- [ ] 实现 ID 工具 (`src/utils/id.ts`)

### Phase 3: WebSocket 层
- [ ] 实现 Game Store (`src/game/store.ts`)
- [ ] 实现 WebSocket Manager (`src/websocket/manager.ts`)
- [ ] 实现各消息处理器 (game/chat/dice/dm)

### Phase 4: 服务器入口
- [ ] 实现 `server.ts`（启动 Express + WebSocket）

### Phase 5: 前端重构
- [ ] 配置 Vite + TypeScript
- [ ] 迁移前端代码到 TypeScript
- [ ] 集成 Zod Schema 验证

### Phase 6: 测试与优化
- [ ] 运行类型检查 (`tsc --noEmit`)
- [ ] 手动测试所有功能
- [ ] 清理和文档化

---

## 7. 验收标准

✅ **代码质量**
- `npx tsc --noEmit` 无错误
- 最大单文件行数 <120 行
- 每个模块单一职责

✅ **类型安全**
- 所有接口有 TypeScript 定义
- Zod Schema 前后端共享
- 无 `any` 类型使用

✅ **功能完整**
- 游戏创建/加入正常
- 聊天消息实时同步
- 骰子滚动服务器端验证
- DM 面板 NPC/事件管理
- LLM 客户端保留（可选实现）

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| TypeScript 学习曲线 | 🟡 中等 | 提供详细注释和示例 |
| Vite 构建配置复杂 | 🟡 中等 | 使用预设模板，逐步调整 |
| Zod Schema 共享问题 | 🟢 低 | 通过相对路径导入，测试验证 |
| WebSocket 兼容性问题 | 🟢 低 | 保持 `ws` 库不变，仅重构代码组织 |

---

## 9. 后续扩展方向

1. **持久化**: 将 Game Store 替换为 SQLite/PostgreSQL
2. **认证**: 添加 JWT Token 验证
3. **房间列表**: 实现公开游戏浏览功能
4. **LLM 集成**: 完善 AI 辅助内容生成
5. **测试**: 添加 Jest + WebSocket 模拟测试

---

**设计文档完成时间**: 2026-04-21  
**下一步**: 创建实施计划（使用 writing-plans skill）
