import React from 'react';
import styles from './Container.module.scss';

export interface ContainerProps {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({
  maxWidth = 'lg',
  children,
  className,
}) => {
  const classNames = [styles.container, styles[maxWidth], className]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames}>{children}</div>;
};
