// import './App.css'
// import { Chat } from './pages/chat/chat'
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import { ThemeProvider } from './context/ThemeContext'

// function App() {
//   return (
//     <ThemeProvider>
//       <Router>
//         <div className="w-full h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
//           <Routes>
//             <Route path="/" element={<Chat />} />
//           </Routes>
//         </div>
//       </Router>
//     </ThemeProvider>
//   )
// }

// export default App;

/**
 * App.tsx
 * src/App.tsx
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/custom/ProtectedRoute";
import { Chat } from "@/pages/chat/chat";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login"  element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected routes — redirect to /login if not authenticated */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
