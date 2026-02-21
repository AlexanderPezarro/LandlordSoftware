import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Typography,
  Switch,
  FormControlLabel,
  ToggleButtonGroup,
  ToggleButton,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
} from '@mui/icons-material';

export interface RuleCondition {
  field: 'description' | 'counterpartyName' | 'reference' | 'merchant' | 'amount';
  matchType: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
  value: string | number;
  caseSensitive?: boolean;
}

export interface RuleConditions {
  operator: 'AND' | 'OR';
  rules: RuleCondition[];
}

export interface RuleData {
  name: string;
  enabled: boolean;
  conditions: RuleConditions;
  propertyId: string | null;
  type: 'INCOME' | 'EXPENSE' | null;
  category: string | null;
}

interface RuleEditorProps {
  initialData?: Partial<RuleData>;
  onSave: (data: RuleData) => void;
  onCancel: () => void;
  onTest?: (data: RuleData) => void;
  loading?: boolean;
  properties?: Array<{ id: string; name: string }>;
}

const FIELD_OPTIONS = [
  { value: 'description', label: 'Description' },
  { value: 'counterpartyName', label: 'Counterparty Name' },
  { value: 'reference', label: 'Reference' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'amount', label: 'Amount' },
] as const;

const MATCH_TYPE_OPTIONS: Record<
  string,
  Array<{ value: string; label: string }>
> = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'startsWith', label: 'Starts with' },
    { value: 'endsWith', label: 'Ends with' },
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'greaterThan', label: 'Greater than' },
    { value: 'lessThan', label: 'Less than' },
  ],
};

const getMatchTypeOptions = (field: string) => {
  return field === 'amount' ? MATCH_TYPE_OPTIONS.number : MATCH_TYPE_OPTIONS.text;
};

const isNumericField = (field: string) => field === 'amount';

export const RuleEditor: React.FC<RuleEditorProps> = ({
  initialData,
  onSave,
  onCancel,
  onTest,
  loading = false,
  properties = [],
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);
  const [operator, setOperator] = useState<'AND' | 'OR'>(
    initialData?.conditions?.operator || 'AND'
  );
  const [conditions, setConditions] = useState<RuleCondition[]>(
    initialData?.conditions?.rules || [
      {
        field: 'description',
        matchType: 'contains',
        value: '',
        caseSensitive: false,
      },
    ]
  );
  const [propertyId, setPropertyId] = useState<string>(initialData?.propertyId || '');
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | ''>(initialData?.type || '');
  const [category, setCategory] = useState(initialData?.category || '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        field: 'description',
        matchType: 'contains',
        value: '',
        caseSensitive: false,
      },
    ]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };

    // If field changed to/from amount, reset matchType to valid option
    if (updates.field !== undefined) {
      const newField = updates.field;
      const currentMatchType = newConditions[index].matchType;
      const validMatchTypes = getMatchTypeOptions(newField);
      const isValid = validMatchTypes.some(
        (opt) => opt.value === currentMatchType
      );

      if (!isValid) {
        newConditions[index].matchType = validMatchTypes[0]
          .value as RuleCondition['matchType'];
      }

      // Convert value type based on field
      if (isNumericField(newField)) {
        newConditions[index].value =
          typeof newConditions[index].value === 'number'
            ? newConditions[index].value
            : 0;
      } else {
        newConditions[index].value = String(newConditions[index].value || '');
      }
    }

    setConditions(newConditions);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Rule name is required';
    }

    conditions.forEach((condition, index) => {
      if (
        condition.value === '' ||
        (typeof condition.value === 'string' && !condition.value.trim())
      ) {
        newErrors[`condition_${index}`] = 'Value is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const data: RuleData = {
      name,
      enabled,
      conditions: {
        operator,
        rules: conditions,
      },
      propertyId: propertyId || null,
      type: type || null,
      category: category || null,
    };

    onSave(data);
  };

  const handleTest = () => {
    if (!validate()) {
      return;
    }

    const data: RuleData = {
      name,
      enabled,
      conditions: {
        operator,
        rules: conditions,
      },
      propertyId: propertyId || null,
      type: type || null,
      category: category || null,
    };

    onTest?.(data);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Rule Name and Enabled Status */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Rule Details
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            label="Rule Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
            required
            disabled={loading}
          />
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                disabled={loading}
              />
            }
            label="Enabled"
            sx={{ mt: 1 }}
          />
        </Box>
      </Paper>

      {/* Conditions Builder */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Conditions</Typography>
          <ToggleButtonGroup
            value={operator}
            exclusive
            onChange={(_, value) => value && setOperator(value)}
            size="small"
            disabled={loading}
          >
            <ToggleButton value="AND">Match ALL</ToggleButton>
            <ToggleButton value="OR">Match ANY</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {conditions.map((condition, index) => (
            <Box key={index}>
              {index > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1, fontWeight: 600 }}
                >
                  {operator}
                </Typography>
              )}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-start',
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.default',
                }}
              >
                <FormControl sx={{ minWidth: 150 }} size="small">
                  <InputLabel>Field</InputLabel>
                  <Select
                    value={condition.field}
                    label="Field"
                    onChange={(e: SelectChangeEvent) =>
                      updateCondition(index, {
                        field: e.target.value as RuleCondition['field'],
                      })
                    }
                    disabled={loading}
                  >
                    {FIELD_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl sx={{ minWidth: 130 }} size="small">
                  <InputLabel>Match Type</InputLabel>
                  <Select
                    value={condition.matchType}
                    label="Match Type"
                    onChange={(e: SelectChangeEvent) =>
                      updateCondition(index, {
                        matchType: e.target.value as RuleCondition['matchType'],
                      })
                    }
                    disabled={loading}
                  >
                    {getMatchTypeOptions(condition.field).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Value"
                  value={condition.value}
                  onChange={(e) =>
                    updateCondition(index, {
                      value: isNumericField(condition.field)
                        ? Number(e.target.value) || 0
                        : e.target.value,
                    })
                  }
                  type={isNumericField(condition.field) ? 'number' : 'text'}
                  error={!!errors[`condition_${index}`]}
                  helperText={errors[`condition_${index}`]}
                  fullWidth
                  size="small"
                  required
                  disabled={loading}
                />

                {!isNumericField(condition.field) && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={condition.caseSensitive || false}
                        onChange={(e) =>
                          updateCondition(index, {
                            caseSensitive: e.target.checked,
                          })
                        }
                        size="small"
                        disabled={loading}
                      />
                    }
                    label="Case sensitive"
                    sx={{ ml: 1, whiteSpace: 'nowrap' }}
                  />
                )}

                <IconButton
                  onClick={() => removeCondition(index)}
                  color="error"
                  size="small"
                  disabled={conditions.length === 1 || loading}
                  sx={{ mt: 0.5 }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ))}
        </Box>

        <Button
          startIcon={<AddIcon />}
          onClick={addCondition}
          variant="outlined"
          size="small"
          sx={{ mt: 2 }}
          disabled={loading}
        >
          Add Condition
        </Button>
      </Paper>

      {/* Actions (Property, Type, Category) */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Actions
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          When a transaction matches this rule, apply the following:
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Property</InputLabel>
            <Select
              value={propertyId}
              label="Property"
              onChange={(e: SelectChangeEvent) => setPropertyId(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {properties.map((property) => (
                <MenuItem key={property.id} value={property.id}>
                  {property.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Transaction Type</InputLabel>
            <Select
              value={type}
              label="Transaction Type"
              onChange={(e: SelectChangeEvent) =>
                setType(e.target.value as 'INCOME' | 'EXPENSE' | '')
              }
              disabled={loading}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="INCOME">Income</MenuItem>
              <MenuItem value="EXPENSE">Expense</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
            disabled={loading}
            placeholder="e.g., Rent, Utilities, Maintenance"
          />
        </Box>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={loading}
          >
            Save Rule
          </Button>
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </Box>

        {onTest && (
          <Button
            variant="outlined"
            startIcon={<TestIcon />}
            onClick={handleTest}
            disabled={loading}
          >
            Test Rule
          </Button>
        )}
      </Box>
    </Box>
  );
};
