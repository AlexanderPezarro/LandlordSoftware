import styles from './Divider.module.scss';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: number;
  className?: string;
}

export function Divider({
  orientation = 'horizontal',
  spacing,
  className,
}: DividerProps) {
  const classNames = [
    styles.divider,
    styles[orientation],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const style = spacing !== undefined
    ? orientation === 'horizontal'
      ? { marginTop: `${spacing * 4}px`, marginBottom: `${spacing * 4}px` }
      : { marginLeft: `${spacing * 4}px`, marginRight: `${spacing * 4}px` }
    : undefined;

  if (orientation === 'vertical') {
    return <span className={classNames} style={style} role="separator" />;
  }

  return <hr className={classNames} style={style} />;
}
