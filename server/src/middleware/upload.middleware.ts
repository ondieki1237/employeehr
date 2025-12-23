import multer from "multer"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../../uploads/logos")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext)
    cb(null, `${name}-${uniqueSuffix}${ext}`)
  },
})

// File filter: only images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"]
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Only image files are allowed"))
  }
}

export const uploadLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
})

// Create application files directory
const applicationFilesDir = path.join(__dirname, "../../uploads/applications")
if (!fs.existsSync(applicationFilesDir)) {
  fs.mkdirSync(applicationFilesDir, { recursive: true })
}

// Configure storage for application files
const applicationStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, applicationFilesDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_')
    cb(null, `${name}-${uniqueSuffix}${ext}`)
  },
})

// File filter: Allow documents and common file types
const applicationFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "image/png",
    "image/jpeg",
    "image/jpg",
  ]
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("File type not allowed. Supported: PDF, DOC, DOCX, XLS, XLSX, TXT, PNG, JPG"))
  }
}

export const uploadApplicationFiles = multer({
  storage: applicationStorage,
  fileFilter: applicationFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
})
