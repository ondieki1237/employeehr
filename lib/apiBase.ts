// Determines API base URL depending on environment (local vs production)
// Usage: import { API_URL } from '@/lib/apiBase'

const DEFAULT_LOCAL = "http://localhost:5010"
const DEFAULT_PROD = "https://hrapi.codewithseth.co.ke"

export const API_URL = (() => {
  // If env is set, prefer it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }

  // In browser, inspect the hostname
  if (typeof window !== "undefined") {
    const host = window.location.hostname
    const isLocal = host === "localhost" || host === "127.0.0.1"
    
    // Production hostnames
    if (host.endsWith("codewithseth.co.ke") || host.endsWith(".vercel.app")) {
      return DEFAULT_PROD
    }
    
    if (isLocal) {
      return DEFAULT_LOCAL
    }
    
    // Fallback for any other hostname - assume production
    return DEFAULT_PROD
  }

  // In server-side rendering, use NODE_ENV as a hint
  const isProd = process.env.NODE_ENV === "production"
  return isProd ? DEFAULT_PROD : DEFAULT_LOCAL
})()

export default API_URL