# Video2Frame

跨平台视频帧提取工具 - 支持 Windows 和 macOS，开箱即用。

## ✨ 特性

- 🎬 **批量处理** - 一次选择多个视频文件，自动依次处理
- ⏱️ **时间范围控制** - 每个视频独立设置开始/结束时间
- ⚡ **高性能** - 基于 FFmpeg，支持所有主流视频格式
- 👁️ **图片预览播放器** - 浏览提取结果，支持播放、帧控制、导出
- 🎥 **视频预览** - 可视化选择时间范围，实时预览
- 🎨 **现代化 UI** - 深色主题，流畅动画，直观操作
- 📦 **开箱即用** - 内置 FFmpeg，用户安装后直接使用
- 🔧 **灵活配置** - 自定义帧率、格式、质量、输出目录
- 💻 **跨平台** - Windows 和 macOS 原生支持

## 🚀 快速开始

### 开发环境配置

#### 1. 安装依赖
```bash
npm install
```

#### 2. 准备 FFmpeg

⚠️ FFmpeg 二进制文件体积较大（Windows 版单文件超过 GitHub 100MB 限制），**不随代码仓库提交**，本地开发前需手动下载一次：

- Windows: 下载后放到 `resources/ffmpeg/win/ffmpeg.exe` + `ffprobe.exe`
- macOS: 下载后放到 `resources/ffmpeg/mac/ffmpeg` + `ffprobe`

详细下载地址和步骤见 [resources/FFMPEG_SETUP.md](./resources/FFMPEG_SETUP.md)。CI 构建会自动下载，无需手动干预。

#### 3. 启动开发服务器

**手动启动**
```bash
# 终端 1 - 启动 Vite
npm run dev

# 终端 2 - 启动 Electron
VITE_DEV_SERVER_URL=http://localhost:3000 npx electron .
```

### 打包发布

```bash
# Windows 安装包（.exe）
npm run build:win

# macOS 安装包（.dmg，仅能在 macOS 系统上执行，electron-builder 的硬性限制）
npm run build:mac
```

⚠️ **`build:mac` 无法在 Windows/Linux 上运行**，`electron-builder` 要求 macOS 打包必须在真机 macOS 环境执行（依赖 `codesign`/`hdiutil` 等系统工具）。如果你在 Windows 上开发，GitHub Actions（`.github/workflows/build.yml`）会自动处理：

- 推送到 `master` 分支：自动打包 Windows + macOS 两个平台，产物在对应 Actions run 页面的 Artifacts 区块下载（默认保留 90 天，不出现在 Releases 里）
- 推送 `v*` 格式的 tag（例如 `v1.0.0`）：打包后额外创建一个正式的 GitHub Release，把两个平台的安装包作为附件传上去，长期保留，出现在仓库首页 Releases 标签下

发布新版本的流程：
```bash
git tag v1.0.1
git push origin v1.0.1
```

**打包后的应用已自动包含 FFmpeg**，用户下载安装包后可直接使用，无需任何额外配置。

本地构建产物在 `release/` 目录下。

## 📖 使用说明

### 应用结构

应用包含三个主要页面：

#### 1. 视频切帧页面

批量提取视频帧的主要功能。

**操作流程：**
1. **选择视频** - 点击"选择视频文件"按钮，支持批量选择
2. **设置时间范围**（可选）- 每个视频可独立设置开始/结束时间
   - 格式：`HH:MM:SS`（例如：`00:00:05` - `00:00:15`）
   - 留空则提取整个视频
3. **配置参数**
   - 输出目录：保存提取帧的位置
   - 提取帧率：1-60 FPS，数值越大提取越密集
   - 图片格式：JPEG（体积小）、PNG（无损）、WebP（高压缩）
   - 图片质量：JPEG 专用，1=最高质量，31=最低质量
4. **开始提取** - 点击"开始提取"，实时查看进度和日志
5. **查看结果** - 完成后点击"打开文件夹"查看提取的帧

#### 2. 预览页面

提供两种预览模式：

**图片预览 Tab：**
- 浏览已提取的图片序列
- 内置播放器功能：播放/暂停、FPS 调节、逐帧控制
- 支持导出单帧图片

**视频预览 Tab：**
- 导入视频文件预览
- 可视化时间线选择开始/结束时间
- 直接跳转到切帧页面进行提取

#### 3. 设置页面

**输出目录设置：**
- 视频所在目录 - 每个视频在其同级目录创建输出文件夹
- 全局自定义目录 - 所有提取结果保存到统一位置

**窗口行为：**
- 直接退出 - 关闭窗口时退出应用
- 最小化到托盘 - 关闭窗口时隐藏到系统托盘（托盘图标右键可"显示主窗口"/"退出"，左键单击切换显示/隐藏）

### 输出结构

```
输出目录/
├── video1_frames/
│   ├── frame_000001.jpg
│   ├── frame_000002.jpg
│   └── ...
├── video2_frames/
│   ├── frame_000001.jpg
│   └── ...
└── ...
```

每个视频生成独立的文件夹，帧文件按序号命名。

## 🛠️ 技术栈

- **框架**: Electron 28 + React 18
- **构建**: Vite 5
- **路由**: React Router 6
- **视频处理**: FFmpeg
- **UI**: 自定义深色主题（深海军蓝 + 青色强调）

## 🧪 测试

查看 [TESTING.md](./TESTING.md) 了解完整的功能测试指南。

## 📁 项目结构

```
video2frame/
├── .github/workflows/     # CI 配置
│   └── build.yml         # Windows/macOS 自动打包
├── electron/              # Electron 主进程
│   ├── main.js           # 应用入口、IPC 通信、托盘逻辑
│   └── preload.js        # 预加载脚本
├── src/                  # React 前端代码
│   ├── views/           # 页面组件
│   │   ├── ExtractView.jsx    # 视频切帧页面
│   │   ├── PreviewView.jsx    # 预览页面
│   │   ├── HistoryView.jsx    # 处理记录页面
│   │   └── SettingsView.jsx   # 设置页面
│   ├── components/      # 公共组件
│   │   ├── Sidebar.jsx        # 侧边栏导航
│   │   └── icons.jsx          # 自绘 SVG 图标集
│   ├── App.jsx          # 主应用（含路由配置）
│   └── main.jsx         # React 入口
├── resources/            # 资源文件
│   ├── icon.ico         # Windows 应用图标
│   ├── icon.icns        # macOS 应用图标
│   ├── tray-icon.png    # 系统托盘图标
│   ├── tray-icon@2x.png # 系统托盘图标（高分屏）
│   ├── FFMPEG_SETUP.md  # FFmpeg 下载/更新指南
│   └── ffmpeg/          # FFmpeg 二进制（不纳入 Git，需手动下载或由 CI 下载）
│       ├── win/         # Windows 版本
│       └── mac/         # macOS 版本
├── dist/                # Vite 构建输出
├── dist-electron/       # Electron 构建输出
└── release/             # 最终安装包
```

## 📝 License

MIT
