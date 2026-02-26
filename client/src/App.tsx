import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { PropertiesProvider } from './contexts/PropertiesContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './router';
import './styles/global.scss';

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <PropertiesProvider>
            <RouterProvider router={router} />
          </PropertiesProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
