import sys

filepath = "src/pages/workspace/TasksPage.tsx"
with open(filepath, 'r') as f:
    content = f.read()

replacements = [
    (
        'showToast(`Created task \\"${taskToastLabel(task.title)}\\".`);',
        'notify.success("Task created", `"${taskToastLabel(task.title)}" was added successfully.`);',
    ),
    (
        'showToast(`Updated task \\"${taskToastLabel(task.title)}\\".`);',
        'notify.success("Task updated", `"${taskToastLabel(task.title)}" was saved.`);',
    ),
    (
        'showToast(`Deleted task \\"${taskToastLabel(taskTitle)}\\".`);',
        'notify.success("Task deleted", `"${taskToastLabel(taskTitle)}" was removed.`);',
    ),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"Replaced: {old[:60]}")
    else:
        print(f"NOT FOUND: {old[:60]}")
        # Try to find a close match
        for line in content.split('\n'):
            if 'showToast' in line and 'task' in line.lower():
                print(f"  candidate: {repr(line)}")

with open(filepath, 'w') as f:
    f.write(content)
print("Done")
