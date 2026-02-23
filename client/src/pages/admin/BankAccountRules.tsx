import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Container } from '../../components/primitives/Container';
import { Button } from '../../components/primitives/Button';
import { Spinner } from '../../components/primitives/Spinner';
import { Chip } from '../../components/primitives/Chip';
import { Dialog } from '../../components/primitives/Dialog';
import { TextField } from '../../components/primitives/TextField';
import { Tooltip } from '../../components/primitives/Tooltip';
import { Divider } from '../../components/primitives/Divider';
import { useToast } from '../../contexts/ToastContext';
import { ApiError, Property } from '../../types/api.types';
import {
  matchingRulesService,
  MatchingRule,
} from '../../services/api/matchingRules.service';
import { propertiesService } from '../../services/api/properties.service';
import { RuleEditor, RuleData } from '../../components/composed/bank';
import { ConfirmDialog } from '../../components/composed/ConfirmDialog';
import styles from './BankAccountRules.module.scss';

interface SortableRuleItemProps {
  rule: MatchingRule;
  onEdit: (rule: MatchingRule) => void;
  onDelete: (rule: MatchingRule) => void;
}

const SortableRuleItem: React.FC<SortableRuleItemProps> = ({ rule, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const parseConditions = () => {
    try {
      const conditions = JSON.parse(rule.conditions);
      return `${conditions.operator} (${conditions.rules.length} condition${
        conditions.rules.length !== 1 ? 's' : ''
      })`;
    } catch {
      return 'Invalid conditions';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.ruleItem}
    >
      <div
        {...attributes}
        {...listeners}
        className={styles.dragHandle}
      >
        <GripVertical size={20} />
      </div>
      <div className={styles.ruleContent}>
        <div className={styles.ruleName}>
          <span className={styles.ruleNameText}>{rule.name}</span>
          {!rule.enabled && (
            <Chip label="Disabled" size="small" color="default" />
          )}
          {rule.bankAccountId === null && (
            <Chip label="Global" size="small" color="primary" />
          )}
        </div>
        <div className={styles.ruleDetails}>
          <span className={styles.ruleConditions}>{parseConditions()}</span>
          {(rule.propertyId || rule.type || rule.category) && (
            <div className={styles.ruleChips}>
              {rule.type && (
                <Chip
                  label={rule.type === 'INCOME' ? 'Income' : 'Expense'}
                  size="small"
                />
              )}
              {rule.category && (
                <Chip label={rule.category} size="small" />
              )}
            </div>
          )}
        </div>
      </div>
      <div className={styles.ruleActions}>
        <Tooltip content="Edit">
          <Button variant="icon" size="small" onClick={() => onEdit(rule)}>
            <Pencil size={16} />
          </Button>
        </Tooltip>
        <Tooltip content="Delete">
          <Button
            variant="icon"
            size="small"
            onClick={() => onDelete(rule)}
            disabled={rule.bankAccountId === null}
          >
            <Trash2 size={16} />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};

export const BankAccountRules: React.FC = () => {
  const { id: accountId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rules, setRules] = useState<MatchingRule[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MatchingRule | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<MatchingRule | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Test rule state
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testData, setTestData] = useState({
    description: '',
    amount: 0,
    counterpartyName: '',
    merchant: '',
    reference: '',
  });
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (accountId) {
      fetchRules();
      fetchProperties();
    }
  }, [accountId]);

  const fetchRules = async () => {
    if (!accountId) return;

    try {
      setLoading(true);
      setError(null);
      const fetchedRules = await matchingRulesService.getRules(accountId);
      setRules(fetchedRules);
    } catch (err) {
      console.error('Error fetching rules:', err);
      const errorMessage =
        err instanceof ApiError ? err.message : 'Failed to load rules';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const fetchedProperties = await propertiesService.getProperties();
      setProperties(fetchedProperties);
    } catch (err) {
      console.error('Error fetching properties:', err);
      // Don't show error to user, just log it
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = rules.findIndex((r) => r.id === active.id);
      const newIndex = rules.findIndex((r) => r.id === over.id);

      const newRules = arrayMove(rules, oldIndex, newIndex);
      setRules(newRules);

      // Save new order to backend
      try {
        await matchingRulesService.reorderRules(
          newRules.filter((r) => r.bankAccountId !== null).map((r) => r.id)
        );
        toast.success('Rules reordered successfully');
      } catch (err) {
        console.error('Error reordering rules:', err);
        const errorMessage =
          err instanceof ApiError ? err.message : 'Failed to reorder rules';
        toast.error(errorMessage);
        // Revert on error
        fetchRules();
      }
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setEditorOpen(true);
  };

  const handleEditRule = (rule: MatchingRule) => {
    setEditingRule(rule);
    setEditorOpen(true);
  };

  const handleDeleteClick = (rule: MatchingRule) => {
    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;

    try {
      setDeleteLoading(true);
      await matchingRulesService.deleteRule(ruleToDelete.id);
      toast.success('Rule deleted successfully');
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
      fetchRules();
    } catch (err) {
      console.error('Error deleting rule:', err);
      const errorMessage =
        err instanceof ApiError ? err.message : 'Failed to delete rule';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveRule = async (data: RuleData) => {
    if (!accountId) return;

    try {
      setEditorLoading(true);

      const requestData = {
        name: data.name,
        enabled: data.enabled,
        conditions: JSON.stringify(data.conditions),
        propertyId: data.propertyId,
        type: data.type,
        category: data.category,
      };

      if (editingRule) {
        // Update existing rule
        const response = await matchingRulesService.updateRule(
          editingRule.id,
          requestData
        );
        toast.success(
          `Rule updated successfully. ${response.reprocessing.approved} pending transactions auto-approved.`
        );
      } else {
        // Create new rule
        const response = await matchingRulesService.createRule(
          accountId,
          requestData
        );
        toast.success(
          `Rule created successfully. ${response.reprocessing.approved} pending transactions auto-approved.`
        );
      }

      setEditorOpen(false);
      setEditingRule(null);
      fetchRules();
    } catch (err) {
      console.error('Error saving rule:', err);
      const errorMessage =
        err instanceof ApiError ? err.message : 'Failed to save rule';
      toast.error(errorMessage);
    } finally {
      setEditorLoading(false);
    }
  };

  const handleTestRule = async () => {
    if (!editingRule?.id) {
      toast.error('Please save the rule before testing');
      return;
    }

    setTestDialogOpen(true);
    setTestResult(null);
  };

  const handleRunTest = async () => {
    if (!editingRule?.id) return;

    try {
      setTestLoading(true);
      const result = await matchingRulesService.testRule(editingRule.id, testData);
      setTestResult(result);
    } catch (err) {
      console.error('Error testing rule:', err);
      const errorMessage =
        err instanceof ApiError ? err.message : 'Failed to test rule';
      toast.error(errorMessage);
    } finally {
      setTestLoading(false);
    }
  };

  const handleEditorCancel = () => {
    setEditorOpen(false);
    setEditingRule(null);
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <div className={styles.loadingWrapper}>
          <Spinner />
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <div className={styles.page}>
          <h1 className={styles.title}>Matching Rules</h1>
          <div className={styles.alert}>{error}</div>
        </div>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <Button variant="icon" onClick={() => navigate('/admin/bank-accounts')}>
            <ArrowLeft size={20} />
          </Button>
          <h1 className={styles.title}>Matching Rules</h1>
        </div>

        {!editorOpen ? (
          <>
            <div className={styles.subheader}>
              <p className={styles.description}>
                Create rules to automatically categorize and assign transactions.
                Rules are evaluated in priority order (drag to reorder).
              </p>
              <Button
                variant="primary"
                startIcon={<Plus size={18} />}
                onClick={handleCreateRule}
              >
                Create Rule
              </Button>
            </div>

            {rules.length === 0 ? (
              <div className={styles.emptyCard}>
                <h2 className={styles.emptyTitle}>No rules configured</h2>
                <p className={styles.emptyText}>
                  Create your first rule to start automatically categorizing transactions.
                </p>
                <Button
                  variant="primary"
                  startIcon={<Plus size={18} />}
                  onClick={handleCreateRule}
                >
                  Create Your First Rule
                </Button>
              </div>
            ) : (
              <div className={styles.rulesCard}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={rules.map((r) => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {rules.map((rule) => (
                      <SortableRuleItem
                        key={rule.id}
                        rule={rule}
                        onEdit={handleEditRule}
                        onDelete={handleDeleteClick}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            )}
          </>
        ) : (
          <RuleEditor
            initialData={
              editingRule
                ? {
                    name: editingRule.name,
                    enabled: editingRule.enabled,
                    conditions: JSON.parse(editingRule.conditions),
                    propertyId: editingRule.propertyId,
                    type: editingRule.type,
                    category: editingRule.category,
                  }
                : undefined
            }
            onSave={handleSaveRule}
            onCancel={handleEditorCancel}
            onTest={editingRule ? handleTestRule : undefined}
            loading={editorLoading}
            properties={properties.map((p) => ({ id: p.id, name: p.name }))}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Rule"
        message={`Are you sure you want to delete the rule "${ruleToDelete?.name}"? This action cannot be undone.`}
        severity="danger"
        confirmLabel={deleteLoading ? 'Deleting...' : 'Delete'}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleteLoading && setDeleteDialogOpen(false)}
      />

      {/* Test Rule Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => !testLoading && setTestDialogOpen(false)}
        size="medium"
      >
        <Dialog.Title>Test Rule</Dialog.Title>
        <Dialog.Content>
          <div className={styles.testForm}>
            <TextField
              label="Description"
              value={testData.description}
              onChange={(e) =>
                setTestData({ ...testData, description: (e.target as HTMLInputElement).value })
              }
              fullWidth
              required
            />
            <TextField
              label="Amount"
              value={String(testData.amount)}
              onChange={(e) =>
                setTestData({ ...testData, amount: Number((e.target as HTMLInputElement).value) || 0 })
              }
              type="number"
              fullWidth
              required
            />
            <TextField
              label="Counterparty Name"
              value={testData.counterpartyName}
              onChange={(e) =>
                setTestData({ ...testData, counterpartyName: (e.target as HTMLInputElement).value })
              }
              fullWidth
            />
            <TextField
              label="Merchant"
              value={testData.merchant}
              onChange={(e) => setTestData({ ...testData, merchant: (e.target as HTMLInputElement).value })}
              fullWidth
            />
            <TextField
              label="Reference"
              value={testData.reference}
              onChange={(e) => setTestData({ ...testData, reference: (e.target as HTMLInputElement).value })}
              fullWidth
            />

            {testResult && (
              <>
                <Divider spacing={1} />
                <div
                  className={`${styles.testResult} ${
                    testResult.matches ? styles.testResultSuccess : styles.testResultInfo
                  }`}
                >
                  {testResult.matches ? <Check size={20} /> : <X size={20} />}
                  <div>
                    <p className={styles.testResultTitle}>
                      {testResult.matches ? 'Rule matches!' : 'Rule does not match'}
                    </p>
                    {testResult.matches && testResult.result && (
                      <div className={styles.testResultDetails}>
                        {testResult.result.suggestedType && (
                          <p className={styles.testResultDetail}>
                            Type: {testResult.result.suggestedType}
                          </p>
                        )}
                        {testResult.result.suggestedCategory && (
                          <p className={styles.testResultDetail}>
                            Category: {testResult.result.suggestedCategory}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button variant="text" onClick={() => setTestDialogOpen(false)} disabled={testLoading}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleRunTest}
            disabled={testLoading || !testData.description}
            loading={testLoading}
          >
            Test
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Container>
  );
};
