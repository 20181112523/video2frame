import { useRef } from 'react';
import './SpotlightCard.css';

// 改编自 reactbits.dev 的 Spotlight Card（零依赖，纯 CSS 变量 + mousemove）。
// 鼠标划过卡片时跟随出现一圈暖光，呼应"光桌"世界观里手持光源掠过胶片小样的动作。
export default function SpotlightCard({ children, className = '', spotlightColor, ...rest }) {
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  // 光效层用真实 DOM 节点而非 ::before，避免和调用方已用于其他装饰
  // （比如胶片齐孔纹理）的 ::before/::after 抢占同一个伪元素位置。
  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`spotlight-card ${className}`}
      style={spotlightColor ? { '--spot-color': spotlightColor } : undefined}
      {...rest}
    >
      <span className="spotlight-glow" aria-hidden="true" />
      {children}
    </div>
  );
}
