import { useRef, useState, useEffect, useCallback } from 'react';
import './SegmentedControl.css';

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  layoutId?: string;
}

export default function SegmentedControl({
  options,
  value,
  onChange,
  size = 'sm',
}: SegmentedControlProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLLabelElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const measure = useCallback(() => {
    const activeIdx = Math.max(0, options.indexOf(value));
    const btn = btnRefs.current[activeIdx];
    if (!btn) return;

    const wrap = wrapRef.current?.querySelector('.di-radio-island') as HTMLElement | null;
    if (!wrap) return;

    const islandRect = wrap.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - islandRect.left,
      width: btnRect.width,
    });
  }, [options, value]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  // Unique name so radios from different instances don't collide
  const groupName = options.map((o) => o.toLowerCase().replace(/[^a-z0-9]+/g, '-')).join('-');

  return (
    <div
      ref={wrapRef}
      className={`di-radio-wrap ${size === 'sm' ? 'di-radio-wrap--sm' : ''}`}
    >
      {options.map((opt, i) => (
        <input
          key={opt}
          type="radio"
          name={groupName}
          id={`di-${groupName}-${i}`}
          className="di-radio-input"
          checked={opt === value}
          onChange={() => onChange(opt)}
        />
      ))}

      <div className="di-radio-island">
        {options.map((opt, i) => (
          <label
            key={opt}
            ref={(el) => { btnRefs.current[i] = el; }}
            className="di-radio-btn"
            htmlFor={`di-${groupName}-${i}`}
          >
            {opt}
          </label>
        ))}
        <div
          className="di-radio-indicator"
          style={{
            transform: `translateX(${indicator.left - 3}px)`,
            width: indicator.width,
          }}
        />
      </div>
    </div>
  );
}
