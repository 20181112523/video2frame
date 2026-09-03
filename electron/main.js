const { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');

let mainWindow;
let tray = null;
let ffmpegProcess = null;
// 标记是否为真正的退出流程（托盘菜单"退出"/系统关机等），
// 区分用户点右上角关闭按钮时该走隐藏到托盘还是彻底退出
let isQuitting = false;

// 历史记录：最多保留 100 条
const MAX_HISTORY = 100;

function getHistoryPath() {
  return path.join(app.getPath('userData'), 'history.json');
}

function readHistory() {
  try {
    const historyPath = getHistoryPath();
    if (fs.existsSync(historyPath)) {
      return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    }
  } catch (error) {
    console.error('读取历史记录失败:', error);
  }
  return [];
}

function appendHistoryRecord(record) {
  try {
    let history = readHistory();
    history.unshift(record); // 最新的排在最前面
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    fs.writeFileSync(getHistoryPath(), JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('写入历史记录失败:', error);
  }
}

// 获取 FFmpeg 路径
// 二进制按平台分别存放在 resources/ffmpeg/win 和 resources/ffmpeg/mac 下
// （不再有平台无关的根目录副本，避免同一份文件被重复打包）
function getFFmpegPath() {
  const platform = process.platform;
  const isDev = !app.isPackaged;
  const platformDir = platform === 'win32' ? 'win' : 'mac';
  const ffmpegName = platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  
  if (isDev) {
    // 开发环境：从 resources/ffmpeg/{platform} 读取
    const devPath = path.join(__dirname, '../resources/ffmpeg', platformDir, ffmpegName);
    if (fs.existsSync(devPath)) return devPath;
    // 如果本地没有，尝试使用系统 PATH 中的 ffmpeg
    return 'ffmpeg';
  }
  
  // 生产环境：从打包后的 resources 目录读取
  const resourcesPath = process.resourcesPath;
  return path.join(resourcesPath, 'ffmpeg', ffmpegName);
}

// 获取 FFprobe 路径
function getFFprobePath() {
  const platform = process.platform;
  const isDev = !app.isPackaged;
  const platformDir = platform === 'win32' ? 'win' : 'mac';
  const ffprobeName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  
  if (isDev) {
    // 开发环境：从 resources/ffmpeg/{platform} 读取
    const devPath = path.join(__dirname, '../resources/ffmpeg', platformDir, ffprobeName);
    if (fs.existsSync(devPath)) return devPath;
    // 如果本地没有，尝试使用系统 PATH 中的 ffprobe
    return 'ffprobe';
  }
  
  // 生产环境：从打包后的 resources 目录读取
  const resourcesPath = process.resourcesPath;
  return path.join(resourcesPath, 'ffmpeg', ffprobeName);
}

// 配置 fluent-ffmpeg 使用自定义的 FFmpeg/FFprobe 路径
function setupFFmpeg() {
  const ffmpegPath = getFFmpegPath();
  const ffprobePath = getFFprobePath();
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
  console.log('FFmpeg path configured:', ffmpegPath);
  console.log('FFprobe path configured:', ffprobePath);
}

// 同步读取设置文件，仅在需要立即判断关闭行为时使用（close 事件回调是同步上下文）
function readSettingsSync() {
  const defaults = { outputDirMode: 'video', customOutputDir: '', closeAction: 'quit' };
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      return { ...defaults, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
    }
  } catch (error) {
    console.error('读取设置失败:', error);
  }
  return defaults;
}

function getTrayIconPath() {
  // resources/ 目录在打包后随 asar 一起打入（见 package.json build.files），
  // 因此开发和生产环境用同一份相对路径即可，无需区分
  return path.join(__dirname, '../resources/tray-icon.png');
}

function createTray() {
  if (tray) return;
  const icon = nativeImage.createFromPath(getTrayIconPath());
  tray = new Tray(icon);
  tray.setToolTip('Video2Frame');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  // 左键单击直接切换显示/隐藏主窗口
  tray.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true, // 隐藏菜单栏（File, Edit, View 等）
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      // 预览页需要用 file:// 加载本地图片/视频，而开发环境页面是从
      // http://localhost:3000 加载的，跨协议访问本地文件默认会被 Web
      // 安全策略拦截，因此关闭 webSecurity（仅限桌面应用，不影响用户）
      webSecurity: false
    },
    backgroundColor: '#0B0E14',
    show: false
  });

  // 开发环境加载 Vite 服务器
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 点击右上角关闭按钮时先落到这里：根据用户设置决定是隐藏到托盘还是真正退出。
  // 只有 isQuitting（托盘菜单退出 / 系统退出）为 true 时才放行默认关闭行为。
  mainWindow.on('close', (event) => {
    if (isQuitting) return;

    const settings = readSettingsSync();
    if (settings.closeAction === 'minimize') {
      event.preventDefault();
      mainWindow.hide();
      createTray();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupFFmpeg();
  createWindow();
});

app.on('window-all-closed', () => {
  // 窗口只是被隐藏到托盘时不会触发这个事件（因为 close 被 preventDefault 了），
  // 所以这里保留原有的"非 mac 平台无窗口即退出"逻辑不受影响
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  destroyTray();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});

// 选择视频文件
ipcMain.handle('select-videos', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '视频文件', extensions: ['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm', 'm4v'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  });
  
  if (result.canceled) return null;
  return result.filePaths;
});

// 选择输出目录
ipcMain.handle('select-output-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  
  if (result.canceled) return null;
  return result.filePaths[0];
});

// 获取视频信息
ipcMain.handle('get-video-info', async (event, videoPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(new Error(`无法读取视频信息: ${err.message}`));
        return;
      }
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) {
        reject(new Error('未找到视频流'));
        return;
      }
      
      const info = {
        path: videoPath,
        name: path.basename(videoPath),
        duration: parseFloat(metadata.format.duration) || 0,
        fps: eval(videoStream.r_frame_rate) || 25, // 计算帧率 (例如 "30000/1001")
        width: videoStream.width || 1920,
        height: videoStream.height || 1080
      };
      
      resolve(info);
    });
  });
});

// 对字符串取短哈希（8位十六进制），用于目录命名时区分同名视频/不同参数，
// 不需要显示完整哈希，只需要"看起来不一样"即可
function shortHash(input) {
  return crypto.createHash('md5').update(input).digest('hex').slice(0, 8);
}

// 清空目录内容但保留目录本身（避免删除后立刻重建产生的时序问题）
function emptyDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath)) {
    fs.rmSync(path.join(dirPath, entry), { recursive: true, force: true });
  }
}

// 提取视频帧
ipcMain.handle('extract-frames', async (event, options) => {
  const {
    videoPath, outputDir, quality, format, startTime, endTime,
    exportMode, sourceFps, intervalFrames, intervalSeconds, sceneThreshold,
    resizeMode, resizePercentage, resizeWidth, resizeHeight, jpegChroma
  } = options;
  
  return new Promise((resolve, reject) => {
    // 输出目录名同时带上"来源路径标识"和"导出参数标识"两段短哈希：
    // - 路径哈希：区分不同目录下的同名视频（比如 C:\A\clip.mp4 和 D:\B\clip.mp4），
    //   避免它们的帧被写进同一个 clip_frames 文件夹导致互相混杂。
    // - 参数哈希：区分同一个视频用不同导出设置（模式/帧率/质量/格式/缩放/时间范围等）
    //   多次导出的结果，让每组参数各自落进独立文件夹，不会互相覆盖或残留旧文件。
    const videoName = path.basename(videoPath, path.extname(videoPath));
    const pathTag = shortHash(videoPath);
    const paramsTag = shortHash(JSON.stringify({
      quality, format, startTime, endTime, exportMode, sourceFps,
      intervalFrames, intervalSeconds, sceneThreshold,
      resizeMode, resizePercentage, resizeWidth, resizeHeight, jpegChroma
    }));
    const framesDir = path.join(outputDir, `${videoName}_${pathTag}_${paramsTag}_frames`);
    
    // 同一视频+同一参数组合的目录如果已存在，先清空再重新生成，
    // 保证目录内容永远和这次的参数严格对应，不会残留上一次导出的帧文件
    if (fs.existsSync(framesDir)) {
      emptyDir(framesDir);
    } else {
      fs.mkdirSync(framesDir, { recursive: true });
    }
    
    const outputPattern = path.join(framesDir, `frame_%06d.${format}`);
    
    // 构建 fluent-ffmpeg 命令
    let command = ffmpeg(videoPath);
    
    // 时间范围
    if (startTime > 0) {
      command = command.seekInput(startTime);
    }
    if (endTime > 0 && endTime > startTime) {
      command = command.duration(endTime - startTime);
    }
    
    // 是否为"零匹配即失败"的选择性过滤模式（关键帧/场景切换），
    // 用于在 error 回调里给出更友好的提示
    let isSelectiveMode = false;
    
    // 收集本次要拼接的视频滤镜（select、scale 等），最终统一合并成
    // 一条 -vf 滤镜链，避免多次设置 -vf 时后者覆盖前者的问题
    const videoFilters = [];
    let needFpsMode = false;
    let outputFps = null; // 用固定帧率方式实现的模式记录到这里，最后统一 .fps()
    
    // 根据导出模式设置过滤器
    // 注意：新版 FFmpeg 已移除 -vsync，需使用 -fps_mode 代替
    if (exportMode === 'original-fps') {
      // 按视频原始帧率逐帧导出（1:1 输出，不丢帧不重复）
      outputFps = sourceFps || 25;
    } else if (exportMode === 'interval-frame') {
      // 按真实帧序号选取：第1帧、第N+1帧、第2N+1帧...
      // 而不是用 -r 做时间轴重采样（那样在非整数倍频率下会产生偏差）
      const n = Math.max(1, Math.round(intervalFrames || 1));
      videoFilters.push(`select='not(mod(n,${n}))'`);
      needFpsMode = true;
    } else if (exportMode === 'interval-second') {
      // 每 N 秒输出一帧，等价于固定输出帧率 1/N
      const seconds = Math.max(0.001, intervalSeconds || 1);
      outputFps = 1 / seconds;
    } else if (exportMode === 'keyframe') {
      // 只提取关键帧
      isSelectiveMode = true;
      videoFilters.push("select='eq(pict_type,I)'");
      needFpsMode = true;
    } else if (exportMode === 'scene') {
      // 场景切换检测，threshold 通过 options 传入
      // 用 ?? 而非 ||，避免用户设置阈值为 0 时被误判为假值而回退到默认 0.3
      isSelectiveMode = true;
      const threshold = sceneThreshold ?? 0.3;
      videoFilters.push(`select='gt(scene,${threshold})'`);
      needFpsMode = true;
    } else {
      // 兜底：未知模式按原始帧率处理
      outputFps = sourceFps || 25;
    }
    
    // 固定帧率模式（原始帧率 / 每N秒）统一并入滤镜链，
    // 避免和后面的缩放滤镜互相覆盖 -vf 参数
    if (outputFps) {
      videoFilters.push(`fps=${outputFps}`);
    }
    
    // 尺寸缩放：追加到滤镜链末尾
    if (resizeMode === 'fixed' && resizeWidth > 0 && resizeHeight > 0) {
      videoFilters.push(`scale=${Math.round(resizeWidth)}:${Math.round(resizeHeight)}`);
    } else if (resizeMode === 'original' && resizePercentage > 0 && resizePercentage !== 100) {
      const ratio = resizePercentage / 100;
      // 缩放后的宽高须为偶数，否则某些编码器/像素格式会报错
      videoFilters.push(`scale=trunc(iw*${ratio}/2)*2:trunc(ih*${ratio}/2)*2`);
    }
    
    if (videoFilters.length > 0) {
      const vfArgs = ['-vf', videoFilters.join(',')];
      if (needFpsMode) vfArgs.push('-fps_mode', 'vfr');
      command = command.outputOptions(vfArgs);
    }
    
    // 质量设置（针对 JPEG）
    if (format === 'jpg' || format === 'jpeg') {
      const chromaMap = { '4.2.0': 'yuvj420p', '4.2.2': 'yuvj422p', '4.4.4': 'yuvj444p' };
      const pixFmt = chromaMap[jpegChroma] || 'yuvj420p';
      command = command.outputOptions(['-qscale:v', quality.toString(), '-pix_fmt', pixFmt]);
    } else if (format === 'webp') {
      // FFmpeg 输出 webp 序列时默认会选用 libwebp_anim（动画编码器），
      // 把所有帧打包成一个动画文件而不是逐帧输出独立图片，
      // 必须显式指定非动画的 libwebp 编码器才能得到 N 张静态 webp 图片
      command = command.outputOptions(['-c:v', 'libwebp', '-qscale:v', quality.toString()]);
    }
    
    // 输出
    command = command.output(outputPattern);
    
    // 记录实际执行的 FFmpeg 命令行，发送给前端日志面板
    command.on('start', (commandLine) => {
      event.sender.send('extraction-log', {
        videoPath,
        type: 'command',
        message: commandLine
      });
    });
    
    // 转发 FFmpeg stderr 输出（FFmpeg 的运行日志默认走 stderr）
    command.on('stderr', (stderrLine) => {
      event.sender.send('extraction-log', {
        videoPath,
        type: 'stderr',
        message: stderrLine
      });
    });
    
    // 进度监听
    command.on('progress', (progress) => {
      if (progress.timemark) {
        event.sender.send('extraction-progress', {
          videoPath,
          percent: progress.percent || 0,
          timemark: progress.timemark,
          currentFrame: progress.frames || 0
        });
      }
    });
    
    // 完成
    command.on('end', () => {
      ffmpegProcess = null;
      
      // 统计生成的帧数
      const files = fs.readdirSync(framesDir);
      const frameFiles = files.filter(f => f.startsWith('frame_'));
      
      event.sender.send('extraction-log', {
        videoPath,
        type: 'success',
        message: `完成，共生成 ${frameFiles.length} 帧，输出至 ${framesDir}`
      });
      
      // 记录处理历史（同时保存本次导出用的完整参数配置，供历史记录页展示详情）
      appendHistoryRecord({
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        fileName: path.basename(videoPath),
        videoPath: videoPath,
        outputDir: framesDir,
        frameCount: frameFiles.length,
        status: 'success',
        timestamp: new Date().toISOString(),
        params: {
          quality, format, startTime, endTime, exportMode, sourceFps,
          intervalFrames, intervalSeconds, sceneThreshold,
          resizeMode, resizePercentage, resizeWidth, resizeHeight, jpegChroma
        }
      });
      
      resolve({
        success: true,
        outputDir: framesDir,
        frameCount: frameFiles.length
      });
    });
    
    // 错误
    command.on('error', (err) => {
      ffmpegProcess = null;
      
      // 关键帧/场景切换模式下，如果视频里完全没有匹配的帧
      // （例如画面几乎静止，场景分数从未超过阈值），FFmpeg 底层会报
      // "Nothing was written into output file" 之类的错误，这里转换成更友好的提示
      let friendlyMessage = err.message;
      if (isSelectiveMode && /Nothing was written|Conversion failed/i.test(err.message)) {
        friendlyMessage = exportMode === 'scene'
          ? `未检测到场景切换（阈值 ${sceneThreshold ?? 0.3}），请尝试降低阈值或更换其他导出模式`
          : '该视频未包含可识别的关键帧，请尝试更换导出模式';
      }
      
      event.sender.send('extraction-log', {
        videoPath,
        type: 'error',
        message: `失败: ${friendlyMessage}`
      });
      
      // 记录失败历史（同样保存完整参数配置，便于排查失败原因）
      appendHistoryRecord({
        id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        fileName: path.basename(videoPath),
        videoPath: videoPath,
        outputDir: framesDir,
        frameCount: 0,
        status: 'error',
        error: friendlyMessage,
        timestamp: new Date().toISOString(),
        params: {
          quality, format, startTime, endTime, exportMode, sourceFps,
          intervalFrames, intervalSeconds, sceneThreshold,
          resizeMode, resizePercentage, resizeWidth, resizeHeight, jpegChroma
        }
      });
      
      reject(new Error(friendlyMessage));
    });
    
    // 启动并保存进程引用
    ffmpegProcess = command.run();
  });
});

// 取消提取
ipcMain.handle('cancel-extraction', async () => {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM');
    ffmpegProcess = null;
    return true;
  }
  return false;
});

// 打开文件夹
ipcMain.handle('open-folder', async (event, folderPath) => {
  const { shell } = require('electron');
  await shell.openPath(folderPath);
});

// 检查 FFmpeg
ipcMain.handle('check-ffmpeg', async () => {
  return new Promise((resolve) => {
    const ffmpegPath = getFFmpegPath();
    const process = spawn(ffmpegPath, ['-version']);
    
    let output = '';
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        const versionMatch = output.match(/ffmpeg version ([\d.]+)/);
        resolve({
          available: true,
          version: versionMatch ? versionMatch[1] : 'unknown',
          path: ffmpegPath
        });
      } else {
        resolve({
          available: false,
          error: '无法运行 FFmpeg'
        });
      }
    });
    
    process.on('error', () => {
      resolve({
        available: false,
        error: 'FFmpeg 未找到'
      });
    });
  });
});

// 选择文件夹（通用）
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (result.canceled) return null;
  return result.filePaths[0];
});

// 列出图片文件
ipcMain.handle('list-images', async (event, folderPath) => {
  try {
    const files = fs.readdirSync(folderPath);
    const imageExts = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'];
    const imageFiles = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExts.includes(ext);
      })
      .map(file => path.join(folderPath, file))
      .sort();
    
    return imageFiles;
  } catch (error) {
    console.error('列出图片失败:', error);
    return [];
  }
});

// 导出图片
ipcMain.handle('export-image', async (event, imagePath) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: path.basename(imagePath),
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'bmp'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    
    if (result.canceled) return null;
    
    fs.copyFileSync(imagePath, result.filePath);
    return result.filePath;
  } catch (error) {
    console.error('导出图片失败:', error);
    throw error;
  }
});

// 获取设置
ipcMain.handle('get-settings', async () => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
    // 返回默认设置
    return {
      outputDirMode: 'video',
      customOutputDir: '',
      closeAction: 'quit'
    };
  } catch (error) {
    console.error('读取设置失败:', error);
    return {
      outputDirMode: 'video',
      customOutputDir: '',
      closeAction: 'quit'
    };
  }
});

// 保存设置
ipcMain.handle('save-settings', async (event, settings) => {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('保存设置失败:', error);
    throw error;
  }
});

// 获取处理历史记录
ipcMain.handle('get-history', async () => {
  return readHistory();
});

// 清空处理历史记录
ipcMain.handle('clear-history', async () => {
  try {
    fs.writeFileSync(getHistoryPath(), JSON.stringify([], null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('清空历史记录失败:', error);
    throw error;
  }
});
