import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Eagerly load Login page (needed for initial render)
import { Login } from './pages/Login';

// Lazy load all other pages (handling named exports)
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Properties = lazy(() => import('./pages/Properties').then(m => ({ default: m.Properties })));
const PropertyDetail = lazy(() => import('./pages/PropertyDetail').then(m => ({ default: m.PropertyDetail })));
const Tenants = lazy(() => import('./pages/Tenants').then(m => ({ default: m.Tenants })));
const Leases = lazy(() => import('./pages/Leases').then(m => ({ default: m.Leases })));
const Transactions = lazy(() => import('./pages/Transactions').then(m => ({ default: m.Transactions })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Events = lazy(() => import('./pages/Events').then(m => ({ default: m.Events })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Loading fallback component
const PageLoader: React.FC = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="400px"
  >
    <CircularProgress />
  </Box>
);

// Wrapper for lazy-loaded components
const LazyPage: React.FC<{ Component: React.LazyExoticComponent<React.ComponentType<any>> }> = ({ Component }) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// Wrapper component for protected routes with layout
const ProtectedLayout: React.FC = () => {
  return (
    <ProtectedRoute>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <LazyPage Component={Dashboard} />,
      },
      {
        path: 'properties',
        element: <LazyPage Component={Properties} />,
      },
      {
        path: 'properties/:id',
        element: <LazyPage Component={PropertyDetail} />,
      },
      {
        path: 'tenants',
        element: <LazyPage Component={Tenants} />,
      },
      {
        path: 'leases',
        element: <LazyPage Component={Leases} />,
      },
      {
        path: 'transactions',
        element: <LazyPage Component={Transactions} />,
      },
      {
        path: 'finances/reports',
        element: <LazyPage Component={Reports} />,
      },
      {
        path: 'events',
        element: <LazyPage Component={Events} />,
      },
      {
        path: 'documents',
        element: <LazyPage Component={Documents} />,
      },
      {
        path: 'settings',
        element: <LazyPage Component={Settings} />,
      },
    ],
  },
  {
    path: '*',
    element: <LazyPage Component={NotFound} />,
  },
]);
