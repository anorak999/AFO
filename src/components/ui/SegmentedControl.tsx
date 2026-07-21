import { useRef, useState, useEffect, useCallback } from 'react';
import './SegmentedControl.css';

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  /** @deprecated No longer used — kept for call-site compat */
  layoutId?: string;
}

interface TabRect {
  left: number;
  width: number;
}

export default function SegmentedControl({
  options,
  value,
  onChange,
  size = 'sm',
}: SegmentedControlProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [indicator, setIndicator] = useState<TabRect>({ left: 2, width: 0 });
  const tabHeight = size === 'sm' ? 24 : 28;

  const measure = useCallback(() => {
    const container = containerRef.current;
    const activeIdx = Math.max(0, options.indexOf(value));
    const activeTab = tabRefs.current[activeIdx];
    if (!container || !activeTab) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    setIndicator({
      left: tabRect.left - containerRect.left,
      width: tabRect.width,
    });
  }, [options, value]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return (
    <div
      ref={containerRef}
      className={`tab-container ${size === 'sm' ? 'tab-container--sm' : ''}`}
    >
      {options.map((opt, i) => {
        const id = `tab-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        return (
          <span key={opt} style={{ position: 'relative' }}>
            <input
              ref={(el) => { tabRefs.current[i] = el; }}
              className="tab-container__input"
              type="radio"
              name={id}
              id={id}
              checked={opt === value}
              onChange={() => onChange(opt)}
              style={{ height: tabHeight }}
            />
            <label
              className="tab-container__label"
              htmlFor={id}
              style={{ height: tabHeight }}
            >
              {opt}
            </label>
          </span>
        );
      })}
      <div
        className="tab-container__indicator"
        style={{
          height: tabHeight,
          left: indicator.left,
          width: indicator.width,
        }}
      />
    </div>
  );
}
