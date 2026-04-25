"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Label as PieLabel, Pie, PieChart, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Bell,
  BookOpen,
  Bookmark,
  Brush,
  Camera,
  ChevronDown,
  Cloud,
  Code,
  Crown,
  Download,
  FileText,
  Grid,
  Heart,
  Home,
  ImageIcon,
  Layers,
  LayoutGrid,
  Lightbulb,
  Menu,
  MessageSquare,
  Palette,
  PanelLeft,
  Play,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Trash,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  Video,
  Wand2,
  Circle,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Archive,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Type,
  CuboidIcon,
  X,
  LogOut,
} from "lucide-react";

import {
  RichTextEditor,
  type AttachedFile,
} from "@/components/rich-text-editor";
import {
  supabase,
  fetchProjects,
  createProject,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  fetchTasks,
  fetchProjectFiles,
  createProjectFile,
  deleteProjectFile,
  createTask,
  createTaskFile,
  updateTask as dbUpdateTask,
  deleteTask as dbDeleteTask,
  deleteTaskFile as dbDeleteTaskFile,
  fetchTaskActivity,
  createTaskActivity,
  uploadTaskAsset,
  fetchProfile,
  uploadAvatar,
  updateProfileAvatar,
} from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Sample data for apps
const apps = [
  {
    name: "PixelMaster",
    icon: <ImageIcon className="text-violet-500" />,
    description: "Advanced image editing and composition",
    category: "Creative",
    recent: true,
    new: false,
    progress: 100,
  },
  {
    name: "VectorPro",
    icon: <Brush className="text-orange-500" />,
    description: "Professional vector graphics creation",
    category: "Creative",
    recent: true,
    new: false,
    progress: 100,
  },
  {
    name: "VideoStudio",
    icon: <Video className="text-pink-500" />,
    description: "Cinematic video editing and production",
    category: "Video",
    recent: true,
    new: false,
    progress: 100,
  },
  {
    name: "MotionFX",
    icon: <Sparkles className="text-blue-500" />,
    description: "Stunning visual effects and animations",
    category: "Video",
    recent: false,
    new: false,
    progress: 100,
  },
  {
    name: "PageCraft",
    icon: <Layers className="text-red-500" />,
    description: "Professional page design and layout",
    category: "Creative",
    recent: false,
    new: false,
    progress: 100,
  },
  {
    name: "UXFlow",
    icon: <LayoutGrid className="text-fuchsia-500" />,
    description: "Intuitive user experience design",
    category: "Design",
    recent: false,
    new: true,
    progress: 85,
  },
  {
    name: "PhotoLab",
    icon: <Camera className="text-teal-500" />,
    description: "Advanced photo editing and organization",
    category: "Photography",
    recent: false,
    new: false,
    progress: 100,
  },
  {
    name: "DocMaster",
    icon: <FileText className="text-red-600" />,
    description: "Document editing and management",
    category: "Document",
    recent: false,
    new: false,
    progress: 100,
  },
  {
    name: "WebCanvas",
    icon: <Code className="text-emerald-500" />,
    description: "Web design and development",
    category: "Web",
    recent: false,
    new: true,
    progress: 70,
  },
  {
    name: "3DStudio",
    icon: <CuboidIcon className="text-indigo-500" />,
    description: "3D modeling and rendering",
    category: "3D",
    recent: false,
    new: true,
    progress: 60,
  },
  {
    name: "FontForge",
    icon: <Type className="text-amber-500" />,
    description: "Typography and font creation",
    category: "Typography",
    recent: false,
    new: false,
    progress: 100,
  },
  {
    name: "ColorPalette",
    icon: <Palette className="text-purple-500" />,
    description: "Color scheme creation and management",
    category: "Design",
    recent: false,
    new: false,
    progress: 100,
  },
];

// Sample data for recent files
const recentFiles = [
  {
    name: "Brand Redesign.pxm",
    app: "PixelMaster",
    modified: "2 hours ago",
    icon: <ImageIcon className="text-violet-500" />,
    shared: true,
    recent: true,
    size: "24.5 MB",
    collaborators: 3,
  },
  {
    name: "Company Logo.vec",
    app: "VectorPro",
    modified: "Yesterday",
    icon: <Brush className="text-orange-500" />,
    shared: true,
    recent: true,
    size: "8.2 MB",
    collaborators: 2,
  },
  {
    name: "Product Launch Video.vid",
    app: "VideoStudio",
    modified: "3 days ago",
    icon: <Video className="text-pink-500" />,
    shared: false,
    recent: false,
    size: "1.2 GB",
    collaborators: 0,
  },
  {
    name: "UI Animation.mfx",
    app: "MotionFX",
    modified: "Last week",
    icon: <Sparkles className="text-blue-500" />,
    shared: true,
    recent: false,
    size: "345 MB",
    collaborators: 4,
  },
  {
    name: "Magazine Layout.pgc",
    app: "PageCraft",
    modified: "2 weeks ago",
    icon: <Layers className="text-red-500" />,
    shared: false,
    recent: false,
    size: "42.8 MB",
    collaborators: 0,
  },
  {
    name: "Mobile App Design.uxf",
    app: "UXFlow",
    modified: "3 weeks ago",
    icon: <LayoutGrid className="text-fuchsia-500" />,
    shared: true,
    recent: false,
    size: "18.3 MB",
    collaborators: 5,
  },
  {
    name: "Product Photography.phl",
    app: "PhotoLab",
    modified: "Last month",
    icon: <Camera className="text-teal-500" />,
    shared: false,
    recent: false,
    size: "156 MB",
    collaborators: 0,
  },
];

type ProjectTask = {
  id?: string;
  name: string;
  description?: string;
  status: "Awaiting Client" | "Complete" | "In Progress" | "In Review" | "Todo";
  dateAdded: string;
  dueDate: string;
  priority: "Urgent" | "High" | "Medium" | "Normal" | "-";
  files?: ProjectFile[];
};

type ProjectTaskGroup = {
  status: ProjectTask["status"];
  count: number;
  tasks: ProjectTask[];
};

type ProjectFile = {
  id?: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  url?: string;
};

type DisplayFile = ProjectFile & {
  projectName: string;
  projectRef: Project;
  taskName: string | null;
  taskRef: ProjectTask | null;
};

type Project = {
  id?: string;
  workspace_id?: string;
  name: string;
  description: string;
  progress: number;
  dueDate: string;
  members: number;
  files: number;
  tasks: ProjectTask[];
  uploadedFiles: ProjectFile[];
};

const projectTaskGroups: ProjectTaskGroup[] = [
  {
    status: "Awaiting Client",
    count: 1,
    tasks: [
      {
        name: "Awaiting Client",
        status: "Awaiting Client",
        dateAdded: "-",
        dueDate: "-",
        priority: "-",
      },
    ],
  },
  {
    status: "Complete",
    count: 8,
    tasks: [
      {
        name: "Complete",
        status: "Complete",
        dateAdded: "-",
        dueDate: "-",
        priority: "-",
      },
      {
        name: "IHS & SAE Ambassador Landing Pages Copy Updates",
        status: "Complete",
        dateAdded: "05 Mar 2026",
        dueDate: "05 Mar 2026",
        priority: "Urgent",
        description: "Apply urgent copy updates to ambassador landing pages.",
      },
      {
        name: "IHS & SAE Online Virtual Session Dates Remove",
        status: "Complete",
        dateAdded: "09 Mar 2026",
        dueDate: "11 Mar 2026",
        priority: "Medium",
        description: "Please remove the following dates from the following pages:\n\nIHS (remove 22 January 2026 & 19 February 2026):\nhttps://hotelschool.co.za/ihs/onlinelearning-virtual-open-evenings/\n\nAdd 16 April 2026 to this form: https://www.hotelschool.co.za/virtual-info-sessions/\n\nSAE (remove 20 January 2026 & 17 February 2026):\nhttps://sae.edu.za/onlinelearning-virtual-open-days/\n\nhttps://www.sae.edu.za/virtual-info-sessions/",
      },
      {
        name: "IHS - Statutory Compliance/Policies Page",
        status: "Complete",
        dateAdded: "10 Mar 2026",
        dueDate: "11 Mar 2026",
        priority: "Urgent",
        description: "Brief and docs attached. Urgent.",
      },
      {
        name: "SAE - Hide Pages",
        status: "Complete",
        dateAdded: "05 Mar 2026",
        dueDate: "09 Mar 2026",
        priority: "Medium",
        description: "Hide specified SAE pages from navigation/search.",
      },
      {
        name: "SAE Online Postgraduate SAQA Number Update",
        status: "Complete",
        dateAdded: "18 Mar 2026",
        dueDate: "19 Mar 2026",
        priority: "High",
        description: "Please can we update the information in brackets for \"Qualification\" to: (SAQA ID No: 125179, NQF Level 8)",
      },
      {
        name: "SAE PT HC Durations to Years",
        status: "Complete",
        dateAdded: "06 Mar 2026",
        dueDate: "09 Mar 2026",
        priority: "Medium",
        description: "Please can we update the SAE Part-Time Higher Certificate Durations to: 1.5 Years",
      },
      {
        name: "SAE Sticky Menu - Do Not Cover Bottom of Site",
        status: "Complete",
        dateAdded: "10 Mar 2026",
        dueDate: "11 Mar 2026",
        priority: "High",
        description: "Hi Levon, please can we fix the sticky menu - it is covering the bottom footer of the website, it shouldn't.",
      },
      {
        name: "Update IHS & SAE Ambassador Landing Page Headers",
        status: "Complete",
        dateAdded: "10 Mar 2026",
        dueDate: "10 Mar 2026",
        priority: "Urgent",
        description: "Hi Levon, please can we update the landing page header images for both brands with the attached. Thank you.\n\nhttps://www.hotelschool.co.za/ihs/ambassador-programme/\nhttps://www.sae.edu.za/ambassador-programme/",
      },
    ],
  },
  {
    status: "In Progress",
    count: 11,
    tasks: [
      {
        name: "In Progress",
        status: "In Progress",
        dateAdded: "-",
        dueDate: "-",
        priority: "-",
      },
      {
        name: "Beyond Grad IHS Alumni Spotlight - Kuhle Ongezwa Cweti",
        status: "In Progress",
        dateAdded: "05 Mar 2026",
        dueDate: "09 Mar 2026",
        priority: "Medium",
        description: "Publish alumni spotlight content for Kuhle Ongezwa Cweti.",
      },
      {
        name: "Carepoint Forms - Add Anonymous Option",
        status: "In Progress",
        dateAdded: "05 Mar 2026",
        dueDate: "09 Mar 2026",
        priority: "Medium",
        description: "Add anonymous submission option to Carepoint forms.",
      },
      {
        name: "IHS & SAE Campus Tour Videos",
        status: "In Progress",
        dateAdded: "05 Mar 2026",
        dueDate: "09 Mar 2026",
        priority: "Medium",
        description: "Publish/update campus tour video placements.",
      },
      {
        name: "IHS Alumni Spotlight - Kenny Chivandire",
        status: "In Progress",
        dateAdded: "10 Mar 2026",
        dueDate: "12 Mar 2026",
        priority: "Medium",
        description: "",
      },
      {
        name: "IHS Fees Schedule - Update",
        status: "In Progress",
        dateAdded: "05 Mar 2026",
        dueDate: "09 Mar 2026",
        priority: "Medium",
        description: "Update IHS fees schedule details and links.",
      },
      {
        name: "IHS Open Day Walk-Ins Landing Page",
        status: "In Progress",
        dateAdded: "09 Mar 2026",
        dueDate: "10 Mar 2026",
        priority: "High",
        description: "",
      },
      {
        name: "IHS Website Registration Footer",
        status: "In Progress",
        dateAdded: "05 Mar 2026",
        dueDate: "10 Mar 2026",
        priority: "Medium",
        description: "Update footer content and registration links.",
      },
      {
        name: "SAE Footers - Thank You Pages",
        status: "In Progress",
        dateAdded: "05 Mar 2026",
        dueDate: "09 Mar 2026",
        priority: "Medium",
        description: "Standardize footer block on SAE thank-you pages.",
      },
      {
        name: "SAE Part-Time Courses Updates",
        status: "In Progress",
        dateAdded: "05 Mar 2026",
        dueDate: "09 Mar 2026",
        priority: "Medium",
        description: "Update SAE part-time course details and content.",
      },
      {
        name: "SAE Privacy Policy Remove in Footer",
        status: "In Progress",
        dateAdded: "24 Mar 2026",
        dueDate: "25 Mar 2026",
        priority: "High",
        description: "Hi Levon, please can we remove the \"Privacy Policy\" from the website footer as this info now falls within the \"Statutory Compliance/Policies\" info.\nThank you.",
      },
      {
        name: "SAE Student Feature - Page Not Found",
        status: "In Progress",
        dateAdded: "10 Mar 2026",
        dueDate: "12 Mar 2026",
        priority: "Medium",
        description: "Hi Levon, when I click on \"Student Feature\" from the \"News, Insights & Media\" drop down, it is coming up with \"Page Not Found\". Please correct.\nThank you.",
      },
    ],
  },
  {
    status: "In Review",
    count: 1,
    tasks: [
      {
        name: "In Review",
        status: "In Review",
        dateAdded: "-",
        dueDate: "-",
        priority: "-",
      },
    ],
  },
  {
    status: "Todo",
    count: 6,
    tasks: [
      {
        name: "Todo",
        status: "Todo",
        dateAdded: "-",
        dueDate: "-",
        priority: "-",
      },
      {
        name: "IHS & SAE Open Day Date Removals",
        status: "Todo",
        dateAdded: "16 Mar 2026",
        dueDate: "17 Mar 2026",
        priority: "Medium",
        description: "Please can we remove the date \"14 March 2026\" from the following pages:\nhttps://hotelschool.co.za/ihs/open-days/\nhttps://www.hotelschool.co.za/open-day/\nhttps://sae.edu.za/campus-open-days/\nhttps://www.sae.edu.za/campus-open-days-bookings/",
      },
      {
        name: "IHS Alumni - Maxine Vice",
        status: "Todo",
        dateAdded: "02 Apr 2026",
        dueDate: "08 Apr 2026",
        priority: "Normal",
        description: "Hi Levon,\n\nPlease can we add a new Alumni feature to both pages:\n\nhttps://www.beyondgrad.co.za/category/alumni-spotlight/\n\nhttps://www.hotelschool.co.za/latest-news/alumni-spotlight/\n\nThank you.",
      },
      {
        name: "IHS Higher Certificate in Culinary Skills and Patisserie Programmes Updates",
        status: "Todo",
        dateAdded: "05 Mar 2026",
        dueDate: "09 Mar 2026",
        priority: "Medium",
        description: "Update programme details/content for Culinary Skills and Patisserie.",
      },
      {
        name: "SAE Online Postgrad Tech Info Sheet",
        status: "Todo",
        dateAdded: "05 Mar 2026",
        dueDate: "09 Mar 2026",
        priority: "Medium",
        description: "Update online postgrad tech info sheet content.",
      },
      {
        name: "SAE Open Day Walk-Ins Landing Page",
        status: "Todo",
        dateAdded: "09 Mar 2026",
        dueDate: "10 Mar 2026",
        priority: "High",
        description: "",
      },
      {
        name: "SAE Part-Time Courses Downloads",
        status: "Todo",
        dateAdded: "07 Apr 2026",
        dueDate: "09 Apr 2026",
        priority: "High",
        description: "Please can we update all the Part-Time Courses' info sheets on the Downloads page (https://www.sae.edu.za/downloads/).",
      },
    ],
  },
];

const allDemoTasks: ProjectTask[] = projectTaskGroups.flatMap((g) =>
  g.tasks.filter((t) => t.name !== (t.status as string)),
);

// Sample data for projects
const projects = [
  {
    name: "Website Redesign",
    description: "Complete overhaul of company website",
    progress: 75,
    dueDate: "June 15, 2025",
    members: 4,
    files: 23,
    tasks: allDemoTasks,
    uploadedFiles: [] as ProjectFile[],
  },
  {
    name: "Mobile App Launch",
    description: "Design and assets for new mobile application",
    progress: 60,
    dueDate: "July 30, 2025",
    members: 6,
    files: 42,
    tasks: [] as ProjectTask[],
    uploadedFiles: [] as ProjectFile[],
  },
  {
    name: "Brand Identity",
    description: "New brand guidelines and assets",
    progress: 90,
    dueDate: "May 25, 2025",
    members: 3,
    files: 18,
    tasks: [] as ProjectTask[],
    uploadedFiles: [] as ProjectFile[],
  },
  {
    name: "Marketing Campaign",
    description: "Summer promotion materials",
    progress: 40,
    dueDate: "August 10, 2025",
    members: 5,
    files: 31,
    tasks: [] as ProjectTask[],
    uploadedFiles: [] as ProjectFile[],
  },
];

const statusDotClass: Record<ProjectTask["status"], string> = {
  "Awaiting Client": "bg-amber-500",
  Complete: "bg-emerald-500",
  "In Progress": "bg-blue-500",
  "In Review": "bg-yellow-500",
  Todo: "bg-zinc-500",
};

const projectStatusClass: Record<
  "Todo" | "Awaiting Client" | "In Progress" | "In Review" | "Completed",
  string
> = {
  "Awaiting Client": "bg-amber-500/15 text-amber-700 border-amber-500/20",
  Completed: "bg-emerald-500/15 text-emerald-700 border-emerald-500/20",
  "In Progress": "bg-blue-500/15 text-blue-700 border-blue-500/20",
  "In Review": "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
  Todo: "bg-zinc-500/15 text-zinc-700 border-zinc-500/20",
};

const priorityClass: Record<Exclude<ProjectTask["priority"], "-">, string> = {
  Urgent: "bg-red-500/15 text-red-700 border-red-500/20",
  High: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  Medium: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  Normal: "bg-zinc-500/15 text-zinc-700 border-zinc-500/20",
};

const taskStatusOptions: ProjectTask["status"][] = [
  "Todo",
  "In Progress",
  "In Review",
  "Awaiting Client",
  "Complete",
];

const taskPriorityOptions: Exclude<ProjectTask["priority"], "-">[] = [
  "Urgent",
  "High",
  "Medium",
  "Normal",
];

function ProjectDetailPanel({
  project,
  tasks,
  uploadedFiles,
  onFilesChange,
  onProjectUpdate,
  onTaskUpdate,
  onTaskDelete,
  onTaskAdd,
  onProjectDelete,
  onBack,
  actorName = "Admin",
  defaultOpenEditTaskId,
  onClearDefaultEditTask,
}: {
  project: Project;
  tasks: ProjectTask[];
  uploadedFiles: ProjectFile[];
  onFilesChange: (files: ProjectFile[]) => void;
  onProjectUpdate: (updated: Project) => void;
  onTaskUpdate: (updated: ProjectTask, index: number) => void;
  onTaskDelete: (index: number) => void;
  onTaskAdd: (task: ProjectTask) => void;
  onProjectDelete: () => void;
  onBack: () => void;
  actorName?: string;
  defaultOpenEditTaskId?: string | null;
  onClearDefaultEditTask?: () => void;
}) {
  const [showCompletedWs, setShowCompletedWs] = useState(false);

  // Derived progress from tasks
  const derivedProgress =
    tasks.length === 0
      ? project.progress
      : Math.round(
          (tasks.filter((t) => t.status === "Complete").length / tasks.length) *
            100,
        );

  const completionEstimate = Math.max(
    1,
    Math.min(12, Math.round((100 - derivedProgress) / 10)),
  );
  const taskGroups = taskStatusOptions
    .filter((status) => status !== "Complete" || showCompletedWs)
    .map((status) => ({
      status,
      tasks: tasks.filter((t) => t.status === status),
    }))
    .filter((g) => g.tasks.length > 0);
  const taskFileCount = tasks.reduce(
    (sum, t) => sum + (t.files?.length ?? 0),
    0,
  );
  const totalFileCount = uploadedFiles.length + taskFileCount;

  // Derived project status badge
  const hasInProgress = tasks.some(
    (t) =>
      t.status === "In Progress" ||
      t.status === "Todo" ||
      t.status === "In Review" ||
      t.status === "Awaiting Client",
  );
  const allComplete =
    tasks.length > 0 && tasks.every((t) => t.status === "Complete");
  const projectStatusLabel = allComplete
    ? "Complete"
    : hasInProgress
      ? "In Progress"
      : "Open Project";
  const projectStatusClass = allComplete
    ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10"
    : hasInProgress
      ? "bg-blue-500/10 text-blue-700 hover:bg-blue-500/10"
      : "bg-primary/10 text-primary hover:bg-primary/10";

   // Sync progress to Supabase when it changes
   const syncProgress = async (newProgress: number) => {
    if (newProgress === project.progress) return;
    const updated = { ...project, progress: newProgress };
    onProjectUpdate(updated);
    if (project.id) {
      try {
        await dbUpdateProject(project.id, { progress: newProgress });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // ---- Collapsed groups ----
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const toggleGroup = (status: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(status) ? next.delete(status) : next.add(status);
      return next;
    });

  const [wsSortField, setWsSortField] = useState<"name" | "dateAdded" | "dueDate" | "priority" | null>(null);
  const [wsSortDir, setWsSortDir] = useState<"asc" | "desc">("asc");
  const handleWsSort = (field: "name" | "dateAdded" | "dueDate" | "priority") => {
    if (wsSortField === field) setWsSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setWsSortField(field); setWsSortDir("asc"); }
  };
  const wsPrioritySortOrder: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Normal: 3, "-": 4 };
  const wsSortTaskGroup = (group: ProjectTask[]) => {
    if (!wsSortField) return group;
    return [...group].sort((a, b) => {
      let cmp = 0;
      if (wsSortField === "name") cmp = a.name.localeCompare(b.name);
      else if (wsSortField === "priority") cmp = (wsPrioritySortOrder[a.priority] ?? 99) - (wsPrioritySortOrder[b.priority] ?? 99);
      else {
        const av = wsSortField === "dateAdded" ? a.dateAdded : a.dueDate;
        const bv = wsSortField === "dateAdded" ? b.dateAdded : b.dueDate;
        const ad = av && av !== "-" ? new Date(av).getTime() : Infinity;
        const bd = bv && bv !== "-" ? new Date(bv).getTime() : Infinity;
        cmp = ad - bd;
      }
      return wsSortDir === "asc" ? cmp : -cmp;
    });
  };

  // ---- Add Task state (workspace) ----
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskName, setAddTaskName] = useState("");
  const [addTaskDescription, setAddTaskDescription] = useState("");
  const [addTaskStatus, setAddTaskStatus] =
    useState<ProjectTask["status"]>("Todo");
  const [addTaskPriority, setAddTaskPriority] =
    useState<Exclude<ProjectTask["priority"], "-">>("Medium");
  const [addTaskDueDate, setAddTaskDueDate] = useState("");
  const [addTaskFiles, setAddTaskFiles] = useState<File[]>([]);

  const handleAddTaskInWorkspace = async () => {
    const trimmedName = addTaskName.trim();
    if (!trimmedName) return;
    const today = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedDue = addTaskDueDate
      ? new Date(addTaskDueDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";
    const newTask: ProjectTask = {
      name: trimmedName,
      description: addTaskDescription || undefined,
      status: addTaskStatus,
      priority: addTaskPriority,
      dateAdded: today,
      dueDate: formattedDue,
    };
    if (project.id) {
      try {
        const saved = await createTask({
          project_id: project.id,
          workspace_id: project.workspace_id,
          title: newTask.name,
          description: newTask.description ?? null,
          status: newTask.status,
          due_date: addTaskDueDate || null,
          priority: newTask.priority,
        } as any);
        newTask.id = saved.id;
        // Persist attached files (upload to storage, store URL)
        const savedFiles: ProjectFile[] = [];
        for (const f of addTaskFiles) {
          try {
            const fileUrl = await uploadTaskAsset(f, saved.id);
            const sf = await createTaskFile({
              task_id: saved.id,
              name: f.name,
              size: f.size,
              type: f.type,
              uploaded_at: today,
              url: fileUrl,
            });
            savedFiles.push({
              id: sf.id,
              name: f.name,
              size: f.size,
              type: f.type,
              uploadedAt: today,
              url: fileUrl,
            });
          } catch (e) {
            console.error(e);
          }
        }
        if (savedFiles.length > 0) newTask.files = savedFiles;
      } catch (e) {
        console.error(e);
      }
    } else if (addTaskFiles.length > 0) {
      newTask.files = addTaskFiles.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        uploadedAt: today,
      }));
    }
    onTaskAdd(newTask);
    setAddTaskName("");
    setAddTaskDescription("");
    setAddTaskStatus("Todo");
    setAddTaskPriority("Medium");
    setAddTaskDueDate("");
    setAddTaskFiles([]);
    setAddTaskOpen(false);
  };

  // ---- Edit Project state ----
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDescription, setEditDescription] = useState(project.description);
  const [editDueDate, setEditDueDate] = useState("");
  const [editProgress, setEditProgress] = useState(String(project.progress));

  const openEditProject = () => {
    setEditName(project.name);
    setEditDescription(project.description);
    const date = new Date(project.dueDate);
    const formatted = date.toISOString().split("T")[0];
    setEditDueDate(formatted);
    setEditProgress(String(project.progress));
    setEditProjectOpen(true);
  };

  const handleSaveProject = async () => {
    const formattedDueDate = editDueDate
      ? new Date(editDueDate).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "-";
    const updated: Project = {
      ...project,
      name: editName.trim() || project.name,
      description: editDescription,
      dueDate: formattedDueDate,
      progress: Math.min(100, Math.max(0, Number(editProgress) || 0)),
    };
    if (project.id) {
      try {
        await dbUpdateProject(project.id, {
          name: updated.name,
          description: updated.description,
          due_date: updated.dueDate,
          progress: updated.progress,
        });
      } catch (e) {
        console.error(e);
        toast.error("Failed to save project.");
        return;
      }
    }
    onProjectUpdate(updated);
    setEditProjectOpen(false);
    toast.success("Project saved.");
  };

  // ---- View Task state ----
  const [viewTaskOpen, setViewTaskOpen] = useState(false);
  const [viewTaskIndex, setViewTaskIndex] = useState<number | null>(null);
  const [viewTaskActivityLog, setViewTaskActivityLog] = useState<
    { id?: string; text: string; timestamp: string; ts: number }[]
  >([]);
  const [viewTaskActivityInput, setViewTaskActivityInput] = useState("");

  // Auto-open edit task when navigated from global view
  useEffect(() => {
    if (!defaultOpenEditTaskId) return;
    const idx = tasks.findIndex((t) => t.id === defaultOpenEditTaskId);
    if (idx !== -1) {
      openEditTask(tasks[idx], idx);
      onClearDefaultEditTask?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultOpenEditTaskId, tasks]);

  const openViewTask = (task: ProjectTask, globalIndex: number) => {
    setViewTaskIndex(globalIndex);
    setViewTaskActivityLog([]);
    setViewTaskActivityInput("");
    setViewTaskOpen(true);
    if (task.id) {
      fetchTaskActivity(task.id)
        .then((rows) =>
          setViewTaskActivityLog(
            rows.map((r) => ({
              id: r.id,
              text: r.text,
              timestamp: new Date(r.created_at).toLocaleString(),
              ts: new Date(r.created_at).getTime(),
            })),
          ),
        )
        .catch(console.error);
    }
  };

  const persistViewActivity = async (
    taskId: string | undefined,
    text: string,
  ) => {
    const now = new Date();
    const timestamp = now.toLocaleString();
    setViewTaskActivityLog((prev) => [
      ...prev,
      { text, timestamp, ts: now.getTime() },
    ]);
    if (taskId) {
      try {
        await createTaskActivity({ task_id: taskId, text });
      } catch (e) {
        console.error(e);
      }
    }
  };

  // ---- Edit Task state ----
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [editTaskIndex, setEditTaskIndex] = useState<number | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskStatus, setEditTaskStatus] =
    useState<ProjectTask["status"]>("Todo");
  const [editTaskPriority, setEditTaskPriority] =
    useState<ProjectTask["priority"]>("Medium");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");
  const [editTaskFiles, setEditTaskFiles] = useState<ProjectFile[]>([]);
  const [editTaskNewFiles, setEditTaskNewFiles] = useState<File[]>([]);
  const [editTaskActivityInput, setEditTaskActivityInput] = useState("");
  const [editTaskActivityLog, setEditTaskActivityLog] = useState<
    { id?: string; text: string; timestamp: string; ts: number }[]
  >([]);

  const openEditTask = (task: ProjectTask, globalIndex: number) => {
    setEditTaskIndex(globalIndex);
    setEditTaskName(task.name);
    setEditTaskDescription(task.description ?? "");
    setEditTaskStatus(task.status);
    setEditTaskPriority(task.priority === "-" ? "Medium" : task.priority);
    // Parse "08 May 2026" → "2026-05-08" for the date input (local time, no UTC shift)
    const parsedDue =
      task.dueDate && task.dueDate !== "-"
        ? (() => {
            const d = new Date(task.dueDate);
            if (!isNaN(d.getTime())) {
              const y = d.getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, "0");
              const day = String(d.getDate()).padStart(2, "0");
              return `${y}-${m}-${day}`;
            }
            return "";
          })()
        : "";
    setEditTaskDueDate(parsedDue);
    setEditTaskFiles(task.files ?? []);
    setEditTaskNewFiles([]);
    setEditTaskActivityInput("");
    setEditTaskActivityLog([]);
    setEditTaskOpen(true);
    // Load persisted activity in background
    if (task.id) {
      fetchTaskActivity(task.id)
        .then((rows) =>
          setEditTaskActivityLog(
            rows.map((r) => ({
              id: r.id,
              text: r.text,
              timestamp: new Date(r.created_at).toLocaleString(),
              ts: new Date(r.created_at).getTime(),
            })),
          ),
        )
        .catch(console.error);
    }
  };

  // Persist a single activity entry to Supabase and append to local log
  const persistActivity = async (taskId: string | undefined, text: string) => {
    const now = new Date();
    const timestamp = now.toLocaleString();
    setEditTaskActivityLog((prev) => [
      ...prev,
      { text, timestamp, ts: now.getTime() },
    ]);
    if (taskId) {
      try {
        await createTaskActivity({ task_id: taskId, text });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSaveTask = async () => {
    if (editTaskIndex === null) return;
    const original = tasks[editTaskIndex];
    const formattedDue = editTaskDueDate
      ? (() => {
          const [y, mo, d] = editTaskDueDate.split("-").map(Number);
          return new Date(y, mo - 1, d).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        })()
      : "-";
    // Persist new file uploads
    let savedNewFiles: ProjectFile[] = [];
    if (original.id && editTaskNewFiles.length > 0) {
      const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      for (const f of editTaskNewFiles) {
        try {
          const fileUrl = await uploadTaskAsset(f, original.id);
          const saved = await createTaskFile({
            task_id: original.id,
            name: f.name,
            size: f.size,
            type: f.type,
            uploaded_at: today,
            url: fileUrl,
          });
          savedNewFiles.push({
            id: saved.id,
            name: f.name,
            size: f.size,
            type: f.type,
            uploadedAt: today,
            url: fileUrl,
          });
        } catch (e) {
          console.error(e);
        }
      }
    } else if (!original.id && editTaskNewFiles.length > 0) {
      const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      savedNewFiles = editTaskNewFiles.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        uploadedAt: today,
      }));
    }
    const updatedName = editTaskName.trim() || original.name;
    const updated: ProjectTask = {
      ...original,
      name: updatedName,
      description: editTaskDescription || undefined,
      status: editTaskStatus,
      priority: editTaskPriority,
      dueDate: formattedDue,
      files: [...editTaskFiles, ...savedNewFiles],
    };
    if (original.id) {
      try {
        await dbUpdateTask(original.id, {
          title: updated.name,
          description: updated.description ?? null,
          status: updated.status,
          priority: updated.priority,
          due_date: editTaskDueDate || null,
        } as any);
      } catch (e) {
        console.error(e);
        toast.error("Failed to save task.");
        return;
      }
    }
    // --- Activity logging ---
    const activityLines: string[] = [];
    if (original.status !== editTaskStatus)
      activityLines.push(
        `${actorName} changed the status from ${original.status} to ${editTaskStatus}.`,
      );
    if (original.priority !== editTaskPriority)
      activityLines.push(
        `${actorName} changed the priority from ${original.priority} to ${editTaskPriority}.`,
      );
    if (original.dueDate !== formattedDue)
      activityLines.push(
        `${actorName} changed the due date from ${original.dueDate} to ${formattedDue}.`,
      );
    if (original.name !== updatedName)
      activityLines.push(`${actorName} updated the task name.`);
    if ((original.description ?? "") !== (editTaskDescription || ""))
      activityLines.push(`${actorName} updated the task description.`);
    if (savedNewFiles.length > 0)
      activityLines.push(
        `${actorName} uploaded ${savedNewFiles.length} file${savedNewFiles.length > 1 ? "s" : ""}.`,
      );
    for (const text of activityLines) {
      persistActivity(original.id, text);
    }
    onTaskUpdate(updated, editTaskIndex);
    setEditTaskOpen(false);
    toast.success("Task saved.");
  };

  const handleDeleteTask = async (task: ProjectTask, index: number) => {
    if (task.id) {
      try {
        await dbDeleteTask(task.id);
      } catch (e) {
        console.error(e);
      }
    }
    onTaskDelete(index);
  };

  const handleDeleteProject = async () => {
    if (project.id) {
      try {
        await dbDeleteProject(project.id);
      } catch (e) {
        console.error(e);
      }
    }
    onProjectDelete();
    setEditProjectOpen(false);
  };

  return (
    <Card className="overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-background via-background to-muted/30 shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="p-6 md:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge className={cn("rounded-xl", projectStatusClass)}>
              {projectStatusLabel}
            </Badge>
            <Badge variant="outline" className="rounded-xl">
              Due {project.dueDate}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl">{project.name}</CardTitle>
                <CardDescription className="max-w-2xl text-base">
                  {project.description}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-2xl"
                  onClick={openEditProject}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-fit rounded-2xl"
                  onClick={onBack}
                >
                  Back to list
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="mt-1 text-2xl font-semibold">
                  {derivedProgress}%
                </p>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Tasks</p>
                <p className="mt-1 text-2xl font-semibold">
                  {project.tasks.length}
                </p>
              </div>
              <div className="rounded-2xl border bg-background p-4">
                <p className="text-sm text-muted-foreground">Files</p>
                <p className="mt-1 text-2xl font-semibold">{totalFileCount}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Completion</span>
                <span>{derivedProgress}%</span>
              </div>
              <Progress value={derivedProgress} className="h-2 rounded-xl" />
              <p className="text-sm text-muted-foreground">
                Estimated time to finish: about {completionEstimate} weeks.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t bg-muted/30 p-6 md:border-t-0 md:border-l md:p-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Project Summary</h3>
              <Button variant="outline" size="icon" className="rounded-2xl">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 rounded-2xl border bg-background p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Deadline</p>
                  <p className="text-sm text-muted-foreground">
                    {project.dueDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Tasks</p>
                  <p className="text-sm text-muted-foreground">
                    {project.tasks.length} tasks
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Assets</p>
                  <p className="text-sm text-muted-foreground">
                    {totalFileCount} file{totalFileCount !== 1 ? "s" : ""} in
                    the workspace
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Next steps
              </h4>
              <div className="space-y-2">
                <div className="rounded-2xl border bg-background p-4">
                  <p className="font-medium">Review open deliverables</p>
                  <p className="text-sm text-muted-foreground">
                    Align the team on the next creative milestone.
                  </p>
                </div>
                <div className="rounded-2xl border bg-background p-4">
                  <p className="font-medium">Share project updates</p>
                  <p className="text-sm text-muted-foreground">
                    Keep stakeholders in the loop with a quick summary.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t bg-background p-4 md:p-6">
        <Tabs defaultValue="tasks">
          <div className="mb-4 flex items-center justify-between">
            <TabsList className="rounded-2xl">
              <TabsTrigger value="tasks" className="rounded-xl">
                Tasks ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="files" className="rounded-xl">
                Files ({totalFileCount})
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              {(() => {
                const completedCount = tasks.filter((t) => t.status === "Complete").length;
                return completedCount > 0 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-2xl gap-2"
                    onClick={() => setShowCompletedWs((v) => !v)}
                  >
                    {showCompletedWs ? "Hide Completed" : "Show Completed"}
                    <Badge variant="secondary" className="rounded-xl px-1.5">{completedCount}</Badge>
                  </Button>
                ) : null;
              })()}
              <Button
                size="sm"
                className="rounded-2xl gap-1.5"
                onClick={() => setAddTaskOpen(true)}
              >
                <Plus className="h-4 w-4" /> Add Task
              </Button>
            </div>
          </div>

          <TabsContent value="tasks">
            {taskGroups.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No tasks added to this project yet.
              </p>
            ) : (
              <div className="rounded-2xl border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[35%]">
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => handleWsSort("name")}
                        >
                          Task
                          {wsSortField === "name" ? (
                            wsSortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => handleWsSort("dateAdded")}
                        >
                          Date Added
                          {wsSortField === "dateAdded" ? (
                            wsSortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => handleWsSort("dueDate")}
                        >
                          Due Date
                          {wsSortField === "dueDate" ? (
                            wsSortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          onClick={() => handleWsSort("priority")}
                        >
                          Priority
                          {wsSortField === "priority" ? (
                            wsSortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Files</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      return taskGroups.map((group) => {
                        const isCollapsed = collapsedGroups.has(group.status);
                        const sortedTasks = wsSortTaskGroup(group.tasks);
                        return (
                          <Fragment key={group.status}>
                            <TableRow
                              className="bg-muted/30 cursor-pointer select-none hover:bg-muted/50"
                              onClick={() => toggleGroup(group.status)}
                            >
                              <TableCell className="font-semibold">
                                <span className="flex items-center gap-2">
                                  <ChevronDown
                                    className={cn(
                                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                      isCollapsed && "-rotate-90",
                                    )}
                                  />
                                  {group.status} ({group.tasks.length})
                                </span>
                              </TableCell>
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell />
                              <TableCell />
                            </TableRow>
                            {!isCollapsed &&
                              sortedTasks.map((task) => {
                                const idx = tasks.indexOf(task);
                                return (
                                  <TableRow
                                    key={`${group.status}-${task.name}`}
                                    className="cursor-pointer hover:bg-muted/30"
                                    onClick={() => openViewTask(task, idx)}
                                  >
                                    <TableCell className="font-medium">
                                      {task.name}
                                    </TableCell>
                                    <TableCell
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Select
                                        value={task.status}
                                        onValueChange={(v) => {
                                          const prev = task.status;
                                          const updated = {
                                            ...task,
                                            status: v as ProjectTask["status"],
                                          };
                                          if (task.id) {
                                            dbUpdateTask(task.id, {
                                              status: v,
                                            }).catch(console.error);
                                            createTaskActivity({
                                              task_id: task.id,
                                              text: `${actorName} changed the status from ${prev} to ${v}.`,
                                            }).catch(console.error);
                                          }
                                          onTaskUpdate(updated, idx);
                                          const newTasks = tasks.map((t, i) =>
                                            i === idx ? updated : t,
                                          );
                                          const newProgress = Math.round(
                                            (newTasks.filter(
                                              (t) => t.status === "Complete",
                                            ).length /
                                              newTasks.length) *
                                              100,
                                          );
                                          syncProgress(newProgress);
                                        }}
                                      >
                                        <SelectTrigger className="h-7 rounded-xl border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0 w-[130px]">
                                          <span
                                            className={cn(
                                              "mr-1.5 inline-block h-2 w-2 rounded-full shrink-0",
                                              statusDotClass[task.status],
                                            )}
                                          />
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl">
                                          {taskStatusOptions.map((s) => (
                                            <SelectItem
                                              key={s}
                                              value={s}
                                              className="text-xs"
                                            >
                                              {s}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>{task.dateAdded}</TableCell>
                                    <TableCell>{task.dueDate}</TableCell>
                                    <TableCell>
                                      {task.priority === "-" ? (
                                        <span className="text-muted-foreground">
                                          -
                                        </span>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "rounded-xl",
                                            priorityClass[
                                              task.priority as Exclude<
                                                ProjectTask["priority"],
                                                "-"
                                              >
                                            ],
                                          )}
                                        >
                                          {task.priority}
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {task.files && task.files.length > 0 ? (
                                        <Badge
                                          variant="outline"
                                          className="rounded-xl gap-1"
                                        >
                                          <Paperclip className="h-3 w-3" />
                                          {task.files.length}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-xl"
                                          >
                                            <MoreHorizontal className="h-3.5 w-3.5" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                          align="end"
                                          className="rounded-2xl"
                                        >
                                          <DropdownMenuItem
                                            onClick={() =>
                                              openEditTask(task, idx)
                                            }
                                            className="gap-2"
                                          >
                                            <Pencil className="h-3.5 w-3.5" />{" "}
                                            Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleDeleteTask(task, idx)
                                            }
                                            className="gap-2 text-destructive focus:text-destructive"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />{" "}
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </Fragment>
                        );
                      });
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="files">
            <div className="space-y-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-10 transition hover:border-primary/50 hover:bg-muted/40">
                <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Click to upload or drag &amp; drop
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Any file type · Multiple allowed
                </p>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (!e.target.files) return;
                    const now = new Date().toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const newFiles: ProjectFile[] = Array.from(
                      e.target.files,
                    ).map((f) => ({
                      name: f.name,
                      size: f.size,
                      type: f.type || "application/octet-stream",
                      uploadedAt: now,
                    }));
                    onFilesChange([...uploadedFiles, ...newFiles]);
                    e.target.value = "";
                  }}
                />
              </label>

              {uploadedFiles.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No files uploaded yet.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {file.name}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className="rounded-xl text-xs"
                          >
                            {file.type.split("/")[1]?.toUpperCase() ?? "FILE"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {file.size < 1024 * 1024
                              ? `${(file.size / 1024).toFixed(1)} KB`
                              : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Uploaded {file.uploadedAt}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-xl"
                        onClick={() =>
                          onFilesChange(
                            uploadedFiles.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={editProjectOpen} onOpenChange={setEditProjectOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ep-name">Name</Label>
              <Input
                id="ep-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ep-desc">Description</Label>
              <Textarea
                id="ep-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="rounded-2xl min-h-[80px]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ep-due">Due date</Label>
                <Input
                  id="ep-due"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ep-progress">Progress (%)</Label>
                <Input
                  id="ep-progress"
                  type="number"
                  min="0"
                  max="100"
                  value={editProgress}
                  onChange={(e) => setEditProgress(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
            </div>
          </div>
          <div className="mt-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm font-medium text-destructive">Danger zone</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Permanently delete this project and all its tasks and files.
            </p>
            <Button
              variant="destructive"
              size="sm"
              className="mt-3 rounded-xl gap-2"
              onClick={handleDeleteProject}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete project
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-2xl"
              onClick={() => setEditProjectOpen(false)}
            >
              Cancel
            </Button>
            <Button className="rounded-2xl" onClick={handleSaveProject}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog (workspace) */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="rounded-3xl w-[90vw] max-w-[90vw] p-0 overflow-hidden">
          <div className="grid grid-cols-[1fr_380px]">
            {/* Left — name + description */}
            <div className="flex flex-col p-6 gap-4 min-h-[520px]">
              <DialogHeader>
                <DialogTitle>Add Task</DialogTitle>
                <DialogDescription>
                  Add a new task to this project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="at-name">Task name</Label>
                <Input
                  id="at-name"
                  value={addTaskName}
                  onChange={(e) => setAddTaskName(e.target.value)}
                  placeholder="Enter task name…"
                  className="rounded-2xl"
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label>Description</Label>
                <RichTextEditor
                  value={addTaskDescription}
                  onChange={setAddTaskDescription}
                  placeholder="Task details…"
                  attachedFiles={addTaskFiles.map((f) => ({ name: f.name }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="rounded-2xl"
                  disabled={!addTaskName.trim()}
                  onClick={handleAddTaskInWorkspace}
                >
                  Add Task
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => setAddTaskOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
            {/* Right — fields + files */}
            <div className="flex flex-col border-l bg-muted/30 p-5 gap-4 overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select
                  value={addTaskStatus}
                  onValueChange={(v) =>
                    setAddTaskStatus(v as ProjectTask["status"])
                  }
                >
                  <SelectTrigger className="rounded-2xl bg-background h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {taskStatusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Priority
                </Label>
                <Select
                  value={addTaskPriority}
                  onValueChange={(v) =>
                    setAddTaskPriority(
                      v as Exclude<ProjectTask["priority"], "-">,
                    )
                  }
                >
                  <SelectTrigger className="rounded-2xl bg-background h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {taskPriorityOptions.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Due date
                </Label>
                <Input
                  id="at-due"
                  type="date"
                  value={addTaskDueDate}
                  onChange={(e) => setAddTaskDueDate(e.target.value)}
                  className="rounded-2xl bg-background h-8 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Files {addTaskFiles.length > 0 && `(${addTaskFiles.length})`}
                </Label>
                {addTaskFiles.length > 0 && (
                  <div className="space-y-1.5">
                    {addTaskFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-2xl border border-dashed bg-background px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-xs">{f.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {(f.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-lg shrink-0"
                          onClick={() =>
                            setAddTaskFiles((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-background px-4 py-3 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-muted/10">
                  <Upload className="h-4 w-4" />
                  <span>Attach files</span>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      setAddTaskFiles((prev) => [
                        ...prev,
                        ...Array.from(e.target.files ?? []),
                      ]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Task Drawer */}
      <Drawer open={viewTaskOpen} onOpenChange={setViewTaskOpen}>
        <DrawerContent className="max-h-[92vh] overflow-hidden rounded-t-[28px] border-0">
          <div
            className="w-[98%] mx-auto flex flex-col"
            style={{ maxHeight: "calc(92vh - 2.5rem)" }}
          >
            {(() => {
              const task = viewTaskIndex !== null ? tasks[viewTaskIndex] : null;
              if (!task) return null;
              return (
                <div className="grid grid-cols-[1.1fr_0.9fr] flex-1 min-h-0 overflow-hidden">
                  {/* Left — name + description */}
                  <div className="space-y-6 p-6 md:p-8 overflow-y-auto">
                    <DrawerHeader className="px-0 space-y-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5 min-w-0">
                          <DrawerTitle className="text-2xl leading-tight">
                            {task.name}
                          </DrawerTitle>
                          <DrawerDescription>
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                              <span
                                className={cn(
                                  "inline-block h-2 w-2 rounded-full shrink-0",
                                  statusDotClass[task.status],
                                )}
                              />
                              {task.status}
                            </span>
                          </DrawerDescription>
                        </div>
                        <div className="flex gap-2 shrink-0 pt-1">
                          <Button
                            className="rounded-2xl"
                            onClick={() => {
                              setViewTaskOpen(false);
                              openEditTask(task, viewTaskIndex!);
                            }}
                          >
                            Edit Task
                          </Button>
                          <Button
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => setViewTaskOpen(false)}
                          >
                            Close
                          </Button>
                        </div>
                      </div>
                    </DrawerHeader>
                    {task.description ? (
                      <div
                        className="prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_img]:rounded-xl [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                        dangerouslySetInnerHTML={{ __html: task.description }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No description.
                      </p>
                    )}
                  </div>

                  {/* Right — details + activity/files */}
                  <div className="border-t bg-muted/30 md:border-t-0 md:border-l p-6 md:p-8 space-y-6 overflow-y-auto">
                    {/* Details card */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Task Details</h3>
                      <div className="space-y-3 rounded-2xl border bg-background p-4">
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium">Status</p>
                          <Select
                            value={task.status}
                            onValueChange={(v) => {
                              const prev = task.status;
                              const updated = {
                                ...task,
                                status: v as ProjectTask["status"],
                              };
                              if (task.id) {
                                dbUpdateTask(task.id, { status: v }).catch(
                                  console.error,
                                );
                                createTaskActivity({
                                  task_id: task.id,
                                  text: `${actorName} changed the status from ${prev} to ${v}.`,
                                }).catch(console.error);
                                setViewTaskActivityLog((log) => {
                                  const now = new Date();
                                  return [
                                    ...log,
                                    {
                                      text: `${actorName} changed the status from ${prev} to ${v}.`,
                                      timestamp: now.toLocaleString(),
                                      ts: now.getTime(),
                                    },
                                  ];
                                });
                              }
                              onTaskUpdate(updated, viewTaskIndex!);
                            }}
                          >
                            <SelectTrigger className="rounded-2xl h-10">
                              <span
                                className={cn(
                                  "mr-1.5 inline-block h-2 w-2 rounded-full shrink-0",
                                  statusDotClass[task.status],
                                )}
                              />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {taskStatusOptions.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium">Priority</p>
                          <Select
                            value={
                              task.priority === "-" ? "Medium" : task.priority
                            }
                            onValueChange={(v) => {
                              const prev = task.priority;
                              const updated = {
                                ...task,
                                priority: v as ProjectTask["priority"],
                              };
                              if (task.id) {
                                dbUpdateTask(task.id, { priority: v }).catch(
                                  console.error,
                                );
                                createTaskActivity({
                                  task_id: task.id,
                                  text: `${actorName} changed the priority from ${prev} to ${v}.`,
                                }).catch(console.error);
                                setViewTaskActivityLog((log) => {
                                  const now = new Date();
                                  return [
                                    ...log,
                                    {
                                      text: `${actorName} changed the priority from ${prev} to ${v}.`,
                                      timestamp: now.toLocaleString(),
                                      ts: now.getTime(),
                                    },
                                  ];
                                });
                              }
                              onTaskUpdate(updated, viewTaskIndex!);
                            }}
                          >
                            <SelectTrigger className="rounded-2xl h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {taskPriorityOptions.map((p) => (
                                <SelectItem key={p} value={p}>
                                  {p}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-muted-foreground">
                            Due date
                          </p>
                          <span className="text-sm">
                            {task.dueDate === "-" ? "Not set" : task.dueDate}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-muted-foreground">
                            Date added
                          </p>
                          <span className="text-sm">{task.dateAdded}</span>
                        </div>
                      </div>
                    </div>

                    {/* Activity + Files tabs */}
                    <Tabs defaultValue="activity">
                      <TabsList className="rounded-2xl w-full">
                        <TabsTrigger
                          value="activity"
                          className="flex-1 rounded-xl"
                        >
                          Activity
                        </TabsTrigger>
                        <TabsTrigger
                          value="files"
                          className="flex-1 rounded-xl"
                        >
                          Files
                          {task.files &&
                            task.files.length > 0 &&
                            ` (${task.files.length})`}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="activity" className="mt-4 space-y-3">
                        <div className="space-y-2">
                          {viewTaskActivityLog.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">
                              No activity yet.
                            </p>
                          ) : (
                            [...viewTaskActivityLog]
                              .sort((a, b) => b.ts - a.ts)
                              .map((entry, i) => (
                                <div
                                  key={i}
                                  className="rounded-2xl border bg-background p-4"
                                >
                                  <p className="font-medium text-sm">
                                    {entry.text}
                                  </p>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    {entry.timestamp}
                                  </p>
                                </div>
                              ))
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            value={viewTaskActivityInput}
                            onChange={(e) =>
                              setViewTaskActivityInput(e.target.value)
                            }
                            placeholder="Add a note…"
                            className="rounded-2xl h-10"
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                viewTaskActivityInput.trim()
                              ) {
                                persistViewActivity(
                                  task.id,
                                  viewTaskActivityInput.trim(),
                                );
                                setViewTaskActivityInput("");
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            className="rounded-2xl shrink-0"
                            onClick={() => {
                              if (!viewTaskActivityInput.trim()) return;
                              persistViewActivity(
                                task.id,
                                viewTaskActivityInput.trim(),
                              );
                              setViewTaskActivityInput("");
                            }}
                          >
                            Post
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="files" className="mt-4 space-y-2">
                        {task.files && task.files.length > 0 ? (
                          task.files.map((f, i) => (
                            <div
                              key={f.id ?? i}
                              className="rounded-2xl border bg-background p-4 flex items-center gap-3"
                            >
                              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                {f.url ? (
                                  <a
                                    href={f.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium text-sm text-primary underline underline-offset-2 truncate block"
                                  >
                                    {f.name}
                                  </a>
                                ) : (
                                  <p className="font-medium text-sm truncate">
                                    {f.name}
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground">
                                  {(f.size / 1024).toFixed(0)} KB
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground py-2">
                            No files attached.
                          </p>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              );
            })()}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit Task Dialog */}
      <Drawer open={editTaskOpen} onOpenChange={setEditTaskOpen}>
        <DrawerContent className="max-h-[92vh] overflow-hidden rounded-t-[28px] border-0">
          <div
            className="w-[98%] mx-auto flex flex-col"
            style={{ maxHeight: "calc(92vh - 2.5rem)" }}
          >
            <div className="grid grid-cols-[1.1fr_0.9fr] flex-1 min-h-0 overflow-hidden">
              {/* Left — header + name/description, scrollable */}
              <div className="space-y-6 p-6 md:p-8 overflow-y-auto">
                <DrawerHeader className="px-0 space-y-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <DrawerTitle className="text-2xl">Edit Task</DrawerTitle>
                      <DrawerDescription>
                        Update task details.
                      </DrawerDescription>
                    </div>
                    <div className="flex gap-2 shrink-0 pt-1">
                      <Button className="rounded-2xl" onClick={handleSaveTask}>
                        Save changes
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => setEditTaskOpen(false)}
                      >
                        Cancel
                      </Button>
                      {editTaskIndex !== null && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            const task = tasks[editTaskIndex];
                            setEditTaskOpen(false);
                            handleDeleteTask(task, editTaskIndex);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </DrawerHeader>
                <div className="space-y-2">
                  <Label htmlFor="et-name" className="text-sm font-medium">
                    Task name
                  </Label>
                  <Input
                    id="et-name"
                    value={editTaskName}
                    onChange={(e) => setEditTaskName(e.target.value)}
                    className="rounded-2xl h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <RichTextEditor
                    value={editTaskDescription}
                    onChange={setEditTaskDescription}
                    placeholder="Task details…"
                    taskId={
                      editTaskIndex !== null
                        ? tasks[editTaskIndex]?.id
                        : undefined
                    }
                    attachedFiles={editTaskFiles as AttachedFile[]}
                  />
                </div>
              </div>

              {/* Right — details + activity/files, scrollable */}
              <div className="border-t bg-muted/30 md:border-t-0 md:border-l p-6 md:p-8 space-y-6 overflow-y-auto">
                {/* Details card */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Task Details</h3>
                  <div className="space-y-3 rounded-2xl border bg-background p-4">
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">Status</p>
                      <Select
                        value={editTaskStatus}
                        onValueChange={(v) =>
                          setEditTaskStatus(v as ProjectTask["status"])
                        }
                      >
                        <SelectTrigger className="rounded-2xl h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {taskStatusOptions.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">Priority</p>
                      <Select
                        value={
                          editTaskPriority === "-" ? "Medium" : editTaskPriority
                        }
                        onValueChange={(v) =>
                          setEditTaskPriority(v as ProjectTask["priority"])
                        }
                      >
                        <SelectTrigger className="rounded-2xl h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {taskPriorityOptions.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">Due date</p>
                      <Input
                        id="et-due"
                        type="date"
                        value={editTaskDueDate}
                        onChange={(e) => setEditTaskDueDate(e.target.value)}
                        className="rounded-2xl h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Activity + Files tabs */}
                <Tabs defaultValue="activity">
                  <TabsList className="rounded-2xl w-full">
                    <TabsTrigger value="activity" className="flex-1 rounded-xl">
                      Activity
                    </TabsTrigger>
                    <TabsTrigger value="files" className="flex-1 rounded-xl">
                      Files
                      {editTaskFiles.length + editTaskNewFiles.length > 0 &&
                        ` (${editTaskFiles.length + editTaskNewFiles.length})`}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="activity" className="mt-4 space-y-3">
                    <div className="space-y-2">
                      {editTaskActivityLog.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No activity yet.
                        </p>
                      ) : (
                        [...editTaskActivityLog]
                          .sort((a, b) => b.ts - a.ts)
                          .map((entry, i) => (
                            <div
                              key={i}
                              className="rounded-2xl border bg-background p-4"
                            >
                              <p className="font-medium text-sm">
                                {entry.text}
                              </p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {entry.timestamp}
                              </p>
                            </div>
                          ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={editTaskActivityInput}
                        onChange={(e) =>
                          setEditTaskActivityInput(e.target.value)
                        }
                        placeholder="Add a note…"
                        className="rounded-2xl h-10"
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            editTaskActivityInput.trim()
                          ) {
                            const text = editTaskActivityInput.trim();
                            const taskId =
                              editTaskIndex !== null
                                ? tasks[editTaskIndex]?.id
                                : undefined;
                            persistActivity(taskId, text);
                            setEditTaskActivityInput("");
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        className="rounded-2xl shrink-0"
                        onClick={() => {
                          if (!editTaskActivityInput.trim()) return;
                          const taskId =
                            editTaskIndex !== null
                              ? tasks[editTaskIndex]?.id
                              : undefined;
                          persistActivity(taskId, editTaskActivityInput.trim());
                          setEditTaskActivityInput("");
                        }}
                      >
                        Post
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="files" className="mt-4 space-y-3">
                    <div className="space-y-2">
                      {editTaskFiles.map((f, i) => (
                        <div
                          key={f.id ?? i}
                          className="rounded-2xl border bg-background p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {f.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {(f.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-xl shrink-0"
                            onClick={() => {
                              if (f.id)
                                dbDeleteTaskFile(f.id).catch(console.error);
                              setEditTaskFiles((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              );
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      {editTaskNewFiles.map((f, i) => (
                        <div
                          key={i}
                          className="rounded-2xl border border-dashed bg-background p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {f.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {(f.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-xl shrink-0"
                            onClick={() =>
                              setEditTaskNewFiles((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-background px-4 py-3 text-sm text-muted-foreground transition hover:border-primary/50 hover:bg-muted/10">
                      <Upload className="h-4 w-4" />
                      <span>Attach files</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          setEditTaskNewFiles((prev) => [
                            ...prev,
                            ...Array.from(e.target.files ?? []),
                          ]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </Card>
  );
}

// Sample data for tutorials
const tutorials = [
  {
    title: "Mastering Digital Illustration",
    description: "Learn advanced techniques for creating stunning digital art",
    duration: "1h 45m",
    level: "Advanced",
    instructor: "Sarah Chen",
    category: "Illustration",
    views: "24K",
  },
  {
    title: "UI/UX Design Fundamentals",
    description: "Essential principles for creating intuitive user interfaces",
    duration: "2h 20m",
    level: "Intermediate",
    instructor: "Michael Rodriguez",
    category: "Design",
    views: "56K",
  },
  {
    title: "Video Editing Masterclass",
    description: "Professional techniques for cinematic video editing",
    duration: "3h 10m",
    level: "Advanced",
    instructor: "James Wilson",
    category: "Video",
    views: "32K",
  },
  {
    title: "Typography Essentials",
    description: "Create beautiful and effective typography for any project",
    duration: "1h 30m",
    level: "Beginner",
    instructor: "Emma Thompson",
    category: "Typography",
    views: "18K",
  },
  {
    title: "Color Theory for Designers",
    description: "Understanding color relationships and psychology",
    duration: "2h 05m",
    level: "Intermediate",
    instructor: "David Kim",
    category: "Design",
    views: "41K",
  },
];

// Sample data for community posts
const communityPosts = [
  {
    title: "Minimalist Logo Design",
    author: "Alex Morgan",
    likes: 342,
    comments: 28,
    image: "/placeholder.svg?height=300&width=400",
    time: "2 days ago",
  },
  {
    title: "3D Character Concept",
    author: "Priya Sharma",
    likes: 518,
    comments: 47,
    image: "/placeholder.svg?height=300&width=400",
    time: "1 week ago",
  },
  {
    title: "UI Dashboard Redesign",
    author: "Thomas Wright",
    likes: 276,
    comments: 32,
    image: "/placeholder.svg?height=300&width=400",
    time: "3 days ago",
  },
  {
    title: "Product Photography Setup",
    author: "Olivia Chen",
    likes: 189,
    comments: 15,
    image: "/placeholder.svg?height=300&width=400",
    time: "5 days ago",
  },
];

// Sample data for sidebar navigation
const sidebarItems = [
  {
    title: "Home",
    icon: <Home />,
  },
  {
    title: "Projects",
    icon: <Layers />,
    dynamicType: "projects" as const,
  },
  {
    title: "Tasks",
    icon: <Clock />,
    dynamicType: "tasks" as const,
  },
  {
    title: "Files",
    icon: <FileText />,
    dynamicType: "files" as const,
    items: [
      { title: "Recent", url: "#", filter: "recent" as const },
      { title: "Shared with me", url: "#", badge: "3", filter: "shared" as const },
      { title: "Favorites", url: "#", filter: "favorites" as const },
      { title: "Trash", url: "#", filter: "trash" as const },
      { title: "Project", url: "#", filter: "all" as const },
      { title: "Task", url: "#", filter: "all" as const },
    ],
  },
];

const projectStatusToFilter: Record<string, "all" | "todo" | "awaiting-client" | "in-progress" | "in-review" | "completed"> = {
  "Todo": "todo",
  "Awaiting Client": "awaiting-client",
  "In Progress": "in-progress",
  "In Review": "in-review",
  "Completed": "completed",
};

function getFileIcon(name: string, type: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (
    /^(jpg|jpeg|png|gif|webp|svg|bmp|tiff|heic)$/.test(ext) ||
    type.startsWith("image/")
  )
    return <ImageIcon className="text-violet-500" />;
  if (/^(mp4|mov|avi|mkv|webm|m4v)$/.test(ext) || type.startsWith("video/"))
    return <Video className="text-pink-500" />;
  if (/^(pdf)$/.test(ext)) return <FileText className="text-red-500" />;
  if (/^(doc|docx|odt|rtf|txt|md)$/.test(ext))
    return <FileText className="text-blue-500" />;
  if (/^(xls|xlsx|csv)$/.test(ext))
    return <FileText className="text-green-500" />;
  if (/^(ppt|pptx|key)$/.test(ext))
    return <FileText className="text-orange-500" />;
  if (
    /^(js|ts|jsx|tsx|html|css|json|py|rb|php|go|rs)$/.test(ext) ||
    type.startsWith("text/")
  )
    return <Code className="text-teal-500" />;
  if (/^(zip|rar|gz|tar|7z)$/.test(ext))
    return <Archive className="text-amber-500" />;
  return <FileText className="text-muted-foreground" />;
}

export function DesignaliCreative({
  userName = "Admin",
}: {
  userName?: string;
}) {
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = () => supabase.auth.signOut();

  const [progress, setProgress] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<
    | "all"
    | "todo"
    | "awaiting-client"
    | "in-progress"
    | "in-review"
    | "completed"
  >("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [fileFilter, setFileFilter] = useState<
    "all" | "recent" | "shared" | "favorites" | "trash"
  >("all");
  const [fileSearch, setFileSearch] = useState("");
  // ---- Global View Task (opened from Home/Tasks tab without entering project) ----
  const [globalViewTaskOpen, setGlobalViewTaskOpen] = useState(false);
  const [globalViewTask, setGlobalViewTask] = useState<ProjectTask | null>(
    null,
  );
  const [globalViewTaskProject, setGlobalViewTaskProject] =
    useState<Project | null>(null);
  const [globalViewTaskActivityLog, setGlobalViewTaskActivityLog] = useState<
    { id?: string; text: string; timestamp: string; ts: number }[]
  >([]);
  const [globalViewTaskActivityInput, setGlobalViewTaskActivityInput] =
    useState("");
  const [settingsFirstName, setSettingsFirstName] = useState(() => userName.split(" ")[0] ?? "");
  const [settingsLastName, setSettingsLastName] = useState(() => userName.split(" ").slice(1).join(" ") ?? "");
  const [settingsEmail, setSettingsEmail] = useState("levongravett@gmail.com");
  const [settingsCurrentPassword, setSettingsCurrentPassword] = useState("");
  const [settingsNewPassword, setSettingsNewPassword] = useState("");
  const [settingsConfirmPassword, setSettingsConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [settingsAvatarUrl, setSettingsAvatarUrl] = useState<string | null>(null);
  const [duplicateProjectOpen, setDuplicateProjectOpen] = useState(false);
  const [projectToDuplicate, setProjectToDuplicate] = useState<Project | null>(
    null,
  );
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [taskStatusFilter, setTaskStatusFilter] = useState<string | null>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [collapsedTaskGroups, setCollapsedTaskGroups] = useState<Set<string>>(new Set());
  const toggleTaskGroup = (key: string) =>
    setCollapsedTaskGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const [taskSortField, setTaskSortField] = useState<"name" | "dateAdded" | "dueDate" | "priority" | null>(null);
  const [taskSortDir, setTaskSortDir] = useState<"asc" | "desc">("asc");

  const handleTaskSort = (field: "name" | "dateAdded" | "dueDate" | "priority") => {
    if (taskSortField === field) {
      setTaskSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setTaskSortField(field);
      setTaskSortDir("asc");
    }
  };

  const prioritySortOrder: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Normal: 3, "-": 4 };

  const sortTaskGroup = (tasks: ProjectTask[]) => {
    if (!taskSortField) return tasks;
    return [...tasks].sort((a, b) => {
      let cmp = 0;
      if (taskSortField === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (taskSortField === "priority") {
        cmp = (prioritySortOrder[a.priority] ?? 99) - (prioritySortOrder[b.priority] ?? 99);
      } else {
        const aVal = taskSortField === "dateAdded" ? a.dateAdded : a.dueDate;
        const bVal = taskSortField === "dateAdded" ? b.dateAdded : b.dueDate;
        const aDate = aVal && aVal !== "-" ? new Date(aVal).getTime() : Infinity;
        const bDate = bVal && bVal !== "-" ? new Date(bVal).getTime() : Infinity;
        cmp = aDate - bDate;
      }
      return taskSortDir === "asc" ? cmp : -cmp;
    });
  };
  const [pendingEditTaskId, setPendingEditTaskId] = useState<string | null>(
    null,
  );

  const openGlobalViewTask = (task: ProjectTask, project: Project) => {
    setGlobalViewTask(task);
    setGlobalViewTaskProject(project);
    setGlobalViewTaskActivityLog([]);
    setGlobalViewTaskActivityInput("");
    setGlobalViewTaskOpen(true);
    if (task.id) {
      fetchTaskActivity(task.id)
        .then((rows) =>
          setGlobalViewTaskActivityLog(
            rows.map((r) => ({
              id: r.id,
              text: r.text,
              timestamp: new Date(r.created_at).toLocaleString(),
              ts: new Date(r.created_at).getTime(),
            })),
          ),
        )
        .catch(console.error);
    }
  };

  const [projectList, setProjectList] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project>({ name: "", description: "", progress: 0, dueDate: "", members: 0, files: 0, tasks: [], uploadedFiles: [] });
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [taskDrafts, setTaskDrafts] = useState<ProjectTask[]>([]);
  const [drawerRightTab, setDrawerRightTab] = useState<"tasks" | "files">(
    "tasks",
  );
  const [drawerUploadedFiles, setDrawerUploadedFiles] = useState<ProjectFile[]>(
    [],
  );
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [newProjectDueDate, setNewProjectDueDate] = useState("");
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskStatus, setNewTaskStatus] =
    useState<ProjectTask["status"]>("Todo");
  const [newTaskDateAdded, setNewTaskDateAdded] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] =
    useState<Exclude<ProjectTask["priority"], "-">>("Medium");
  const [newTaskFiles, setNewTaskFiles] = useState<ProjectFile[]>([]);
  const [newTaskDescription, setNewTaskDescription] = useState("");

  // Simulate progress loading
  useEffect(() => {
    const timer = setTimeout(() => setProgress(100), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Load projects from Supabase
  useEffect(() => {
    async function load() {
      try {
        const rows = await fetchProjects();
        if (rows.length > 0) {
          const mapped: Project[] = rows.map((r) => ({
            id: r.id,
            workspace_id: (r as any).workspace_id,
            name: r.name,
            description: r.description,
            progress: r.progress,
            dueDate: r.due_date,
            members: 0,
            files: 0,
            tasks: [],
            uploadedFiles: [],
          }));
          setProjectList(mapped);
          // Load data for all projects
          const loadedProjects = await Promise.all(mapped.map(loadProjectData));
          setProjectList(loadedProjects);
          setSelectedProject(loadedProjects[0]);
        }
      } catch (e) {
        console.error("Failed to load projects", e);
      } finally {
        setProjectsLoading(false);
      }
    }
    load();
  }, []);

  // Load user profile (avatar) on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data?.user?.id;
      if (!userId) return;
      fetchProfile(userId).then((profile) => {
        if (profile?.avatar_url) setSettingsAvatarUrl(profile.avatar_url);
      });
    });
  }, []);

  // Request browser notification permission on mount (once)
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      const timer = setTimeout(() => {
        Notification.requestPermission();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const formatTaskDate = (dateValue: string) => {
    const [y, mo, d] = dateValue.split("-").map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getProjectStatus = (
    project: Project,
  ): "Todo" | "Awaiting Client" | "In Progress" | "In Review" | "Completed" => {
    if (project.tasks.length === 0) {
      return project.progress === 100 ? "Completed" : "Todo";
    }

    const hasAwaitingClient = project.tasks.some(
      (t) => t.status === "Awaiting Client",
    );
    if (hasAwaitingClient) return "Awaiting Client";

    const hasInReview = project.tasks.some((t) => t.status === "In Review");
    if (hasInReview) return "In Review";

    const hasInProgress = project.tasks.some((t) => t.status === "In Progress");
    if (hasInProgress) return "In Progress";

    const allComplete = project.tasks.every((t) => t.status === "Complete");
    if (allComplete) return "Completed";

    return "Todo";
  };

  const resetTaskForm = () => {
    setNewTaskName("");
    setNewTaskStatus("Todo");
    setNewTaskDateAdded(new Date().toISOString().split("T")[0]);
    setNewTaskDueDate("");
    setNewTaskPriority("Medium");
    setNewTaskFiles([]);
    setNewTaskDescription("");
  };

  const resetProjectForm = () => {
    setNewProjectName("");
    setNewProjectDescription("");
    setNewProjectDueDate("");

    setTaskDrafts([]);
    setDrawerRightTab("tasks");
    setDrawerUploadedFiles([]);
    resetTaskForm();
  };

  const handleAddTask = () => {
    const trimmedName = newTaskName.trim();
    if (!trimmedName) {
      return;
    }

    setTaskDrafts((prev) => [
      ...prev,
      {
        name: trimmedName,
        description: newTaskDescription || undefined,
        status: newTaskStatus,
        dateAdded: newTaskDateAdded ? formatTaskDate(newTaskDateAdded) : "-",
        dueDate: newTaskDueDate ? formatTaskDate(newTaskDueDate) : "-",
        priority: newTaskPriority,
        files: newTaskFiles.length > 0 ? [...newTaskFiles] : undefined,
      },
    ]);

    resetTaskForm();
  };

  const handleCreateProject = async () => {
    const trimmedName = newProjectName.trim();
    const trimmedDescription = newProjectDescription.trim();

    if (!trimmedName) return;

    const formattedDueDate = newProjectDueDate
      ? new Date(newProjectDueDate).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "-";

    try {
      // Insert project
      const dbProject = await createProject({
        name: trimmedName,
        description: trimmedDescription,
        progress: 0,
        due_date: formattedDueDate,
      });

      // Insert task drafts
      for (const draft of taskDrafts) {
        const dbTask = await createTask({
          project_id: dbProject.id,
          title: draft.name,
          description: draft.description ?? null,
          status: draft.status,
          due_date: draft.dueDate !== "-" ? draft.dueDate : null,
          priority: draft.priority,
        } as any);
        if (draft.files) {
          for (const f of draft.files) {
            await createTaskFile({
              task_id: dbTask.id,
              name: f.name,
              size: f.size,
              type: f.type,
              uploaded_at: f.uploadedAt,
            });
          }
        }
      }

      // Insert project files
      for (const f of drawerUploadedFiles) {
        await createProjectFile({
          project_id: dbProject.id,
          name: f.name,
          size: f.size,
          type: f.type,
          uploaded_at: f.uploadedAt,
        });
      }

      const newProject: Project = {
        id: dbProject.id,
        name: trimmedName,
        description: trimmedDescription,
        progress: 0,
        dueDate: formattedDueDate,
        members: 0,
        files: drawerUploadedFiles.length,
        tasks: taskDrafts,
        uploadedFiles: drawerUploadedFiles,
      };

      setProjectList((prev) => [newProject, ...prev]);
      setSelectedProject(newProject);
      setActiveTab("projects");
      setIsCreateProjectOpen(false);
      resetProjectForm();
      toast.success("Project created.");
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Failed to create project:", errorMsg);
      toast.error("Failed to create project.");
    }
  };

  const filteredProjects = projectList.filter((p) => {
    const matchesSearch =
      !projectSearch ||
      p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(projectSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (projectFilter === "completed")
      return getProjectStatus(p) === "Completed";
    if (projectFilter === "in-progress")
      return getProjectStatus(p) === "In Progress";
    if (projectFilter === "in-review")
      return getProjectStatus(p) === "In Review";
    if (projectFilter === "awaiting-client")
      return getProjectStatus(p) === "Awaiting Client";
    if (projectFilter === "todo") return getProjectStatus(p) === "Todo";
    return true;
  });

  const hasTodoProjects = projectList.some(
    (p) => getProjectStatus(p) === "Todo",
  );
  const hasAwaitingClientProjects = projectList.some(
    (p) => getProjectStatus(p) === "Awaiting Client",
  );
  const hasInProgressProjects = projectList.some(
    (p) => getProjectStatus(p) === "In Progress",
  );
  const hasInReviewProjects = projectList.some(
    (p) => getProjectStatus(p) === "In Review",
  );
  const hasCompletedProjects = projectList.some(
    (p) => getProjectStatus(p) === "Completed",
  );

  // Aggregate all project files with project and task context
  const allProjectFiles: DisplayFile[] = projectList.flatMap((p) => {
    // Project-level files (uploaded directly to project workspace)
    const projectFiles: DisplayFile[] = (p.uploadedFiles ?? []).map((f) => ({
      ...f,
      projectName: p.name,
      projectRef: p,
      taskName: null,
      taskRef: null,
    }));

    // Task-level files (uploaded via Add Task / Edit Task — these have URLs)
    const taskFiles: DisplayFile[] = (p.tasks ?? []).flatMap((t) =>
      (t.files ?? []).map((f) => ({
        ...f,
        projectName: p.name,
        projectRef: p,
        taskName: t.name,
        taskRef: t,
      })),
    );

    return [...projectFiles, ...taskFiles];
  });

  const dedupedProjectFiles = (() => {
    const seen = new Set<string>();
    return allProjectFiles.filter((f) => {
      const key = f.url ?? `${f.name}-${f.size}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  const filteredFiles = dedupedProjectFiles.filter((f) => {
    const matchesSearch =
      !fileSearch ||
      f.name.toLowerCase().includes(fileSearch.toLowerCase()) ||
      f.projectName.toLowerCase().includes(fileSearch.toLowerCase());
    if (!matchesSearch) return false;
    return true;
  });

  // Sync globalViewTask back from projectList after project workspace closes
  useEffect(() => {
    if (!isProjectDrawerOpen && globalViewTask?.id) {
      const updatedTask = projectList
        .flatMap((p) => p.tasks ?? [])
        .find((t) => t.id === globalViewTask.id);
      if (updatedTask) setGlobalViewTask(updatedTask);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProjectDrawerOpen]);

  const handleDuplicateProject = async (project: Project) => {
    try {
      // Create new project with copied data
      const newProjectData = {
        name: `${project.name} (Copy)`,
        description: project.description,
        progress: 0, // start at 0
        due_date: project.dueDate,
      };
      const dbProject = await createProject(newProjectData);
      const newProjectId = dbProject.id;

      // Copy tasks
      for (const task of project.tasks) {
        await createTask({
          project_id: newProjectId,
          title: task.name,
          description: task.description ?? null,
          status: "Todo",
          due_date: task.dueDate && task.dueDate !== "-" ? task.dueDate : null,
          priority: task.priority,
        } as any);
      }

      // Copy files - for demo, skip

      // Reload projects
      const rows = await fetchProjects();
      if (rows.length > 0) {
        const mapped: Project[] = rows.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          progress: r.progress,
          dueDate: r.due_date,
          members: 0,
          files: 0,
          tasks: [],
          uploadedFiles: [],
        }));
        const loadedProjects = await Promise.all(mapped.map(loadProjectData));
        setProjectList(loadedProjects);
        setSelectedProject(
          loadedProjects.find((p) => p.id === newProjectId) ||
            loadedProjects[0],
        );
      }

      setDuplicateProjectOpen(false);
      setProjectToDuplicate(null);
      toast.success("Project duplicated.");
    } catch (e) {
      console.error("Failed to duplicate project", e);
      toast.error("Failed to duplicate project.");
    }
  };

  const loadProjectData = async (project: Project) => {
    if (!project.id) return project;

    try {
      const [dbTasks, dbFiles] = await Promise.all([
        fetchTasks(project.id),
        fetchProjectFiles(project.id),
      ]);

      const tasks: ProjectTask[] = dbTasks.map((t) => ({
        id: t.id,
        name: (t as any).title ?? t.name ?? "",
        description: t.description ?? undefined,
        status: t.status as ProjectTask["status"],
        dateAdded: t.date_added ?? new Date(t.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        dueDate: t.due_date ? (() => { const [y,m,d] = String(t.due_date).split("-").map(Number); return new Date(y,m-1,d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); })() : "-",
        priority: t.priority as ProjectTask["priority"],
        files: t.task_files?.map((f) => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          uploadedAt: f.uploaded_at,
          url: f.url,
        })),
      }));

      const uploadedFiles: ProjectFile[] = dbFiles.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        uploadedAt: f.uploaded_at,
      }));

      const taskFileCount = tasks.reduce(
        (sum, t) => sum + (t.files?.length ?? 0),
        0,
      );
      return {
        ...project,
        tasks,
        uploadedFiles,
        files: uploadedFiles.length + taskFileCount,
      };
    } catch (e) {
      console.error("Failed to load project data", e);
      return project;
    }
  };

  const openProject = async (project: Project) => {
    const resolved = await loadProjectData(project);
    setSelectedProject(resolved);
    setIsProjectDrawerOpen(true);
    setActiveTab("projects");
  };

  const handleFilesChange = async (files: ProjectFile[]) => {
    setProjectList((prev) =>
      prev.map((p) =>
        p.id === selectedProject.id
          ? { ...p, uploadedFiles: files, files: files.length }
          : p,
      ),
    );
    setSelectedProject((prev) => ({
      ...prev,
      uploadedFiles: files,
      files: files.length,
    }));

    if (!selectedProject.id) return;

    const prev = selectedProject.uploadedFiles;
    // New files: in `files` but not in `prev` (no id yet)
    const added = files.filter((f) => !f.id);
    // Removed files: in `prev` but not in `files`
    const removed = prev.filter(
      (p) => p.id && !files.find((f) => f.id === p.id),
    );

    try {
      for (const f of added) {
        const saved = await createProjectFile({
          project_id: selectedProject.id,
          name: f.name,
          size: f.size,
          type: f.type,
          uploaded_at: f.uploadedAt,
        });
        // Patch the id onto the local copy
        f.id = saved.id;
      }
      for (const f of removed) {
        if (f.id) await deleteProjectFile(f.id);
      }
    } catch (e) {
      console.error("Failed to sync project files", e);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 -z-10 opacity-20"
        animate={{
          background: [
            "radial-gradient(circle at 50% 50%, rgba(120, 41, 190, 0.5) 0%, rgba(53, 71, 125, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 30% 70%, rgba(233, 30, 99, 0.5) 0%, rgba(81, 45, 168, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 70% 30%, rgba(76, 175, 80, 0.5) 0%, rgba(32, 119, 188, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 50% 50%, rgba(120, 41, 190, 0.5) 0%, rgba(53, 71, 125, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
          ],
        }}
        transition={{
          duration: 30,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-background transition-transform duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col border-r">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-10 items-center justify-center">
                <img
                  src="/BPC-Logo.jpg"
                  alt="BPC Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-semibold">Broken Pony Club</h2>
                <p className="text-xs text-muted-foreground">Project Manager</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full rounded-2xl bg-muted pl-9 pr-4 py-2"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-2">
            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <div key={item.title} className="mb-1">
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium",
                      activeTab === item.title.toLowerCase()
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted",
                    )}
                    onClick={() => {
                      if (item.dynamicType || item.items) {
                        toggleExpanded(item.title);
                        setActiveTab(item.title.toLowerCase());
                      } else {
                        setActiveTab(item.title.toLowerCase());
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.title}</span>
                    </div>
                    {(item.dynamicType === "projects" || item.dynamicType === "tasks") && (
                      <Badge
                        variant="outline"
                        className="ml-auto rounded-full px-2 py-0.5 text-xs"
                      >
                        {item.dynamicType === "projects"
                          ? projectList.length
                          : projectList.flatMap((p) => p.tasks ?? []).length}
                      </Badge>
                    )}
                    {(item.dynamicType || item.items) && (
                      <ChevronDown
                        className={cn(
                          "ml-2 h-4 w-4 transition-transform",
                          expandedItems[item.title] ? "rotate-180" : "",
                        )}
                      />
                    )}
                  </button>

                  {(item.dynamicType || item.items) &&
                    expandedItems[item.title] && (
                      <div className="mt-1 ml-6 space-y-1 border-l pl-3">

                        {/* Projects: list each project by name */}
                        {item.dynamicType === "projects" && projectList.map((p) => (
                          <button
                            key={p.id ?? p.name}
                            onClick={() => {
                              setActiveTab("projects");
                              openProject(p);
                            }}
                            className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm hover:bg-muted text-left"
                          >
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}

                        {/* Tasks: group all tasks by status across all projects */}
                        {item.dynamicType === "tasks" && (() => {
                          const allTasks = projectList.flatMap((p) => p.tasks ?? []);
                          const groups: Record<string, number> = {};
                          allTasks.forEach((t) => {
                            groups[t.status] = (groups[t.status] ?? 0) + 1;
                          });
                          return Object.entries(groups).map(([status, count]) => (
                            <button
                              key={status}
                              onClick={() => {
                                setTaskStatusFilter(status);
                                setActiveTab("tasks");
                              }}
                              className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm hover:bg-muted text-left"
                            >
                              {status}
                              <Badge variant="outline" className="ml-auto rounded-full px-2 py-0.5 text-xs">
                                {count}
                              </Badge>
                            </button>
                          ));
                        })()}

                        {/* Files: static items */}
                        {item.dynamicType === "files" && (item.items ?? []).map((subItem) => (
                          <button
                            key={subItem.title}
                            onClick={() => {
                              setFileFilter(subItem.filter ?? "all");
                              setActiveTab("files");
                            }}
                            className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm hover:bg-muted text-left"
                          >
                            {subItem.title}
                            {subItem.badge && (
                              <Badge variant="outline" className="ml-auto rounded-full px-2 py-0.5 text-xs">
                                {subItem.badge}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted",
                  activeTab === "settings" ? "bg-primary/10 text-primary" : "",
                )}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </button>
              <div className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium">
                <div className="flex items-center gap-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src="/placeholder.svg?height=32&width=32"
                      alt="User"
                    />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <span>{userName}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-auto rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-64 transform border-r bg-background transition-transform duration-300 ease-in-out md:block",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-10 items-center justify-center">
                <img
                  src="/BPC-Logo.jpg"
                  alt="BPC Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h2 className="font-semibold">Broken Pony Club</h2>
                <p className="text-xs text-muted-foreground">Project Manager</p>
              </div>
            </div>
          </div>

          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search..."
                className="w-full rounded-2xl bg-muted pl-9 pr-4 py-2"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 px-3 py-2">
            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <div key={item.title} className="mb-1">
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium",
                      activeTab === item.title.toLowerCase()
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted",
                    )}
                    onClick={() => {
                      if (item.dynamicType || item.items) {
                        toggleExpanded(item.title);
                        setActiveTab(item.title.toLowerCase());
                      } else {
                        setActiveTab(item.title.toLowerCase());
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.title}</span>
                    </div>
                    {(item.dynamicType === "projects" || item.dynamicType === "tasks") && (
                      <Badge
                        variant="outline"
                        className="ml-auto rounded-full px-2 py-0.5 text-xs"
                      >
                        {item.dynamicType === "projects"
                          ? projectList.length
                          : projectList.flatMap((p) => p.tasks ?? []).length}
                      </Badge>
                    )}
                    {(item.dynamicType || item.items) && (
                      <ChevronDown
                        className={cn(
                          "ml-2 h-4 w-4 transition-transform",
                          expandedItems[item.title] ? "rotate-180" : "",
                        )}
                      />
                    )}
                  </button>

                  {(item.dynamicType || item.items) &&
                    expandedItems[item.title] && (
                      <div className="mt-1 ml-6 space-y-1 border-l pl-3">

                        {/* Projects: list each project by name */}
                        {item.dynamicType === "projects" && projectList.map((p) => (
                          <button
                            key={p.id ?? p.name}
                            onClick={() => {
                              setActiveTab("projects");
                              openProject(p);
                            }}
                            className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm hover:bg-muted text-left"
                          >
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}

                        {/* Tasks: group all tasks by status across all projects */}
                        {item.dynamicType === "tasks" && (() => {
                          const allTasks = projectList.flatMap((p) => p.tasks ?? []);
                          const groups: Record<string, number> = {};
                          allTasks.forEach((t) => {
                            groups[t.status] = (groups[t.status] ?? 0) + 1;
                          });
                          return Object.entries(groups).map(([status, count]) => (
                            <button
                              key={status}
                              onClick={() => {
                                setTaskStatusFilter(status);
                                setActiveTab("tasks");
                              }}
                              className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm hover:bg-muted text-left"
                            >
                              {status}
                              <Badge variant="outline" className="ml-auto rounded-full px-2 py-0.5 text-xs">
                                {count}
                              </Badge>
                            </button>
                          ));
                        })()}

                        {/* Files: static items */}
                        {item.dynamicType === "files" && (item.items ?? []).map((subItem) => (
                          <button
                            key={subItem.title}
                            onClick={() => {
                              setFileFilter(subItem.filter ?? "all");
                              setActiveTab("files");
                            }}
                            className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm hover:bg-muted text-left"
                          >
                            {subItem.title}
                            {subItem.badge && (
                              <Badge variant="outline" className="ml-auto rounded-full px-2 py-0.5 text-xs">
                                {subItem.badge}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab("settings")}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted",
                  activeTab === "settings" ? "bg-primary/10 text-primary" : "",
                )}
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </button>
              <div className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium">
                <div className="flex items-center gap-3">
                  <Avatar className="h-6 w-6">
                    <AvatarImage
                      src="/placeholder.svg?height=32&width=32"
                      alt="User"
                    />
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <span>{userName}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="ml-auto rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out",
          sidebarOpen ? "md:pl-64" : "md:pl-0",
        )}
      >
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-xl font-semibold">BPC Project Manager</h1>
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-2xl">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-2xl">
                  <div className="px-3 py-2 text-sm font-medium">Messages</div>
                  <DropdownMenuSeparator />
                  <div className="px-3 py-2">
                    <div className="text-sm">You have no new messages.</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Demo content - static for now.
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-2xl relative">
                    <Bell className="h-5 w-5" />
                    {notifications > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {notifications}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-2xl">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm font-medium">Notifications</span>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setNotifications(0)}
                    >
                      Mark all read
                    </button>
                  </div>
                  <DropdownMenuSeparator />
                  {notifications > 0 ? (
                    <div className="px-3 py-2 space-y-2">
                      <div className="flex items-start gap-2 rounded-xl p-2 hover:bg-muted">
                        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                        <div>
                          <p className="text-sm font-medium">Task status updated</p>
                          <p className="text-xs text-muted-foreground">A task was moved to In Review</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 rounded-xl p-2 hover:bg-muted">
                        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                        <div>
                          <p className="text-sm font-medium">Due date approaching</p>
                          <p className="text-xs text-muted-foreground">2 tasks due within 48 hours</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  )}
                  <DropdownMenuSeparator />
                  <div className="px-3 py-2">
                    <button
                      className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
                      onClick={() => {
                        if ("Notification" in window && Notification.permission === "default") {
                          Notification.requestPermission();
                        }
                      }}
                    >
                      {typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted"
                        ? "Browser notifications enabled"
                        : "Enable browser notifications"}
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-9 w-9 border-2 border-primary cursor-pointer">
                    {settingsAvatarUrl && <AvatarImage src={settingsAvatarUrl} alt="User" />}
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl">
                  <div className="px-3 py-2 text-sm font-medium">
                    {userName}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setActiveTab("settings")}
                    className="cursor-pointer gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>


        <Dialog
          open={duplicateProjectOpen}
          onOpenChange={setDuplicateProjectOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Duplicate Project</DialogTitle>
              <DialogDescription>
                This will create a copy of "{projectToDuplicate?.name}" with all
                tasks reset to "Todo" status.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDuplicateProjectOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  projectToDuplicate &&
                  handleDuplicateProject(projectToDuplicate)
                }
              >
                Duplicate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <main className="flex-1 p-4 md:p-6">
          <Tabs
            defaultValue="home"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <TabsList className="grid w-full max-w-[560px] grid-cols-4 rounded-2xl p-1">
                <TabsTrigger
                  value="home"
                  className="rounded-xl data-[state=active]:rounded-xl"
                >
                  Home
                </TabsTrigger>
                <TabsTrigger
                  value="projects"
                  className="rounded-xl data-[state=active]:rounded-xl"
                >
                  Projects
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="rounded-xl data-[state=active]:rounded-xl"
                >
                  Tasks
                </TabsTrigger>
                <TabsTrigger
                  value="files"
                  className="rounded-xl data-[state=active]:rounded-xl"
                >
                  Files
                </TabsTrigger>
                {/*
                <TabsTrigger value="apps" className="rounded-xl data-[state=active]:rounded-xl">
                  Apps
                </TabsTrigger>
                <TabsTrigger value="learn" className="rounded-xl data-[state=active]:rounded-xl">
                  Learn
                </TabsTrigger>
                */}
              </TabsList>
              <div className="hidden md:flex gap-2">
                <Button
                  className="rounded-2xl"
                  onClick={() => setIsCreateProjectOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Project
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="home" className="space-y-8 mt-0">
                  {/* Daily checker stat cards */}
                  {(() => {
                    const today = new Date();
                    const todayStr = today.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }).replace(",", "");
                    const allTasksFlat = projectList.flatMap((p) => p.tasks ?? []);
                    const activeTasks = allTasksFlat.filter((t) => t.status !== "Complete");
                    const dueTodayCount = activeTasks.filter((t) => {
                      if (!t.dueDate || t.dueDate === "-") return false;
                      try { return new Date(t.dueDate).toDateString() === today.toDateString(); } catch { return false; }
                    }).length;
                    const overdueCount = activeTasks.filter((t) => {
                      if (!t.dueDate || t.dueDate === "-") return false;
                      try { return new Date(t.dueDate) < today && new Date(t.dueDate).toDateString() !== today.toDateString(); } catch { return false; }
                    }).length;
                    const inProgressCount = activeTasks.filter((t) => t.status === "In Progress").length;
                    const awaitingCount = activeTasks.filter((t) => t.status === "Awaiting Client").length;
                    return (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {/* Today's Tasks */}
                        <div className="rounded-3xl border bg-card p-6 space-y-1">
                          <p className="text-sm text-muted-foreground font-medium">Today&apos;s Tasks</p>
                          <p className="text-4xl font-bold">{dueTodayCount}</p>
                          <p className="text-sm text-muted-foreground">
                            {overdueCount > 0
                              ? <span className="text-destructive font-medium">{overdueCount} overdue</span>
                              : "due today"}
                          </p>
                        </div>
                        {/* Active Work */}
                        <div className="rounded-3xl border bg-card p-6 space-y-1">
                          <p className="text-sm text-muted-foreground font-medium">Active Work</p>
                          <p className="text-4xl font-bold">{inProgressCount}</p>
                          <p className="text-sm text-muted-foreground">
                            in progress
                            {awaitingCount > 0 && <> · <span className="text-amber-500 font-medium">{awaitingCount} awaiting client</span></>}
                          </p>
                        </div>
                        {/* Task Status Pie Chart */}
                        {(() => {
                          const allTasks2 = projectList.flatMap((p) => p.tasks ?? []);
                          const statusColors: Record<string, string> = {
                            "Todo": "hsl(220 9% 55%)",
                            "In Progress": "hsl(221 83% 53%)",
                            "In Review": "hsl(43 96% 50%)",
                            "Awaiting Client": "hsl(32 98% 52%)",
                            "Complete": "hsl(142 71% 45%)",
                          };
                          const pieData = Object.entries(
                            allTasks2.reduce<Record<string, number>>((acc, t) => {
                              acc[t.status] = (acc[t.status] ?? 0) + 1;
                              return acc;
                            }, {})
                          ).map(([status, count]) => ({ status, count, fill: statusColors[status] ?? "hsl(220 9% 55%)" }));
                          const total = allTasks2.length;
                          return (
                            <div className="rounded-3xl border bg-card p-4 flex flex-col">
                              <p className="text-sm text-muted-foreground font-medium mb-1">Tasks by Status</p>
                              <ChartContainer config={{}} className="mx-auto w-full max-h-[140px]">
                                <PieChart>
                                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                                  <Pie data={pieData} dataKey="count" nameKey="status" innerRadius={42} strokeWidth={3}>
                                    {pieData.map((entry, i) => (
                                      <Cell key={i} fill={entry.fill} />
                                    ))}
                                    <PieLabel
                                      content={({ viewBox }) => {
                                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                          return (
                                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">{total}</tspan>
                                              <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-xs">tasks</tspan>
                                            </text>
                                          );
                                        }
                                      }}
                                    />
                                  </Pie>
                                </PieChart>
                              </ChartContainer>
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
                                {pieData.map((d) => (
                                  <span key={d.status} className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.fill }} />
                                    {d.status} ({d.count})
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}

                  {/* Row 1: Projects (left) + Tasks (right) */}
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-1">
                    {/* Projects */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Projects</h2>
                        <Button
                          variant="ghost"
                          className="rounded-2xl"
                          onClick={() => setActiveTab("projects")}
                        >
                          View All
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {projectList
                            .filter((p) => p.progress < 100)
                            .slice(0, 3)
                            .map((project, index) => (
                              <motion.div
                                key={project.id ?? `${project.name}-${index}`}
                                whileHover={{ scale: 1.02, y: -5 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Card className="overflow-hidden rounded-3xl border hover:border-primary/50 transition-all duration-300 flex flex-col h-full">
                                  <CardHeader>
                                    <div className="mb-2">
                                      <div className="flex items-center justify-between mb-1">
                                        <CardTitle>{project.name}</CardTitle>
                                        <Badge
                                          variant="outline"
                                          className={`rounded-xl ${projectStatusClass[getProjectStatus(project)]}`}
                                        >
                                          {getProjectStatus(project)}
                                        </Badge>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="rounded-xl"
                                      >
                                        Due {project.dueDate}
                                      </Badge>
                                    </div>
                                    <CardDescription>
                                      {project.description}
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent className="space-y-4 flex-grow">
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between text-sm">
                                        <span>Progress</span>
                                        <span>
                                          {project.tasks.length === 0
                                            ? project.progress
                                            : Math.round(
                                                (project.tasks.filter(
                                                  (t) => t.status === "Complete",
                                                ).length /
                                                  project.tasks.length) *
                                                  100,
                                              )}
                                          %
                                        </span>
                                      </div>
                                      <Progress
                                        value={
                                          project.tasks.length === 0
                                            ? project.progress
                                            : Math.round(
                                                (project.tasks.filter(
                                                  (t) => t.status === "Complete",
                                                ).length /
                                                  project.tasks.length) *
                                                  100,
                                              )
                                        }
                                        className="h-2 rounded-xl"
                                      />
                                    </div>
                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                      <div className="flex items-center">
                                        <Clock className="mr-1 h-4 w-4" />
                                        {project.tasks.filter((t) => t.status !== "Complete").length} tasks
                                      </div>
                                      <div className="flex items-center">
                                        <FileText className="mr-1 h-4 w-4" />
                                        {(project.uploadedFiles?.length ?? 0) + (project.tasks ?? []).reduce((sum, t) => sum + (t.files?.length ?? 0), 0)} files
                                      </div>
                                    </div>
                                  </CardContent>
                                  <CardFooter className="flex gap-2">
                                    <Button
                                      variant="secondary"
                                      className="flex-1 rounded-2xl"
                                      onClick={() => openProject(project)}
                                    >
                                      Open Project
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="rounded-2xl"
                                      onClick={() => {
                                        setProjectToDuplicate(project);
                                        setDuplicateProjectOpen(true);
                                      }}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </CardFooter>
                                </Card>
                              </motion.div>
                            ))}
                      </div>
                    </section>

                    {/* Recent Tasks */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Recent Tasks</h2>
                        <Button
                          variant="ghost"
                          className="rounded-2xl"
                          onClick={() => setActiveTab("tasks")}
                        >
                          View All
                        </Button>
                      </div>
                      <div className="rounded-3xl border overflow-hidden">
                        <div className="relative w-full overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="border-b hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <TableHead className="w-[35%]">Task</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Date Added</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Files</TableHead>
                                <TableHead className="w-10"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(() => {
                                const allTasks = projectList.flatMap((p) =>
                                  (p.tasks ?? []).map((t) => ({
                                    ...t,
                                    projectName: p.name,
                                    projectRef: p,
                                  })),
                                );
                                const tasksByStatus = allTasks.reduce(
                                  (acc, task) => {
                                    if (!acc[task.status])
                                      acc[task.status] = [];
                                    acc[task.status].push(task);
                                    return acc;
                                  },
                                  {} as Record<string, typeof allTasks>,
                                );
                                const statusKeys = Object.keys(tasksByStatus);
                                if (statusKeys.length === 0) {
                                  return (
                                    <TableRow>
                                      <TableCell
                                        colSpan={7}
                                        className="text-center text-muted-foreground py-8"
                                      >
                                        No tasks yet.
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                                return statusKeys.flatMap((status) => {
                                  const tasks = tasksByStatus[status].slice(
                                    0,
                                    3,
                                  ); // limit to 3 tasks per status
                                  const isExpanded = expandedTasks.has(status);
                                  return [
                                    <TableRow
                                      key={`header-${status}`}
                                      className="bg-muted/30 cursor-pointer select-none hover:bg-muted/50"
                                      onClick={() => {
                                        setExpandedTasks((prev) => {
                                          const newSet = new Set(prev);
                                          if (isExpanded) newSet.delete(status);
                                          else newSet.add(status);
                                          return newSet;
                                        });
                                      }}
                                    >
                                      <TableCell className="font-semibold">
                                        <span className="flex items-center gap-2">
                                          <ChevronDown
                                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                          />
                                          {status} (
                                          {tasksByStatus[status].length})
                                        </span>
                                      </TableCell>
                                      <TableCell></TableCell>
                                      <TableCell></TableCell>
                                      <TableCell></TableCell>
                                      <TableCell></TableCell>
                                      <TableCell></TableCell>
                                      <TableCell></TableCell>
                                    </TableRow>,
                                    ...(isExpanded
                                      ? tasks.map((task, i) => (
                                          <TableRow
                                            key={
                                              task.id ?? `task-${status}-${i}`
                                            }
                                            className="cursor-pointer hover:bg-muted/30"
                                            onClick={() =>
                                              openGlobalViewTask(
                                                task,
                                                task.projectRef,
                                              )
                                            }
                                          >
                                            <TableCell className="font-medium">
                                              {task.name}
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className={`inline-block h-2 w-2 rounded-full ${statusDotClass[task.status]}`}
                                                />
                                                <Select value={task.status}>
                                                  <SelectTrigger className="h-7 rounded-xl border-0 bg-transparent px-2 text-xs shadow-none focus:ring-0 w-[130px]">
                                                    <SelectValue />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {taskStatusOptions.map(
                                                      (s) => (
                                                        <SelectItem
                                                          key={s}
                                                          value={s}
                                                        >
                                                          {s}
                                                        </SelectItem>
                                                      ),
                                                    )}
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              {task.dateAdded}
                                            </TableCell>
                                            <TableCell>
                                              {task.dueDate}
                                            </TableCell>
                                            <TableCell>
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  "rounded-xl text-xs",
                                                  task.priority !== "-" &&
                                                    priorityClass[
                                                      task.priority as Exclude<
                                                        ProjectTask["priority"],
                                                        "-"
                                                      >
                                                    ],
                                                )}
                                              >
                                                {task.priority === "-"
                                                  ? task.status
                                                  : task.priority}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>
                                              {task.files && task.files.length > 0 ? (
                                                <Badge variant="outline" className="rounded-xl gap-1">
                                                  <Paperclip className="h-3 w-3" />
                                                  {task.files.length}
                                                </Badge>
                                              ) : (
                                                <span className="text-muted-foreground">-</span>
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 rounded-xl"
                                                  >
                                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                                  </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                  <DropdownMenuItem
                                                    onClick={() =>
                                                      openGlobalViewTask(
                                                        task,
                                                        task.projectRef,
                                                      )
                                                    }
                                                  >
                                                    View Details
                                                  </DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem
                                                    className="gap-2 text-destructive focus:text-destructive"
                                                    onClick={() => {
                                                      const proj = projectList.find(p => p.id === task.projectRef.id);
                                                      if (!proj) return;
                                                      const idx = proj.tasks.findIndex(t => t.id === task.id);
                                                      if (idx === -1) return;
                                                      if (task.id) dbDeleteTask(task.id).catch(console.error);
                                                      setProjectList(prev => prev.map(p =>
                                                        p.id === proj.id ? { ...p, tasks: p.tasks.filter((_, i) => i !== idx) } : p
                                                      ));
                                                    }}
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                                  </DropdownMenuItem>
                                                </DropdownMenuContent>
                                              </DropdownMenu>
                                            </TableCell>
                                          </TableRow>
                                        ))
                                      : []),
                                  ];
                                });
                              })()}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Row 2: Recent Files (full width) */}
                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold">Recent Files</h2>
                      <Button
                        variant="ghost"
                        className="rounded-2xl"
                        onClick={() => setActiveTab("files")}
                      >
                        View All
                      </Button>
                    </div>
                    <div className="rounded-3xl border overflow-hidden">
                      <div className="bg-muted/50 p-3 hidden md:grid md:grid-cols-12 text-sm font-medium text-muted-foreground">
                        <div className="col-span-4">Name</div>
                        <div className="col-span-2">Project</div>
                        <div className="col-span-2">Task</div>
                        <div className="col-span-2">Size</div>
                        <div className="col-span-2 text-right">Actions</div>
                      </div>
                      <div className="divide-y">
                        {dedupedProjectFiles.length === 0 ? (
                          <p className="py-12 text-center text-sm text-muted-foreground">
                            No files uploaded yet. Upload files inside a project
                            workspace.
                          </p>
                        ) : (
                          (() => {
                            const sliced = dedupedProjectFiles.slice(0, 4);
                            return (
                              <>
                                {sliced.map((file, idx) => (
                            <motion.div
                              key={file.id ?? idx}
                              whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                              className="p-3 md:grid md:grid-cols-12 items-center flex flex-col md:flex-row gap-3 md:gap-0"
                            >
                              <div className="col-span-4 flex items-center gap-3 w-full md:w-auto min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
                                  {getFileIcon(file.name, file.type)}
                                </div>
                                <div className="min-w-0">
                                  {file.url ? (
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-primary underline underline-offset-2 truncate block"
                                    >
                                      {file.name}
                                    </a>
                                  ) : (
                                    <p className="font-medium truncate">{file.name}</p>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-2 text-sm text-muted-foreground truncate">
                                <span className="font-medium text-foreground/60">Project: </span>{file.projectName}
                              </div>
                              <div className="col-span-2 text-sm text-muted-foreground truncate">
                                {file.taskName ? (
                                  <><span className="font-medium text-foreground/60">Task: </span>{file.taskName}</>
                                ) : "-"}
                              </div>
                              <div className="col-span-2 text-sm text-muted-foreground">
                                {(file.size / 1024).toFixed(0)} KB
                              </div>
                              <div className="col-span-2 flex items-center gap-1 justify-end w-full md:w-auto">
                                {file.url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl h-7 px-2 text-xs"
                                    asChild
                                  >
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-xl"
                                  onClick={() => openProject(file.projectRef)}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </motion.div>
                          ))}
                                {dedupedProjectFiles.length > 4 && (
                                  <div className="col-span-12 mt-3 p-3 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                      Showing 4 of {dedupedProjectFiles.length} files —{" "}
                                      <Button
                                        variant="link"
                                        className="p-0 h-auto font-medium"
                                        onClick={() => setActiveTab("files")}
                                      >
                                        View all files
                                      </Button>
                                    </p>
                                  </div>
                                )}
                              </>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="tasks" className="mt-0">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold">
                        {taskStatusFilter ? taskStatusFilter : "All Tasks"}
                      </h2>
                      <div className="flex items-center gap-2">
                        {taskSortField && (
                          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => { setTaskSortField(null); setTaskSortDir("asc"); }}>
                            Clear sort
                          </Button>
                        )}
                        {taskStatusFilter && (
                          <Button variant="ghost" size="sm" className="rounded-2xl" onClick={() => setTaskStatusFilter(null)}>
                            Clear filter
                          </Button>
                        )}
                        {!taskStatusFilter && (() => {
                          const completedCount = projectList.flatMap((p) => p.tasks ?? []).filter((t) => t.status === "Complete").length;
                          return completedCount > 0 ? (
                            <Button variant="outline" size="sm" className="rounded-2xl gap-2" onClick={() => setShowCompletedTasks((v) => !v)}>
                              {showCompletedTasks ? "Hide Completed" : "Show Completed"}
                              <Badge variant="secondary" className="rounded-xl px-1.5">{completedCount}</Badge>
                            </Button>
                          ) : null;
                        })()}
                      </div>
                    </div>
                    {projectList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No projects yet.
                      </p>
                    ) : (
                      projectList.map((project) => {
                        const allTasks = project.tasks ?? [];
                        const tasks = taskStatusFilter
                          ? allTasks.filter((t) => t.status === taskStatusFilter)
                          : allTasks;
                        if (tasks.length === 0) return null;
                        const grouped: Record<string, typeof tasks> = {};
                        tasks.forEach((t) => {
                          if (!grouped[t.status]) grouped[t.status] = [];
                          grouped[t.status].push(t);
                        });
                        const visibleStatuses = taskStatusOptions.filter(
                          (s) => grouped[s] && (s !== "Complete" || showCompletedTasks || !!taskStatusFilter),
                        );
                        if (visibleStatuses.length === 0) return null;
                        const taskCols: { label: string; field: "name" | "dateAdded" | "dueDate" | "priority" | null }[] = [
                          { label: "Task", field: "name" },
                          { label: "Status", field: null },
                          { label: "Date Added", field: "dateAdded" },
                          { label: "Due Date", field: "dueDate" },
                          { label: "Priority", field: "priority" },
                        ];
                        return (
                          <div key={project.id ?? project.name} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{project.name}</h3>
                              <Badge variant="outline" className="rounded-xl">
                                {tasks.filter((t) => t.status !== "Complete").length} active
                              </Badge>
                            </div>
                            <div className="rounded-3xl overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    {taskCols.map(({ label, field }) => (
                                      <TableHead key={label}>
                                        {field ? (
                                          <button
                                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                                            onClick={() => handleTaskSort(field)}
                                          >
                                            {label}
                                            {taskSortField === field ? (
                                              taskSortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
                                            ) : (
                                              <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                                            )}
                                          </button>
                                        ) : label}
                                      </TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {visibleStatuses.flatMap((status) => {
                                    const groupKey = `${project.id ?? project.name}-${status}`;
                                    const isCollapsed = collapsedTaskGroups.has(groupKey);
                                    const sortedGroup = sortTaskGroup(grouped[status]);
                                    return [
                                      <TableRow
                                        key={`grp-${groupKey}`}
                                        className="bg-muted/30 cursor-pointer select-none hover:bg-muted/50"
                                        onClick={() => toggleTaskGroup(groupKey)}
                                      >
                                        <TableCell className="font-semibold" colSpan={5}>
                                          <span className="flex items-center gap-2">
                                            <ChevronDown
                                              className={cn(
                                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                                isCollapsed && "-rotate-90",
                                              )}
                                            />
                                            {status} ({grouped[status].length})
                                          </span>
                                        </TableCell>
                                      </TableRow>,
                                      ...(!isCollapsed
                                        ? sortedGroup.map((task, i) => (
                                            <TableRow
                                              key={task.id ?? `${groupKey}-${i}`}
                                              className="cursor-pointer hover:bg-muted/30"
                                              onClick={() => openGlobalViewTask(task, project)}
                                            >
                                              <TableCell className="font-medium pl-8">{task.name}</TableCell>
                                              <TableCell>
                                                <span className="inline-flex items-center gap-1.5">
                                                  <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", statusDotClass[task.status])} />
                                                  {task.status}
                                                </span>
                                              </TableCell>
                                              <TableCell className="text-muted-foreground">{task.dateAdded}</TableCell>
                                              <TableCell className="text-muted-foreground">{task.dueDate}</TableCell>
                                              <TableCell>
                                                {task.priority === "-" ? (
                                                  <span className="text-muted-foreground">-</span>
                                                ) : (
                                                  <Badge variant="outline" className={cn("rounded-xl", priorityClass[task.priority as Exclude<ProjectTask["priority"], "-">])}>
                                                    {task.priority}
                                                  </Badge>
                                                )}
                                              </TableCell>
                                              <TableCell onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-xl">
                                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                                    </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end" className="rounded-2xl">
                                                    <DropdownMenuItem onClick={() => openGlobalViewTask(task, project)} className="gap-2">
                                                      <Eye className="h-3.5 w-3.5" /> View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                      className="gap-2 text-destructive focus:text-destructive"
                                                      onClick={() => {
                                                        const idx = project.tasks.findIndex(t => t.id === task.id);
                                                        if (idx === -1) return;
                                                        if (task.id) dbDeleteTask(task.id).catch(console.error);
                                                        setProjectList(prev => prev.map(p =>
                                                          p.id === project.id ? { ...p, tasks: p.tasks.filter((_, i) => i !== idx) } : p
                                                        ));
                                                      }}
                                                    >
                                                      <Trash2 className="h-3.5 w-3.5" /> Delete
                                                    </DropdownMenuItem>
                                                  </DropdownMenuContent>
                                                </DropdownMenu>
                                              </TableCell>
                                            </TableRow>
                                          ))
                                        : []),
                                    ];
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </TabsContent>

                {/*
                <TabsContent value="apps" className="space-y-8 mt-0">
                  <section>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="overflow-hidden rounded-3xl bg-gradient-to-r from-pink-600 via-red-600 to-orange-600 p-8 text-white"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <h2 className="text-3xl font-bold">Creative Apps Collection</h2>
                          <p className="max-w-[600px] text-white/80">
                            Discover our full suite of professional design and creative applications.
                          </p>
                        </div>
                        <Button className="w-fit rounded-2xl bg-white text-red-700 hover:bg-white/90">
                          <Download className="mr-2 h-4 w-4" />
                          Install Desktop App
                        </Button>
                      </div>
                    </motion.div>
                  </section>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <Button variant="outline" className="rounded-2xl">
                      All Categories
                    </Button>
                    <Button variant="outline" className="rounded-2xl">
                      Creative
                    </Button>
                    <Button variant="outline" className="rounded-2xl">
                      Video
                    </Button>
                    <Button variant="outline" className="rounded-2xl">
                      Web
                    </Button>
                    <Button variant="outline" className="rounded-2xl">
                      3D
                    </Button>
                    <div className="flex-1"></div>
                    <div className="relative w-full md:w-auto mt-3 md:mt-0">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search apps..."
                        className="w-full rounded-2xl pl-9 md:w-[200px]"
                      />
                    </div>
                  </div>

                  <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">New Releases</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {apps
                        .filter((app) => app.new)
                        .map((app) => (
                          <motion.div key={app.name} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
                            <Card className="overflow-hidden rounded-3xl border-2 hover:border-primary/50 transition-all duration-300">
                              <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                                    {app.icon}
                                  </div>
                                  <Badge className="rounded-xl bg-amber-500">New</Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="pb-2">
                                <CardTitle className="text-lg">{app.name}</CardTitle>
                                <CardDescription>{app.description}</CardDescription>
                                <div className="mt-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span>Installation</span>
                                    <span>{app.progress}%</span>
                                  </div>
                                  <Progress value={app.progress} className="h-2 mt-1 rounded-xl" />
                                </div>
                              </CardContent>
                              <CardFooter>
                                <Button variant="secondary" className="w-full rounded-2xl">
                                  {app.progress < 100 ? "Continue Install" : "Open"}
                                </Button>
                              </CardFooter>
                            </Card>
                          </motion.div>
                        ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">All Apps</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {apps.map((app) => (
                        <motion.div key={app.name} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
                          <Card className="overflow-hidden rounded-3xl border hover:border-primary/50 transition-all duration-300">
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                                  {app.icon}
                                </div>
                                <Badge variant="outline" className="rounded-xl">
                                  {app.category}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <CardTitle className="text-lg">{app.name}</CardTitle>
                              <CardDescription>{app.description}</CardDescription>
                            </CardContent>
                            <CardFooter className="flex gap-2">
                              <Button variant="secondary" className="flex-1 rounded-2xl">
                                {app.progress < 100 ? "Install" : "Open"}
                              </Button>
                              <Button variant="outline" size="icon" className="rounded-2xl">
                                <Star className="h-4 w-4" />
                              </Button>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                </TabsContent>
                */}

                <TabsContent value="files" className="space-y-6 mt-0">
                  <div className="flex flex-wrap gap-3 mb-6">
                    <Button
                      variant={fileFilter === "all" ? "default" : "outline"}
                      className="rounded-2xl"
                      onClick={() => setFileFilter("all")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      All Files
                    </Button>
                    <Button
                      variant={fileFilter === "recent" ? "default" : "outline"}
                      className="rounded-2xl"
                      onClick={() => setFileFilter("recent")}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Recent
                    </Button>
                    <Button
                      variant={fileFilter === "shared" ? "default" : "outline"}
                      className="rounded-2xl"
                      onClick={() => setFileFilter("shared")}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Shared
                    </Button>
                    <Button
                      variant={
                        fileFilter === "favorites" ? "default" : "outline"
                      }
                      className="rounded-2xl"
                      onClick={() => setFileFilter("favorites")}
                    >
                      <Star className="mr-2 h-4 w-4" />
                      Favorites
                    </Button>
                    <Button
                      variant={fileFilter === "trash" ? "default" : "outline"}
                      className="rounded-2xl"
                      onClick={() => setFileFilter("trash")}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Trash
                    </Button>
                    <div className="flex-1"></div>
                    <div className="relative w-full md:w-auto mt-3 md:mt-0">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search files..."
                        value={fileSearch}
                        onChange={(e) => setFileSearch(e.target.value)}
                        className="w-full rounded-2xl pl-9 md:w-[200px]"
                      />
                    </div>
                  </div>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold">
                        {fileFilter === "recent"
                          ? "Recent Files"
                          : fileFilter === "shared"
                            ? "Shared Files"
                            : fileFilter === "favorites"
                              ? "Favorites"
                              : fileFilter === "trash"
                                ? "Trash"
                                : "All Files"}
                        {filteredFiles.length > 0 && (
                          <span className="ml-2 text-base font-normal text-muted-foreground">
                            ({filteredFiles.length})
                          </span>
                        )}
                      </h2>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                        >
                          <PanelLeft className="mr-2 h-4 w-4" />
                          Filter
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-2xl"
                        >
                          <ArrowUpDown className="mr-2 h-4 w-4" />
                          Sort
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-3xl border overflow-hidden">
                      <div className="bg-muted/50 p-3 hidden md:grid md:grid-cols-12 text-sm font-medium text-muted-foreground">
                        <div className="col-span-4">Name</div>
                        <div className="col-span-2">Project</div>
                        <div className="col-span-2">Task</div>
                        <div className="col-span-2">Size</div>
                        <div className="col-span-2">Uploaded</div>
                      </div>
                      <div className="divide-y">
                        {filteredFiles.length === 0 ? (
                          <p className="py-12 text-center text-sm text-muted-foreground">
                            No files uploaded yet. Upload files inside a project
                            workspace.
                          </p>
                        ) : (
                          filteredFiles.map((file, idx) => (
                            <motion.div
                              key={file.id ?? idx}
                              whileHover={{
                                backgroundColor: "rgba(0,0,0,0.02)",
                              }}
                              className="p-3 md:grid md:grid-cols-12 items-center flex flex-col md:flex-row gap-3 md:gap-0"
                            >
                              <div className="col-span-4 flex items-center gap-3 w-full md:w-auto min-w-0">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted">
                                  {getFileIcon(file.name, file.type)}
                                </div>
                                <div className="min-w-0">
                                  {file.url ? (
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="font-medium text-primary underline underline-offset-2 truncate block"
                                    >
                                      {file.name}
                                    </a>
                                  ) : (
                                    <p className="font-medium truncate">
                                      {file.name}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="col-span-2 text-sm text-muted-foreground truncate">
                                <span className="font-medium text-foreground/60">Project: </span>{file.projectName}
                              </div>
                              <div className="col-span-2 text-sm text-muted-foreground truncate">
                                {file.taskName ? (
                                  <><span className="font-medium text-foreground/60">Task: </span>{file.taskName}</>
                                ) : (
                                  "-"
                                )}
                              </div>
                              <div className="col-span-2 text-sm text-muted-foreground">
                                {(file.size / 1024).toFixed(0)} KB
                              </div>
                              <div className="col-span-2 flex items-center gap-1 justify-end w-full md:w-auto">
                                {file.url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl h-7 px-2 text-xs"
                                    asChild
                                  >
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      Download
                                    </a>
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-xl"
                                  onClick={() => openProject(file.projectRef)}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="projects" className="space-y-6 mt-0">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant={projectFilter === "all" ? "default" : "outline"}
                      className="rounded-2xl"
                      onClick={() => setProjectFilter("all")}
                    >
                      <Layers className="mr-2 h-4 w-4" />
                      All Projects
                    </Button>
                    {hasTodoProjects && (
                      <Button
                        variant={
                          projectFilter === "todo" ? "default" : "outline"
                        }
                        className="rounded-2xl"
                        onClick={() => setProjectFilter("todo")}
                      >
                        <Circle className="mr-2 h-4 w-4" />
                        Todo
                      </Button>
                    )}
                    {hasAwaitingClientProjects && (
                      <Button
                        variant={
                          projectFilter === "awaiting-client"
                            ? "default"
                            : "outline"
                        }
                        className="rounded-2xl"
                        onClick={() => setProjectFilter("awaiting-client")}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Awaiting Client
                      </Button>
                    )}
                    {hasInReviewProjects && (
                      <Button
                        variant={
                          projectFilter === "in-review" ? "default" : "outline"
                        }
                        className="rounded-2xl"
                        onClick={() => setProjectFilter("in-review")}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        In Review
                      </Button>
                    )}
                    {hasInProgressProjects && (
                      <Button
                        variant={
                          projectFilter === "in-progress"
                            ? "default"
                            : "outline"
                        }
                        className="rounded-2xl"
                        onClick={() => setProjectFilter("in-progress")}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        In Progress
                      </Button>
                    )}
                    {hasCompletedProjects && (
                      <Button
                        variant={
                          projectFilter === "completed" ? "default" : "outline"
                        }
                        className="rounded-2xl"
                        onClick={() => setProjectFilter("completed")}
                      >
                        <Award className="mr-2 h-4 w-4" />
                        Completed
                      </Button>
                    )}
                    <div className="flex-1"></div>
                    <div className="relative w-full md:w-auto mt-3 md:mt-0">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="w-full rounded-2xl pl-9 md:w-[200px]"
                      />
                    </div>
                  </div>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold">
                        {projectFilter === "completed"
                          ? "Completed Projects"
                          : projectFilter === "in-progress"
                            ? "In Progress Projects"
                            : projectFilter === "in-review"
                              ? "In Review Projects"
                              : projectFilter === "awaiting-client"
                                ? "Awaiting Client Projects"
                                : projectFilter === "todo"
                                  ? "Todo Projects"
                                  : "All Projects"}
                        {filteredProjects.length > 0 && (
                          <span className="ml-2 text-base font-normal text-muted-foreground">
                            ({filteredProjects.length})
                          </span>
                        )}
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {filteredProjects.length === 0 ? (
                        <p className="col-span-3 py-12 text-center text-sm text-muted-foreground">
                          No projects match this filter.
                        </p>
                      ) : (
                        filteredProjects.map((project) => (
                          <motion.div
                            key={project.name}
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Card className="overflow-hidden rounded-3xl border hover:border-primary/50 transition-all duration-300 flex flex-col h-full">
                              <CardHeader>
                                <div className="mb-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <CardTitle>{project.name}</CardTitle>
                                    <Badge
                                      variant="outline"
                                      className={`rounded-xl ${projectStatusClass[getProjectStatus(project)]}`}
                                    >
                                      {getProjectStatus(project)}
                                    </Badge>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="rounded-xl"
                                  >
                                    Due {project.dueDate}
                                  </Badge>
                                </div>
                                <CardDescription>
                                  {project.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4 flex-grow">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span>Progress</span>
                                    <span>
                                      {project.tasks.length === 0
                                        ? project.progress
                                        : Math.round(
                                            (project.tasks.filter(
                                              (t) => t.status === "Complete",
                                            ).length /
                                              project.tasks.length) *
                                              100,
                                          )}
                                      %
                                    </span>
                                  </div>
                                  <Progress
                                    value={
                                      project.tasks.length === 0
                                        ? project.progress
                                        : Math.round(
                                            (project.tasks.filter(
                                              (t) => t.status === "Complete",
                                            ).length /
                                              project.tasks.length) *
                                              100,
                                          )
                                    }
                                    className="h-2 rounded-xl"
                                  />
                                </div>
                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                  <div className="flex items-center">
                                    <Clock className="mr-1 h-4 w-4" />
                                    {project.tasks.length} tasks
                                  </div>
                                  <div className="flex items-center">
                                    <FileText className="mr-1 h-4 w-4" />
                                    {(project.uploadedFiles?.length ?? 0) + (project.tasks ?? []).reduce((sum, t) => sum + (t.files?.length ?? 0), 0)} files
                                  </div>
                                </div>
                              </CardContent>
                              <CardFooter className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  className="flex-1 rounded-2xl"
                                  onClick={() => openProject(project)}
                                >
                                  Open Project
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="rounded-2xl"
                                  onClick={() => {
                                    setProjectToDuplicate(project);
                                    setDuplicateProjectOpen(true);
                                  }}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </CardFooter>
                            </Card>
                          </motion.div>
                        ))
                      )}
                      <motion.div
                        whileHover={{ scale: 1.02, y: -5 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Card className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed p-8 hover:border-primary/50 transition-all duration-300 col-span-1">
                          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <Plus className="h-6 w-6" />
                          </div>
                          <h3 className="text-lg font-medium">
                            Create New Project
                          </h3>
                          <p className="mb-4 text-center text-sm text-muted-foreground">
                            Start a new creative project from scratch or use a
                            template
                          </p>
                          <Button
                            className="rounded-2xl"
                            onClick={() => setIsCreateProjectOpen(true)}
                          >
                            New Project
                          </Button>
                        </Card>
                      </motion.div>
                    </div>
                  </section>
                </TabsContent>

                {/*
                <TabsContent value="learn" className="space-y-8 mt-0">
                  <section>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="overflow-hidden rounded-3xl bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 p-8 text-white"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-2">
                          <h2 className="text-3xl font-bold">Learn & Grow</h2>
                          <p className="max-w-[600px] text-white/80">
                            Expand your creative skills with tutorials, courses, and resources.
                          </p>
                        </div>
                        <Button className="w-fit rounded-2xl bg-white text-emerald-700 hover:bg-white/90">
                          <Crown className="mr-2 h-4 w-4" />
                          Upgrade to Pro
                        </Button>
                      </div>
                    </motion.div>
                  </section>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <Button variant="outline" className="rounded-2xl">
                      <Play className="mr-2 h-4 w-4" />
                      All Tutorials
                    </Button>
                    <Button variant="outline" className="rounded-2xl">
                      <BookOpen className="mr-2 h-4 w-4" />
                      Courses
                    </Button>
                    <Button variant="outline" className="rounded-2xl">
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Tips & Tricks
                    </Button>
                    <Button variant="outline" className="rounded-2xl">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Trending
                    </Button>
                    <Button variant="outline" className="rounded-2xl">
                      <Bookmark className="mr-2 h-4 w-4" />
                      Saved
                    </Button>
                    <div className="flex-1"></div>
                    <div className="relative w-full md:w-auto mt-3 md:mt-0">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search tutorials..."
                        className="w-full rounded-2xl pl-9 md:w-[200px]"
                      />
                    </div>
                  </div>

                  <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Featured Tutorials</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {tutorials.slice(0, 3).map((tutorial) => (
                        <motion.div key={tutorial.title} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
                          <Card className="overflow-hidden rounded-3xl">
                            <div className="aspect-video overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 relative">
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Button size="icon" variant="secondary" className="h-14 w-14 rounded-full">
                                  <Play className="h-6 w-6" />
                                </Button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-white">
                                <Badge className="bg-white/20 text-white hover:bg-white/30 rounded-xl">
                                  {tutorial.category}
                                </Badge>
                                <h3 className="mt-2 text-lg font-medium">{tutorial.title}</h3>
                              </div>
                            </div>
                            <CardContent className="p-4">
                              <p className="text-sm text-muted-foreground">{tutorial.description}</p>
                              <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback>{tutorial.instructor.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">{tutorial.instructor}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4" />
                                  {tutorial.duration}
                                </div>
                              </div>
                            </CardContent>
                            <CardFooter className="flex items-center justify-between border-t p-4">
                              <Badge variant="outline" className="rounded-xl">
                                {tutorial.level}
                              </Badge>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Eye className="h-4 w-4" />
                                {tutorial.views} views
                              </div>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold">Popular Courses</h2>
                      <Button variant="ghost" className="rounded-2xl">
                        View All
                      </Button>
                    </div>
                    <div className="rounded-3xl border overflow-hidden">
                      <div className="divide-y">
                        {tutorials.slice(3, 5).map((tutorial) => (
                          <motion.div
                            key={tutorial.title}
                            whileHover={{ scale: 1.02, y: -5 }}
                            whileTap={{ scale: 0.98 }}
                            className="p-4 flex flex-col md:flex-row gap-3"
                          >
                            <div className="flex-shrink-0">
                              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600">
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Play className="h-8 w-8 text-white" />
                                </div>
                              </div>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium">{tutorial.title}</h3>
                              <p className="text-sm text-muted-foreground">{tutorial.description}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-3">
                                <Badge variant="outline" className="rounded-xl">
                                  {tutorial.level}
                                </Badge>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {tutorial.duration}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Eye className="h-3 w-3" />
                                  {tutorial.views} views
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Button variant="ghost" size="sm" className="rounded-xl">
                                Watch Now
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h2 className="text-2xl font-semibold">Learning Paths</h2>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <Card className="overflow-hidden rounded-3xl border-2 hover:border-primary/50 transition-all duration-300">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <Badge className="rounded-xl bg-blue-500">Beginner</Badge>
                            <Award className="h-5 w-5 text-amber-500" />
                          </div>
                          <CardTitle className="mt-2">UI/UX Design Fundamentals</CardTitle>
                          <CardDescription>Master the basics of user interface and experience design</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>8 courses • 24 hours</span>
                              <span>4.8 ★</span>
                            </div>
                            <Progress value={30} className="h-2 rounded-xl" />
                            <p className="text-xs text-muted-foreground">30% completed</p>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button variant="secondary" className="w-full rounded-2xl">
                            Continue Learning
                          </Button>
                        </CardFooter>
                      </Card>

                      <Card className="overflow-hidden rounded-3xl border-2 hover:border-primary/50 transition-all duration-300">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <Badge className="rounded-xl bg-amber-500">Intermediate</Badge>
                            <Award className="h-5 w-5 text-amber-500" />
                          </div>
                          <CardTitle className="mt-2">Digital Illustration Mastery</CardTitle>
                          <CardDescription>Create stunning digital artwork and illustrations</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>12 courses • 36 hours</span>
                              <span>4.9 ★</span>
                            </div>
                            <Progress value={0} className="h-2 rounded-xl" />
                            <p className="text-xs text-muted-foreground">Not started</p>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button variant="secondary" className="w-full rounded-2xl">
                            Start Learning
                          </Button>
                        </CardFooter>
                      </Card>

                      <Card className="overflow-hidden rounded-3xl border-2 hover:border-primary/50 transition-all duration-300">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <Badge className="rounded-xl bg-red-500">Advanced</Badge>
                            <Award className="h-5 w-5 text-amber-500" />
                          </div>
                          <CardTitle className="mt-2">Motion Graphics & Animation</CardTitle>
                          <CardDescription>Create professional motion graphics and animations</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>10 courses • 30 hours</span>
                              <span>4.7 ★</span>
                            </div>
                            <Progress value={0} className="h-2 rounded-xl" />
                            <p className="text-xs text-muted-foreground">Not started</p>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Button variant="secondary" className="w-full rounded-2xl">
                            Start Learning
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  </section>
                </TabsContent>
                */}

                <TabsContent value="settings" className="mt-0">
                  <div className="space-y-8">
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

                    <Tabs defaultValue="account" className="w-full">
                      <TabsList className="rounded-2xl p-1 mb-8">
                        <TabsTrigger value="account" className="rounded-xl data-[state=active]:rounded-xl">Account</TabsTrigger>
                        <TabsTrigger value="notifications" className="rounded-xl data-[state=active]:rounded-xl">Notifications</TabsTrigger>
                        <TabsTrigger value="admin-tools" className="rounded-xl data-[state=active]:rounded-xl">Admin Tools</TabsTrigger>
                      </TabsList>

                      {/* Account Tab */}
                      <TabsContent value="account" className="mt-0">
                        <div className="max-w-2xl space-y-10">

                          {/* Profile Section */}
                          <section className="space-y-6">
                            <h2 className="text-2xl font-bold tracking-tight">Profile</h2>

                            {/* Avatar */}
                            <div className="flex items-center gap-6">
                              <div className="relative group cursor-pointer" onClick={() => document.getElementById("avatar-upload")?.click()}>
                                <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border">
                                  {settingsAvatarUrl ? (
                                    <img src={settingsAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                  ) : (
                                    <Avatar className="h-full w-full rounded-full">
                                      <AvatarFallback className="text-2xl rounded-full">{userInitials}</AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera className="h-6 w-6 text-white" />
                                </div>
                                <input
                                  id="avatar-upload"
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    // Optimistic preview
                                    setSettingsAvatarUrl(URL.createObjectURL(file));
                                    try {
                                      const { data } = await supabase.auth.getUser();
                                      const userId = data?.user?.id;
                                      if (!userId) return;
                                      const url = await uploadAvatar(file, userId);
                                      await updateProfileAvatar(userId, url);
                                      setSettingsAvatarUrl(url);
                                      toast.success("Avatar updated.");
                                    } catch (err) {
                                      console.error(err);
                                      toast.error("Failed to upload avatar.");
                                    }
                                  }}
                                />
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Update your avatar by clicking the image<br />
                                288×288 px size recommended in PNG or JPG format only.
                              </p>
                            </div>

                            {/* Name row */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="relative rounded-2xl border bg-muted/30 px-4 pt-5 pb-3">
                                <label className="absolute top-2 left-4 text-xs text-muted-foreground">First Name</label>
                                <input
                                  value={settingsFirstName}
                                  onChange={(e) => setSettingsFirstName(e.target.value)}
                                  className="w-full bg-transparent text-sm font-medium focus:outline-none"
                                />
                              </div>
                              <div className="relative rounded-2xl border bg-muted/30 px-4 pt-5 pb-3">
                                <label className="absolute top-2 left-4 text-xs text-muted-foreground">Last Name</label>
                                <input
                                  value={settingsLastName}
                                  onChange={(e) => setSettingsLastName(e.target.value)}
                                  className="w-full bg-transparent text-sm font-medium focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Email */}
                            <div className="relative rounded-2xl border bg-muted/30 px-4 pt-5 pb-3">
                              <label className="absolute top-2 left-4 text-xs text-muted-foreground">Email</label>
                              <input
                                type="email"
                                value={settingsEmail}
                                onChange={(e) => setSettingsEmail(e.target.value)}
                                className="w-full bg-transparent text-sm font-medium focus:outline-none"
                              />
                            </div>

                            <Button
                              className="rounded-2xl px-6"
                              onClick={async () => {
                                const { error } = await supabase.auth.updateUser({
                                  email: settingsEmail,
                                  data: { full_name: `${settingsFirstName} ${settingsLastName}`.trim() },
                                });
                                if (error) toast.error("Failed to update profile.");
                                else toast.success("Profile updated.");
                              }}
                            >
                              Save changes
                            </Button>
                          </section>

                          {/* Security Section */}
                          <section className="space-y-6">
                            <h2 className="text-2xl font-bold tracking-tight">Security</h2>

                            <div className="relative rounded-2xl border bg-muted/30 px-4 pt-5 pb-3">
                              <label className="absolute top-2 left-4 text-xs text-muted-foreground">Current password</label>
                              <div className="flex items-center">
                                <input
                                  type={showCurrentPw ? "text" : "password"}
                                  value={settingsCurrentPassword}
                                  onChange={(e) => setSettingsCurrentPassword(e.target.value)}
                                  className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                                />
                                <button type="button" onClick={() => setShowCurrentPw((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                                  {showCurrentPw ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="relative rounded-2xl border bg-muted/30 px-4 pt-5 pb-3">
                              <label className="absolute top-2 left-4 text-xs text-muted-foreground">New password</label>
                              <div className="flex items-center">
                                <input
                                  type={showNewPw ? "text" : "password"}
                                  value={settingsNewPassword}
                                  onChange={(e) => setSettingsNewPassword(e.target.value)}
                                  className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                                />
                                <button type="button" onClick={() => setShowNewPw((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                                  {showNewPw ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            <div className="relative rounded-2xl border bg-muted/30 px-4 pt-5 pb-3">
                              <label className="absolute top-2 left-4 text-xs text-muted-foreground">Confirm password</label>
                              <div className="flex items-center">
                                <input
                                  type={showConfirmPw ? "text" : "password"}
                                  value={settingsConfirmPassword}
                                  onChange={(e) => setSettingsConfirmPassword(e.target.value)}
                                  className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                                />
                                <button type="button" onClick={() => setShowConfirmPw((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
                                  {showConfirmPw ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            <Button
                              className="rounded-2xl px-6"
                              onClick={async () => {
                                if (!settingsNewPassword || settingsNewPassword !== settingsConfirmPassword) {
                                  toast.error("Passwords do not match.");
                                  return;
                                }
                                const { error } = await supabase.auth.updateUser({ password: settingsNewPassword });
                                if (error) toast.error("Failed to update password.");
                                else {
                                  toast.success("Password updated.");
                                  setSettingsCurrentPassword("");
                                  setSettingsNewPassword("");
                                  setSettingsConfirmPassword("");
                                }
                              }}
                            >
                              Save changes
                            </Button>
                          </section>
                        </div>
                      </TabsContent>

                      {/* Notifications Tab — placeholder */}
                      <TabsContent value="notifications" className="mt-0">
                        <div className="max-w-2xl">
                          <p className="text-sm text-muted-foreground">Notification preferences coming soon.</p>
                        </div>
                      </TabsContent>

                      {/* Admin Tools Tab — placeholder */}
                      <TabsContent value="admin-tools" className="mt-0">
                        <div className="max-w-2xl">
                          <p className="text-sm text-muted-foreground">Admin tools coming soon.</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </main>
      </div>

      <Drawer
        open={isCreateProjectOpen}
        onOpenChange={(open) => {
          setIsCreateProjectOpen(open);
          if (!open) {
            resetProjectForm();
          }
        }}
      >
        <DrawerContent className="max-h-[92vh] overflow-hidden rounded-t-[28px] border-0">
          <div
            className="w-[98%] mx-auto flex flex-col"
            style={{ maxHeight: "calc(92vh - 2.5rem)" }}
          >
            <div className="grid gap-0 md:grid-cols-[1.1fr_0.9fr] flex-1 min-h-0 overflow-hidden">
              <div className="space-y-6 p-6 md:p-8 overflow-y-auto">
                <DrawerHeader className="space-y-2 px-0 text-left">
                  <DrawerTitle className="text-2xl">
                    Create New Project
                  </DrawerTitle>
                  <DrawerDescription>
                    Start a new creative project from scratch or use a template.
                  </DrawerDescription>
                </DrawerHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="project-name">Project name</Label>
                    <Input
                      id="project-name"
                      value={newProjectName}
                      onChange={(event) =>
                        setNewProjectName(event.target.value)
                      }
                      placeholder="Summer campaign refresh"
                      className="rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-description">Project summary</Label>
                    <Textarea
                      id="project-description"
                      value={newProjectDescription}
                      onChange={(event) =>
                        setNewProjectDescription(event.target.value)
                      }
                      placeholder="Describe the goal, deliverables, and creative direction."
                      className="min-h-[120px] rounded-2xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project-due-date">Due date</Label>
                    <Input
                      id="project-due-date"
                      type="date"
                      value={newProjectDueDate}
                      onChange={(event) =>
                        setNewProjectDueDate(event.target.value)
                      }
                      className="rounded-2xl"
                    />
                  </div>
                </div>

                <DrawerFooter className="px-0 justify-start sm:justify-start sm:space-x-3">
                  <Button
                    className="rounded-2xl"
                    onClick={handleCreateProject}
                    disabled={!newProjectName.trim()}
                  >
                    Create Project
                  </Button>
                  <DrawerClose asChild>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        resetProjectForm();
                      }}
                    >
                      Cancel
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </div>

              <div className="border-t bg-muted/30 p-6 md:border-l md:border-t-0 md:p-8 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Add work items to the new project
                    </p>
                    <h3 className="mt-1 text-lg font-semibold">Work Items</h3>
                  </div>

                  <Tabs
                    value={drawerRightTab}
                    onValueChange={(v) =>
                      setDrawerRightTab(v as "tasks" | "files")
                    }
                  >
                    <TabsList className="rounded-2xl w-full">
                      <TabsTrigger value="tasks" className="flex-1 rounded-xl">
                        Tasks{" "}
                        {taskDrafts.length > 0 && `(${taskDrafts.length})`}
                      </TabsTrigger>
                      <TabsTrigger value="files" className="flex-1 rounded-xl">
                        Files
                        {drawerUploadedFiles.length > 0 &&
                          ` (${drawerUploadedFiles.length})`}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="tasks" className="mt-4 space-y-4">
                      <div className="space-y-3 rounded-3xl border bg-background p-4">
                        <div className="space-y-2">
                          <Label htmlFor="task-name">Task name</Label>
                          <Input
                            id="task-name"
                            value={newTaskName}
                            onChange={(event) =>
                              setNewTaskName(event.target.value)
                            }
                            placeholder="IHS Open Day Walk-Ins Landing Page"
                            className="rounded-2xl"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Description</Label>
                          <RichTextEditor
                            value={newTaskDescription}
                            onChange={setNewTaskDescription}
                            placeholder="Add task details, context, or acceptance criteria…"
                          />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="task-status">Status</Label>
                            <Select
                              value={newTaskStatus}
                              onValueChange={(value) =>
                                setNewTaskStatus(value as ProjectTask["status"])
                              }
                            >
                              <SelectTrigger
                                id="task-status"
                                className="rounded-2xl"
                              >
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl">
                                {taskStatusOptions.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="task-priority">Priority</Label>
                            <Select
                              value={newTaskPriority}
                              onValueChange={(value) =>
                                setNewTaskPriority(
                                  value as Exclude<
                                    ProjectTask["priority"],
                                    "-"
                                  >,
                                )
                              }
                            >
                              <SelectTrigger
                                id="task-priority"
                                className="rounded-2xl"
                              >
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl">
                                {taskPriorityOptions.map((priority) => (
                                  <SelectItem key={priority} value={priority}>
                                    {priority}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="task-date-added">Date added</Label>
                            <Input
                              id="task-date-added"
                              type="date"
                              value={newTaskDateAdded}
                              onChange={(event) =>
                                setNewTaskDateAdded(event.target.value)
                              }
                              className="rounded-2xl"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="task-due-date">Due date</Label>
                            <Input
                              id="task-due-date"
                              type="date"
                              value={newTaskDueDate}
                              onChange={(event) =>
                                setNewTaskDueDate(event.target.value)
                              }
                              className="rounded-2xl"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Attach files</Label>
                          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-3 transition hover:border-primary/50 hover:bg-muted/40">
                            <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {newTaskFiles.length === 0
                                ? "Click to attach files"
                                : `${newTaskFiles.length} file${newTaskFiles.length > 1 ? "s" : ""} attached`}
                            </span>
                            <input
                              type="file"
                              multiple
                              className="hidden"
                              onChange={(e) => {
                                if (!e.target.files) return;
                                const now = new Date().toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                );
                                const picked: ProjectFile[] = Array.from(
                                  e.target.files,
                                ).map((f) => ({
                                  name: f.name,
                                  size: f.size,
                                  type: f.type || "application/octet-stream",
                                  uploadedAt: now,
                                }));
                                setNewTaskFiles((prev) => [...prev, ...picked]);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {newTaskFiles.length > 0 && (
                            <div className="space-y-1">
                              {newTaskFiles.map((f, i) => (
                                <div
                                  key={`${f.name}-${i}`}
                                  className="flex items-center justify-between rounded-xl border bg-background px-3 py-2"
                                >
                                  <span className="truncate text-xs font-medium">
                                    {f.name}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 rounded-lg"
                                    onClick={() =>
                                      setNewTaskFiles((prev) =>
                                        prev.filter((_, idx) => idx !== i),
                                      )
                                    }
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          className="w-full rounded-2xl"
                          onClick={handleAddTask}
                        >
                          Add Task
                        </Button>
                      </div>

                      <div className="rounded-3xl border bg-background p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-medium">Task Queue</h4>
                          <Badge variant="outline" className="rounded-xl">
                            {taskDrafts.length} added
                          </Badge>
                        </div>

                        {taskDrafts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Add a few tasks here to outline the work before the
                            project starts.
                          </p>
                        ) : (
                          <div className="max-h-[280px] space-y-3 overflow-auto pr-1">
                            {taskDrafts.map((task, index) => (
                              <div
                                key={`${task.name}-${index}`}
                                className="rounded-2xl border p-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium">{task.name}</p>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      <Badge
                                        variant="outline"
                                        className="rounded-xl"
                                      >
                                        {task.status}
                                      </Badge>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "rounded-xl",
                                          priorityClass[
                                            task.priority as Exclude<
                                              ProjectTask["priority"],
                                              "-"
                                            >
                                          ],
                                        )}
                                      >
                                        {task.priority}
                                      </Badge>
                                    </div>
                                    <p className="mt-2 text-xs text-muted-foreground">
                                      Added {task.dateAdded} · Due{" "}
                                      {task.dueDate}
                                    </p>
                                    {task.files && task.files.length > 0 && (
                                      <p className="mt-1 text-xs text-muted-foreground">
                                        {task.files.length} file
                                        {task.files.length > 1 ? "s" : ""}{" "}
                                        attached
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl"
                                    onClick={() =>
                                      setTaskDrafts((prev) =>
                                        prev.filter(
                                          (_, taskIndex) => taskIndex !== index,
                                        ),
                                      )
                                    }
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="files" className="mt-4 space-y-4">
                      <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted-foreground/30 bg-background p-10 transition hover:border-primary/50 hover:bg-muted/20">
                        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          Click to upload or drag &amp; drop
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Any file type · Multiple allowed
                        </p>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (!e.target.files) return;
                            const now = new Date().toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            });
                            const newFiles: ProjectFile[] = Array.from(
                              e.target.files,
                            ).map((f) => ({
                              name: f.name,
                              size: f.size,
                              type: f.type || "application/octet-stream",
                              uploadedAt: now,
                            }));
                            setDrawerUploadedFiles((prev) => [
                              ...prev,
                              ...newFiles,
                            ]);
                            e.target.value = "";
                          }}
                        />
                      </label>

                      {drawerUploadedFiles.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          No files added yet.
                        </p>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {drawerUploadedFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {file.name}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Badge
                                    variant="outline"
                                    className="rounded-xl text-xs"
                                  >
                                    {file.type.split("/")[1]?.toUpperCase() ??
                                      "FILE"}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {file.size < 1024 * 1024
                                      ? `${(file.size / 1024).toFixed(1)} KB`
                                      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Added {file.uploadedAt}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-xl"
                                onClick={() =>
                                  setDrawerUploadedFiles((prev) =>
                                    prev.filter((_, i) => i !== index),
                                  )
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Global View Task Drawer — opened from Home/Tasks tab */}
      <Drawer open={globalViewTaskOpen} onOpenChange={setGlobalViewTaskOpen}>
        <DrawerContent className="max-h-[92vh] overflow-hidden rounded-t-[28px] border-0">
          <div
            className="w-[98%] mx-auto flex flex-col"
            style={{ maxHeight: "calc(92vh - 2.5rem)" }}
          >
            {globalViewTask && (
              <div className="grid grid-cols-[1.1fr_0.9fr] flex-1 min-h-0 overflow-hidden">
                {/* Left */}
                <div className="space-y-6 p-6 md:p-8 overflow-y-auto">
                  <DrawerHeader className="px-0 space-y-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <DrawerTitle className="text-2xl leading-tight">
                          {globalViewTask.name}
                        </DrawerTitle>
                        <DrawerDescription>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                            <span
                              className={cn(
                                "inline-block h-2 w-2 rounded-full shrink-0",
                                statusDotClass[globalViewTask.status],
                              )}
                            />
                            {globalViewTask.status}
                            {globalViewTaskProject && (
                              <span className="text-muted-foreground ml-1">
                                · {globalViewTaskProject.name}
                              </span>
                            )}
                          </span>
                        </DrawerDescription>
                      </div>
                      <div className="flex gap-2 shrink-0 pt-1">
                        <Button
                          className="rounded-2xl"
                          onClick={async () => {
                            setGlobalViewTaskOpen(false);
                            if (globalViewTaskProject && globalViewTask.id) {
                              setPendingEditTaskId(globalViewTask.id);
                              await openProject(globalViewTaskProject);
                            }
                          }}
                        >
                          Edit Task
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-2xl"
                          onClick={() => setGlobalViewTaskOpen(false)}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </DrawerHeader>
                  {globalViewTask.description ? (
                    <div
                      className="prose prose-sm max-w-none text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_img]:rounded-xl [&_img]:max-w-full [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                      dangerouslySetInnerHTML={{
                        __html: globalViewTask.description,
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No description.
                    </p>
                  )}
                </div>

                {/* Right */}
                <div className="border-t bg-muted/30 md:border-t-0 md:border-l p-6 md:p-8 space-y-6 overflow-y-auto">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Task Details</h3>
                    <div className="space-y-3 rounded-2xl border bg-background p-4">
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium">Status</p>
                        <Select
                          value={globalViewTask.status}
                          onValueChange={(v) => {
                            const prev = globalViewTask.status;
                            const updated = {
                              ...globalViewTask,
                              status: v as ProjectTask["status"],
                            };
                            if (globalViewTask.id) {
                              dbUpdateTask(globalViewTask.id, {
                                status: v,
                              }).catch(console.error);
                              createTaskActivity({
                                task_id: globalViewTask.id,
                                text: `${userName} changed the status from ${prev} to ${v}.`,
                              }).catch(console.error);
                              setGlobalViewTaskActivityLog((log) => {
                                const now = new Date();
                                return [
                                  ...log,
                                  {
                                    text: `${userName} changed the status from ${prev} to ${v}.`,
                                    timestamp: now.toLocaleString(),
                                    ts: now.getTime(),
                                  },
                                ];
                              });
                            }
                            setGlobalViewTask(updated);
                            // Sync back to project list
                            setProjectList((prev) =>
                              prev.map((p) =>
                                p.id === globalViewTaskProject?.id
                                  ? {
                                      ...p,
                                      tasks: p.tasks.map((t) =>
                                        t.id === updated.id ? updated : t,
                                      ),
                                    }
                                  : p,
                              ),
                            );
                          }}
                        >
                          <SelectTrigger className="rounded-2xl h-10">
                            <span
                              className={cn(
                                "mr-1.5 inline-block h-2 w-2 rounded-full shrink-0",
                                statusDotClass[globalViewTask.status],
                              )}
                            />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {taskStatusOptions.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm font-medium">Priority</p>
                        <Select
                          value={
                            globalViewTask.priority === "-"
                              ? "Medium"
                              : globalViewTask.priority
                          }
                          onValueChange={(v) => {
                            const prev = globalViewTask.priority;
                            const updated = {
                              ...globalViewTask,
                              priority: v as ProjectTask["priority"],
                            };
                            if (globalViewTask.id) {
                              dbUpdateTask(globalViewTask.id, {
                                priority: v,
                              }).catch(console.error);
                              createTaskActivity({
                                task_id: globalViewTask.id,
                                text: `${userName} changed the priority from ${prev} to ${v}.`,
                              }).catch(console.error);
                              setGlobalViewTaskActivityLog((log) => {
                                const now = new Date();
                                return [
                                  ...log,
                                  {
                                    text: `${userName} changed the priority from ${prev} to ${v}.`,
                                    timestamp: now.toLocaleString(),
                                    ts: now.getTime(),
                                  },
                                ];
                              });
                            }
                            setGlobalViewTask(updated);
                            setProjectList((prev) =>
                              prev.map((p) =>
                                p.id === globalViewTaskProject?.id
                                  ? {
                                      ...p,
                                      tasks: p.tasks.map((t) =>
                                        t.id === updated.id ? updated : t,
                                      ),
                                    }
                                  : p,
                              ),
                            );
                          }}
                        >
                          <SelectTrigger className="rounded-2xl h-10">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {taskPriorityOptions.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">
                          Due date
                        </p>
                        <span className="text-sm">
                          {globalViewTask.dueDate === "-"
                            ? "Not set"
                            : globalViewTask.dueDate}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-muted-foreground">
                          Date added
                        </p>
                        <span className="text-sm">
                          {globalViewTask.dateAdded}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Tabs defaultValue="activity">
                    <TabsList className="rounded-2xl w-full">
                      <TabsTrigger
                        value="activity"
                        className="flex-1 rounded-xl"
                      >
                        Activity
                      </TabsTrigger>
                      <TabsTrigger value="files" className="flex-1 rounded-xl">
                        Files
                        {globalViewTask.files &&
                          globalViewTask.files.length > 0 &&
                          ` (${globalViewTask.files.length})`}
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="activity" className="mt-4 space-y-3">
                      <div className="space-y-2">
                        {globalViewTaskActivityLog.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">
                            No activity yet.
                          </p>
                        ) : (
                          [...globalViewTaskActivityLog]
                            .sort((a, b) => b.ts - a.ts)
                            .map((entry, i) => (
                              <div
                                key={i}
                                className="rounded-2xl border bg-background p-4"
                              >
                                <p className="font-medium text-sm">
                                  {entry.text}
                                </p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {entry.timestamp}
                                </p>
                              </div>
                            ))
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={globalViewTaskActivityInput}
                          onChange={(e) =>
                            setGlobalViewTaskActivityInput(e.target.value)
                          }
                          placeholder="Add a note…"
                          className="rounded-2xl h-10"
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" &&
                              globalViewTaskActivityInput.trim()
                            ) {
                              const text = globalViewTaskActivityInput.trim();
                              const now = new Date();
                              setGlobalViewTaskActivityLog((log) => [
                                ...log,
                                {
                                  text,
                                  timestamp: now.toLocaleString(),
                                  ts: now.getTime(),
                                },
                              ]);
                              if (globalViewTask.id)
                                createTaskActivity({
                                  task_id: globalViewTask.id,
                                  text,
                                }).catch(console.error);
                              setGlobalViewTaskActivityInput("");
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          className="rounded-2xl shrink-0"
                          onClick={() => {
                            if (!globalViewTaskActivityInput.trim()) return;
                            const text = globalViewTaskActivityInput.trim();
                            const now = new Date();
                            setGlobalViewTaskActivityLog((log) => [
                              ...log,
                              {
                                text,
                                timestamp: now.toLocaleString(),
                                ts: now.getTime(),
                              },
                            ]);
                            if (globalViewTask.id)
                              createTaskActivity({
                                task_id: globalViewTask.id,
                                text,
                              }).catch(console.error);
                            setGlobalViewTaskActivityInput("");
                          }}
                        >
                          Post
                        </Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="files" className="mt-4 space-y-2">
                      {globalViewTask.files &&
                      globalViewTask.files.length > 0 ? (
                        globalViewTask.files.map((f, i) => (
                          <div
                            key={f.id ?? i}
                            className="rounded-2xl border bg-background p-4 flex items-center gap-3"
                          >
                            <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              {f.url ? (
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-medium text-sm text-primary underline underline-offset-2 truncate block"
                                >
                                  {f.name}
                                </a>
                              ) : (
                                <p className="font-medium text-sm truncate">
                                  {f.name}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                {(f.size / 1024).toFixed(0)} KB
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground py-2">
                          No files attached.
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={isProjectDrawerOpen} onOpenChange={setIsProjectDrawerOpen}>
        <DrawerContent className="max-h-[92vh] overflow-hidden rounded-t-[28px] border-0">
          <div
            className="w-[98%] mx-auto flex flex-col"
            style={{ maxHeight: "calc(92vh - 2.5rem)" }}
          >
            <div className="flex-shrink-0 p-6 md:p-8 pb-4">
              <DrawerHeader className="px-0 text-left space-y-2">
                <DrawerTitle className="text-2xl">
                  Project Workspace
                </DrawerTitle>
                <DrawerDescription>
                  Review details, progress, and next steps for this project.
                </DrawerDescription>
              </DrawerHeader>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 md:px-8 pb-6 md:pb-8">
              <ProjectDetailPanel
                project={selectedProject}
                tasks={selectedProject.tasks}
                uploadedFiles={selectedProject.uploadedFiles}
                onFilesChange={handleFilesChange}
                onProjectUpdate={(updated) => {
                  setSelectedProject(updated);
                  setProjectList((prev) =>
                    prev.map((p) => (p.id === updated.id ? updated : p)),
                  );
                }}
                onTaskUpdate={(updated, index) => {
                  const newTasks = [...selectedProject.tasks];
                  newTasks[index] = updated;
                  const updatedProject = {
                    ...selectedProject,
                    tasks: newTasks,
                  };
                  setSelectedProject(updatedProject);
                  setProjectList((prev) =>
                    prev.map((p) =>
                      p.id === updatedProject.id ? updatedProject : p,
                    ),
                  );
                }}
                onTaskDelete={(index) => {
                  const newTasks = selectedProject.tasks.filter(
                    (_, i) => i !== index,
                  );
                  const updatedProject = {
                    ...selectedProject,
                    tasks: newTasks,
                  };
                  setSelectedProject(updatedProject);
                  setProjectList((prev) =>
                    prev.map((p) =>
                      p.id === updatedProject.id ? updatedProject : p,
                    ),
                  );
                }}
                onTaskAdd={(newTask) => {
                  const updatedProject = {
                    ...selectedProject,
                    tasks: [...selectedProject.tasks, newTask],
                  };
                  setSelectedProject(updatedProject);
                  setProjectList((prev) =>
                    prev.map((p) =>
                      p.id === updatedProject.id ? updatedProject : p,
                    ),
                  );
                }}
                onProjectDelete={() => {
                  setProjectList((prev) =>
                    prev.filter((p) => p.id !== selectedProject.id),
                  );
                  setIsProjectDrawerOpen(false);
                }}
                onBack={() => setIsProjectDrawerOpen(false)}
                actorName={userName}
                defaultOpenEditTaskId={pendingEditTaskId}
                onClearDefaultEditTask={() => setPendingEditTaskId(null)}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
