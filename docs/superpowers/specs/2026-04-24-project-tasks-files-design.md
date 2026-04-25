# Design: Project Tasks & Files — Static Wiring + Tabs + Upload

**Date:** 2026-04-24  
**Status:** Approved

---

## Summary

Wire up the Add Task form in the Create Project drawer so tasks persist with the project. Add Tasks and Files tabs to the Project Workspace drawer (`ProjectDetailPanel`). Add a static file upload UI in the Files tab.

All state is in-memory only — no backend, no API.

---

## Data Model

### New type: `ProjectFile`
```ts
type ProjectFile = {
  name: string
  size: number       // bytes
  type: string       // MIME type
  uploadedAt: string // formatted date string
}
```

### Extended project shape
The `projects` const and `projectList` state gain two new fields:
```ts
tasks: ProjectTask[]
uploadedFiles: ProjectFile[]
```

Static projects initialise with `tasks` derived from `projectTaskGroups` (existing hardcoded groups flat-mapped per project — Website Redesign gets all groups as demo data, others get `[]`). All static projects get `uploadedFiles: []`.

---

## Changes: `handleCreateProject`

- After validating and building the new project object, include `tasks: taskDrafts` and `uploadedFiles: []`
- `setProjectList` and `setSelectedProject` both receive the enriched object
- `taskDrafts` is reset as before via `resetProjectForm`

---

## Changes: `ProjectDetailPanel`

### Props added
```ts
tasks: ProjectTask[]
uploadedFiles: ProjectFile[]
onFilesChange: (files: ProjectFile[]) => void
```

### Task grouping
Remove dependency on global `projectTaskGroups`. Compute groups inline:
```ts
const grouped = taskStatusOptions
  .map(status => ({ status, tasks: tasks.filter(t => t.status === status) }))
  .filter(g => g.tasks.length > 0)
```

### Tab structure
Replace the static task section (`<div className="border-t …">`) with:
```
<Tabs defaultValue="tasks">
  <TabsList>
    <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
    <TabsTrigger value="files">Files ({uploadedFiles.length})</TabsTrigger>
  </TabsList>

  <TabsContent value="tasks">
    {/* existing grouped table, now driven by `grouped` */}
  </TabsContent>

  <TabsContent value="files">
    {/* file upload UI */}
  </TabsContent>
</Tabs>
```

### Files tab UI
- Styled upload zone: `<label>` wrapping a hidden `<input type="file" multiple>`, with dashed border, upload icon, "Click to upload or drag & drop" text
- On `change`: read `event.target.files`, map to `ProjectFile[]`, call `onFilesChange([...uploadedFiles, ...newFiles])`
- File list: card grid (2 cols on md+). Each card shows: file name, MIME type badge, formatted size (KB/MB), upload date, remove button (`X`)
- Empty state: "No files uploaded yet." text

---

## Changes: Parent (`DesignaliCreative`)

### File update handler
```ts
const handleFilesChange = (files: ProjectFile[]) => {
  setProjectList(prev =>
    prev.map(p => p.name === selectedProject.name ? { ...p, uploadedFiles: files } : p)
  )
  setSelectedProject(prev => ({ ...prev, uploadedFiles: files }))
}
```

### `ProjectDetailPanel` call site
Pass `tasks={selectedProject.tasks}`, `uploadedFiles={selectedProject.uploadedFiles}`, `onFilesChange={handleFilesChange}`.

---

## Files Changed

| File | Change |
|------|--------|
| `components/creative.tsx` | All changes — single file |

---

## Out of Scope

- Persistent storage / backend
- Drag-and-drop file reordering
- File preview / lightbox
- Task editing after creation
- File download
