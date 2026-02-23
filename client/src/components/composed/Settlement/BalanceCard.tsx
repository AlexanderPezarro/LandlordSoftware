import { Landmark } from 'lucide-react';
import { Card } from '../../primitives/Card';
import { Chip } from '../../primitives/Chip';
import { Divider } from '../../primitives/Divider';
import styles from './Settlement.module.scss';

export interface Balance {
  userA: string;
  userB: string;
  amount: number;
  userADetails: { id: string; email: string };
  userBDetails: { id: string; email: string };
}

export interface BalanceCardProps {
  balances: Balance[];
  currentUserId?: string;
}

export function BalanceCard({ balances, currentUserId }: BalanceCardProps) {
  return (
    <Card className={styles.balanceCard}>
      <Card.Content>
        <div className={styles.cardHeader}>
          <span className={styles.cardHeaderIcon}>
            <Landmark size={24} />
          </span>
          <h3 className={styles.cardTitle}>Current Balances</h3>
        </div>

        {balances.length === 0 ? (
          <p className={styles.emptyMessage}>
            All balances are settled. No outstanding payments.
          </p>
        ) : (
          balances.map((balance, index) => {
            const owesUser = balance.userBDetails;
            const owedUser = balance.userADetails;
            const amount = Math.abs(balance.amount);

            const involvesCurrentUser =
              currentUserId != null &&
              (balance.userA === currentUserId ||
                balance.userB === currentUserId);

            const itemClassNames = [
              styles.balanceItem,
              involvesCurrentUser ? styles.balanceItemHighlighted : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <div key={index}>
                {index > 0 && <Divider spacing={2} />}
                <div className={itemClassNames}>
                  <span className={styles.balanceText}>
                    <span className={styles.balanceBold}>
                      {owesUser.email}
                    </span>{' '}
                    owes{' '}
                    <span className={styles.balanceBold}>
                      {owedUser.email}
                    </span>
                  </span>
                  <Chip
                    label={`\u00A3${amount.toFixed(2)}`}
                    color={involvesCurrentUser ? 'primary' : 'default'}
                  />
                </div>
              </div>
            );
          })
        )}
      </Card.Content>
    </Card>
  );
}
