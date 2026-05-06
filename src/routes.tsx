import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { AdminLogin } from './admin/AdminLogin';
import { AdminLayout, AdminHome } from './admin/AdminLayout';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { BuildersList } from './admin/builders/BuildersList';
import { BuilderForm } from './admin/builders/BuilderForm';
import { PropertiesList } from './admin/properties/PropertiesList';
import { PropertyForm } from './admin/properties/PropertyForm';
import { ProfilePage } from './pages/ProfilePage';

export const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/admin/login', element: <AdminLogin /> },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminHome /> },
      { path: 'builders', element: <BuildersList /> },
      { path: 'builders/new', element: <BuilderForm /> },
      { path: 'builders/:id', element: <BuilderForm /> },
      { path: 'properties', element: <PropertiesList /> },
      { path: 'properties/new', element: <PropertyForm /> },
      { path: 'properties/:id', element: <PropertyForm /> },
    ],
  },
]);
