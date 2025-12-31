# 缠论技术分析平台

基于缠论（Chan Theory）的股票技术分析 Web 应用，提供实时 K 线图表可视化与批量买卖点扫描功能。

这是一个全栈项目，集成缠论计算引擎、图表可视化和批量扫描功能，适用于需要进行缠论技术分析的投资者和研究者。

**技术栈**: React 18 + Vite 5 + LightWeight Charts v5 + Ant Design 6 / FastAPI + PostgreSQL / Chan.py 缠论计算引擎

---

## 核心特性

- **实时 K 线图表** - 缠论元素可视化（笔、线段、中枢、买卖点），支持 8 种 K 线周期
- **批量买卖点扫描** - 支持全市场/板块/自定义股票池的批量扫描与实时进度监控
- **智能搜索** - 股票代码/名称/拼音全拼/拼音首字母模糊搜索
- **多周期分析** - 日线/周线/月线/1 分/5 分/15 分/30 分/60 分钟线
- **暗黑模式** - 明暗主题切换 + 响应式设计

---

## 快速开始

### 环境要求

- Python >= 3.9
- Node.js >= 16
- PostgreSQL >= 13

### 安装步骤

**0. 配置数据源**

[**tdx-api**](https://github.com/oficcejo/tdx-api)

请严格按照上面这个开源项目的步骤进行配置，你需要安装 Docker 来运行 tdx-api 数据源。

**1. 克隆项目**

```bash
git clone <repository-url>
cd CHAN
```

**2. 配置数据库**

创建 PostgreSQL 数据库：

```sql
CREATE DATABASE stock_db;
```

创建环境变量文件 `Backend/.env`：

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=stock_db
```

**3. 初始化数据库**

```bash
cd Backend
pip install -r requirements.txt
python data/init.py
```

此步骤会创建数据表并导入约 8000 只股票/指数/ETF 的基本信息（含拼音）

**4. 安装依赖**

```bash
# 缠论计算依赖
cd Chan
pip install -r requirements.txt

# 前端依赖
cd Frontend
npm install
```

**5. 启动服务**

Windows 一键启动：

```bash
start_all.bat
```

或分别启动：

```bash
# 终端1 - 后端
cd Backend
python run.py

# 终端2 - 前端
cd Frontend
npm run dev
```

**6. 访问应用**

- 前端: http://localhost:3000
- 后端 API 文档: http://localhost:8000/docs

---

## 功能概览

### 图表页面

实时 K 线图表查看，支持 8 种 K 线周期（日/周/月/1 分/5 分/15 分/30 分/60 分钟线），可视化展示缠论元素（笔、线段、中枢、买卖点），集成技术指标（MA/EMA、MACD），提供股票搜索、收藏管理、图表测量工具等交互功能。

### 扫描页面

批量扫描指定股票池的买卖点信号，支持全市场、按板块筛选（沪市主板/深市主板/创业板/科创板/北交所/ETF）或自定义股票列表。可配置买卖点类型（1 买/1 卖/2 买/2 卖/3 买 a/3 买 b）、时间窗口和 K 线周期，实时显示扫描进度（通过 SSE 推送），提供任务管理、结果查看和导出功能。

---

## 项目结构

```
CHAN_3/
├── Frontend/                    # 前端项目
│   ├── src/
│   │   ├── pages/              # ChartPage（图表页）、ScanPage（扫描页）
│   │   ├── components/         # 组件（Header、ChartContainer、ScanPage组件等）
│   │   ├── services/           # API封装（api.ts）
│   │   ├── contexts/           # 主题上下文
│   │   ├── config/             # 图表配置
│   │   └── utils/              # 工具函数
│   ├── package.json
│   └── vite.config.js
│
├── Backend/                     # 后端项目
│   ├── app/
│   │   ├── api/                # chan_api、stock_api、scan_api
│   │   ├── services/           # chan_service、scan_service
│   │   ├── models/             # schemas.py（Pydantic模型）
│   │   └── main.py             # FastAPI应用入口
│   ├── data/                   # init.py（数据库初始化）
│   ├── utils/                  # database.py（数据库连接）
│   ├── requirements.txt
│   └── run.py
│
└── Chan/                        # 缠论计算引擎（Python包）
    ├── Chan.py                 # 核心CChan类
    ├── Bi/                     # 笔模块
    ├── Seg/                    # 线段模块
    ├── ZS/                     # 中枢模块
    ├── BuySellPoint/           # 买卖点模块
    └── DataAPI/                # 数据接口
```

---

## API 概览

完整 API 文档请访问: http://localhost:8000/docs

### 缠论计算

- `POST /api/chan/calculate` - 计算指定股票的缠论数据（K 线、笔、线段、中枢、买卖点）

### 股票信息

- `GET /api/stocks/list` - 获取所有股票列表（含拼音，用于搜索）

### 扫描任务

- `POST /api/scan/start` - 启动批量扫描任务
- `GET /api/scan/progress/{task_id}` - 订阅扫描进度（SSE 实时推送）
- `GET /api/scan/result/{task_id}` - 获取扫描结果
- `GET /api/scan/tasks` - 获取任务列表（分页）
- `GET /api/scan/tasks/{task_id}` - 获取任务详情
- `DELETE /api/scan/tasks/{task_id}` - 删除任务
- `POST /api/scan/cancel/{task_id}` - 取消任务
- `GET /api/scan/all-results` - 获取所有已完成任务的结果汇总

---

## 开发提示

### 重要提醒

- 首次运行前必须执行 `python Backend/data/init.py` 初始化数据库
- 确保 `Backend/.env` 文件存在且配置正确
- 确保 PostgreSQL 服务已启动
- 确保 tdx-api 数据源已启动
- 确保 3000（前端）和 8000（后端）端口未被占用

### 配置修改

- **数据库配置**: 修改 `Backend/.env`
- **前端端口/代理**: 修改 `Frontend/vite.config.js`
- **图表主题**: 修改 `Frontend/src/config/config.jsx`
- **缠论参数**: 修改 `Chan/ChanConfig.py`

### 数据源说明

股票数据基于 **tdx-api** 开源库，支持实时数据获取。有条件的用户可以修改 `Chan/DataAPI/` 目录接入其他数据源。

### 投资风险提示

**本项目仅供学习研究使用，不构成任何投资建议。股市有风险，投资需谨慎。**

---

## 致谢

本项目基于以下优秀的开源项目：

- **特别鸣谢 缠论计算引擎**: [vespa314/chan.py](https://github.com/vespa314/chan.py)
- **特别鸣谢 股票数据源**: [tdx-api](https://github.com/oficcejo/tdx-api)
- **图表库**: [TradingView LightWeight Charts](https://www.tradingview.com/lightweight-charts/)
- **Ant Design**: [ant-design/ant-design](https://github.com/ant-design/ant-design)

感谢所有开源项目的贡献者！

---

## 许可证

[MIT License](LICENSE.md)

本项目采用 MIT 许可证开源，您可以在遵守许可证条款的前提下自由使用、修改和分发本项目的代码。

## 贡献

暂无
