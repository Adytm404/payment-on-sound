import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App";
import { AppProvider } from "./store/AppContext";
import { AuthProvider } from "./store/AuthContext";
import { AdminRoute, MerchantRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { ToastHost } from "./components/Toast";

import DashboardPage from "./pages/DashboardPage";
import CreatePaymentPage from "./pages/CreatePaymentPage";
import QRPaymentPage from "./pages/QRPaymentPage";
import ReportPage from "./pages/ReportPage";
import SettingsPage from "./pages/SettingsPage";
import PlanManagementPage from "./pages/PlanManagementPage";
import WithdrawalPage from "./pages/WithdrawalPage";
import NotFoundPage from "./pages/NotFoundPage";
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import PublicPaymentPage from "./pages/PublicPaymentPage";
import AdminApp from "./pages/admin/AdminApp";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminUserDetailPage from "./pages/admin/AdminUserDetailPage";
import AdminTransactionsPage from "./pages/admin/AdminTransactionsPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminPlansPage from "./pages/admin/AdminPlansPage";
import AdminPromosPage from "./pages/admin/AdminPromosPage";
import AdminPlatformSettingsPage from "./pages/admin/AdminPlatformSettingsPage";
import AdminMerchantsPage from "./pages/admin/AdminMerchantsPage";
import AdminMerchantDetailPage from "./pages/admin/AdminMerchantDetailPage";
import AdminWithdrawalsPage from "./pages/admin/AdminWithdrawalsPage";
import AdminWithdrawalDetailPage from "./pages/admin/AdminWithdrawalDetailPage";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="p/:orderId" element={<PublicPaymentPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="login" element={<AuthPage mode="login" />} />
            <Route path="register" element={<AuthPage mode="register" />} />
          </Route>
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminApp />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="merchants" element={<AdminMerchantsPage />} />
              <Route path="merchants/:userId" element={<AdminMerchantDetailPage />} />
              <Route path="plans" element={<AdminPlansPage />} />
              <Route path="promos" element={<AdminPromosPage />} />
              <Route path="settings" element={<AdminPlatformSettingsPage />} />
              <Route path="users/:userId" element={<AdminUserDetailPage />} />
              <Route path="transactions" element={<AdminTransactionsPage />} />
              <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
              <Route path="withdrawals/:requestId" element={<AdminWithdrawalDetailPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>
          </Route>
          <Route element={<MerchantRoute />}>
            <Route
              element={
                <AppProvider>
                  <App />
                </AppProvider>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="transaksi/baru" element={<CreatePaymentPage />} />
              <Route path="transaksi/:orderId" element={<QRPaymentPage />} />
              <Route path="laporan" element={<ReportPage />} />
              <Route path="penarikan" element={<WithdrawalPage />} />
              <Route path="pengaturan" element={<SettingsPage />} />
              <Route path="pengaturan/plan" element={<PlanManagementPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
        <ToastHost />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
