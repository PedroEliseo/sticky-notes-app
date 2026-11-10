import { forwardRef } from 'react';
import styles from './TrashZone.module.css';

interface TrashZoneProps {
  /** A note is being dragged, so the zone can accept it. */
  readonly isActive: boolean;
  /** The dragged note is currently over the zone. */
  readonly isTargeted: boolean;
}

export const TrashZone = forwardRef<HTMLDivElement, TrashZoneProps>(function TrashZone(
  { isActive, isTargeted },
  ref,
) {
  const className = [styles.trash, isActive && styles.active, isTargeted && styles.targeted]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={ref} className={className} aria-label="Trash: drop a note here to delete it">
      <svg viewBox="0 0 24 24" width="32" height="32" aria-hidden>
        <path
          fill="currentColor"
          d="M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9zm4 2v8h1.5v-8H10zm3.5 0v8H15v-8h-1.5z"
        />
      </svg>
      <span>{isTargeted ? 'Release to delete' : 'Trash'}</span>
    </div>
  );
});
