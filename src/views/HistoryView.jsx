import { useState, useEffect, useCallback } from 'react';
import { IconTrash, IconCheck, IconClose, IconClipboard, IconInfo } from '../components/icons.jsx';
import SpotlightCard from '../components/SpotlightCard.jsx';
import { Button } from '../components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog.jsx';
import { cn } from '../lib/utils.js';

const formatTime = (isoString) => {
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatDuration = (seconds) => {
  if (!seconds) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const EXPORT_MODE_LABELS = {
  'original-fps': '按原始帧率导出',
  'interval-frame': '按帧间隔提取',
  'interval-second': '按秒间隔提取',
  keyframe: '仅关键帧',
  scene: '场景切换检测',
};

const RESIZE_MODE_LABELS = {
  original: '百分比缩放',
  fixed: '固定尺寸',
};

// 把一条历史记录的 params 对象转成"标签 - 值"列表，用于详情弹窗展示
function buildParamRows(record) {
  const p = record.params;
  if (!p) return [];

  const rows = [
    { label: '导出模式', value: EXPORT_MODE_LABELS[p.exportMode] || p.exportMode || '-' },
  ];

  if (p.exportMode === 'interval-frame') {
    rows.push({ label: '帧间隔', value: `每 ${p.intervalFrames ?? '-'} 帧提取一次` });
  } else if (p.exportMode === 'interval-second') {
    rows.push({ label: '秒间隔', value: `每 ${p.intervalSeconds ?? '-'} 秒提取一次` });
  } else if (p.exportMode === 'scene') {
    rows.push({ label: '场景阈值', value: p.sceneThreshold ?? '-' });
  }

  rows.push(
    { label: '时间范围', value: `${formatDuration(p.startTime)} – ${formatDuration(p.endTime)}` },
    { label: '源帧率', value: p.sourceFps ? `${p.sourceFps} fps` : '-' },
    { label: '图片格式', value: (p.format || '-').toUpperCase() },
    { label: '图片质量', value: p.quality != null ? `qscale ${p.quality}` : '-' },
  );

  if (p.format === 'jpg' || p.format === 'jpeg') {
    rows.push({ label: '色度采样', value: p.jpegChroma || '4:2:0' });
  }

  rows.push({ label: '缩放方式', value: RESIZE_MODE_LABELS[p.resizeMode] || p.resizeMode || '-' });
  if (p.resizeMode === 'fixed') {
    rows.push({ label: '目标尺寸', value: `${p.resizeWidth || '-'} × ${p.resizeHeight || '-'}` });
  } else if (p.resizeMode === 'original' && p.resizePercentage) {
    rows.push({ label: '缩放比例', value: `${p.resizePercentage}%` });
  }

  return rows;
}

export default function HistoryView() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailRecord, setDetailRecord] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const records = await window.electronAPI.getHistory();
      setHistory(records);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleClearHistory = async () => {
    if (!confirm('确定要清空所有处理记录吗？此操作不可撤销。')) return;
    try {
      await window.electronAPI.clearHistory();
      setHistory([]);
    } catch (error) {
      console.error('清空历史记录失败:', error);
      alert(`清空失败: ${error.message}`);
    }
  };

  const openFolder = async (folderPath) => {
    await window.electronAPI.openFolder(folderPath);
  };

  const paramRows = detailRecord ? buildParamRows(detailRecord) : [];

  return (
    <div className="mx-auto max-w-6xl px-10 py-8 pb-16">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">处理记录</h1>
        <p className="mt-1 text-sm text-muted-foreground">最近 100 次的视频切帧处理记录</p>
      </div>

      <div className="glass-panel rounded-xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-mono text-xs text-muted-foreground">共 {history.length} 条记录</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearHistory}
            disabled={history.length === 0}
          >
            <IconTrash className="size-3.5" />
            清空记录
          </Button>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        ) : history.length > 0 ? (
          <div className="flex max-h-[640px] flex-col gap-3 overflow-y-auto">
            {history.map((record) => (
              <SpotlightCard
                key={record.id}
                spotlightColor="rgba(37, 99, 235, 0.12)"
                className="glass-panel relative flex gap-4 rounded-xl p-4"
              >
                <div
                  className={cn(
                    'relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full',
                    record.status === 'success' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                  )}
                >
                  {record.status === 'success' ? <IconCheck className="size-3.5" /> : <IconClose className="size-3.5" />}
                </div>
                <div className="relative z-[1] min-w-0 flex-1">
                  <div className="mb-2 text-sm font-bold text-foreground">{record.fileName}</div>
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span className="shrink-0 font-semibold text-muted-foreground">视频文件地址:</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{record.videoPath}</span>
                  </div>
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span className="shrink-0 font-semibold text-muted-foreground">输出目录:</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-muted-foreground">{record.outputDir}</span>
                    <button
                      className="shrink-0 whitespace-nowrap rounded-md border border-border px-2.5 py-0.5 text-[11px] font-bold text-foreground hover:bg-secondary"
                      onClick={() => setDetailRecord(record)}
                    >
                      查看详情
                    </button>
                    {record.status === 'success' && (
                      <button
                        className="shrink-0 whitespace-nowrap rounded-md border border-primary/40 px-2.5 py-0.5 text-[11px] font-bold text-primary hover:bg-primary/10"
                        onClick={() => openFolder(record.outputDir)}
                      >
                        前往目录
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 font-mono text-[11px] text-muted-foreground/70">
                    {record.status === 'success' ? (
                      <span>{record.frameCount} 帧</span>
                    ) : (
                      <span className="text-destructive">{record.error}</span>
                    )}
                    <span className="ml-auto">{formatTime(record.timestamp)}</span>
                  </div>
                </div>
              </SpotlightCard>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <IconClipboard className="mb-2 size-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">暂无处理记录</p>
            <p className="text-xs text-muted-foreground/70">完成视频切帧后，记录会显示在这里</p>
          </div>
        )}
      </div>

      <Dialog open={!!detailRecord} onOpenChange={(open) => !open && setDetailRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailRecord?.fileName}</DialogTitle>
            <DialogDescription>本次导出使用的完整参数配置</DialogDescription>
          </DialogHeader>

          {paramRows.length > 0 ? (
            <div className="flex flex-col divide-y divide-border/60">
              {paramRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <span className="shrink-0 text-muted-foreground">{row.label}</span>
                  <span className="min-w-0 truncate text-right font-mono text-xs font-semibold text-foreground">
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <IconInfo className="size-4 shrink-0" />
              该记录未保存参数配置详情
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
