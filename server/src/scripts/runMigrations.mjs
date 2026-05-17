import { exec } from 'child_process'
import { promisify } from 'util'
import dotenv from 'dotenv'

dotenv.config()

const execAsync = promisify(exec)

export async function runMigrations() {
  try {
    const environment = process.env.NODE_ENV || 'development'
    console.log(`🔄 Running Prisma migrations for ${environment}...`)
    console.log(`📍 Database: ${process.env.MYSQL_DATABASE_URL?.split('@')[1] || 'unknown'}`)

    if (environment === 'production') {
      console.log("📦 Using 'prisma migrate deploy' for production...")
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
      console.log('✅ Output:', stdout)
      if (stderr) console.warn('⚠️ Warnings:', stderr)
    } else {
      console.log("📦 Using 'prisma db push' for development...")
      const { stdout, stderr } = await execAsync('npx prisma db push --skip-generate')
      console.log('✅ Output:', stdout)
      if (stderr) console.warn('⚠️ Warnings:', stderr)
    }

    console.log('✅ Prisma migrations completed successfully!')
    return true
  } catch (error) {
    console.error('❌ Prisma migration failed:')
    console.error(error)
    if (process.env.NODE_ENV === 'production') process.exit(1)
    return false
  }
}

export default runMigrations
