# Meiti Admin System — 演示讲解手册 / Demo Guide

> 给汇报人自己看的备讲稿。老师提问大多用英语，关键问答给了英文参考答案。

---

## 1. 一句话介绍

**EN:** "Meiti Admin System is a web-based store administration system for a retail shop. It covers employee management, weekly shift scheduling, leave management with an approval workflow, statistics, and an operation log. It supports three roles — administrator, store manager, and staff — and the whole UI switches freely between English and Chinese."

中文：这是一个零售门店管理系统，覆盖员工管理、排班、请假审批、统计和操作日志，三种角色（管理员 / 店长 / 员工），全站中英自由切换。

---

## 2. 技术栈（老师大概率会问 "Why these technologies?"）

| 技术 | 作用 | 为什么选它（可以这么答） |
|---|---|---|
| React 19 + TypeScript | 界面与类型系统 | Component-based UI + static typing catches errors at compile time, e.g. the two language dictionaries can never drift apart. |
| Vite | 构建工具 | Fast dev server and it bundles everything into ONE single HTML file, so the system runs by double-clicking — no server needed. |
| Tailwind CSS | 样式 | Utility-first styling keeps the design consistent (one brand palette) without writing CSS files. |
| localStorage | 数据持久化 | The course project is front-end only; localStorage acts as a small database so data survives refreshes. Swapping in a real REST API later only changes the load/save layer in App.tsx. |

架构一句话：**single source of truth**——所有数据集中在 `App.tsx` 的 state 里，页面组件只负责展示和回调（one-way data flow）。

---

## 3. 目录结构 → 功能 → URS 对照

```
src/
├── main.tsx            入口，挂载 App + 语言 Provider
├── App.tsx             ★ 核心：全部状态、业务规则、路由、弹窗链
├── i18n.tsx            中英文字典 + 语言切换（类型安全）
├── types/index.ts      数据模型（Employee / Shift / Leave / OpLog…）
├── data/seed.ts        演示数据 + 业务常量（请假上限 3/5）
├── lib/dates.ts        日期工具（周一为一周起点，YYYY-MM-DD 字符串）
├── components/Modal.tsx 全局唯一的确认弹窗组件
└── sections/
    ├── Login.tsx         P0 登录（FR-01，工号自动识别角色）
    ├── Shell.tsx         管理端布局（顶栏 + 侧边导航）
    ├── EmployeeList.tsx  P1 员工列表（FR-02/03/10/11）
    ├── EmployeeForm.tsx  P2/P4 添加/编辑员工（FR-02/05，含手机号校验）
    ├── EmployeeDetail.tsx P3 员工详情（FR-04，工资仅管理员可见）
    ├── ShiftPlanner.tsx  P5 个人排班（FR-07/08）
    ├── ShiftOverview.tsx P6 全店总览 + 导出 Excel（FR-09/12）
    ├── LeavePage.tsx     请假管理（FR-14，审批制 + 人数上限）
    ├── EmployeeHome.tsx  员工个人门户（FR-01/14）
    ├── Stats.tsx         统计页（FR-11，纯 CSS 图表）
    └── LogsPage.tsx      操作日志（FR-13，Could have）
```

---

## 4. 核心设计点（演示时主动讲，显得有思考）

1. **登录不用选角色**：工号首字母即角色（A 管理员 / B 店长 / C 员工），员工人数不限（C999 也行）。系统根据员工档案自动判断，删了档案工号即失效。
2. **排班双视图**：个人排班（点空格预选 → 按 Assign）+ 全店总览（格子显示人数角标，人多了折叠成 "+N more"，点开看完整名单）。
3. **规则都在 App.tsx 集中处理，弹窗链确认**：
   - 一人一天最多一个班次 → 冲突时询问是否改班，绝不静默覆盖；
   - 已批准请假的日期不能排班；
   - 请假：每天常规 3 人，特殊情况管理员可特批到 5 人（绝对上限）；
   - 员工在门户提交的申请是 pending，管理员同意/拒绝后才生效；
   - 删除员工连带删除"未来"班次和请假，历史记录保留。
4. **数据安全细节**：工资只有管理员可见（NF-03）；工号自动分配且永不复用；所有变更写入操作日志（谁、何时、做了什么）。
5. **国际化是类型安全的**：中文字典类型是 `Record<keyof typeof en, string>`，缺一个 key 直接编译报错。

---

## 5. 预判提问 & 英文参考答案

**Q: How does login work without a password?**
A: "For this internal store system the client asked for the simplest possible login: the staff ID encodes the role — A for admin, B for the manager, C plus the employee number for staff. The system looks up the ID and routes each role to its own landing page. A password layer could be added on top without changing the routing logic."

**Q: Where is the data stored? / What happens on refresh?**
A: "All state lives in App.tsx and every change is mirrored into the browser's localStorage, so data survives a refresh. The load function falls back to seed data on first launch. If we later add a backend, only this load/save layer changes — the UI and business rules stay the same."

**Q: What if two shifts conflict for the same person?**
A: "One employee can have at most one shift per day. When the admin assigns a different shift on an occupied day, the system opens a confirmation dialog instead of silently overwriting — the admin decides."

**Q: How do you prevent too many people being on leave the same day?**
A: "There's a two-level quota: normally 3 people per day; beyond that the admin gets a warning and may specially approve up to an absolute maximum of 5, which can never be exceeded. Employee requests stay pending until approved, so the admin always has the final say."

**Q: How does the language switch work?**
A: "Every visible string is a key in two dictionaries, English and Chinese. Components call t(key), so switching language re-renders the whole UI instantly. The Chinese dictionary is typed against the English keys, so a missing translation is a compile-time error."

**Q: What happens when you delete an employee?**
A: "The record is removed together with their FUTURE shifts and leave records — history is kept unchanged. Employee IDs are auto-assigned and never reused, so old logs can never point to the wrong person."

**Q: Can the manager change anything?**
A: "No, the manager account is read-only by design: they can browse employees, schedules, leave and statistics, but the edit controls are not rendered for them, and the wage field is hidden as sensitive data."

**Q: How do the charts work — did you use a chart library?**
A: "No library — the pie is a CSS conic-gradient whose stops are computed from live data, and the bars are flexbox divs with proportional heights. Fewer dependencies, and the numbers are always computed from the current data, never stored separately."

**Q: How would you extend this to multiple stores / a real database?**
A: "The data layer is isolated in App.tsx's load/save functions and the types file, so we would replace localStorage with REST calls and keep the rest. IDs are already unique and immutable, which makes migration safe."

---

## 6. 演示动线建议（3–5 分钟）

1. 登录页：先切英文 → 输 `A001` 进入管理员（顺便展示中/EN 切换）。
2. 员工管理：搜索/筛选 → 添加员工（故意输 10 位手机号触发校验）→ 详情页看登录工号。
3. 排班：个人排班点空格 + Assign；故意给同一天再排一个班 → 冲突弹窗；切全店总览 → 点人多的格子 → 导出 Excel。
4. 请假：管理员登记到第 4 个人 → 特批弹窗；到第 6 个人 → 绝对上限拦截。
5. 员工门户：退出 → 用 `C001` 登录 → 申请请假 → 回到 `A001` 审批同意。
6. 统计 + 操作日志收尾（实时计算、可追溯）。
