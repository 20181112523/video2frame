# FFmpeg 可执行文件目录

✅ 本项目已内置 FFmpeg，用户安装后可直接使用，无需额外配置。

⚠️ **本目录下 `win/`、`mac/` 里的二进制文件不纳入 Git 版本控制**（Windows 版单文件超过 GitHub 100MB 限制）。本地开发或打包前需先按 [FFMPEG_SETUP.md](../FFMPEG_SETUP.md) 下载对应平台文件；CI 构建会自动完成这一步。

## 📦 所需文件

### Windows (`win/`)
- `ffmpeg.exe` (~140MB) - 视频处理核心
- `ffprobe.exe` (~139MB) - 视频信息读取

### macOS (`mac/`)
- `ffmpeg` (~78MB) - 视频处理核心
- `ffprobe` (~77MB) - 视频信息读取

（不含 `ffplay`，应用只做抽帧和读取元信息，不需要播放功能）

## 🔧 开发者说明

这些二进制文件在打包时会通过 `package.json` 的 `build.win.extraResources` / `build.mac.extraResources` 配置，分别按平台打包到安装包中（各平台只打自己需要的文件，互不重复）：

```json
"win": {
  "extraResources": [{ "from": "resources/ffmpeg/win", "to": "ffmpeg" }]
},
"mac": {
  "extraResources": [{ "from": "resources/ffmpeg/mac", "to": "ffmpeg" }]
}
```

应用运行时会从以下路径加载：
- **开发环境**: `resources/ffmpeg/{platform}/`
- **生产环境**: `{安装目录}/resources/ffmpeg/`

## ℹ️ 版本信息

- Windows FFmpeg: 7.0+（`gpl` 静态构建）
- macOS FFmpeg: 7.0+（Universal Binary）
- 来源:
  - Windows: https://github.com/BtbN/FFmpeg-Builds
  - macOS: https://evermeet.cx/ffmpeg/

详细的下载/更新步骤见 [FFMPEG_SETUP.md](../FFMPEG_SETUP.md)。
