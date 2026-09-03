import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { IconFolder, IconPlay, IconClose, IconCheck, IconSliders, IconImage, IconLayers, IconFilm } from '../components/icons.jsx';
import SpotlightCard from '../components/SpotlightCard.jsx';
import CountUp from '../components/CountUp.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';
import { Slider } from '../components/ui/slider.jsx';
import { Progress } from '../components/ui/progress.jsx';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { cn } from '../lib/utils.js';

const MAX_LOGS = 500; // 避免长时间运行日志无限增长

let videoIdCounter = 0;

const formatDuration = (seconds) => {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// 转换时间字符串为秒数
const parseTime = (timeStr) => {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return 0;
};

// 将 FFmpeg 的 timemark（HH:MM:SS.ms）转换为秒数
const parseTimemark = (timemark) => {
  if (!timemark) return 0;
  const match = timemark.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return 0;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
};

const formatNow = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const logTypeLabel = (type) => {
  const labels = {
    command: '指令',
    stderr: '输出',
    success: '完成',
    error: '错误',
  };
  return labels[type] || type;
};

export default function ExtractView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  // 全局设置（从设置页读取）
  const [globalSettings, setGlobalSettings] = useState({
    outputDirMode: 'video',
    customOutputDir: '',
  });

  // 本次会话临时覆盖的输出目录（不写入全局设置）
  const [sessionOutputDir, setSessionOutputDir] = useState('');

  // 导出设置（时间范围改为每个视频单独设置，见 video.rangeStart / video.rangeEnd）
  const [exportMode, setExportMode] = useState('interval-frame'); // 'interval-frame', 'interval-second', 'keyframe', 'scene'
  const [intervalFrames, setIntervalFrames] = useState(1);
  const [intervalSeconds, setIntervalSeconds] = useState(1);
  const [sceneThreshold, setSceneThreshold] = useState(0.3);

  // 格式设置
  const [imageFormat, setImageFormat] = useState('jpg'); // 'jpg', 'png', 'webp'
  const [imageQuality, setImageQuality] = useState(95); // 1-100
  const [resizeMode, setResizeMode] = useState('original'); // 'original', 'fixed'
  const [resizePercentage, setResizePercentage] = useState(100);
  const [resizeWidth, setResizeWidth] = useState(1920);
  const [resizeHeight, setResizeHeight] = useState(1080);
  const [jpegChroma, setJpegChroma] = useState('4.2.0'); // JPEG 色度采样: '4.2.0' | '4.2.2' | '4.4.4'

  // 当前正在处理的视频路径
  const [currentVideoPath, setCurrentVideoPath] = useState('');

  // 处理结果记录（本次批处理的结果卡片）
  const [results, setResults] = useState([]);

  // 日志面板相关状态
  const [logs, setLogs] = useState([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [lastLogTime, setLastLogTime] = useState('');
  const [lastLogMessage, setLastLogMessage] = useState('');

  // 用于在异步循环 / 事件回调中读取"最新值"，效果等价于 Vue 的 ref 实时读取
  const videosRef = useRef(videos);
  videosRef.current = videos;

  const settingsRef = useRef();
  settingsRef.current = {
    globalSettings, sessionOutputDir, exportMode, intervalFrames, intervalSeconds,
    sceneThreshold, imageFormat, imageQuality, resizeMode, resizePercentage,
    resizeWidth, resizeHeight, jpegChroma,
  };

  const handledPresetVideoRef = useRef(false);
  const currentVideoPathRef = useRef('');
  const currentVideoElapsedRef = useRef(0);
  const completedDurationRef = useRef(0);
  const totalDurationRef = useRef(0);

  // 当前生效的输出目录展示文本
  const outputDirDisplay = sessionOutputDir
    ? sessionOutputDir
    : (globalSettings.outputDirMode === 'custom' && globalSettings.customOutputDir)
      ? globalSettings.customOutputDir
      : '（使用视频所在目录）';

  // 提取时实际使用的目录：
  // - 有本次覆盖，用覆盖值
  // - 否则按设置：custom 用全局自定义目录，video 模式返回视频所在目录
  const resolveOutputDir = (videoPath) => {
    const s = settingsRef.current;
    if (s.sessionOutputDir) return s.sessionOutputDir;
    if (s.globalSettings.outputDirMode === 'custom' && s.globalSettings.customOutputDir) {
      return s.globalSettings.customOutputDir;
    }
    return videoPath.substring(0, Math.max(videoPath.lastIndexOf('\\'), videoPath.lastIndexOf('/')));
  };

  // 添加一批视频路径到列表，并异步获取每个视频的详细信息
  // 抽成独立函数是为了让"手动选择视频"和"从预览页跳转带过来的视频"复用同一套逻辑
  const addVideos = useCallback(async (paths, presetTimeRange) => {
    if (!paths || paths.length === 0) return;

    // 预设时间范围（来自预览页跳转带来的 query 参数）是 HH:MM:SS 字符串，
    // 转成秒数存放；没有预设时先给 0，等视频信息读到 duration 后再补成整段视频
    const presetStart = presetTimeRange?.start ? parseTime(presetTimeRange.start) : null;
    const presetEnd = presetTimeRange?.end ? parseTime(presetTimeRange.end) : null;

    const newVideos = paths.map((path) => ({
      id: ++videoIdCounter,
      path,
      name: path.split(/[\\/]/).pop(),
      loading: true,
      error: null,
      duration: 0,
      fps: 0,
      width: 0,
      height: 0,
      rangeStart: presetStart ?? 0,
      rangeEnd: presetEnd ?? 0,
      hasCustomRange: presetStart != null || presetEnd != null,
    }));

    setVideos((prev) => [...prev, ...newVideos]);

    // 并行获取每个视频的详细信息（而不是逐个等待）
    await Promise.all(newVideos.map(async (v) => {
      try {
        const info = await window.electronAPI.getVideoInfo(v.path);
        setVideos((prev) => prev.map((item) => {
          if (item.id !== v.id) return item;
          // 默认时间范围是整个视频；只有从预览页带了自定义范围才保留原值
          return {
            ...item,
            duration: info.duration,
            fps: info.fps,
            width: info.width,
            height: info.height,
            loading: false,
            rangeEnd: item.hasCustomRange ? item.rangeEnd : info.duration,
          };
        }));
      } catch (error) {
        console.error(`获取视频信息失败 (${v.name}):`, error);
        setVideos((prev) => prev.map((item) => item.id === v.id
          ? { ...item, error: '无法读取信息', loading: false }
          : item));
      }
    }));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedSettings = await window.electronAPI.getSettings();
        if (savedSettings) {
          setGlobalSettings(savedSettings);
        }
      } catch (error) {
        console.error('读取设置失败:', error);
      }

      // 从预览页跳转过来时，路由会带上 video/start/end 三个 query 参数，
      // 这里读取并自动把该视频加入列表、预填时间范围。
      // 用 ref 拦截重复执行：React.StrictMode 在开发模式下会把 effect 触发两次，
      // 两次调用都在 navigate 清空 query 之前读到同一个 video 参数，若不拦截会加入两条重复记录。
      const video = searchParams.get('video');
      if (video && !handledPresetVideoRef.current) {
        handledPresetVideoRef.current = true;
        const start = searchParams.get('start') || '';
        const end = searchParams.get('end') || '';
        await addVideos([video], { start, end });
        // 用完即清空 query，避免刷新页面或再次进入该路由时重复添加
        navigate('/extract', { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushLog = useCallback((type, message) => {
    const time = formatNow();
    setLogs((prev) => {
      const next = [...prev, { time, type, message }];
      if (next.length > MAX_LOGS) next.shift();
      return next;
    });
    setLastLogTime(time);
    setLastLogMessage(message);
  }, []);

  const updateOverallProgress = useCallback(() => {
    if (totalDurationRef.current <= 0) {
      setExtractionProgress(0);
      return;
    }
    const processed = completedDurationRef.current + currentVideoElapsedRef.current;
    setExtractionProgress(Math.min(100, Math.round((processed / totalDurationRef.current) * 100)));
  }, []);

  // 监听 FFmpeg 实时进度，驱动平滑进度条 + 实际执行命令、stderr 输出、完成/失败信息
  useEffect(() => {
    const unsubscribeProgress = window.electronAPI.onProgress((data) => {
      if (data.videoPath !== currentVideoPathRef.current) return;
      currentVideoElapsedRef.current = parseTimemark(data.timemark);
      updateOverallProgress();
    });

    const unsubscribeLog = window.electronAPI.onLog((data) => {
      pushLog(data.type, data.message);
    });

    return () => {
      if (unsubscribeProgress) unsubscribeProgress();
      if (unsubscribeLog) unsubscribeLog();
    };
  }, [pushLog, updateOverallProgress]);

  const selectVideos = async () => {
    const files = await window.electronAPI.selectVideos();
    await addVideos(files);
  };

  const selectOutputDir = async () => {
    const dir = await window.electronAPI.selectOutputDir();
    if (dir) {
      setSessionOutputDir(dir);
    }
  };

  const resetSessionOutputDir = () => {
    setSessionOutputDir('');
  };

  const removeVideo = (id) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVideoField = (id, field, value) => {
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
  };

  const openFolder = async (folderPath) => {
    await window.electronAPI.openFolder(folderPath);
  };

  // 预估某个视频在当前导出设置下会生成多少张图片
  const estimateFrameCount = (video) => {
    if (!video.duration) return '--';

    const effectiveDuration = Math.max(0, video.rangeEnd - video.rangeStart) || video.duration;
    const sourceFps = video.fps || 25;

    if (exportMode === 'interval-frame') {
      const totalFrames = Math.round(effectiveDuration * sourceFps);
      const n = Math.max(1, intervalFrames);
      return Math.max(0, Math.floor(totalFrames / n) + (totalFrames > 0 ? 1 : 0));
    }
    if (exportMode === 'interval-second') {
      const seconds = Math.max(0.001, intervalSeconds);
      return Math.max(0, Math.floor(effectiveDuration / seconds) + (effectiveDuration > 0 ? 1 : 0));
    }
    // 关键帧 / 场景切换：取决于画面内容，无法精确预估
    return '~';
  };

  const clearLogs = () => {
    setLogs([]);
    setLastLogTime('');
    setLastLogMessage('准备就绪');
  };

  const startExtraction = async () => {
    const videoList = videosRef.current;
    if (videoList.length === 0) return;

    setIsExtracting(true);
    setExtractionProgress(0);
    completedDurationRef.current = 0;
    currentVideoElapsedRef.current = 0;
    setResults([]);

    // 计算本批次总有效时长（用于平滑进度条），每个视频用自己的时间范围
    totalDurationRef.current = videoList.reduce((sum, v) => {
      const effective = Math.max(0, v.rangeEnd - v.rangeStart) || (v.duration || 0);
      return sum + effective;
    }, 0);

    for (let i = 0; i < videoList.length; i++) {
      const video = videoList[i];
      currentVideoPathRef.current = video.path;
      setCurrentVideoPath(video.path);
      currentVideoElapsedRef.current = 0;

      const start = video.rangeStart;
      const end = video.rangeEnd;
      const effectiveDuration = Math.max(0, end - start) || (video.duration || 0);

      try {
        const sourceFps = video.fps || 25; // 视频实际帧率，读取失败时兜底 25
        const s = settingsRef.current;

        // 质量转换：滑块 0-100 转为 FFmpeg 的 1-31（值越小质量越高）
        const quality = Math.round((100 - s.imageQuality) / 100 * 30) + 1;

        const result = await window.electronAPI.extractFrames({
          videoPath: video.path,
          outputDir: resolveOutputDir(video.path),
          exportMode: s.exportMode,
          sourceFps,
          intervalFrames: s.intervalFrames,
          intervalSeconds: s.intervalSeconds,
          sceneThreshold: s.sceneThreshold,
          quality,
          format: s.imageFormat,
          startTime: start,
          endTime: end,
          // 额外参数
          resizeMode: s.resizeMode,
          resizePercentage: s.resizePercentage,
          resizeWidth: s.resizeWidth,
          resizeHeight: s.resizeHeight,
          jpegChroma: s.jpegChroma,
        });

        setResults((prev) => [...prev, {
          name: video.name,
          status: 'success',
          frameCount: result.frameCount,
          outputDir: result.outputDir,
        }]);
      } catch (error) {
        console.error('提取失败:', error);
        setResults((prev) => [...prev, {
          name: video.name,
          status: 'error',
          error: error.message,
        }]);
      }

      // 该视频处理完毕，累计其有效时长，作为已完成部分
      completedDurationRef.current += effectiveDuration;
      currentVideoElapsedRef.current = 0;
      updateOverallProgress();
    }

    currentVideoPathRef.current = '';
    setCurrentVideoPath('');
    setIsExtracting(false);
    setExtractionProgress(100);
  };

  return (
    <div className="mx-auto max-w-6xl px-10 py-8 pb-16">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">视频切帧</h1>
        <p className="mt-1 text-sm text-muted-foreground">请选择视频文件，可选择每个视频的时间范围，默认整个视频</p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex gap-3">
          <Button variant="outline" onClick={selectVideos}>
            <IconFolder className="size-4" />
            选择视频文件
          </Button>
          <Button onClick={startExtraction} disabled={videos.length === 0 || isExtracting}>
            {isExtracting ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
            ) : (
              <IconPlay className="size-4" />
            )}
            {isExtracting ? '提取中…' : '开始提取'}
          </Button>
        </div>

        {videos.length > 0 && (
          <div className="flex flex-col gap-3">
            {videos.map((video) => (
              <SpotlightCard
                key={video.id}
                spotlightColor="rgba(37, 99, 235, 0.12)"
                className="glass-panel relative flex flex-col gap-3 rounded-xl px-5 py-4"
              >
                <div className="relative z-[1] flex items-center justify-between">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="truncate text-sm font-semibold text-foreground">{video.name}</span>
                    {video.loading ? (
                      <span className="shrink-0 text-xs text-muted-foreground">读取信息中...</span>
                    ) : video.error ? (
                      <span className="shrink-0 text-xs text-destructive">{video.error}</span>
                    ) : (
                      <>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{video.width}×{video.height}</span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{video.fps.toFixed(2)} fps</span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDuration(video.duration)}</span>
                      </>
                    )}
                  </div>
                  <button
                    className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeVideo(video.id)}
                    aria-label="移除"
                  >
                    <IconClose className="size-3.5" />
                  </button>
                </div>

                {!video.loading && !video.error && (
                  <div className="relative z-[1] flex flex-col gap-3 border-t border-border/60 pt-3">
                    <div className="flex items-center gap-3">
                      <span className="shrink-0 text-xs font-semibold text-muted-foreground">时间范围</span>
                      <Slider
                        value={[video.rangeStart, video.rangeEnd]}
                        onValueChange={([start, end]) => {
                          updateVideoField(video.id, 'rangeStart', start);
                          updateVideoField(video.id, 'rangeEnd', end);
                        }}
                        min={0}
                        max={video.duration || 0}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {formatDuration(video.rangeStart)} – {formatDuration(video.rangeEnd)}
                      </span>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      预计导出 <strong className="font-mono font-bold text-primary">{estimateFrameCount(video)}</strong> 张
                    </div>
                  </div>
                )}
              </SpotlightCard>
            ))}
          </div>
        )}

        <div className="glass-panel flex items-center gap-3 rounded-lg px-4 py-3 text-sm">
          <span className="shrink-0 font-semibold text-muted-foreground">输出目录:</span>
          <span className="flex-1 truncate font-mono text-xs text-foreground">{outputDirDisplay}</span>
          {sessionOutputDir && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">本次自定义</span>
          )}
          <button className="shrink-0 text-xs font-bold text-primary hover:underline" onClick={selectOutputDir}>
            更改本次目录
          </button>
          {sessionOutputDir && (
            <button className="shrink-0 text-xs font-bold text-primary hover:underline" onClick={resetSessionOutputDir}>
              恢复默认
            </button>
          )}
        </div>

        {/* 设置面板容器 - 左右布局 */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* 导出设置面板 */}
          <div className="glass-panel rounded-xl p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
              <IconSliders className="size-4 text-primary" />
              <span className="text-sm font-bold text-foreground">导出设置</span>
            </div>

            <RadioGroup value={exportMode} onValueChange={setExportMode} className="gap-2">
              <label className="flex items-center gap-2 rounded-lg px-1 py-2 text-sm hover:bg-white/40">
                <RadioGroupItem value="interval-frame" id="mode-frame" />
                <span className="text-foreground">每</span>
                <Input
                  type="number"
                  min="1"
                  value={intervalFrames}
                  onChange={(e) => setIntervalFrames(Number(e.target.value))}
                  onFocus={() => setExportMode('interval-frame')}
                  disabled={exportMode !== 'interval-frame'}
                  className="w-16 text-center font-mono"
                />
                <span className="text-foreground">帧提取一次</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg px-1 py-2 text-sm hover:bg-white/40">
                <RadioGroupItem value="interval-second" id="mode-second" />
                <span className="text-foreground">每</span>
                <Input
                  type="number"
                  min="1"
                  value={intervalSeconds}
                  onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                  onFocus={() => setExportMode('interval-second')}
                  disabled={exportMode !== 'interval-second'}
                  className="w-16 text-center font-mono"
                />
                <span className="text-foreground">秒提取一次</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg px-1 py-2 text-sm hover:bg-white/40">
                <RadioGroupItem value="keyframe" id="mode-keyframe" />
                <span className="text-foreground">关键帧</span>
              </label>

              <label className="flex items-center gap-2 rounded-lg px-1 py-2 text-sm hover:bg-white/40">
                <RadioGroupItem value="scene" id="mode-scene" />
                <span className="text-foreground">场景切换</span>
                <span className="text-xs text-muted-foreground">阈值</span>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={sceneThreshold}
                  onChange={(e) => setSceneThreshold(Number(e.target.value))}
                  onFocus={() => setExportMode('scene')}
                  disabled={exportMode !== 'scene'}
                  className="w-20 text-center font-mono"
                />
              </label>
            </RadioGroup>
          </div>

          {/* 格式与尺寸面板 */}
          <div className="glass-panel rounded-xl p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
              <IconImage className="size-4 text-primary" />
              <span className="text-sm font-bold text-foreground">格式与尺寸</span>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Label className="min-w-14 shrink-0 text-xs font-semibold text-muted-foreground">格式</Label>
                <div className="flex gap-2">
                  {['jpg', 'png', 'webp'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setImageFormat(fmt)}
                      className={cn(
                        'rounded-md border px-4 py-1.5 font-mono text-xs font-semibold transition-colors',
                        imageFormat === fmt
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-input bg-transparent text-foreground hover:border-primary/40'
                      )}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Label className="min-w-14 shrink-0 text-xs font-semibold text-muted-foreground">质量</Label>
                <Slider
                  value={[imageQuality]}
                  onValueChange={([v]) => setImageQuality(v)}
                  min={1}
                  max={100}
                  className="flex-1"
                />
                <span className="min-w-11 shrink-0 text-right font-mono text-sm font-semibold text-foreground">{imageQuality}%</span>
              </div>

              <div className="flex items-center gap-4">
                <Label className="min-w-14 shrink-0 text-xs font-semibold text-muted-foreground">尺寸</Label>
                <Select value={resizeMode} onValueChange={setResizeMode}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">百分比缩放</SelectItem>
                    <SelectItem value="fixed">固定尺寸</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {resizeMode === 'original' && (
                <div className="flex items-center gap-4">
                  <span className="min-w-14 shrink-0" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Input
                      type="number"
                      min="1"
                      max="200"
                      value={resizePercentage}
                      onChange={(e) => setResizePercentage(Number(e.target.value))}
                      className="w-24 text-center font-mono"
                    />
                    <span>%</span>
                  </div>
                </div>
              )}

              {resizeMode === 'fixed' && (
                <div className="flex items-center gap-4">
                  <span className="min-w-14 shrink-0" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Input
                      type="number"
                      value={resizeWidth}
                      onChange={(e) => setResizeWidth(Number(e.target.value))}
                      className="w-24 text-center font-mono"
                    />
                    <span>×</span>
                    <Input
                      type="number"
                      value={resizeHeight}
                      onChange={(e) => setResizeHeight(Number(e.target.value))}
                      className="w-24 text-center font-mono"
                    />
                  </div>
                </div>
              )}

              {imageFormat === 'jpg' && (
                <div className="flex items-center gap-4">
                  <Label className="min-w-14 shrink-0 text-xs font-semibold text-muted-foreground">色度采样</Label>
                  <Select value={jpegChroma} onValueChange={setJpegChroma}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4.2.0">4:2:0（高压缩，文件更小）</SelectItem>
                      <SelectItem value="4.2.2">4:2:2（平衡）</SelectItem>
                      <SelectItem value="4.4.4">4:4:4（高质量，文件更大）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        {isExtracting && (
          <div className="glass-panel rounded-xl p-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-foreground">提取进度</h3>
            {currentVideoPath && (
              <div className="mb-3 truncate font-mono text-xs text-muted-foreground">
                正在处理: {currentVideoPath.split(/[\\/]/).pop()}
              </div>
            )}
            <div className="relative">
              <Progress value={extractionProgress} />
              <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold text-foreground/70">
                {extractionProgress}%
              </span>
            </div>
          </div>
        )}

        {/* 处理结果卡片 */}
        {results.length > 0 && (
          <div className="glass-panel rounded-xl p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
              <IconLayers className="size-4 text-primary" />
              <span className="text-sm font-bold text-foreground">处理结果</span>
            </div>
            <div className="flex flex-col gap-2">
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-3 rounded-lg border border-border/60 bg-white/40 px-4 py-3">
                  <div
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full',
                      result.status === 'success' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                    )}
                  >
                    {result.status === 'success' ? <IconCheck className="size-3" /> : <IconClose className="size-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground">{result.name}</div>
                    {result.status === 'success' ? (
                      <div className="truncate font-mono text-xs text-muted-foreground">
                        <CountUp value={result.frameCount} /> 帧 · {result.outputDir}
                      </div>
                    ) : (
                      <div className="truncate text-xs text-destructive">{result.error}</div>
                    )}
                  </div>
                  {result.status === 'success' && (
                    <button
                      className="shrink-0 rounded-md border border-primary/40 px-3 py-1 text-[11px] font-bold text-primary hover:bg-primary/10"
                      onClick={() => openFolder(result.outputDir)}
                    >
                      前往目录
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {videos.length === 0 && !isExtracting && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <IconFilm className="mb-2 size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无视频文件</p>
            <p className="text-xs text-muted-foreground/70">点击上方按钮选择视频文件</p>
          </div>
        )}

        {/* 日志状态栏 */}
        <div className="glass-panel flex items-center justify-between gap-4 rounded-lg px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="shrink-0 font-mono text-xs text-muted-foreground/70">{lastLogTime || '--:--:--'}</span>
            <span className="truncate text-xs text-muted-foreground">{lastLogMessage || '准备就绪'}</span>
          </div>
          <div className="flex shrink-0 gap-4">
            <button
              className="text-xs font-semibold text-muted-foreground hover:text-primary disabled:opacity-40"
              onClick={() => setShowLogPanel(!showLogPanel)}
              disabled={logs.length === 0}
            >
              {showLogPanel ? '收起日志' : '查看日志'}
            </button>
            <button
              className="text-xs font-semibold text-muted-foreground hover:text-primary disabled:opacity-40"
              onClick={clearLogs}
              disabled={logs.length === 0}
            >
              清空
            </button>
          </div>
        </div>

        {/* 日志详情面板 */}
        {showLogPanel && (
          <div className="glass-panel max-h-80 overflow-y-auto rounded-lg px-4 py-3 font-mono">
            {logs.map((log, index) => (
              <div key={index} className="flex items-baseline gap-2 py-0.5 text-[11px] leading-relaxed">
                <span className="shrink-0 text-muted-foreground/60">{log.time}</span>
                <span
                  className={cn(
                    'shrink-0 rounded px-1.5 py-px text-[10px] font-bold',
                    log.type === 'command' && 'bg-primary/10 text-primary',
                    log.type === 'stderr' && 'bg-muted text-muted-foreground',
                    log.type === 'success' && 'bg-success/15 text-success',
                    log.type === 'error' && 'bg-destructive/15 text-destructive'
                  )}
                >
                  {logTypeLabel(log.type)}
                </span>
                <span className={cn('whitespace-pre-wrap break-all text-muted-foreground', log.type === 'error' && 'text-destructive')}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
