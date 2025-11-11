import "dotenv/config"

import { createProjectTask } from "@/lib/supabase/project-tasks"

async function main() {
  const projectId = process.argv[2]
  if (!projectId) {
    console.error("Usage: tsx scripts/debug-create-task.ts <projectId>")
    process.exit(1)
  }

  try {
    const id = await createProjectTask(
      projectId,
      {
        title: "Debug task",
        description: "Testing createProjectTask via script",
        status: "todo",
        weight: 1,
        assigneeId: null,
        startDate: null,
        dueDate: null,
      },
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    )
    console.log("Created task:", id)
  } catch (error) {
    console.error("Failed to create task:", error)
    if (typeof error === "object" && error !== null) {
      console.error("Error keys:", Object.keys(error as Record<string, unknown>))
    }
  }
}

main()
