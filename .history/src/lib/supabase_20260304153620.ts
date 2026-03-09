import { createClient, type SupabaseClient } from "@supabase/supabase-js";






















































































  isDemoMode ? demoApi.notifyWorkspaceEvent(...args) : notificationsApi.notifyWorkspaceEvent(...args);export const notifyWorkspaceEvent = (...args: Parameters<typeof notificationsApi.notifyWorkspaceEvent>) =>  isDemoMode ? demoApi.markNotificationRead(...args) : notificationsApi.markNotificationRead(...args);export const markNotificationRead = (...args: Parameters<typeof notificationsApi.markNotificationRead>) =>  isDemoMode ? demoApi.markAsRead(...args) : notificationsApi.markNotificationRead(...args);export const markAsRead = (...args: [notificationId: string]) =>    : notificationsApi.getUnreadNotificationCount(...args);    ? demoApi.getUnreadNotificationCount(...args)  isDemoModeexport const getUnreadNotificationCount = (...args: Parameters<typeof notificationsApi.getUnreadNotificationCount>) =>  isDemoMode ? demoApi.countUnread(...args) : notificationsApi.getUnreadNotificationCount(...args);export const countUnread = (...args: [workspaceId: string]) =>  isDemoMode ? demoApi.listNotifications(...args) : notificationsApi.listNotifications(...args);export const listNotifications = (...args: Parameters<typeof notificationsApi.listNotifications>) =>  isDemoMode ? demoApi.listSupportBuckets(...args) : timeApi.listSupportBuckets(...args);export const listSupportBuckets = (...args: [workspaceId: string]) =>  isDemoMode ? demoApi.getHoursBreakdown(...args) : timeApi.getHoursBreakdown(...args);export const getHoursBreakdown = (...args: Parameters<typeof timeApi.getHoursBreakdown>) =>  isDemoMode ? demoApi.getSupportSummary(...args) : timeApi.getWorkspaceSupportSummary(...args);export const getSupportSummary = (...args: [workspaceId: string]) =>    : timeApi.getWorkspaceSupportSummary(...args);    ? demoApi.getWorkspaceSupportSummary(...args)  isDemoModeexport const getWorkspaceSupportSummary = (...args: Parameters<typeof timeApi.getWorkspaceSupportSummary>) =>  isDemoMode ? demoApi.stopTimer(...args) : timeApi.stopTaskTimer(...args);export const stopTimer = (...args: [workspaceId: string, taskId: string]) =>  isDemoMode ? demoApi.startTimer(...args) : timeApi.startTaskTimer(...args);export const startTimer = (...args: [workspaceId: string, taskId: string]) =>  isDemoMode ? demoApi.stopTaskTimer(...args) : timeApi.stopTaskTimer(...args);export const stopTaskTimer = (...args: Parameters<typeof timeApi.stopTaskTimer>) =>  isDemoMode ? demoApi.startTaskTimer(...args) : timeApi.startTaskTimer(...args);export const startTaskTimer = (...args: Parameters<typeof timeApi.startTaskTimer>) =>  isDemoMode ? demoApi.listTimeEntries(...args) : timeApi.listTimeEntries(...args);export const listTimeEntries = (...args: Parameters<typeof timeApi.listTimeEntries>) =>  isDemoMode ? demoApi.getRunningTimer(...args) : timeApi.getRunningTimer(...args);export const getRunningTimer = (...args: Parameters<typeof timeApi.getRunningTimer>) =>  isDemoMode ? demoApi.logTaskActivity(...args) : tasksApi.logTaskActivity(...args);export const logTaskActivity = (...args: Parameters<typeof tasksApi.logTaskActivity>) =>  isDemoMode ? demoApi.listTaskActivity(...args) : tasksApi.listTaskActivity(...args);export const listTaskActivity = (...args: Parameters<typeof tasksApi.listTaskActivity>) =>  isDemoMode ? demoApi.addComment(...args) : tasksApi.addComment(...args);export const addComment = (...args: Parameters<typeof tasksApi.addComment>) =>  isDemoMode ? demoApi.listComments(...args) : tasksApi.listComments(...args);export const listComments = (...args: Parameters<typeof tasksApi.listComments>) =>  isDemoMode ? demoApi.updateTaskStatus(...args) : tasksApi.updateTask(args[0], { status: args[1] });export const updateTaskStatus = (...args: [taskId: string, status: import("@/types/models").TaskStatus]) =>  isDemoMode ? demoApi.updateTask(...args) : tasksApi.updateTask(...args);export const updateTask = (...args: Parameters<typeof tasksApi.updateTask>) =>  isDemoMode ? demoApi.createTask(...args) : tasksApi.createTask(...args);export const createTask = (...args: Parameters<typeof tasksApi.createTask>) =>  isDemoMode ? demoApi.listTasks(...args) : tasksApi.listTasks(...args);export const listTasks = (...args: Parameters<typeof tasksApi.listTasks>) =>  isDemoMode ? demoApi.listMyWorkspaces(...args) : workspacesApi.getMyWorkspaces(...args);export const getMyWorkspaces = (...args: Parameters<typeof workspacesApi.getMyWorkspaces>) =>import * as notificationsApi from "@/api/notifications";import * as timeApi from "@/api/time";import * as tasksApi from "@/api/tasks";import * as workspacesApi from "@/api/workspaces";const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isDevBypassEnabled =
  import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

export const isDemoMode = isDevBypassEnabled || !isSupabaseConfigured;

if (!isSupabaseConfigured) {
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to .env.local to enable auth/data.",
  );
}

function createUnavailableClient(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(
        "Supabase is not configured for live calls. Enable Supabase env vars or use demo mode API.",
      );
    },
  });
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : createUnavailableClient();
