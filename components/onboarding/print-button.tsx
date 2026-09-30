'use client';

export function PrintButton({ label = 'הדפסה / שמירה כ-PDF' }: { label?: string }) {
  return (
    <button type="button" className="button button-compact" onClick={() => window.print()}>
      {label}
    </button>
  );
}
