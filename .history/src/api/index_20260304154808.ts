import { isDemoMode } from "@/lib/supabase";
import type { TaskStatus } from "@/types/models";
import * as demoApi from "@/demo/demoData";

import * as workspacesApi from "@/api/workspaces";
import * as tasksApi from "@/api/tasks";
import * as timeApi from "@/api/time";
import * as notificationsApi from "@/api/notifications";

export const getMyWorkspaces = (...args: Parameters<typeof workspacesApi.getMyWorkspaces>) =>
  isDemoMode ? demoApi.listMyWorkspaces(...args) : workspacesApi.getMyWorkspaces(...args);

export const listTasks = (...args: Parameters<typeof tasksApi.listTasks>) =>
  isDemoMode ? demoApi.listTasks(...args) : tasksApi.listTasks(...args);

export const createTask = (...args: Parameters<typeof tasksApi.createTask>) =>
  isDemoMode ? demoApi.createTask(...args) : tasksApi.createTask(...args);

export const updateTask = (...args: Parameters<typeof tasksApi.updateTask>) =>
  isDemoMode ? demoApi.updateTask(...args) : tasksApi.updateTask(...args);

export const updateTaskStatus = (...args: [taskId: string, status: TaskStatus]) =>
  isDemoMode ? demoApi.updateTaskStatus(...args) : tasksApi.updateTask(args[0], { status: args[1] });

export const listComments = (...args: Parameters<typeof tasksApi.listComments>) =>
  isDemoMode ? demoApi.listComments(...args) : tasksApi.listComments(...args);

export const addComment = (...args: Parameters<typeof tasksApi.addComment>) =>
  isDemoMode ? demoApi.addComment(...args) : tasksApi.addComment(...args);

export const listTaskActivity = (...args: Parameters<typeof tasksApi.listTaskActivity>) =>
  isDemoMode ? demoApi.listTaskActivity(...args) : tasksApi.listTaskActivity(...args);

export const logTaskActivity = (...args: Parameters<typeof tasksApi.logTaskActivity>) =>
  isDemoMode ? demoApi.logTaskActivity(...args) : tasksApi.logTaskActivity(...args);

export const getRunningTimer = (...args: Parameters<typeof timeApi.getRunningTimer>) =>
  isDemoMode ? demoApi.getRunningTimer(...args) : timeApi.getRunningTimer(...args);

export const listTimeEntries = (...args: Parameters<typeof timeApi.listTimeEntries>) =>
  isDemoMode ? demoApi.listTimeEntries(...args) : timeApi.listTimeEntries(...args);

export const startTaskTimer = (...args: Parameters<typeof timeApi.startTaskTimer>) =>
  isDemoMode ? demoApi.startTaskTimer(...args) : timeApi.startTaskTimer(...args);

export const stopTaskTimer = (...args: Parameters<typeof timeApi.stopTaskTimer>) =>
  isDemoMode ? demoApi.stopTaskTimer(...args) : timeApi.stopTaskTimer(...args);

export const getWorkspaceSupportSummary = (...args: Parameters<typeof timeApi.getWorkspaceSupportSummary>) =>
  isDemoMode ? demoApi.getWorkspaceSupportSummary(...args) : timeApi.getWorkspaceSupportSummary(...args);

export const getSupportSummary = (...args: [workspaceId: string]) =>
  isDemoMode ? demoApi.getSupportSummary(...args) : timeApi.getWorkspaceSupportSummary(...args);

export const getHoursBreakdown = (...args: Parameters<typeof timeApi.getHoursBreakdown>) =>
  isDemoMode ? demoApi.getHoursBreakdown(...args) : timeApi.getHoursBreakdown(...args);

export const listSupportBuckets = (...args: [workspaceId: string]) =>
  isDemoMode ? demoApi.listSupportBuckets(...args) : timeApi.listSupportBuckets(...args);

export const listNotifications = (...args: Parameters<typeof notificationsApi.listNotifications>) =>
  isDemoMode ? demoApi.listNotifications(...args) : notificationsApi.listNotifications(...args);

export const countUnread = (...args: [workspaceId: string]) =>
  isDemoMode ? demoApi.countUnread(...args) : notificationsApi.getUnreadNotificationCount(...args);

export const getUnreadNotificationCount = (...args: Parameters<typeof notificationsApi.getUnreadNotificationCount>) =>
  isDemoMode ? demoApi.getUnreadNotificationCount(...args) : notificationsApi.getUnreadNotificationCount(...args);

export const markAsRead = (...args: [notificationId: string]) =>
  isDemoMode ? demoApi.markAsRead(...args) : notificationsApi.markNotificationRead(...args);

export const markNotificationRead = (...args: Parameters<typeof notificationsApi.markNotificationRead>) =>
  isDemoMode ? demoApi.markNotificationRead(...args) : notificationsApi.markNotificationRead(...args);

export const notifyWorkspaceEvent = (...args: Parameters<typeof notificationsApi.notifyWorkspaceEvent>) =>
  isDemoMode ? demoApi.notifyWorkspaceEvent(...args) : notificationsApi.notifyWorkspaceEvent(...args);