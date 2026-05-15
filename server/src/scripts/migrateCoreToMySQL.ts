import "dotenv/config"
import path from "path"
import { spawn } from "child_process"
import fs from "fs/promises"

const run = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
    })

    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) return resolve()
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`))
    })
  })

const main = async () => {
  await run("npx", ["tsx", "src/scripts/exportCoreMongoData.ts"])

  const exportDir = path.resolve(process.cwd(), "data", "migrations")
  const files = await fs.readdir(exportDir)
  const latestFile = files
    .filter((file) => file.startsWith("core-mongo-export-") && file.endsWith(".json"))
    .sort()
    .at(-1)

  if (!latestFile) {
    throw new Error(`No export file found in ${exportDir}`)
  }

  const exportPath = path.join("data", "migrations", latestFile)
  await run("npx", ["tsx", "src/scripts/importCoreToMySQL.ts", exportPath])
}

main().catch((error) => {
  console.error("Core migration helper failed:", error)
  process.exitCode = 1
})
