import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import GhostFibers from './components/GhostFibers.jsx';
import ExtractView from './views/ExtractView.jsx';
import PreviewView from './views/PreviewView.jsx';
import HistoryView from './views/HistoryView.jsx';
import SettingsView from './views/SettingsView.jsx';

export default function App() {
  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background">
      {/* 静态氛围层：光纤场渲染在整个窗口背后，侧边栏和内容区都叠加在玻璃面板之上。
          组件与 reactbits 原版算法一致，lightMode 默认开启，贴合白底玻璃蓝主题：
          主题主色光纤核（#0B60EA）+ 浅蓝柔光带（#93C5FD） */}
      {/* 静态氛围层：光纤场渲染在整个窗口背后，侧边栏和内容区都叠加在玻璃面板之上。
          组件与 reactbits 原版算法一致，lightMode 默认开启，贴合白底玻璃蓝主题：
          主题主色光纤核（#0B60EA）+ 浅蓝柔光带（#93C5FD）；vignette 调低避免
          侧边栏区域被边缘暗角抹白盖住 */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <GhostFibers vignette={0.25} />
      </div>

      <Sidebar />
      <main className="relative z-10 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/extract" replace />} />
          <Route path="/extract" element={<ExtractView />} />
          <Route path="/preview" element={<PreviewView />} />
          <Route path="/history" element={<HistoryView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Routes>
      </main>
    </div>
  );
}
