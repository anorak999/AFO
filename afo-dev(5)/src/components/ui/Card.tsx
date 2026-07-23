import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`mb-5 rounded-card border border-border bg-card shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-border px-[18px] py-3 text-[11.5px] font-semibold uppercase tracking-wide text-text-dim">
      {children}
    </div>
  );
}

export function CardRow({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between border-t border-border px-[18px] py-3.5 first:border-t-0 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-end gap-2.5 border-t border-border px-[18px] py-4">
      {children}
    </div>
  );
}
