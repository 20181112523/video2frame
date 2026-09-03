# 快速开始指南

## 🎯 用户使用（安装包）

### 1. 下载安装

- **Windows**: 下载 `.exe` 安装包，双击安装
- **macOS**: 下载 `.dmg` 或 `.zip`（内容一样，`.dmg` 拖入应用程序文件夹，`.zip` 解压后直接运行）

**应用已内置 FFmpeg，安装后直接使用，无需任何额外配置。**

⚠️ **macOS 用户注意两点：**

1. **芯片架构**：目前只提供 Apple Silicon（M系列）版本，**Intel Mac 无法运行**。不确定自己电脑芯片的，点苹果图标 →「关于本机」查看。
2. **"已损坏"提示**：不是文件真的损坏，是安装包没有 Apple 付费签名（$99/年）导致 Gatekeeper 拦截。终端执行以下命令即可正常打开：
   ```bash
   xattr -cr /Applications/Video2Frame.app
   ```
   （`.zip` 解压到其他位置的话把路径换成实际位置）或者：打开一次提示已损坏后，去「系统设置」→「隐私与安全性」页面底部点击「仍要打开」。

详见 [README.md](./README.md#-macos-用户须知)。

### 2. 开始使用

1. 打开 Video2Frame 应用
2. 点击"选择视频文件"，支持批量选择
3. 选择输出目录
4. 配置提取参数（帧率、格式、质量）
5. 点击"开始提取"
6. 完成后点击"打开文件夹"查看结果

---

## 🛠️ 开发者使用（源码）

### Windows 开发环境

```bash
# 1. 安装依赖
npm install

# 2. 准备 FFmpeg（仅需一次）
# 下载 FFmpeg Windows builds: https://github.com/BtbN/FFmpeg-Builds/releases
# 将 ffmpeg.exe 和 ffprobe.exe 放到: resources/ffmpeg/win/

# 3. 启动开发
npm run dev

# 4. 打包
npm run build:win
```

### macOS 开发环境

```bash
# 1. 安装依赖
npm install

# 2. 准备 FFmpeg（仅需一次）
# 下载 FFmpeg macOS: https://evermeet.cx/ffmpeg/
# 将 ffmpeg 和 ffprobe 放到: resources/ffmpeg/mac/
chmod +x resources/ffmpeg/mac/ffmpeg
chmod +x resources/ffmpeg/mac/ffprobe

# 3. 启动开发
npm run dev

# 4. 打包
npm run build:mac
```

> `npm run build:mac` 只能在 macOS 系统上执行（`electron-builder` 的硬性限制）。如果只有 Windows 环境，推送到 GitHub 后由 Actions 在 macOS runner 上自动打包即可，见仓库根目录 `.github/workflows/build.yml`。

### 目录结构

```
resources/ffmpeg/
├── win/
│   ├── ffmpeg.exe
│   └── ffprobe.exe
└── mac/
    ├── ffmpeg
    └── ffprobe
```

**打包后的应用会自动包含 resources/ffmpeg/ 目录**，用户安装后无需手动配置。

---

## 💡 提示

### 参数建议

- **高质量截图**: 帧率 1 FPS，格式 PNG
- **快速预览**: 帧率 0.1 FPS（10秒一帧），格式 JPEG，质量 10
- **AI训练数据集**: 帧率 5-10 FPS，格式 JPEG，质量 2-5
- **视频分析**: 帧率 30 FPS，格式 WebP

### 时间范围

- 格式：`HH:MM:SS` 或 `MM:SS`
- 示例：
  - `00:00:10` - 从第 10 秒开始
  - `00:01:30` 到 `00:02:45` - 提取 1分30秒 到 2分45秒 的片段

### 批量处理

选择多个视频后，会依次自动处理，每个视频生成独立的输出文件夹。
