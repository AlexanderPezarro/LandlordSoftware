import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '../../primitives/Card';
import styles from './StatsCard.module.scss';

export interface StatsCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function StatsCard({ title, value, trend, trendValue }: StatsCardProps) {
  const trendClassName =
    trend === 'up'
      ? styles.trendUp
      : trend === 'down'
        ? styles.trendDown
        : styles.trendNeutral;

  return (
    <Card className={styles.statsCard}>
      <Card.Content>
        <span className={styles.title}>{title}</span>
        <span className={styles.value}>{value}</span>
        {trend && trendValue && (
          <span className={`${styles.trend} ${trendClassName}`}>
            {trend === 'up' && <TrendingUp size={16} />}
            {trend === 'down' && <TrendingDown size={16} />}
            <span className={styles.trendValue}>{trendValue}</span>
          </span>
        )}
      </Card.Content>
    </Card>
  );
}
