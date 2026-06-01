import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/custom/ProtectedRoute";
import { Chat } from "@/pages/chat/chat";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import './App.css'   //check

// This layout renders ProtectedRoute ONCE.
// "/" and "/chat/:chatId" are children — React keeps the same
// component tree mounted across both routes.
// Result: Header, Sidebar and all Chat state NEVER unmount during navigation.
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login"  element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            <Route element={<ProtectedLayout />}>
              <Route path="/"             element={<Chat />} />
              <Route path="/chat/:chatId" element={<Chat />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
