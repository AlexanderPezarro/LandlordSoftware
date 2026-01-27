import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Stack,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { OwnerInput } from './OwnerInput';
import { usersService, type UserListItem } from '../../services/api/users.service';
import { useToast } from '../../contexts/ToastContext';

interface Owner {
  userId: string;
  percentage: number;
}

interface OwnershipSectionProps {
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
    newOwners[index].userId = userId;
    onChange(newOwners);
  };

  const handlePercentageChange = (index: number, percentage: number) => {
    const newOwners = [...owners];
    newOwners[index].percentage = percentage;
    onChange(newOwners);
  };

  const totalPercentage = owners.reduce((sum, owner) => sum + owner.percentage, 0);
  const hasInvalidTotal = owners.length > 0 && Math.abs(totalPercentage - 100) > 0.01;
  const hasDuplicateUsers = owners.some(
    (owner, index) => owner.userId && owners.findIndex((o) => o.userId === owner.userId) !== index
  );

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Property Ownership
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configure multiple owners for this property. Ownership percentages must total 100%.
      </Typography>

      {loading ? (
        <Typography variant="body2" color="text.secondary">
          Loading users...
        </Typography>
      ) : (
        <Stack spacing={2}>
          {owners.map((owner, index) => (
            <OwnerInput
              key={index}
              userId={owner.userId}
              percentage={owner.percentage}
              users={users}
              onUserChange={(userId) => handleUserChange(index, userId)}
              onPercentageChange={(percentage) => handlePercentageChange(index, percentage)}
              onRemove={() => handleRemoveOwner(index)}
              disabled={disabled}
              error={
                hasDuplicateUsers && owner.userId && owners.findIndex((o) => o.userId === owner.userId) !== index
                  ? 'Duplicate owner selected'
                  : undefined
              }
            />
          ))}

          <Box>
            <Button
              startIcon={<AddIcon />}
              onClick={handleAddOwner}
              disabled={disabled || loading}
              variant="outlined"
              size="small"
            >
              Add Owner
            </Button>
          </Box>

          {owners.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total ownership: {totalPercentage.toFixed(2)}%
              </Typography>
              {hasInvalidTotal && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  Total ownership must equal 100%. Current total: {totalPercentage.toFixed(2)}%
                </Alert>
              )}
              {hasDuplicateUsers && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  Each user can only be added once as an owner
                </Alert>
              )}
            </Box>
          )}
        </Stack>
      )}
    </Box>
  );
};
