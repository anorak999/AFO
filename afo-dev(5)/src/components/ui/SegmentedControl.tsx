import { useState } from 'react';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="inline-flex gap-0.5 rounded-pill border border-border bg-bg p-0.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={[
              'rounded-[6px] px-4 py-[7px] text-[12.5px] font-medium transition-colors',
              active
                ? 'bg-card text-text shadow-card font-semibold'
                : 'text-text-dim hover:text-text',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Example usage in OrganizePanel:
 *
 * const [method, setMethod] = useState<'extension' | 'date' | 'rename'>('extension');
 * <SegmentedControl
 *   value={method}
 *   onChange={setMethod}
 *   options={[
 *     { value: 'extension', label: 'By Extension' },
 *     { value: 'date', label: 'By Date' },
 *     { value: 'rename', label: 'Batch Rename' },
 *   ]}
 * />
 */
