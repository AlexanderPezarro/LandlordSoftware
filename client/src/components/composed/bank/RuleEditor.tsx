import { useState } from 'react';
import { Plus, Trash2, Play } from 'lucide-react';
import { Card } from '../../primitives/Card';
import { TextField } from '../../primitives/TextField';
import { Select } from '../../primitives/Select';
import { Button } from '../../primitives/Button';
import { ToggleGroup } from '../../primitives/ToggleGroup';
import styles from './bank.module.scss';

export interface RuleCondition {
  field:
    | 'description'
    | 'counterpartyName'
    | 'reference'
    | 'merchant'
    | 'amount';
  matchType:
    | 'contains'
    | 'equals'
    | 'startsWith'
    | 'endsWith'
    | 'greaterThan'
    | 'lessThan';
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

export interface RuleEditorProps {
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
];

const TEXT_MATCH_OPTIONS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
];

const NUMBER_MATCH_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'greaterThan', label: 'Greater than' },
  { value: 'lessThan', label: 'Less than' },
];

const getMatchTypeOptions = (field: string) => {
  return field === 'amount' ? NUMBER_MATCH_OPTIONS : TEXT_MATCH_OPTIONS;
};

const isNumericField = (field: string) => field === 'amount';

const OPERATOR_OPTIONS = [
  { value: 'AND', label: 'Match ALL' },
  { value: 'OR', label: 'Match ANY' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'INCOME', label: 'Income' },
  { value: 'EXPENSE', label: 'Expense' },
];

export function RuleEditor({
  initialData,
  onSave,
  onCancel,
  onTest,
  loading = false,
  properties = [],
}: RuleEditorProps) {
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
  const [propertyId, setPropertyId] = useState<string>(
    initialData?.propertyId || ''
  );
  const [type, setType] = useState<string>(initialData?.type || '');
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

  const updateCondition = (
    index: number,
    updates: Partial<RuleCondition>
  ) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };

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

  const buildRuleData = (): RuleData => ({
    name,
    enabled,
    conditions: {
      operator,
      rules: conditions,
    },
    propertyId: propertyId || null,
    type: (type as 'INCOME' | 'EXPENSE') || null,
    category: category || null,
  });

  const handleSave = () => {
    if (!validate()) return;
    onSave(buildRuleData());
  };

  const handleTest = () => {
    if (!validate()) return;
    onTest?.(buildRuleData());
  };

  const propertyOptions = [
    { value: '', label: 'None' },
    ...properties.map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <div className={styles.ruleEditorRoot}>
      {/* Rule Details */}
      <Card className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>Rule Details</h3>
        <div className={styles.ruleDetailsRow}>
          <div className={styles.ruleNameField}>
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
          </div>
          <label className={styles.enabledToggle}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={loading}
              className={styles.enabledToggleInput}
            />
            <span className={styles.enabledToggleLabel}>Enabled</span>
          </label>
        </div>
      </Card>

      {/* Conditions Builder */}
      <Card className={styles.sectionCard}>
        <div className={styles.conditionsHeader}>
          <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
            Conditions
          </h3>
          <ToggleGroup
            options={OPERATOR_OPTIONS}
            value={operator}
            onChange={(val) => setOperator(val as 'AND' | 'OR')}
            size="small"
            disabled={loading}
          />
        </div>

        <div className={styles.conditionsList}>
          {conditions.map((condition, index) => (
            <div key={index}>
              {index > 0 && (
                <span className={styles.conditionOperatorLabel}>
                  {operator}
                </span>
              )}
              <div className={styles.conditionRow}>
                <div className={styles.conditionFieldSelect}>
                  <Select
                    label="Field"
                    options={FIELD_OPTIONS}
                    value={condition.field}
                    onChange={(val) =>
                      updateCondition(index, {
                        field: val as RuleCondition['field'],
                      })
                    }
                    disabled={loading}
                    size="small"
                  />
                </div>

                <div className={styles.conditionMatchSelect}>
                  <Select
                    label="Match Type"
                    options={getMatchTypeOptions(condition.field)}
                    value={condition.matchType}
                    onChange={(val) =>
                      updateCondition(index, {
                        matchType: val as RuleCondition['matchType'],
                      })
                    }
                    disabled={loading}
                    size="small"
                  />
                </div>

                <div className={styles.conditionValueField}>
                  <TextField
                    label="Value"
                    value={String(condition.value)}
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
                </div>

                {!isNumericField(condition.field) && (
                  <label className={styles.caseSensitiveToggle}>
                    <input
                      type="checkbox"
                      checked={condition.caseSensitive || false}
                      onChange={(e) =>
                        updateCondition(index, {
                          caseSensitive: e.target.checked,
                        })
                      }
                      disabled={loading}
                      className={styles.caseSensitiveInput}
                    />
                    <span className={styles.caseSensitiveLabel}>
                      Case sensitive
                    </span>
                  </label>
                )}

                <Button
                  variant="icon"
                  size="small"
                  onClick={() => removeCondition(index)}
                  disabled={conditions.length === 1 || loading}
                  aria-label="Remove condition"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="secondary"
          size="small"
          startIcon={<Plus size={16} />}
          onClick={addCondition}
          disabled={loading}
          style={{ marginTop: 16 }}
        >
          Add Condition
        </Button>
      </Card>

      {/* Actions (Property, Type, Category) */}
      <Card className={styles.sectionCard}>
        <h3 className={styles.sectionTitle}>Actions</h3>
        <p className={styles.sectionDescription}>
          When a transaction matches this rule, apply the following:
        </p>

        <div className={styles.actionsRow}>
          <Select
            label="Property"
            options={propertyOptions}
            value={propertyId}
            onChange={(val) => setPropertyId(val)}
            disabled={loading}
            fullWidth
          />

          <Select
            label="Transaction Type"
            options={TYPE_OPTIONS}
            value={type}
            onChange={(val) => setType(val)}
            disabled={loading}
            fullWidth
          />

          <TextField
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
            disabled={loading}
            placeholder="e.g., Rent, Utilities, Maintenance"
          />
        </div>
      </Card>

      {/* Action Buttons */}
      <div className={styles.buttonRow}>
        <div className={styles.buttonGroup}>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading}
            loading={loading}
          >
            Save Rule
          </Button>
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>

        {onTest && (
          <Button
            variant="secondary"
            startIcon={<Play size={16} />}
            onClick={handleTest}
            disabled={loading}
          >
            Test Rule
          </Button>
        )}
      </div>
    </div>
  );
}
