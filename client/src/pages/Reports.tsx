// @ts-nocheck - Recharts has type compatibility issues with React 18
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BarChart3, PieChart as PieChartIcon, BarChart as BarChartLucide, User, X } from 'lucide-react';
import { format, startOfYear, endOfYear, subDays, startOfQuarter, subYears } from 'date-fns';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { Container } from '../components/primitives/Container';
import { Card } from '../components/primitives/Card';
import { Button } from '../components/primitives/Button';
import { Select } from '../components/primitives/Select';
import { Table } from '../components/primitives/Table';
import { ToggleGroup } from '../components/primitives/ToggleGroup';
import { Chip } from '../components/primitives/Chip';
import { Divider } from '../components/primitives/Divider';
import { Spinner } from '../components/primitives/Spinner';
import { StatsCard } from '../components/composed/StatsCard';
import DateRangePicker from '../components/composed/DateRangePicker';
import { PropertySelector } from '../components/composed/PropertySelector';
import { reportsService } from '../services/api/reports.service';
import { transactionsService } from '../services/api/transactions.service';
import {
  MonthlyPLData,
  CategoryBreakdown,
  PropertyPerformance,
  TransactionFilters,
  Transaction,
  OwnerPLReport,
  ReportOwner,
} from '../types/api.types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import styles from './Reports.module.scss';

type ChartType = 'pie' | 'bar';
type SortField = 'propertyName' | 'totalRevenue' | 'totalExpenses' | 'netIncome';
type SortOrder = 'asc' | 'desc';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const CHART_COLOR_SUCCESS = '#2e7d32';
const CHART_COLOR_ERROR = '#d32f2f';

const INCOME_CATEGORIES = ['Rent', 'Security Deposit', 'Late Fee', 'Lease Fee'];
const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Repair',
  'Utilities',
  'Insurance',
  'Property Tax',
  'Management Fee',
  'Legal Fee',
  'Transport',
  'Other',
];

export const Reports: React.FC = () => {
  const toast = useToast();
  const { user, isAdmin } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [plData, setPlData] = useState<MonthlyPLData>({});
  const [categoryData, setCategoryData] = useState<CategoryBreakdown>({ income: {}, expense: {} });
  const [propertyData, setPropertyData] = useState<PropertyPerformance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Owner P&L states
  const [owners, setOwners] = useState<ReportOwner[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [ownerPLReport, setOwnerPLReport] = useState<OwnerPLReport | null>(null);
  const [ownerPLLoading, setOwnerPLLoading] = useState(false);

  // Filter states - composed PropertySelector uses '' for all properties
  const [propertyFilter, setPropertyFilter] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState<Date | null>(startOfYear(new Date()));
  const [dateRangeEnd, setDateRangeEnd] = useState<Date | null>(endOfYear(new Date()));

  // UI states
  const [chartType, setChartType] = useState<ChartType>('pie');
  const [sortField, setSortField] = useState<SortField>('propertyName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Fetch available owners for the selector
  useEffect(() => {
    const fetchOwners = async () => {
      try {
        const ownersList = await reportsService.getReportOwners();
        setOwners(ownersList);
        // Default to current logged-in user
        if (user && ownersList.some(o => o.id === user.id)) {
          setSelectedOwnerId(user.id);
        } else if (ownersList.length > 0) {
          setSelectedOwnerId(ownersList[0].id);
        }
      } catch (err) {
        console.error('Error fetching owners:', err);
      }
    };
    fetchOwners();
  }, [user]);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: TransactionFilters = {};

      if (propertyFilter !== '') {
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

  // Fetch owner P&L report when owner or date range changes
  const fetchOwnerPLReport = useCallback(async () => {
    if (!selectedOwnerId || !dateRangeStart || !dateRangeEnd) {
      setOwnerPLReport(null);
      return;
    }

    try {
      setOwnerPLLoading(true);
      const startDate = dateRangeStart.toISOString().split('T')[0];
      const endDate = dateRangeEnd.toISOString().split('T')[0];
      const report = await reportsService.getOwnerPLReport(selectedOwnerId, startDate, endDate);
      setOwnerPLReport(report);
    } catch (err) {
      console.error('Error fetching owner P&L report:', err);
      setOwnerPLReport(null);
    } finally {
      setOwnerPLLoading(false);
    }
  }, [selectedOwnerId, dateRangeStart, dateRangeEnd]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    fetchOwnerPLReport();
  }, [fetchOwnerPLReport]);

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

  const handleOwnerChange = (value: string) => {
    setSelectedOwnerId(value);
  };

  const formatCurrency = (amount: number) => {
    return `\u00A3${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatOwnerShare = (ownerShare: number, total: number, percentage: number) => {
    if (percentage >= 100) {
      return formatCurrency(ownerShare);
    }
    return `${formatCurrency(ownerShare)} (${percentage}% of ${formatCurrency(total)})`;
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

  // Build owner options for the Select primitive
  const ownerOptions = useMemo(() => {
    if (owners.length === 0) {
      return [{ value: '', label: 'No owners available' }];
    }
    return owners.map((owner) => ({
      value: owner.id,
      label: `${owner.email}${owner.id === user?.id ? ' (You)' : ''}`,
    }));
  }, [owners, user]);

  // Build export options for the Select primitive
  const exportOptions = useMemo(() => [
    { value: 'pl', label: 'Export P&L Report' },
    { value: 'property', label: 'Export Property Performance' },
    { value: 'transactions', label: 'Export Transactions' },
  ], []);

  const handleExport = (value: string) => {
    switch (value) {
      case 'pl':
        exportPLReport();
        break;
      case 'property':
        exportPropertyPerformance();
        break;
      case 'transactions':
        exportTransactions();
        break;
    }
  };

  // Get the selected owner's name for display
  const selectedOwner = owners.find(o => o.id === selectedOwnerId);

  // Toggle group options for chart type
  const chartToggleOptions = useMemo(() => [
    { value: 'pie', label: '', icon: <PieChartIcon size={18} /> },
    { value: 'bar', label: '', icon: <BarChartLucide size={18} /> },
  ], []);

  return (
    <Container maxWidth="xl">
      <div className={styles.page}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>
            <BarChart3 size={32} className={styles.pageTitleIcon} />
            <h1 className={styles.pageTitleText}>Financial Reports</h1>
          </div>
          <div className={styles.exportSelect}>
            <Select
              label="Export"
              placeholder="Select Report to Export"
              options={exportOptions}
              value=""
              onChange={handleExport}
              size="small"
            />
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            <span>{error}</span>
            <button
              className={styles.alertCloseButton}
              onClick={() => setError(null)}
              aria-label="Close error"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Filters */}
        <Card className={styles.filtersCard}>
          <Card.Content>
            <p className={styles.filtersTitle}>Filters</p>

            <div className={styles.filtersStack}>
              <div className={styles.filterRow}>
                <div className={styles.filterField}>
                  <PropertySelector
                    value={propertyFilter}
                    onChange={setPropertyFilter}
                    includeAllOption={true}
                  />
                </div>
                <div className={styles.filterField}>
                  <Select
                    label="Owner"
                    name="owner-selector"
                    options={ownerOptions}
                    value={selectedOwnerId}
                    onChange={handleOwnerChange}
                    size="small"
                    fullWidth
                  />
                </div>
              </div>

              <DateRangePicker
                startDate={dateRangeStart}
                endDate={dateRangeEnd}
                onStartChange={setDateRangeStart}
                onEndChange={setDateRangeEnd}
                label="Report Date Range"
              />

              <div className={styles.datePresets}>
                <Button variant="secondary" size="small" onClick={() => handleDatePreset('last30')}>
                  Last 30 Days
                </Button>
                <Button variant="secondary" size="small" onClick={() => handleDatePreset('lastQuarter')}>
                  Last Quarter
                </Button>
                <Button variant="secondary" size="small" onClick={() => handleDatePreset('lastYear')}>
                  Last Year
                </Button>
                <Button variant="secondary" size="small" onClick={() => handleDatePreset('currentYear')}>
                  Current Year
                </Button>
                <Button variant="secondary" size="small" onClick={() => handleDatePreset('allTime')}>
                  All Time
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>

        {loading ? (
          <div className={styles.loadingWrapper}>
            <Spinner size="large" />
          </div>
        ) : (
          <>
            {/* Owner P&L Report Section */}
            {selectedOwnerId && (
              <Card className={styles.sectionCard}>
                <Card.Content>
                  <div className={styles.ownerHeader}>
                    <User size={24} className={styles.ownerIcon} />
                    <h2 className={styles.sectionTitle}>
                      Owner P&L Report
                      {selectedOwner && (
                        <Chip
                          label={selectedOwner.email}
                          size="small"
                          color="primary"
                          className={styles.chipInline}
                        />
                      )}
                    </h2>
                  </div>

                  {!dateRangeStart || !dateRangeEnd ? (
                    <div className={`${styles.alert} ${styles.alertInfo}`}>
                      <span>Please select a date range to view the owner P&L report.</span>
                    </div>
                  ) : ownerPLLoading ? (
                    <div className={styles.loadingSmall}>
                      <Spinner />
                    </div>
                  ) : !ownerPLReport || ownerPLReport.properties.length === 0 ? (
                    <p className={styles.emptyText}>
                      No ownership data found for the selected owner in this date range.
                    </p>
                  ) : (
                    <>
                      {/* Owner Summary Cards */}
                      <div className={styles.statsGrid}>
                        <StatsCard
                          title="Owner's Income Share"
                          value={formatCurrency(ownerPLReport.summary.totalIncome)}
                        />
                        <StatsCard
                          title="Owner's Expense Share"
                          value={formatCurrency(ownerPLReport.summary.totalExpenses)}
                        />
                        <StatsCard
                          title="Owner's Net Profit"
                          value={formatCurrency(ownerPLReport.summary.netProfit)}
                        />
                      </div>

                      {/* Per-Property Breakdown */}
                      {ownerPLReport.properties.map((propReport) => (
                        <div key={propReport.property.id} className={styles.propertyCard}>
                          <div className={styles.propertyHeader}>
                            <h3 className={styles.propertyName}>
                              {propReport.property.name}
                            </h3>
                            <Chip
                              label={`${propReport.owner.ownershipPercentage}% ownership`}
                              size="small"
                              color="primary"
                            />
                          </div>
                          <p className={styles.propertyAddress}>
                            {propReport.property.address}
                          </p>

                          <Table.Container>
                            <Table>
                              <Table.Head>
                                <Table.Row>
                                  <Table.Cell sortable={false} sortDirection={null}>Category</Table.Cell>
                                  <Table.Cell sortable={false} sortDirection={null} align="right">Owner's Share</Table.Cell>
                                </Table.Row>
                              </Table.Head>
                              <Table.Body>
                                {/* Income Section Header */}
                                <Table.Row>
                                  <td
                                    colSpan={2}
                                    className={`${styles.sectionHeaderRow} ${styles.sectionHeaderIncome}`}
                                  >
                                    INCOME
                                  </td>
                                </Table.Row>
                                {Object.entries(propReport.income.byCategory).map(([category, data]) => (
                                  <Table.Row key={`income-${category}`}>
                                    <Table.Cell>{category}</Table.Cell>
                                    <Table.Cell align="right">
                                      {formatOwnerShare(data.ownerShare, data.total, propReport.owner.ownershipPercentage)}
                                    </Table.Cell>
                                  </Table.Row>
                                ))}
                                {Object.keys(propReport.income.byCategory).length === 0 && (
                                  <Table.Row>
                                    <td colSpan={2}>
                                      <span className={styles.italicText}>No income in this period</span>
                                    </td>
                                  </Table.Row>
                                )}
                                <Table.Row className={styles.totalRow}>
                                  <Table.Cell className={styles.boldCell}>Total Income</Table.Cell>
                                  <Table.Cell align="right" className={styles.boldCell}>
                                    {formatOwnerShare(
                                      propReport.income.totalOwnerShare,
                                      propReport.income.totalOverall,
                                      propReport.owner.ownershipPercentage
                                    )}
                                  </Table.Cell>
                                </Table.Row>

                                {/* Expenses Section Header */}
                                <Table.Row>
                                  <td
                                    colSpan={2}
                                    className={`${styles.sectionHeaderRow} ${styles.sectionHeaderExpense}`}
                                  >
                                    EXPENSES
                                  </td>
                                </Table.Row>
                                {Object.entries(propReport.expenses.byCategory).map(([category, data]) => (
                                  <Table.Row key={`expense-${category}`}>
                                    <Table.Cell>{category}</Table.Cell>
                                    <Table.Cell align="right">
                                      {formatOwnerShare(data.ownerShare, data.total, propReport.owner.ownershipPercentage)}
                                    </Table.Cell>
                                  </Table.Row>
                                ))}
                                {Object.keys(propReport.expenses.byCategory).length === 0 && (
                                  <Table.Row>
                                    <td colSpan={2}>
                                      <span className={styles.italicText}>No expenses in this period</span>
                                    </td>
                                  </Table.Row>
                                )}
                                <Table.Row className={styles.totalRow}>
                                  <Table.Cell className={styles.boldCell}>Total Expenses</Table.Cell>
                                  <Table.Cell align="right" className={styles.boldCell}>
                                    {formatOwnerShare(
                                      propReport.expenses.totalOwnerShare,
                                      propReport.expenses.totalOverall,
                                      propReport.owner.ownershipPercentage
                                    )}
                                  </Table.Cell>
                                </Table.Row>

                                {/* Net Profit */}
                                <Table.Row className={styles.netRow}>
                                  <Table.Cell className={styles.boldCell}>Net Profit</Table.Cell>
                                  <Table.Cell
                                    align="right"
                                    className={`${styles.boldCell} ${propReport.netProfit >= 0 ? styles.textSuccessDark : styles.textErrorDark}`}
                                  >
                                    {formatCurrency(propReport.netProfit)}
                                  </Table.Cell>
                                </Table.Row>
                              </Table.Body>
                            </Table>
                          </Table.Container>

                          {/* Balance Summary for this property */}
                          {propReport.balances.length > 0 && (
                            <div className={styles.balanceSummary}>
                              <Divider />
                              <p className={styles.balanceSummaryTitle}>Balance Summary</p>
                              {propReport.balances.map((balance, idx) => (
                                <div key={idx} className={styles.balanceRow}>
                                  <span className={styles.balanceLabel}>
                                    {balance.amount > 0
                                      ? `${balance.email} owes you`
                                      : `You owe ${balance.email}`}
                                  </span>
                                  <span
                                    className={`${styles.balanceAmount} ${balance.amount > 0 ? styles.textSuccessDark : styles.textErrorDark}`}
                                  >
                                    {formatCurrency(Math.abs(balance.amount))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </Card.Content>
              </Card>
            )}

            {/* Summary Cards (overall, not per-owner) */}
            <div className={styles.statsGrid}>
              <StatsCard
                title="Total Income"
                value={formatCurrency(totals.totalIncome)}
              />
              <StatsCard
                title="Total Expenses"
                value={formatCurrency(totals.totalExpense)}
              />
              <StatsCard
                title="Net Income"
                value={formatCurrency(totals.netIncome)}
              />
            </div>

            {/* P&L Report */}
            <Card className={styles.sectionCard}>
              <Card.Content>
                <h2 className={styles.sectionTitle}>
                  Profit &amp; Loss Report - Monthly Breakdown
                </h2>
                {plTableData.months.length === 0 ? (
                  <p className={styles.emptyText}>
                    No data available for the selected date range
                  </p>
                ) : (
                  <div className={styles.plTableContainer}>
                    <Table.Container>
                      <Table>
                        <Table.Head>
                          <Table.Row>
                            <Table.Cell
                              sortable={false}
                              sortDirection={null}
                              className={styles.plTableCategoryCell}
                            >
                              Category
                            </Table.Cell>
                            {plTableData.months.map(month => (
                              <Table.Cell
                                key={month}
                                sortable={false}
                                sortDirection={null}
                                align="right"
                                className={styles.plTableMonthCell}
                              >
                                {format(new Date(month + '-01'), 'MMM yyyy')}
                              </Table.Cell>
                            ))}
                          </Table.Row>
                        </Table.Head>
                        <Table.Body>
                          {/* Income Section */}
                          <Table.Row>
                            <td
                              colSpan={plTableData.months.length + 1}
                              className={`${styles.sectionHeaderRow} ${styles.sectionHeaderIncome}`}
                            >
                              INCOME
                            </td>
                          </Table.Row>
                          {plTableData.incomeCategories.map(category => (
                            <Table.Row key={category}>
                              <Table.Cell>{category}</Table.Cell>
                              {plTableData.months.map(month => (
                                <Table.Cell key={month} align="right">
                                  {formatCurrency(plData[month]?.income[category] || 0)}
                                </Table.Cell>
                              ))}
                            </Table.Row>
                          ))}
                          <Table.Row className={styles.totalRow}>
                            <Table.Cell className={styles.boldCell}>Total Income</Table.Cell>
                            {plTableData.months.map(month => {
                              const total = Object.values(plData[month]?.income || {}).reduce((sum, val) => sum + val, 0);
                              return (
                                <Table.Cell key={month} align="right" className={styles.boldCell}>
                                  {formatCurrency(total)}
                                </Table.Cell>
                              );
                            })}
                          </Table.Row>

                          {/* Expense Section */}
                          <Table.Row>
                            <td
                              colSpan={plTableData.months.length + 1}
                              className={`${styles.sectionHeaderRow} ${styles.sectionHeaderExpense}`}
                            >
                              EXPENSES
                            </td>
                          </Table.Row>
                          {plTableData.expenseCategories.map(category => (
                            <Table.Row key={category}>
                              <Table.Cell>{category}</Table.Cell>
                              {plTableData.months.map(month => (
                                <Table.Cell key={month} align="right">
                                  {formatCurrency(plData[month]?.expense[category] || 0)}
                                </Table.Cell>
                              ))}
                            </Table.Row>
                          ))}
                          <Table.Row className={styles.totalRow}>
                            <Table.Cell className={styles.boldCell}>Total Expenses</Table.Cell>
                            {plTableData.months.map(month => {
                              const total = Object.values(plData[month]?.expense || {}).reduce((sum, val) => sum + val, 0);
                              return (
                                <Table.Cell key={month} align="right" className={styles.boldCell}>
                                  {formatCurrency(total)}
                                </Table.Cell>
                              );
                            })}
                          </Table.Row>

                          {/* Net Income */}
                          <Table.Row className={styles.netRow}>
                            <Table.Cell className={styles.boldCell}>Net Income</Table.Cell>
                            {plTableData.months.map(month => {
                              const income = Object.values(plData[month]?.income || {}).reduce((sum, val) => sum + val, 0);
                              const expense = Object.values(plData[month]?.expense || {}).reduce((sum, val) => sum + val, 0);
                              const net = income - expense;
                              return (
                                <Table.Cell
                                  key={month}
                                  align="right"
                                  className={`${styles.boldCell} ${net >= 0 ? styles.textSuccessDark : styles.textErrorDark}`}
                                >
                                  {formatCurrency(net)}
                                </Table.Cell>
                              );
                            })}
                          </Table.Row>
                        </Table.Body>
                      </Table>
                    </Table.Container>
                  </div>
                )}
              </Card.Content>
            </Card>

            {/* Category Breakdown Charts */}
            <Card className={styles.sectionCard}>
              <Card.Content>
                <div className={styles.sectionHeader}>
                  <h2 className={`${styles.sectionTitle} ${styles.sectionTitleNoMargin}`}>
                    Category Breakdown
                  </h2>
                  <ToggleGroup
                    options={chartToggleOptions}
                    value={chartType}
                    onChange={(value) => setChartType(value as ChartType)}
                    size="small"
                  />
                </div>

                {incomeChartData.length === 0 && expenseChartData.length === 0 ? (
                  <p className={styles.emptyText}>
                    No data available for the selected date range
                  </p>
                ) : (
                  <div className={styles.chartsGrid}>
                    {/* Income Chart */}
                    <div className={styles.chartSection}>
                      <p className={styles.chartTitle}>Income by Category</p>
                      {incomeChartData.length === 0 ? (
                        <p className={styles.emptyText}>No income data</p>
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
                            <Tooltip formatter={(value?: number) => value ? formatCurrency(value) : '\u00A30.00'} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={incomeChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value?: number) => value ? formatCurrency(value) : '\u00A30.00'} />
                            <Bar dataKey="value" fill={CHART_COLOR_SUCCESS} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Expense Chart */}
                    <div className={styles.chartSection}>
                      <p className={styles.chartTitle}>Expenses by Category</p>
                      {expenseChartData.length === 0 ? (
                        <p className={styles.emptyText}>No expense data</p>
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
                            <Tooltip formatter={(value?: number) => value ? formatCurrency(value) : '\u00A30.00'} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={expenseChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value?: number) => value ? formatCurrency(value) : '\u00A30.00'} />
                            <Bar dataKey="value" fill={CHART_COLOR_ERROR} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                )}
              </Card.Content>
            </Card>

            {/* Property Performance */}
            <Card>
              <Card.Content>
                <h2 className={styles.sectionTitle}>
                  Property Performance Metrics
                </h2>
                {sortedPropertyData.length === 0 ? (
                  <p className={styles.emptyText}>
                    No data available for the selected date range
                  </p>
                ) : (
                  <Table.Container>
                    <Table>
                      <Table.Head>
                        <Table.Row>
                          <Table.Cell
                            sortable
                            sortDirection={sortField === 'propertyName' ? sortOrder : null}
                            onSort={() => handleSort('propertyName')}
                          >
                            Property Name
                          </Table.Cell>
                          <Table.Cell
                            sortable
                            sortDirection={sortField === 'totalRevenue' ? sortOrder : null}
                            onSort={() => handleSort('totalRevenue')}
                            align="right"
                          >
                            Total Revenue
                          </Table.Cell>
                          <Table.Cell
                            sortable
                            sortDirection={sortField === 'totalExpenses' ? sortOrder : null}
                            onSort={() => handleSort('totalExpenses')}
                            align="right"
                          >
                            Total Expenses
                          </Table.Cell>
                          <Table.Cell
                            sortable
                            sortDirection={sortField === 'netIncome' ? sortOrder : null}
                            onSort={() => handleSort('netIncome')}
                            align="right"
                          >
                            Net Income
                          </Table.Cell>
                        </Table.Row>
                      </Table.Head>
                      <Table.Body>
                        {sortedPropertyData.map((property) => (
                          <Table.Row key={property.propertyId}>
                            <Table.Cell>{property.propertyName}</Table.Cell>
                            <Table.Cell align="right" className={styles.textSuccessDark}>
                              {formatCurrency(property.totalRevenue)}
                            </Table.Cell>
                            <Table.Cell align="right" className={styles.textErrorDark}>
                              {formatCurrency(property.totalExpenses)}
                            </Table.Cell>
                            <Table.Cell
                              align="right"
                              className={`${styles.boldCell} ${property.netIncome >= 0 ? styles.textSuccessDark : styles.textErrorDark}`}
                            >
                              {formatCurrency(property.netIncome)}
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table>
                  </Table.Container>
                )}
              </Card.Content>
            </Card>
          </>
        )}
      </div>
    </Container>
  );
};
