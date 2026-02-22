import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  ArrowBack as BackIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
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
import { useToast } from '../../contexts/ToastContext';
import { ApiError, Property } from '../../types/api.types';
import {
  matchingRulesService,
  MatchingRule,
} from '../../services/api/matchingRules.service';
import { propertiesService } from '../../services/api/properties.service';
import { RuleEditor, RuleData } from '../../components/bank/RuleEditor';

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
    <ListItem
      ref={setNodeRef}
      style={style}
      sx={{
        bgcolor: 'background.paper',
        mb: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        '&:hover': {
          bgcolor: 'action.hover',
        },
      }}
      secondaryAction={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Edit">
            <IconButton edge="end" onClick={() => onEdit(rule)} size="small">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              edge="end"
              onClick={() => onDelete(rule)}
              color="error"
              size="small"
              disabled={rule.bankAccountId === null}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab',
          mr: 2,
          display: 'flex',
          alignItems: 'center',
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragIcon color="action" />
      </Box>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body1" component="span" fontWeight={500}>
              {rule.name}
            </Typography>
            {!rule.enabled && (
              <Chip label="Disabled" size="small" color="default" />
            )}
            {rule.bankAccountId === null && (
              <Chip label="Global" size="small" color="primary" />
            )}
          </Box>
        }
        secondary={
          <Box sx={{ mt: 0.5 }}>
            <Typography variant="caption" display="block" color="text.secondary">
              {parseConditions()}
            </Typography>
            {(rule.propertyId || rule.type || rule.category) && (
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                {rule.type && (
                  <Chip
                    label={rule.type === 'INCOME' ? 'Income' : 'Expense'}
                    size="small"
                    variant="outlined"
                  />
                )}
                {rule.category && (
                  <Chip label={rule.category} size="small" variant="outlined" />
                )}
              </Box>
            )}
          </Box>
        }
      />
    </ListItem>
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
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Matching Rules
          </Typography>
          <Alert severity="error">{error}</Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
          <IconButton onClick={() => navigate('/admin/bank-accounts')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h4" component="h1">
            Matching Rules
          </Typography>
        </Box>

        {!editorOpen ? (
          <>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Create rules to automatically categorize and assign transactions.
                Rules are evaluated in priority order (drag to reorder).
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleCreateRule}
              >
                Create Rule
              </Button>
            </Box>

            {rules.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No rules configured
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create your first rule to start automatically categorizing transactions.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleCreateRule}
                >
                  Create Your First Rule
                </Button>
              </Paper>
            ) : (
              <Paper sx={{ p: 2 }}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={rules.map((r) => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <List>
                      {rules.map((rule) => (
                        <SortableRuleItem
                          key={rule.id}
                          rule={rule}
                          onEdit={handleEditRule}
                          onDelete={handleDeleteClick}
                        />
                      ))}
                    </List>
                  </SortableContext>
                </DndContext>
              </Paper>
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
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleteLoading && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Rule</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the rule "{ruleToDelete?.name}"? This action
            cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Rule Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => !testLoading && setTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Test Rule</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Description"
              value={testData.description}
              onChange={(e) =>
                setTestData({ ...testData, description: e.target.value })
              }
              fullWidth
              required
            />
            <TextField
              label="Amount"
              value={testData.amount}
              onChange={(e) =>
                setTestData({ ...testData, amount: Number(e.target.value) || 0 })
              }
              type="number"
              fullWidth
              required
            />
            <TextField
              label="Counterparty Name"
              value={testData.counterpartyName}
              onChange={(e) =>
                setTestData({ ...testData, counterpartyName: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Merchant"
              value={testData.merchant}
              onChange={(e) => setTestData({ ...testData, merchant: e.target.value })}
              fullWidth
            />
            <TextField
              label="Reference"
              value={testData.reference}
              onChange={(e) => setTestData({ ...testData, reference: e.target.value })}
              fullWidth
            />

            {testResult && (
              <>
                <Divider sx={{ my: 1 }} />
                <Alert
                  severity={testResult.matches ? 'success' : 'info'}
                  icon={testResult.matches ? <CheckIcon /> : <CloseIcon />}
                >
                  <Typography variant="subtitle2" gutterBottom>
                    {testResult.matches ? 'Rule matches!' : 'Rule does not match'}
                  </Typography>
                  {testResult.matches && testResult.result && (
                    <Box sx={{ mt: 1 }}>
                      {testResult.result.suggestedType && (
                        <Typography variant="body2">
                          Type: {testResult.result.suggestedType}
                        </Typography>
                      )}
                      {testResult.result.suggestedCategory && (
                        <Typography variant="body2">
                          Category: {testResult.result.suggestedCategory}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Alert>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)} disabled={testLoading}>
            Close
          </Button>
          <Button
            onClick={handleRunTest}
            variant="contained"
            disabled={testLoading || !testData.description}
          >
            {testLoading ? <CircularProgress size={24} /> : 'Test'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
