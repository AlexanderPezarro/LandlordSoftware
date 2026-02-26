import { History } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '../../primitives/Card';
import { Table } from '../../primitives/Table';
import { Chip } from '../../primitives/Chip';
import styles from './Settlement.module.scss';

export interface Settlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  settlementDate: string;
  notes?: string;
  fromUser: { id: string; email: string };
  toUser: { id: string; email: string };
}

export interface SettlementHistoryProps {
  settlements: Settlement[];
}

export function SettlementHistory({ settlements }: SettlementHistoryProps) {
  return (
    <Card className={styles.historyCard}>
      <Card.Content>
        <div className={styles.cardHeader}>
          <span className={styles.cardHeaderIcon}>
            <History size={24} />
          </span>
          <h3 className={styles.cardTitle}>Settlement History</h3>
        </div>

        {settlements.length === 0 ? (
          <p className={styles.emptyMessage}>No settlements recorded yet.</p>
        ) : (
          <Table.Container>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.Cell sortable={false}>Date</Table.Cell>
                  <Table.Cell sortable={false}>From</Table.Cell>
                  <Table.Cell sortable={false}>To</Table.Cell>
                  <Table.Cell sortable={false} align="right">
                    Amount
                  </Table.Cell>
                  <Table.Cell sortable={false}>Notes</Table.Cell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {settlements.map((settlement) => (
                  <Table.Row key={settlement.id}>
                    <Table.Cell>
                      {format(
                        new Date(settlement.settlementDate),
                        'MMM dd, yyyy'
                      )}
                    </Table.Cell>
                    <Table.Cell>{settlement.fromUser.email}</Table.Cell>
                    <Table.Cell>{settlement.toUser.email}</Table.Cell>
                    <Table.Cell align="right">
                      <Chip
                        label={`\u00A3${settlement.amount.toFixed(2)}`}
                        color="success"
                        size="small"
                        className={styles.amountChip}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <span className={styles.notesCell}>
                        {settlement.notes || '-'}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Table.Container>
        )}
      </Card.Content>
    </Card>
  );
}
