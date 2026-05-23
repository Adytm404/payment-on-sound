import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import App from "./App";
import { AppProvider } from "./store/AppContext";
import { AuthProvider } from "./store/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/ProtectedRoute";
import { ToastHost } from "./components/Toast";

import DashboardPage from "./pages/DashboardPage";
import CreatePaymentPage from "./pages/CreatePaymentPage";
import QRPaymentPage from "./pages/QRPaymentPage";
import ReportPage from "./pages/ReportPage";
import SettingsPage from "./pages/SettingsPage";
import NotFoundPage from "./pages/NotFoundPage";
import AuthPage from "./pages/AuthPage";
import PublicPaymentPage from "./pages/PublicPaymentPage";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="p/:orderId" element={<PublicPaymentPage />} />
          <Route element={<PublicOnlyRoute />}>
            <Route path="login" element={<AuthPage mode="login" />} />
            <Route path="register" element={<AuthPage mode="register" />} />
          </Route>
          <Route element={<ProtectedRoute />}>
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
              <Route path="pengaturan" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
        <ToastHost />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
