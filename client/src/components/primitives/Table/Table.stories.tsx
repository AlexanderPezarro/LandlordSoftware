import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Table } from './Table';

const meta: Meta<typeof Table> = {
  title: 'Primitives/Table',
  component: Table,
};

export default meta;

type Story = StoryObj<typeof Table>;

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleRows = [
  { id: 1, address: '123 Main St', city: 'Springfield', rent: 1200 },
  { id: 2, address: '456 Oak Ave', city: 'Shelbyville', rent: 950 },
  { id: 3, address: '789 Elm Blvd', city: 'Capital City', rent: 1450 },
  { id: 4, address: '321 Pine Rd', city: 'Ogdenville', rent: 1100 },
  { id: 5, address: '654 Cedar Ln', city: 'North Haverbrook', rent: 875 },
];

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const Basic: Story = {
  render: () => (
    <Table.Container>
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.Cell sortable={false}>Address</Table.Cell>
            <Table.Cell sortable={false}>City</Table.Cell>
            <Table.Cell sortable={false} align="right">
              Rent
            </Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {sampleRows.map((row) => (
            <Table.Row key={row.id}>
              <Table.Cell>{row.address}</Table.Cell>
              <Table.Cell>{row.city}</Table.Cell>
              <Table.Cell align="right">${row.rent}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </Table.Container>
  ),
};

export const Sortable: Story = {
  render: function SortableStory() {
    const [sortKey, setSortKey] = useState<'address' | 'city' | 'rent'>(
      'address',
    );
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    function handleSort(key: 'address' | 'city' | 'rent') {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    }

    const sorted = [...sampleRows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = typeof aVal === 'number' ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return (
      <Table.Container>
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell
                sortable
                sortDirection={sortKey === 'address' ? sortDir : null}
                onSort={() => handleSort('address')}
              >
                Address
              </Table.Cell>
              <Table.Cell
                sortable
                sortDirection={sortKey === 'city' ? sortDir : null}
                onSort={() => handleSort('city')}
              >
                City
              </Table.Cell>
              <Table.Cell
                sortable
                sortDirection={sortKey === 'rent' ? sortDir : null}
                onSort={() => handleSort('rent')}
                align="right"
              >
                Rent
              </Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {sorted.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.address}</Table.Cell>
                <Table.Cell>{row.city}</Table.Cell>
                <Table.Cell align="right">${row.rent}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Table.Container>
    );
  },
};

export const Paginated: Story = {
  render: function PaginatedStory() {
    const allRows = Array.from({ length: 23 }, (_, i) => ({
      id: i + 1,
      address: `${100 + i} Example St`,
      city: `City ${i + 1}`,
      rent: 800 + i * 50,
    }));

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const pageRows = allRows.slice(
      page * rowsPerPage,
      (page + 1) * rowsPerPage,
    );

    return (
      <Table.Container>
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.Cell sortable={false}>Address</Table.Cell>
              <Table.Cell sortable={false}>City</Table.Cell>
              <Table.Cell sortable={false} align="right">
                Rent
              </Table.Cell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {pageRows.map((row) => (
              <Table.Row key={row.id}>
                <Table.Cell>{row.address}</Table.Cell>
                <Table.Cell>{row.city}</Table.Cell>
                <Table.Cell align="right">${row.rent}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <Table.Pagination
          count={allRows.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
        />
      </Table.Container>
    );
  },
};

export const EmptyState: Story = {
  render: () => (
    <Table.Container>
      <Table>
        <Table.Head>
          <Table.Row>
            <Table.Cell sortable={false}>Address</Table.Cell>
            <Table.Cell sortable={false}>City</Table.Cell>
            <Table.Cell sortable={false} align="right">
              Rent
            </Table.Cell>
          </Table.Row>
        </Table.Head>
        <Table.Body>
          <Table.Empty colSpan={3}>
            No properties found. Add your first property to get started.
          </Table.Empty>
        </Table.Body>
      </Table>
    </Table.Container>
  ),
};
