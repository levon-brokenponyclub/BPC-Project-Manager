import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";

import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { WorkspaceSelectPage } from "@/pages/WorkspaceSelectPage";
import { DashboardPage } from "@/pages/workspace/DashboardPage";
import { ReportsPage } from "@/pages/workspace/ReportsPage";
import { SettingsPage } from "@/pages/workspace/SettingsPage";
import { TasksPage } from "@/pages/workspace/TasksPage";
import { TimePage } from "@/pages/workspace/TimePage";
import { AuthInvitePage } from "@/pages/AuthInvitePage";

const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/auth/invite",
    element: <AuthInvitePage />,
  },
  {
    path: "/workspaces",
    element: (
      <RequireAuth>
        <WorkspaceSelectPage />
      </RequireAuth>
    ),
  },
  {
    path: "/w/:workspaceId",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "time", element: <TimePage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "settings", element: <SettingsPage /> },
      { index: true, element: <Navigate to="dashboard" replace /> },
    ],
  },
  {
    path: "/",
    element: <Navigate to="/workspaces" replace />,
  },
  {
    path: "*",
    element: <Navigate to="/workspaces" replace />,
  },
]);

export default function App(): React.ReactElement {
  return <RouterProvider router={router} />;
}
