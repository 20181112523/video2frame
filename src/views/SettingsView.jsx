import { useState, useEffect } from 'react';
import { IconFolder, IconWindow, IconSave, IconRefresh, IconCheck } from '../components/icons.jsx';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group.jsx';
import { cn } from '../lib/utils.js';

const DEFAULT_SETTINGS = {
  outputDirMode: 'video',
  customOutputDir: '',
  closeAction: 'quit',
};

export default function SettingsView() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    window.electronAPI.getSettings().then((savedSettings) => {
      if (savedSettings) {
        setSettings(savedSettings);
      }
    });
  }, []);

  const selectOutputDir = async () => {
    const dir = await window.electronAPI.selectFolder();
    if (dir) {
      setSettings((prev) => ({ ...prev, customOutputDir: dir }));
    }
  };

  const saveSettings = async () => {
    try {
      await window.electronAPI.saveSettings(settings);
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
    } catch (error) {
      console.error('保存设置失败:', error);
      alert(`保存设置失败: ${error.message}`);
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="mx-auto max-w-3xl px-10 py-8 pb-16">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">设置</h1>
        <p className="mt-1 text-sm text-muted-foreground">配置应用程序的全局选项</p>
      </div>

      <div className="flex flex-col gap-6">
        {/* 输出目录设置 */}
        <div className="glass-panel rounded-xl p-6">
          <div className="mb-5">
            <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
              <IconFolder className="size-[17px] text-primary" />
              输出目录
            </h2>
            <p className="pl-[25px] text-xs text-muted-foreground/70">设置提取帧图片的保存位置</p>
          </div>

          <RadioGroup
            value={settings.outputDirMode}
            onValueChange={(v) => setSettings((prev) => ({ ...prev, outputDirMode: v }))}
            className="gap-3"
          >
            <label
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 transition-colors',
                settings.outputDirMode === 'video' ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-white/40 hover:border-primary/30'
              )}
            >
              <RadioGroupItem value="video" className="mt-0.5" />
              <div className="flex-1">
                <div className="mb-1 text-sm font-semibold text-foreground">视频所在目录</div>
                <div className="text-xs text-muted-foreground">在每个视频文件的同级目录下创建输出文件夹</div>
              </div>
            </label>

            <label
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 transition-colors',
                settings.outputDirMode === 'custom' ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-white/40 hover:border-primary/30'
              )}
            >
              <RadioGroupItem value="custom" className="mt-0.5" />
              <div className="flex-1">
                <div className="mb-1 text-sm font-semibold text-foreground">全局自定义目录</div>
                <div className="text-xs text-muted-foreground">所有视频的提取结果保存到指定的统一目录</div>
              </div>
            </label>

            {settings.outputDirMode === 'custom' && (
              <div className="flex gap-3 rounded-lg bg-white/40 p-4">
                <Input value={settings.customOutputDir} placeholder="选择输出目录" readOnly className="flex-1 font-mono text-xs" />
                <Button size="sm" onClick={selectOutputDir}>浏览...</Button>
              </div>
            )}
          </RadioGroup>
        </div>

        {/* 窗口行为设置 */}
        <div className="glass-panel rounded-xl p-6">
          <div className="mb-5">
            <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-foreground">
              <IconWindow className="size-[17px] text-primary" />
              窗口行为
            </h2>
            <p className="pl-[25px] text-xs text-muted-foreground/70">设置点击右上角关闭按钮时的行为</p>
          </div>

          <RadioGroup
            value={settings.closeAction}
            onValueChange={(v) => setSettings((prev) => ({ ...prev, closeAction: v }))}
            className="gap-3"
          >
            <label
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 transition-colors',
                settings.closeAction === 'quit' ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-white/40 hover:border-primary/30'
              )}
            >
              <RadioGroupItem value="quit" className="mt-0.5" />
              <div className="flex-1">
                <div className="mb-1 text-sm font-semibold text-foreground">直接退出</div>
                <div className="text-xs text-muted-foreground">关闭窗口时完全退出应用程序</div>
              </div>
            </label>

            <label
              className={cn(
                'flex items-start gap-3 rounded-lg border p-4 transition-colors',
                settings.closeAction === 'minimize' ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-white/40 hover:border-primary/30'
              )}
            >
              <RadioGroupItem value="minimize" className="mt-0.5" />
              <div className="flex-1">
                <div className="mb-1 text-sm font-semibold text-foreground">最小化到托盘</div>
                <div className="text-xs text-muted-foreground">关闭窗口时隐藏到系统托盘，保持后台运行</div>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* 保存按钮 */}
        <div className="flex gap-3">
          <Button size="lg" onClick={saveSettings}>
            <IconSave className="size-4" />
            保存设置
          </Button>
          <Button size="lg" variant="secondary" onClick={resetSettings}>
            <IconRefresh className="size-4" />
            恢复默认
          </Button>
        </div>

        {/* 保存成功提示 */}
        {showSaveSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-5 py-3 text-sm font-semibold text-success">
            <IconCheck className="size-4" />
            设置已保存
          </div>
        )}
      </div>
    </div>
  );
}
