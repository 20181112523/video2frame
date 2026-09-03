const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 文件选择
  selectVideos: () => ipcRenderer.invoke('select-videos'),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  
  // 视频信息
  getVideoInfo: (videoPath) => ipcRenderer.invoke('get-video-info', videoPath),
  
  // 帧提取
  extractFrames: (options) => ipcRenderer.invoke('extract-frames', options),
  cancelExtraction: () => ipcRenderer.invoke('cancel-extraction'),
  
  // 进度监听（返回取消订阅函数，避免组件重复挂载时监听器堆积）
  onProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('extraction-progress', listener);
    return () => ipcRenderer.removeListener('extraction-progress', listener);
  },
  
  // 日志监听（FFmpeg 实际执行命令、stderr 输出、每个视频的完成/失败信息）
  onLog: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('extraction-log', listener);
    return () => ipcRenderer.removeListener('extraction-log', listener);
  },
  
  // 图片预览
  listImages: (folderPath) => ipcRenderer.invoke('list-images', folderPath),
  exportImage: (imagePath) => ipcRenderer.invoke('export-image', imagePath),
  
  // 设置管理
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // 处理历史记录
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  
  // 工具
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  checkFFmpeg: () => ipcRenderer.invoke('check-ffmpeg'),
});
