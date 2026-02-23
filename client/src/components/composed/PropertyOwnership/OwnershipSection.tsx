import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../primitives/Button';
import { OwnerInput } from './OwnerInput';
import { usersService, type UserListItem } from '../../../services/api/users.service';
import { useToast } from '../../../contexts/ToastContext';
import styles from './PropertyOwnership.module.scss';

export interface Owner {
  userId: string;
  percentage: number;
}

export interface OwnershipSectionProps {
  owners: Owner[];
  onChange: (owners: Owner[]) => void;
  disabled?: boolean;
}

export const OwnershipSection: React.FC<OwnershipSectionProps> = ({
  owners,
  onChange,
  disabled = false,
}) => {
  const toast = useToast();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await usersService.getUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOwner = () => {
    onChange([...owners, { userId: '', percentage: 0 }]);
  };

  const handleRemoveOwner = (index: number) => {
    const newOwners = owners.filter((_, i) => i !== index);
    onChange(newOwners);
  };

  const handleUserChange = (index: number, userId: string) => {
    const newOwners = [...owners];
    newOwners[index] = { ...newOwners[index], userId };
    onChange(newOwners);
  };

  const handlePercentageChange = (index: number, percentage: number) => {
    const newOwners = [...owners];
    newOwners[index] = { ...newOwners[index], percentage };
    onChange(newOwners);
  };

  const totalPercentage = owners.reduce((sum, owner) => sum + owner.percentage, 0);
  const hasInvalidTotal = owners.length > 0 && Math.abs(totalPercentage - 100) > 0.01;
  const hasDuplicateUsers = owners.some(
    (owner, index) =>
      owner.userId && owners.findIndex((o) => o.userId === owner.userId) !== index
  );

  return (
    <div className={styles.root}>
      <h3 className={styles.heading}>Property Ownership</h3>
      <p className={styles.description}>
        Configure multiple owners for this property. Ownership percentages must total 100%.
      </p>

      {loading ? (
        <p className={styles.loadingText}>Loading users...</p>
      ) : (
        <div className={styles.ownerList}>
          {owners.map((owner, index) => (
            <OwnerInput
              key={index}
              userId={owner.userId}
              percentage={owner.percentage}
              users={users.filter(
                (u) => u.id === owner.userId || !owners.some((o) => o.userId === u.id)
              )}
              onUserChange={(userId) => handleUserChange(index, userId)}
              onPercentageChange={(percentage) => handlePercentageChange(index, percentage)}
              onRemove={() => handleRemoveOwner(index)}
              disabled={disabled}
              error={
                hasDuplicateUsers &&
                owner.userId &&
                owners.findIndex((o) => o.userId === owner.userId) !== index
                  ? 'Duplicate owner selected'
                  : undefined
              }
            />
          ))}

          <div>
            <Button
              variant="secondary"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={handleAddOwner}
              disabled={disabled || loading}
            >
              Add Owner
            </Button>
          </div>

          {owners.length > 0 && (
            <div className={styles.summary}>
              <span className={styles.totalText}>
                Total ownership: {totalPercentage.toFixed(2)}%
              </span>
              {hasInvalidTotal && (
                <div className={styles.errorAlert} role="alert">
                  Total ownership must equal 100%. Current total: {totalPercentage.toFixed(2)}%
                </div>
              )}
              {hasDuplicateUsers && (
                <div className={styles.errorAlert} role="alert">
                  Each user can only be added once as an owner
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
