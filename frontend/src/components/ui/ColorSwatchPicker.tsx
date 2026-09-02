import { PALETTE } from '../../lib/palette';
import styles from './ColorSwatchPicker.module.scss';

interface Props {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export function ColorSwatchPicker({ value, onChange, label }: Props) {
  return (
    <div>
      {label && <div className={styles.label}>{label}</div>}
      <div
        className={styles.grid}
        role="radiogroup"
        aria-label={label ?? 'Цвет'}
      >
        {PALETTE.map((c) => (
          <button
            key={c.value}
            type="button"
            className={styles.swatch}
            style={{ background: c.value }}
            data-selected={value === c.value || undefined}
            onClick={() => onChange(c.value)}
            aria-label={c.name}
            aria-pressed={value === c.value}
            title={c.name}
          />
        ))}
      </div>
    </div>
  );
}
