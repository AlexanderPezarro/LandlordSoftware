// @ts-nocheck - Recharts has type compatibility issues with React 18
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Stack,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TableSortLabel,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { format, startOfYear, endOfYear, subDays, startOfQuarter, subYears } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { reportsService } from '../services/api/reports.service';
import { transactionsService } from '../services/api/transactions.service';
import {
  MonthlyPLData,
  CategoryBreakdown,
  PropertyPerformance,
  TransactionFilters,
  Transaction,
} from '../types/api.types';
import StatsCard from '../components/shared/StatsCard';
import DateRangePicker from '../components/shared/DateRangePicker';
import PropertySelector from '../components/shared/PropertySelector';
import { useToast } from '../contexts/ToastContext';

type ChartType = 'pie' | 'bar';
type SortField = 'propertyName' | 'totalRevenue' | 'totalExpenses' | 'netIncome';
type SortOrder = 'asc' | 'desc';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const INCOME_CATEGORIES = ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'];
const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Repair',
  'Utilities',
  'Insurance',
  'Property Tax',
  'Management Fee',
  'Legal Fee',
  'Other',
];

export const Reports: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [plData, setPlData] = useState<MonthlyPLData>({});
  const [categoryData, setCategoryData] = useState<CategoryBreakdown>({ income: {}, expense: {} });
  const [propertyData, setPropertyData] = useState<PropertyPerformance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Filter states
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(startOfYear(new Date()));
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(endOfYear(new Date()));

  // UI states
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [sortField, setSortField] = useState<SortField>('propertyName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: TransactionFilters = {};

      if (propertyFilter !== 'all') {
        filters.propertyId = propertyFilter;
      }

      if (dateRangeStart) {
        filters.startDate = dateRangeStart.toISOString().split('T')[0];
      }

      if (dateRangeEnd) {
        filters.endDate = dateRangeEnd.toISOString().split('T')[0];
      }

      const [pl, category, property, transactionList] = await Promise.all([
        reportsService.getProfitLossReport(filters),
        reportsService.getCategoryBreakdown(filters),
        reportsService.getPropertyPerformance(filters),
        transactionsService.getTransactions(filters),
      ]);

      setPlData(pl);
      setCategoryData(category);
      setPropertyData(property);
      setTransactions(transactionList);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [propertyFilter, dateRangeStart, dateRangeEnd]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDatePreset = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case 'last30':
        setDateRangeStart(subDays(now, 30));
        setDateRangeEnd(now);
        break;
      case 'lastQuarter':
        setDateRangeStart(startOfQuarter(subDays(now, 90)));
        setDateRangeEnd(subDays(now, 1));
        break;
      case 'lastYear':
        setDateRangeStart(startOfYear(subYears(now, 1)));
        setDateRangeEnd(endOfYear(subYears(now, 1)));
        break;
      case 'currentYear':
        setDateRangeStart(startOfYear(now));
        setDateRangeEnd(endOfYear(now));
        break;
      case 'allTime':
        setDateRangeStart(null);
        setDateRangeEnd(null);
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate totals for summary cards
  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    Object.values(categoryData.income).forEach(amount => {
      totalIncome += amount;
    });

    Object.values(categoryData.expense).forEach(amount => {
      totalExpense += amount;
    });

    return {
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
    };
  }, [categoryData]);

  // Prepare chart data
  const incomeChartData = useMemo(() => {
    return Object.entries(categoryData.income).map(([name, value]) => ({
      name,
      value,
    }));
  }, [categoryData.income]);

  const expenseChartData = useMemo(() => {
    return Object.entries(categoryData.expense).map(([name, value]) => ({
      name,
      value,
    }));
  }, [categoryData.expense]);

  // Sort property data
  const sortedPropertyData = useMemo(() => {
    const sorted = [...propertyData];
    sorted.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    return sorted;
  }, [propertyData, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Prepare P&L table data
  const plTableData = useMemo(() => {
    const months = Object.keys(plData).sort();
    const allCategories = new Set<string>();

    // Collect all categories
    Object.values(plData).forEach(monthData => {
      Object.keys(monthData.income).forEach(cat => allCategories.add(cat));
      Object.keys(monthData.expense).forEach(cat => allCategories.add(cat));
    });

    const incomeCategories = INCOME_CATEGORIES.filter(cat => allCategories.has(cat));
    const expenseCategories = EXPENSE_CATEGORIES.filter(cat => allCategories.has(cat));

    return {
      months,
      incomeCategories,
      expenseCategories,
    };
  }, [plData]);

  // CSV Export functions
  const exportPLReport = () => {
    const { months, incomeCategories, expenseCategories } = plTableData;

    const headers = ['Category', ...months];
    const rows: string[][] = [headers];

    // Income section
    rows.push(['INCOME']);
    incomeCategories.forEach(category => {
      const row = [category];
      months.forEach(month => {
        const amount = plData[month]?.income[category] || 0;
        row.push(amount.toFixed(2));
      });
      rows.push(row);
    });

    // Total Income
    const totalIncomeRow = ['Total Income'];
    months.forEach(month => {
      const total = Object.values(plData[month]?.income || {}).reduce((sum, val) => sum + val, 0);
      totalIncomeRow.push(total.toFixed(2));
    });
    rows.push(totalIncomeRow);

    // Expense section
    rows.push(['']);
    rows.push(['EXPENSES']);
    expenseCategories.forEach(category => {
      const row = [category];
      months.forEach(month => {
        const amount = plData[month]?.expense[category] || 0;
        row.push(amount.toFixed(2));
      });
      rows.push(row);
    });

    // Total Expenses
    const totalExpenseRow = ['Total Expenses'];
    months.forEach(month => {
      const total = Object.values(plData[month]?.expense || {}).reduce((sum, val) => sum + val, 0);
      totalExpenseRow.push(total.toFixed(2));
    });
    rows.push(totalExpenseRow);

    // Net Income
    rows.push(['']);
    const netIncomeRow = ['Net Income'];
    months.forEach(month => {
      const income = Object.values(plData[month]?.income || {}).reduce((sum, val) => sum + val, 0);
      const expense = Object.values(plData[month]?.expense || {}).reduce((sum, val) => sum + val, 0);
      netIncomeRow.push((income - expense).toFixed(2));
    });
    rows.push(netIncomeRow);

    downloadCSV(rows, 'profit-loss-report');
  };

  const exportPropertyPerformance = () => {
    const headers = ['Property Name', 'Total Revenue', 'Total Expenses', 'Net Income'];
    const rows: string[][] = [headers];

    sortedPropertyData.forEach(property => {
      rows.push([
        property.propertyName,
        property.totalRevenue.toFixed(2),
        property.totalExpenses.toFixed(2),
        property.netIncome.toFixed(2),
      ]);
    });

    downloadCSV(rows, 'property-performance');
  };

  const exportTransactions = () => {
    const headers = ['Date', 'Property', 'Type', 'Category', 'Amount', 'Description'];
    const rows: string[][] = [headers];

    transactions.forEach(transaction => {
      rows.push([
        format(new Date(transaction.transactionDate), 'dd/MM/yyyy'),
        transaction.property?.name || 'N/A',
        transaction.type,
        transaction.category,
        transaction.amount.toFixed(2),
        transaction.description || '',
      ]);
    });

    downloadCSV(rows, 'transactions');
  };

  const downloadCSV = (rows: string[][], filename: string) => {
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully');
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon fontSize="large" />
            <Typography variant="h4" component="h1">
              Financial Reports
            </Typography>
          </Box>
          <TextField
            select
            size="small"
            label="Export"
            defaultValue=""
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="" disabled>Select Report to Export</MenuItem>
            <MenuItem onClick={exportPLReport}>Export P&L Report</MenuItem>
            <MenuItem onClick={exportPropertyPerformance}>Export Property Performance</MenuItem>
            <MenuItem onClick={exportTransactions}>Export Transactions</MenuItem>
          </TextField>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Date Range Filters
          </Typography>

          <Stack spacing={2}>
            <Stack direction={isMobile ? 'column' : 'row'} spacing={2}>
              <PropertySelector
                value={propertyFilter}
                onChange={setPropertyFilter}
                includeAllOption={true}
              />
            </Stack>

            <DateRangePicker
              startDate={dateRangeStart}
              endDate={dateRangeEnd}
              onStartDateChange={setDateRangeStart}
              onEndDateChange={setDateRangeEnd}
              label="Report Date Range"
            />

            <Stack direction={isMobile ? 'column' : 'row'} spacing={1} flexWrap="wrap">
              <Button size="small" variant="outlined" onClick={() => handleDatePreset('last30')}>
                Last 30 Days
              </Button>
              <Button size="small" variant="outlined" onClick={() => handleDatePreset('lastQuarter')}>
                Last Quarter
              </Button>
              <Button size="small" variant="outlined" onClick={() => handleDatePreset('lastYear')}>
                Last Year
              </Button>
              <Button size="small" variant="outlined" onClick={() => handleDatePreset('currentYear')}>
                Current Year
              </Button>
              <Button size="small" variant="outlined" onClick={() => handleDatePreset('allTime')}>
                All Time
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {loading ? (
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
        ) : (
          <>
            {/* Summary Cards */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 3,
                mb: 3,
              }}
            >
              <StatsCard
                title="Total Income"
                value={formatCurrency(totals.totalIncome)}
                icon={<AssessmentIcon />}
                color={theme.palette.success.main}
              />
              <StatsCard
                title="Total Expenses"
                value={formatCurrency(totals.totalExpense)}
                icon={<AssessmentIcon />}
                color={theme.palette.error.main}
              />
              <StatsCard
                title="Net Income"
                value={formatCurrency(totals.netIncome)}
                icon={<AssessmentIcon />}
                color={totals.netIncome >= 0 ? theme.palette.success.main : theme.palette.error.main}
              />
            </Box>

            {/* P&L Report */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Profit & Loss Report - Monthly Breakdown
              </Typography>
              {plTableData.months.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No data available for the selected date range
                </Typography>
              ) : (
                <TableContainer sx={{ maxHeight: 600, overflowX: 'auto' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>Category</TableCell>
                        {plTableData.months.map(month => (
                          <TableCell key={month} align="right" sx={{ fontWeight: 'bold', minWidth: 100 }}>
                            {format(new Date(month + '-01'), 'MMM yyyy')}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {/* Income Section */}
                      <TableRow>
                        <TableCell colSpan={plTableData.months.length + 1} sx={{ bgcolor: 'success.light', fontWeight: 'bold' }}>
                          INCOME
                        </TableCell>
                      </TableRow>
                      {plTableData.incomeCategories.map(category => (
                        <TableRow key={category}>
                          <TableCell>{category}</TableCell>
                          {plTableData.months.map(month => (
                            <TableCell key={month} align="right">
                              {formatCurrency(plData[month]?.income[category] || 0)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Total Income</TableCell>
                        {plTableData.months.map(month => {
                          const total = Object.values(plData[month]?.income || {}).reduce((sum, val) => sum + val, 0);
                          return (
                            <TableCell key={month} align="right" sx={{ fontWeight: 'bold' }}>
                              {formatCurrency(total)}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      {/* Expense Section */}
                      <TableRow>
                        <TableCell colSpan={plTableData.months.length + 1} sx={{ bgcolor: 'error.light', fontWeight: 'bold' }}>
                          EXPENSES
                        </TableCell>
                      </TableRow>
                      {plTableData.expenseCategories.map(category => (
                        <TableRow key={category}>
                          <TableCell>{category}</TableCell>
                          {plTableData.months.map(month => (
                            <TableCell key={month} align="right">
                              {formatCurrency(plData[month]?.expense[category] || 0)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                      <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Total Expenses</TableCell>
                        {plTableData.months.map(month => {
                          const total = Object.values(plData[month]?.expense || {}).reduce((sum, val) => sum + val, 0);
                          return (
                            <TableCell key={month} align="right" sx={{ fontWeight: 'bold' }}>
                              {formatCurrency(total)}
                            </TableCell>
                          );
                        })}
                      </TableRow>

                      {/* Net Income */}
                      <TableRow sx={{ bgcolor: 'primary.light' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Net Income</TableCell>
                        {plTableData.months.map(month => {
                          const income = Object.values(plData[month]?.income || {}).reduce((sum, val) => sum + val, 0);
                          const expense = Object.values(plData[month]?.expense || {}).reduce((sum, val) => sum + val, 0);
                          const net = income - expense;
                          return (
                            <TableCell
                              key={month}
                              align="right"
                              sx={{
                                fontWeight: 'bold',
                                color: net >= 0 ? 'success.dark' : 'error.dark',
                              }}
                            >
                              {formatCurrency(net)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>

            {/* Category Breakdown Charts */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Category Breakdown
                </Typography>
                <ToggleButtonGroup
                  value={chartType}
                  exclusive
                  onChange={(_, newType) => newType && setChartType(newType)}
                  size="small"
                >
                  <ToggleButton value="pie">
                    <PieChartIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="bar">
                    <BarChartIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {incomeChartData.length === 0 && expenseChartData.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No data available for the selected date range
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                    gap: 3,
                  }}
                >
                  {/* Income Chart */}
                  <Box>
                    <Typography variant="subtitle2" gutterBottom align="center">
                      Income by Category
                    </Typography>
                    {incomeChartData.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        No income data
                      </Typography>
                    ) : chartType === 'pie' ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={incomeChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                          >
                            {incomeChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value?: number) => value ? formatCurrency(value) : '£0.00'} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={incomeChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value?: number) => value ? formatCurrency(value) : '£0.00'} />
                          <Bar dataKey="value" fill={theme.palette.success.main} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Box>

                  {/* Expense Chart */}
                  <Box>
                    <Typography variant="subtitle2" gutterBottom align="center">
                      Expenses by Category
                    </Typography>
                    {expenseChartData.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                        No expense data
                      </Typography>
                    ) : chartType === 'pie' ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={expenseChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={(entry) => `${entry.name}: ${formatCurrency(entry.value)}`}
                          >
                            {expenseChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value?: number) => value ? formatCurrency(value) : '£0.00'} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={expenseChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value?: number) => value ? formatCurrency(value) : '£0.00'} />
                          <Bar dataKey="value" fill={theme.palette.error.main} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </Box>
                </Box>
              )}
            </Paper>

            {/* Property Performance */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Property Performance Metrics
              </Typography>
              {sortedPropertyData.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                  No data available for the selected date range
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={sortField === 'propertyName'}
                            direction={sortField === 'propertyName' ? sortOrder : 'asc'}
                            onClick={() => handleSort('propertyName')}
                          >
                            Property Name
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right">
                          <TableSortLabel
                            active={sortField === 'totalRevenue'}
                            direction={sortField === 'totalRevenue' ? sortOrder : 'asc'}
                            onClick={() => handleSort('totalRevenue')}
                          >
                            Total Revenue
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right">
                          <TableSortLabel
                            active={sortField === 'totalExpenses'}
                            direction={sortField === 'totalExpenses' ? sortOrder : 'asc'}
                            onClick={() => handleSort('totalExpenses')}
                          >
                            Total Expenses
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right">
                          <TableSortLabel
                            active={sortField === 'netIncome'}
                            direction={sortField === 'netIncome' ? sortOrder : 'asc'}
                            onClick={() => handleSort('netIncome')}
                          >
                            Net Income
                          </TableSortLabel>
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sortedPropertyData.map((property) => (
                        <TableRow key={property.propertyId}>
                          <TableCell>{property.propertyName}</TableCell>
                          <TableCell align="right" sx={{ color: 'success.dark' }}>
                            {formatCurrency(property.totalRevenue)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'error.dark' }}>
                            {formatCurrency(property.totalExpenses)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 'bold',
                              color: property.netIncome >= 0 ? 'success.dark' : 'error.dark',
                            }}
                          >
                            {formatCurrency(property.netIncome)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </>
        )}
      </Box>
    </Container>
  );
};
