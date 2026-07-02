import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { Layout } from "./components/Layout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { Auth } from "./pages/Auth";
import { Dashboard } from "./pages/Dashboard";
import { Timetable } from "./pages/Timetable";
import { Notes } from "./pages/Notes";
import { AIPlanner } from "./pages/AIPlanner";
import { Friends } from "./pages/Friends";
import { Invitation } from "./pages/Invitation";

import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { Loader2 } from "lucide-react";

function ProtectedLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

/** Root layout that wraps the entire app with AuthProvider */
function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      {
        path: "/login",
        Component: Auth,
      },
      {
        path: "/invite/:token",
        Component: Invitation,
      },
      {
        path: "/",
        Component: ProtectedLayout,
        children: [
          { index: true, Component: Dashboard },
          { path: "timetable", Component: Timetable },
          { path: "notes", Component: Notes },
          { path: "ai-planner", Component: AIPlanner },
          { path: "friends", Component: Friends },
          { path: "profile", Component: Profile },
          { path: "settings", Component: Settings },
        ],
      },
    ],
  },
]);
