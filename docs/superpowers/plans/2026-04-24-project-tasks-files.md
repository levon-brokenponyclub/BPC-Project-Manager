# Project Tasks & Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the Add Task form so tasks persist with their project, add Tasks/Files tabs to the Project Workspace drawer, and add a static in-memory file upload UI.

**Architecture:** All changes are in `components/creative.tsx` (single large file — existing pattern). A new `ProjectFile` type is added. The project shape gains `tasks` and `uploadedFiles` fields. `ProjectDetailPanel` receives these as props and computes task groups dynamically. File state is lifted to the parent via an `onFilesChange` callback.

**Tech Stack:** React 18, Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui (`Tabs`, `Input`, `Badge`, `Button`), Lucide icons

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `components/creative.tsx` | Modify | All changes — types, data, panel component, parent component |

---

### Task 1: Add `ProjectFile` type and extend the project shape

**Files:**
- Modify: `components/creative.tsx` (around line 290, after `ProjectTask` type)

**Context:** `ProjectTask` is defined at line 290. The `projects` const is at line 255. The `projectTaskGroups` const is at line 304.

The sentinel tasks in `projectTaskGroups` (each group's first task has `name === status`) are rendering artifacts from the old approach. The real tasks start at index 1 of each group's `tasks` array.

- [ ] **Step 1: Add `ProjectFile` type after the `ProjectTaskGroup` type block (around line 302)**

Insert immediately after the closing `}` of `ProjectTaskGroup`:

```ts
type ProjectFile = {
  name: string
  size: number
  type: string
  uploadedAt: string
}
```

- [ ] **Step 2: Add `tasks` and `uploadedFiles` to the `projects` const**

Find the `const projects = [` block (line 255). Replace it with:

```ts
const allDemoTasks: ProjectTask[] = projectTaskGroups.flatMap((g) =>
  g.tasks.filter((t) => t.name !== (t.status as string))
)

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
]
```

**Important:** `allDemoTasks` must be declared AFTER `projectTaskGroups` (line 304+), not before. Move it to just before the `projects` const declaration and ensure `projectTaskGroups` is already declared above it.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/levongravett/Desktop/BPC/Sites/bpc-pm && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing unrelated errors)

- [ ] **Step 4: Commit**

```bash
git add components/creative.tsx
git commit -m "feat: add ProjectFile type and tasks/uploadedFiles to project shape"
```

---

### Task 2: Update `handleCreateProject` to persist task drafts

**Files:**
- Modify: `components/creative.tsx` (around line 950, `handleCreateProject` function)

**Context:** `handleCreateProject` builds a project object and calls `setProjectList` and `setSelectedProject`. Currently the object has `{ name, description, progress, dueDate, members, files }`. We add `tasks: taskDrafts` and `uploadedFiles: []`.

- [ ] **Step 1: Find the object passed to `setProjectList` in `handleCreateProject` (around line 965)**

It looks like:
```ts
setProjectList((prev) => [
  {
    name: trimmedName,
    description: trimmedDescription,
    progress: 0,
    dueDate: formattedDueDate,
    members: Number(newProjectMembers),
    files: 0,
  },
  ...prev,
])
```

Replace with:
```ts
const newProject = {
  name: trimmedName,
  description: trimmedDescription,
  progress: 0,
  dueDate: formattedDueDate,
  members: Number(newProjectMembers),
  files: 0,
  tasks: taskDrafts,
  uploadedFiles: [] as ProjectFile[],
}

setProjectList((prev) => [newProject, ...prev])
setSelectedProject(newProject)
```

- [ ] **Step 2: Remove the separate `setSelectedProject` call that comes after `setProjectList`**

The old code has a second `setSelectedProject({...})` call with the same fields (around line 977). Delete it — the new `setSelectedProject(newProject)` above replaces it.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/creative.tsx
git commit -m "feat: persist taskDrafts and uploadedFiles when creating project"
```

---

### Task 3: Update `ProjectDetailPanel` props and dynamic task grouping

**Files:**
- Modify: `components/creative.tsx` (`ProjectDetailPanel` function, line 538)

**Context:** `ProjectDetailPanel` currently takes `{ project, onBack }`. We add `tasks`, `uploadedFiles`, `onFilesChange`. The existing task table uses `projectTaskGroups` (global static). We replace it with dynamic grouping from `tasks` prop.

- [ ] **Step 1: Update the `ProjectDetailPanel` function signature**

Find:
```ts
function ProjectDetailPanel({
  project,
  onBack,
}: {
  project: (typeof projects)[number]
  onBack: () => void
}) {
```

Replace with:
```ts
function ProjectDetailPanel({
  project,
  tasks,
  uploadedFiles,
  onFilesChange,
  onBack,
}: {
  project: (typeof projects)[number]
  tasks: ProjectTask[]
  uploadedFiles: ProjectFile[]
  onFilesChange: (files: ProjectFile[]) => void
  onBack: () => void
}) {
```

- [ ] **Step 2: Add dynamic task grouping inside `ProjectDetailPanel`, after `completionEstimate`**

After:
```ts
const completionEstimate = Math.max(1, Math.min(12, Math.round((100 - project.progress) / 10)))
```

Add:
```ts
const taskGroups = taskStatusOptions
  .map((status) => ({ status, tasks: tasks.filter((t) => t.status === status) }))
  .filter((g) => g.tasks.length > 0)
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/creative.tsx
git commit -m "feat: update ProjectDetailPanel props — dynamic task grouping"
```

---

### Task 4: Replace static task section with Tabs (Tasks + Files)

**Files:**
- Modify: `components/creative.tsx` (the task section inside `ProjectDetailPanel`, around line 647)

**Context:** The current task section starts with:
```tsx
<div className="border-t bg-background p-4 md:p-6">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
    <div>
      <h3 className="text-lg font-semibold">Tasks</h3>
```
and ends just before the closing `</Card>` tag of `ProjectDetailPanel`.

- [ ] **Step 1: Replace the entire task section with a Tabs layout**

Find the block starting with `<div className="border-t bg-background p-4 md:p-6">` (the Tasks heading section) and replace it — up to and including its closing `</div>` before `</Card>` — with:

```tsx
<div className="border-t bg-background p-4 md:p-6">
  <Tabs defaultValue="tasks">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <TabsList className="rounded-2xl">
        <TabsTrigger value="tasks" className="rounded-xl">
          Tasks ({tasks.length})
        </TabsTrigger>
        <TabsTrigger value="files" className="rounded-xl">
          Files ({uploadedFiles.length})
        </TabsTrigger>
      </TabsList>
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
                <TableHead className="w-[45%]">Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskGroups.map((group) => (
                <Fragment key={group.status}>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">
                      {group.status} ({group.tasks.length})
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-xl">
                        <span
                          className={cn(
                            "mr-2 inline-block h-2 w-2 rounded-full",
                            statusDotClass[group.status]
                          )}
                        />
                        {group.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                  </TableRow>
                  {group.tasks.map((task) => (
                    <TableRow key={`${group.status}-${task.name}`}>
                      <TableCell className="font-medium">{task.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-xl">
                          <span
                            className={cn(
                              "mr-2 inline-block h-2 w-2 rounded-full",
                              statusDotClass[task.status]
                            )}
                          />
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.dateAdded}</TableCell>
                      <TableCell>{task.dueDate}</TableCell>
                      <TableCell>
                        {task.priority === "-" ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn("rounded-xl", priorityClass[task.priority])}
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </TabsContent>

    <TabsContent value="files">
      <div className="space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-10 transition hover:border-primary/50 hover:bg-muted/40">
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Click to upload or drag &amp; drop</p>
          <p className="mt-1 text-xs text-muted-foreground">Any file type · Multiple allowed</p>
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (!e.target.files) return
              const now = new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
              const newFiles: ProjectFile[] = Array.from(e.target.files).map((f) => ({
                name: f.name,
                size: f.size,
                type: f.type || "application/octet-stream",
                uploadedAt: now,
              }))
              onFilesChange([...uploadedFiles, ...newFiles])
              e.target.value = ""
            }}
          />
        </label>

        {uploadedFiles.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No files uploaded yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">{file.name}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-xl text-xs">
                      {file.type.split("/")[1]?.toUpperCase() ?? "FILE"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {file.size < 1024 * 1024
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Uploaded {file.uploadedAt}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-xl"
                  onClick={() =>
                    onFilesChange(uploadedFiles.filter((_, i) => i !== index))
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
```

- [ ] **Step 2: Add `Upload` to the Lucide import list at the top of the file**

Find the existing import block from `lucide-react`. Add `Upload` to the list. It should look like:
```ts
import {
  ...
  Upload,
  ...
} from "lucide-react"
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/creative.tsx
git commit -m "feat: add Tasks/Files tabs and file upload UI to ProjectDetailPanel"
```

---

### Task 5: Wire up `onFilesChange` and updated props in the parent

**Files:**
- Modify: `components/creative.tsx` (`DesignaliCreative` component, around line 872)

**Context:** The `ProjectDetailPanel` is called in two places:
1. Inside the Project Workspace Drawer (line ~2386): `<ProjectDetailPanel project={selectedProject} onBack={...} />`
2. Possibly elsewhere — search first.

We add `handleFilesChange`, then pass all new props to the call site.

- [ ] **Step 1: Grep to confirm all `ProjectDetailPanel` call sites**

```bash
grep -n "ProjectDetailPanel" /Users/levongravett/Desktop/BPC/Sites/bpc-pm/components/creative.tsx
```

Expected: one call site inside the Project Workspace Drawer.

- [ ] **Step 2: Add `handleFilesChange` to `DesignaliCreative`, after `openProject`**

After the `openProject` function (around line 991), insert:

```ts
const handleFilesChange = (files: ProjectFile[]) => {
  setProjectList((prev) =>
    prev.map((p) => (p.name === selectedProject.name ? { ...p, uploadedFiles: files } : p))
  )
  setSelectedProject((prev) => ({ ...prev, uploadedFiles: files }))
}
```

- [ ] **Step 3: Update the `ProjectDetailPanel` call site**

Find:
```tsx
<ProjectDetailPanel
  project={selectedProject}
  onBack={() => setIsProjectDrawerOpen(false)}
/>
```

Replace with:
```tsx
<ProjectDetailPanel
  project={selectedProject}
  tasks={selectedProject.tasks}
  uploadedFiles={selectedProject.uploadedFiles}
  onFilesChange={handleFilesChange}
  onBack={() => setIsProjectDrawerOpen(false)}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors

- [ ] **Step 5: Start the dev server and verify in browser**

```bash
pnpm dev
```

Open `http://localhost:3000`:
1. Click **New Project**, fill in name/summary/due date, add 2–3 tasks, click **Create Project**
2. Click the newly created project card → Project Workspace drawer opens
3. **Tasks tab:** Verify your tasks appear grouped by status
4. **Files tab:** Click upload zone, select 2 files → they appear as cards
5. Click X on a file → it removes
6. Open **Website Redesign** project → Tasks tab shows the demo tasks, Files tab shows empty

- [ ] **Step 6: Commit**

```bash
git add components/creative.tsx
git commit -m "feat: wire up ProjectDetailPanel tasks and files props in parent"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Wire up Add Task → tasks persist with project (Tasks 2, 5)
- ✅ Tasks tab in Project Workspace (Task 4)
- ✅ Files tab in Project Workspace (Task 4)
- ✅ File upload function — click to upload, list, remove (Task 4)
- ✅ Dynamic task grouping replaces hardcoded `projectTaskGroups` (Task 3)

**Placeholder scan:** None found. All code steps include complete implementations.

**Type consistency:**
- `ProjectFile` defined in Task 1, used in Tasks 2, 3, 4, 5 — consistent
- `tasks: ProjectTask[]` added in Task 1, passed through Tasks 2→3→5 — consistent
- `uploadedFiles: ProjectFile[]` same chain — consistent
- `onFilesChange: (files: ProjectFile[]) => void` defined in Task 3, implemented in Task 5 — consistent
- `taskGroups` computed in Task 3, rendered in Task 4 — consistent
- `Upload` icon added in Task 4 step 2, used in Task 4 step 1 JSX — consistent
