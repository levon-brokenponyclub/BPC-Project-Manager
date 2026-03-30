import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("auth/invite", "routes/auth-invite.tsx"),
  route("inbox", "routes/inbox.tsx"),
  route("activity", "routes/activity.tsx"),
  route("activity/:category", "routes/activity.tsx", {
    id: "routes/activity-category",
  }),
  route("tasks", "routes/tasks.tsx"),
  route("projects", "routes/projects.tsx"),
  route("settings", "routes/settings.tsx"),
  route("sprint-dashboard", "routes/sprint-dashboard.tsx"),
] satisfies RouteConfig
