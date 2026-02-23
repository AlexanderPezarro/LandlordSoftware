import { useCallback, useRef, useState } from 'react';
import styles from './Tooltip.module.scss';

export interface TooltipProps {
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement;
}

export function Tooltip({
  content,
  placement = 'top',
  children,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, 200);
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  const wrapperClassNames = [styles.wrapper].filter(Boolean).join(' ');

  const tooltipClassNames = [
    styles.tooltip,
    styles[placement],
    visible && styles.visible,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={wrapperClassNames}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <span className={tooltipClassNames} role="tooltip" aria-hidden={!visible}>
        {content}
      </span>
    </span>
  );
}
