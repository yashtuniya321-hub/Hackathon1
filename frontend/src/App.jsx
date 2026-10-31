import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { FinanceDashboard } from './pages/dashboard/FinanceDashboard';
import { SubscriptionsList } from './pages/subscriptions/SubscriptionsList';
import { QuotationTemplates } from './pages/subscriptions/QuotationTemplates';
import { BillingEngine } from './pages/billing/BillingEngine';
import { InvoicesList } from './pages/billing/InvoicesList';
import { PaymentsManagement } from './pages/payments/PaymentsManagement';
import { CatalogManagement } from './pages/catalog/CatalogManagement';
import { DiscountsManagement } from './pages/discounts/DiscountsManagement';
import { StaffManagement } from './pages/staff/StaffManagement';
import { CustomerPortal } from './pages/portal/CustomerPortal';
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';

export const App = () => {
  return (
    <Routes>
      {/* Auth Public Routes */}
      <Route path="/auth/login" element={<Login />} />
      <Route path="/auth/signup" element={<Signup />} />
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />

      {/* Main ERP Layout Routes */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/analytics" replace />} />
        <Route path="analytics" element={<FinanceDashboard />} />
        <Route path="subscriptions" element={<SubscriptionsList />} />
        <Route path="templates" element={<QuotationTemplates />} />
        <Route path="billing" element={<BillingEngine />} />
        <Route path="invoices" element={<InvoicesList />} />
        <Route path="payments" element={<PaymentsManagement />} />
        <Route path="catalog" element={<CatalogManagement />} />
        <Route path="discounts" element={<DiscountsManagement />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="portal" element={<CustomerPortal />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/analytics" replace />} />
    </Routes>
  );
};

export default App;
