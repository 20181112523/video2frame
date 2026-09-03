# FFmpeg 准备指南（仅供开发者参考）

✅ **用户无需关心此文档** - 应用已内置 FFmpeg，安装后直接使用。

本文档记录项目维护者如何准备本地开发/打包所需的 FFmpeg 可执行文件。

---

## 📦 目录结构

`resources/ffmpeg/` 下按平台分目录存放，**不含 ffplay**（应用不需要播放功能，只用 `ffmpeg` 抽帧、`ffprobe` 读取元信息）：

```
resources/ffmpeg/
├── win/
│   ├── ffmpeg.exe   (~140MB) - 视频处理核心
│   └── ffprobe.exe  (~139MB) - 视频信息读取
└── mac/
    ├── ffmpeg       (~78MB)  - 视频处理核心
    └── ffprobe      (~77MB)  - 视频信息读取
```

⚠️ **这两个目录下的二进制文件不纳入 Git 版本控制**（Windows 版单文件超过 GitHub 100MB 的单文件限制，且二进制文件不适合放进普通 Git 仓库）。`.gitignore` 只保留了空的 `.gitkeep` 占位。本地开发和 CI 构建前都需要按下面的步骤自行下载。

---

## 🔧 本地开发：如何准备 FFmpeg

### Windows

**下载地址**: https://github.com/BtbN/FFmpeg-Builds/releases

**步骤**:
1. 下载最新的 `ffmpeg-master-latest-win64-gpl.zip`（静态编译版，单文件不依赖额外 DLL）
2. 解压后进入 `bin/` 目录
3. 将以下文件复制到 `resources/ffmpeg/win/`:
   ```
   ffmpeg.exe
   ffprobe.exe
   ```

**验证**:
```bash
cd resources/ffmpeg/win
./ffmpeg.exe -version
./ffprobe.exe -version
```

---

### macOS

**下载地址**: https://evermeet.cx/ffmpeg/

**步骤**:
1. 分别下载：
   - **ffmpeg**: https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip
   - **ffprobe**: https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip

2. 解压后将文件放到 `resources/ffmpeg/mac/`:
   ```
   ffmpeg
   ffprobe
   ```

3. 赋予执行权限：
   ```bash
   chmod +x resources/ffmpeg/mac/ffmpeg
   chmod +x resources/ffmpeg/mac/ffprobe
   ```

**验证**:
```bash
cd resources/ffmpeg/mac
./ffmpeg -version
./ffprobe -version
```

---

## 📋 版本要求

- **最低版本**: FFmpeg 4.0+
- **推荐版本**: FFmpeg 7.0+
- **构建类型**:
  - Windows: `gpl` 静态构建（单文件不依赖额外 DLL）
  - macOS: Universal Binary（支持 Intel + Apple Silicon）

---

## 🤖 CI 自动化

GitHub Actions（`.github/workflows/build.yml`）在构建前会自动执行上述下载步骤，无需手动干预。macOS 打包只能在 macOS runner 上进行（`electron-builder` 的硬性限制，Windows/Linux 无法生成 `.dmg`），这也是引入该 workflow 的主要原因。

---

## 🚀 打包流程

### 开发环境
应用会从 `resources/ffmpeg/{platform}/` 加载对应平台的 FFmpeg。

### 生产打包
`electron-builder` 通过 `package.json` 里 `build.win.extraResources` / `build.mac.extraResources` 配置，分别把对应平台目录下的二进制打进安装包（不会互相打包对方平台的文件，也不会重复打进 `app.asar`）：

```json
"win": {
  "extraResources": [{ "from": "resources/ffmpeg/win", "to": "ffmpeg" }]
},
"mac": {
  "extraResources": [{ "from": "resources/ffmpeg/mac", "to": "ffmpeg" }]
}
```

**打包后路径**:
- Windows: `{安装目录}\resources\ffmpeg\`
- macOS: `{应用包}.app/Contents/Resources/ffmpeg/`

**验证打包**:
1. 运行 `npm run build:win` 或 `npm run build:mac`
2. 安装生成的 `.exe` 或 `.dmg`
3. 打开应用，侧边栏应显示 FFmpeg 状态为就绪

---

## 🐛 故障排查

### 应用显示 "FFmpeg 未就绪"

**原因排查**:
1. 文件是否存在于正确路径？
   - 开发环境: `resources/ffmpeg/{platform}/ffmpeg[.exe]`
   - 生产环境: `{安装目录}/resources/ffmpeg/`

2. 文件是否有执行权限？（macOS）
   ```bash
   ls -l resources/ffmpeg/mac/
   # 应显示 -rwxr-xr-x
   ```

3. 文件是否为对应平台版本？
   - Windows 文件必须是 `.exe`
   - macOS 文件是 Unix 可执行文件（无扩展名）

4. 架构是否匹配？
   - macOS 应使用 Universal Binary
   - Windows 应使用 x64 版本

---

## 📄 许可证

FFmpeg 是开源软件，采用 **LGPL v2.1+** 或 **GPL v2+** 许可证。

- 官网: https://ffmpeg.org/
- 许可证说明: https://ffmpeg.org/legal.html
- 源代码: https://github.com/FFmpeg/FFmpeg

本项目使用 GPL 构建版本，符合开源软件分发要求。
