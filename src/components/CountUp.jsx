import { useEffect, useRef } from 'react';

// 改编自 reactbits.dev 的 CountUp，去掉了原版对 motion/react（framer-motion）的依赖，
// 用纯 requestAnimationFrame + 手写 ease-out 实现同等的"数字滚动"效果，
// 避免为一个小组件额外引入一整个动画库。
export default function CountUp({ value, duration = 500, className = '' }) {
  const ref = useRef(null);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const from = fromRef.current;
    const to = typeof value === 'number' ? value : 0;
    const start = performance.now();

    // 减弱动效偏好：直接跳到目标值，不做过渡
    const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      el.textContent = String(to);
      fromRef.current = to;
      return;
    }

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const current = Math.round(from + (to - from) * easeOut(progress));
      el.textContent = String(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span ref={ref} className={className}>{typeof value === 'number' ? value : ''}</span>;
}
