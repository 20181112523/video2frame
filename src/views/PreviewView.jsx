import { useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconFolder, IconPhoto, IconVideoCamera, IconSkipBack, IconSkipForward,
  IconPlay, IconPause, IconDownload, IconArrowRight,
} from '../components/icons.jsx';
import { Button } from '../components/ui/button.jsx';
import { Slider } from '../components/ui/slider.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs.jsx';
import { cn } from '../lib/utils.js';

// 将本地文件系统路径转换为合法的 file:// URL
// Windows 路径如 C:\Users\xxx\a.jpg 必须转为 file:///C:/Users/xxx/a.jpg
// （反斜杠转正斜杠、补上第三个斜杠、并对特殊字符做百分号编码），
// 否则 Chromium 会把盘符当成 host 解析，导致资源加载失败
const toFileUrl = (localPath) => {
  if (!localPath) return '';
  let normalized = localPath.replace(/\\/g, '/');
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized; // 补齐 file:/// 的第三个斜杠（Windows 盘符路径）
  }
  return 'file://' + normalized
    .split('/')
    .map((segment) => {
      // Windows 盘符段（如 "C:"）必须保留原始冒号，一旦被编码成 %3A，
      // Chromium 的 file 协议处理器就无法定位到实际磁盘驱动器
      if (/^[a-zA-Z]:$/.test(segment)) return segment;
      return encodeURIComponent(segment);
    })
    .join('/');
};

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function PreviewView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('images');

  // 图片预览相关
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef(null);
  const imagesRef = useRef([]);
  imagesRef.current = images;

  const currentImageUrl = useMemo(() => {
    if (images.length === 0) return '';
    return toFileUrl(images[currentIndex]);
  }, [images, currentIndex]);

  const selectImageFolder = async () => {
    const folder = await window.electronAPI.selectFolder();
    if (folder) {
      const files = await window.electronAPI.listImages(folder);
      setImages(files);
      setCurrentIndex(0);
    }
  };

  const stopPlaying = useCallback(() => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
  }, []);

  const nextImage = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < imagesRef.current.length - 1) {
        return prev + 1;
      }
      stopPlaying();
      return prev;
    });
  }, [stopPlaying]);

  const previousImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopPlaying();
    } else {
      setIsPlaying(true);
      playIntervalRef.current = setInterval(() => {
        nextImage();
      }, 500); // 每0.5秒切换一张
    }
  };

  // 手动拖动进度条跳转到指定图片时，如果正在自动播放就先停下来，
  // 避免定时器马上又把 currentIndex 切走，导致拖动"跳不动"
  const onProgressSliderChange = ([v]) => {
    if (isPlaying) stopPlaying();
    setCurrentIndex(v);
  };

  const exportCurrentImage = async () => {
    if (images.length === 0) return;
    const currentImage = images[currentIndex];
    await window.electronAPI.exportImage(currentImage);
  };

  // 视频预览相关
  const [videoPath, setVideoPath] = useState(''); // 用于 <video> 标签的 file:// URL
  const [videoLocalPath, setVideoLocalPath] = useState(''); // 原始本地文件系统路径，用于跳转到切帧页面
  const videoPlayerRef = useRef(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(10);

  // 当前播放位置在时间轴上的百分比，用于在范围选择轨道上画出播放头标记
  const playheadPercent = videoDuration ? (currentTime / videoDuration) * 100 : 0;

  // 拖动播放进度条时，同步 seek 视频到对应时间点
  const onSeekChange = ([v]) => {
    if (videoPlayerRef.current) {
      videoPlayerRef.current.currentTime = v;
    }
    setCurrentTime(v);
  };

  // 双滑块时间范围：Radix Slider 原生支持多 thumb，用一个 value=[start,end] 数组驱动
  const onRangeChange = ([start, end]) => {
    setRangeStart(start);
    setRangeEnd(end);
  };

  const selectVideo = async () => {
    const files = await window.electronAPI.selectVideos();
    if (files && files.length > 0) {
      setVideoLocalPath(files[0]); // 保留原始本地路径，用于后续跳转到切帧页面
      setVideoPath(toFileUrl(files[0]));
    }
  };

  const onVideoLoaded = () => {
    if (videoPlayerRef.current) {
      const duration = videoPlayerRef.current.duration;
      setVideoDuration(duration);
      setRangeEnd(duration);
    }
  };

  const onTimeUpdate = () => {
    if (videoPlayerRef.current) {
      setCurrentTime(videoPlayerRef.current.currentTime);
    }
  };

  const toggleVideoPlay = () => {
    if (!videoPlayerRef.current) return;
    if (isVideoPlaying) {
      videoPlayerRef.current.pause();
    } else {
      videoPlayerRef.current.play();
    }
    setIsVideoPlaying(!isVideoPlaying);
  };

  const applyToExtract = () => {
    // 将视频路径和时间范围传递到切帧页面
    navigate({
      pathname: '/extract',
      search: `?video=${encodeURIComponent(videoLocalPath)}&start=${encodeURIComponent(formatTime(rangeStart))}&end=${encodeURIComponent(formatTime(rangeEnd))}`,
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-10 py-8 pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">预览</h1>
        <p className="mt-1 text-sm text-muted-foreground">预览已提取的图片或视频片段</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 glass-panel">
          <TabsTrigger value="images" className="gap-1.5">
            <IconPhoto className="size-[15px]" />
            图片预览
          </TabsTrigger>
          <TabsTrigger value="video" className="gap-1.5">
            <IconVideoCamera className="size-[15px]" />
            视频预览
          </TabsTrigger>
        </TabsList>

        <TabsContent value="images">
          <div className="glass-panel rounded-xl p-6">
            <div className="mb-6 flex items-center gap-4">
              <Button onClick={selectImageFolder}>
                <IconFolder className="size-4" />
                选择图片目录
              </Button>
              {images.length > 0 && (
                <div className="font-mono text-xs text-muted-foreground">共 {images.length} 张图片</div>
              )}
            </div>

            {images.length > 0 ? (
              <div className="flex flex-col gap-5">
                <div className="flex min-h-[480px] items-center justify-center rounded-xl border border-border/60 bg-white/50 p-4">
                  <img src={currentImageUrl} alt="Preview" className="max-h-[480px] max-w-full rounded-md object-contain" />
                </div>

                <Slider
                  value={[currentIndex]}
                  onValueChange={onProgressSliderChange}
                  min={0}
                  max={Math.max(0, images.length - 1)}
                  step={1}
                />

                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={previousImage} disabled={currentIndex === 0}>
                    <IconSkipBack className="size-4" />
                    上一张
                  </Button>
                  <Button variant="outline" onClick={togglePlay}>
                    {isPlaying ? <IconPause className="size-4" /> : <IconPlay className="size-4" />}
                    {isPlaying ? '暂停' : '播放'}
                  </Button>
                  <Button variant="outline" onClick={nextImage} disabled={currentIndex === images.length - 1}>
                    下一张
                    <IconSkipForward className="size-4" />
                  </Button>
                  <Button variant="outline" className="ml-auto border-success/40 text-success hover:bg-success/10" onClick={exportCurrentImage}>
                    <IconDownload className="size-4" />
                    导出当前图片
                  </Button>
                </div>

                <div className="text-center font-mono text-xs text-muted-foreground">
                  {currentIndex + 1} / {images.length}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <IconPhoto className="mb-2 size-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">暂无图片</p>
                <p className="text-xs text-muted-foreground/70">点击上方按钮选择图片目录</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="video">
          <div className="glass-panel rounded-xl p-6">
            <div className="mb-6">
              <Button onClick={selectVideo}>
                <IconFolder className="size-4" />
                选择视频文件
              </Button>
            </div>

            {videoPath ? (
              <div className="flex flex-col gap-5">
                <video
                  ref={videoPlayerRef}
                  src={videoPath}
                  className="max-h-[480px] w-full rounded-xl border border-border/60 bg-black"
                  onLoadedMetadata={onVideoLoaded}
                  onTimeUpdate={onTimeUpdate}
                />

                <div className="flex items-center gap-4">
                  <Button size="icon" variant="outline" onClick={toggleVideoPlay}>
                    {isVideoPlaying ? <IconPause className="size-4" /> : <IconPlay className="size-4" />}
                  </Button>
                  <div className="shrink-0 font-mono text-xs text-muted-foreground">
                    {formatTime(currentTime)} / {formatTime(videoDuration)}
                  </div>
                  <Slider value={[currentTime]} onValueChange={onSeekChange} min={0} max={videoDuration || 0} step={0.1} className="flex-1" />
                </div>

                <div className="rounded-xl border border-border/60 bg-white/40 p-5">
                  <label className="mb-3 block text-xs font-semibold text-muted-foreground">选择时间范围:</label>

                  <div className="relative mb-4 py-2">
                    {/* 播放头标记：随视频播放位置移动，叠在双滑块轨道上方 */}
                    <div
                      className="pointer-events-none absolute top-0 z-10 h-4 w-0.5 -translate-x-1/2 rounded-full bg-accent transition-[left] duration-100 ease-linear"
                      style={{ left: `${playheadPercent}%` }}
                      title={`当前播放: ${formatTime(currentTime)}`}
                    />
                    <Slider
                      value={[rangeStart, rangeEnd]}
                      onValueChange={onRangeChange}
                      min={0}
                      max={videoDuration || 0}
                      step={0.1}
                    />
                  </div>

                  <div className="mb-4 flex gap-6 font-mono text-xs text-muted-foreground">
                    <span>起始: {formatTime(rangeStart)}</span>
                    <span>结束: {formatTime(rangeEnd)}</span>
                    <span>时长: {formatTime(rangeEnd - rangeStart)}</span>
                  </div>

                  <Button className="w-full" onClick={applyToExtract}>
                    应用到切帧页面
                    <IconArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <IconVideoCamera className="mb-2 size-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">暂无视频</p>
                <p className="text-xs text-muted-foreground/70">点击上方按钮选择视频文件</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
