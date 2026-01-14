import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Properties } from './pages/Properties';
import { PropertyDetail } from './pages/PropertyDetail';
import { Tenants } from './pages/Tenants';
import { Leases } from './pages/Leases';
import { Transactions } from './pages/Transactions';
import { Reports } from './pages/Reports';
import { Events } from './pages/Events';
import { Documents } from './pages/Documents';
import { NotFound } from './pages/NotFound';

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
        element: <Dashboard />,
      },
      {
        path: 'properties',
        element: <Properties />,
      },
      {
        path: 'properties/:id',
        element: <PropertyDetail />,
      },
      {
        path: 'tenants',
        element: <Tenants />,
      },
      {
        path: 'leases',
        element: <Leases />,
      },
      {
        path: 'transactions',
        element: <Transactions />,
      },
      {
        path: 'finances/reports',
        element: <Reports />,
      },
      {
        path: 'events',
        element: <Events />,
      },
      {
        path: 'documents',
        element: <Documents />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
