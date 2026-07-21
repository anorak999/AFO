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
  return (
    <div
      className={`cir-tabs ${size === 'sm' ? 'cir-tabs--sm' : ''}`}
      role="tablist"
    >
      {options.map((opt) => {
        const id = `cir-${opt.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        return (
          <span key={opt} style={{ position: 'relative' }}>
            <input
              className="cir-tabs__r"
              type="radio"
              name={id}
              id={id}
              checked={opt === value}
              onChange={() => onChange(opt)}
            />
            <label className="cir-tabs__t" htmlFor={id} role="tab">
              {opt}
            </label>
          </span>
        );
      })}
    </div>
  );
}
