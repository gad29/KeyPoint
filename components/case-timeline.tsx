'use client';

import type { CaseStage } from '@/data/domain';

const STAGES: { key: CaseStage; label: string }[] = [
  { key: 'new-lead', label: 'ליד חדש' },
  { key: 'intake-submitted', label: 'טופס הוגש' },
  { key: 'approved', label: 'אושר' },
  { key: 'portal-activated', label: 'פורטל הופעל' },
  { key: 'documents-in-progress', label: 'מסמכים' },
  { key: 'secretary-review', label: 'בדיקת מזכירה' },
  { key: 'waiting-appraiser', label: 'ממתין לשמאי' },
  { key: 'appraisal-received', label: 'שמאות התקבלה' },
  { key: 'ready-for-bank', label: 'מוכן לבנק' },
  { key: 'bank-negotiation', label: 'משא ומתן' },
  { key: 'recommendation-prepared', label: 'המלצה מוכנה' },
  { key: 'completed', label: 'הושלם' },
];

type Props = {
  currentStage: CaseStage;
  /** If provided, clicking a stage calls this. Omit for read-only mode. */
  onStageClick?: (stage: CaseStage) => void;
};

function DoneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function CaseTimeline({ currentStage, onStageClick }: Props) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="stage-bar-wrap">
      <div className="stage-bar" dir="rtl">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const stateClass = isDone ? 'done' : isCurrent ? 'current' : 'future';

          return (
            <div
              key={stage.key}
              className={`stage-step ${stateClass}`}
              title={stage.label}
              onClick={onStageClick ? () => onStageClick(stage.key) : undefined}
              style={onStageClick && !isCurrent ? { cursor: 'pointer' } : { cursor: 'default' }}
              role={onStageClick ? 'button' : undefined}
              tabIndex={onStageClick ? 0 : undefined}
              onKeyDown={onStageClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onStageClick(stage.key); } : undefined}
            >
              <div className="stage-dot">
                {isDone && (
                  <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
                    <DoneIcon />
                  </span>
                )}
              </div>
              <span className="stage-label">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
