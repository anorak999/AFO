import './SegmentedControl.css';

interface SegmentedControlProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  /** @deprecated No longer used — kept for call-site compat */
  layoutId?: string;
}

export default function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps) {
  const selectedIndex = Math.max(0, options.indexOf(value));
  const tabWidth = size === 'sm' ? 110 : 130;
  const tabHeight = size === 'sm' ? 24 : 28;

  const indicatorStyle = {
    '--indicator-width': `${tabWidth}px`,
    '--indicator-height': `${tabHeight}px`,
    '--indicator-left': `${2 + selectedIndex * tabWidth}px`,
  } as React.CSSProperties;

  return (
    <div
      className={`tab-container ${size === 'sm' ? 'tab-container--sm' : ''}`}
      style={indicatorStyle}
    >
      {options.map((opt) => {
        const id = `tab-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        return (
          <span key={opt} style={{ position: 'relative' }}>
            <input
              className="tab-container__input"
              type="radio"
              name={id}
              id={id}
              checked={opt === value}
              onChange={() => onChange(opt)}
              style={{ width: tabWidth, height: tabHeight }}
            />
            <label
              className="tab-container__label"
              htmlFor={id}
              style={{ width: tabWidth, height: tabHeight }}
            >
              {opt}
            </label>
          </span>
        );
      })}
      <div
        className="tab-container__indicator"
        style={{
          width: tabWidth,
          height: tabHeight,
          left: 2 + selectedIndex * tabWidth,
        }}
      />
    </div>
  );
}
