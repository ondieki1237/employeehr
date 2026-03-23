"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200" style={{
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.08)"
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/" className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center shadow-lg"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                >
                  <span className="text-white font-bold text-lg">E</span>
                </motion.div>
                <span className="font-bold text-lg hidden sm:inline text-slate-900">Elevate</span>
              </Link>
            </motion.div>

            {/* Nav links */}
            <div className="hidden md:flex gap-8">
              {["Features", "How it Works", "Pricing"].map((item, idx) => (
                <motion.div key={idx} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
                  <Link
                    href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    {item}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex gap-3">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm" className="text-slate-700 hover:text-blue-600 hover:bg-blue-50/50">
                  Log in
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="/auth/signup">
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg" style={{
                  boxShadow: "0 4px 12px rgba(37,99,235,0.3)"
                }}>
                  Get Started
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Mobile menu button */}
          <motion.button className="md:hidden p-2 text-slate-600" onClick={() => setIsOpen(!isOpen)} whileTap={{ scale: 0.95 }}>
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={24} />
                </motion.div>
              ) : (
                <motion.div
                  key="open"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="md:hidden pb-4 flex flex-col gap-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {["Features", "How it Works", "Pricing"].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-sm text-slate-600 hover:text-blue-600 block py-2"
                  >
                    {item}
                  </Link>
                </motion.div>
              ))}
              <div className="border-t border-slate-200 pt-3 mt-3 space-y-2">
                <Link href="/auth/login" className="block">
                  <Button variant="ghost" className="w-full justify-start text-slate-700">
                    Log in
                  </Button>
                </Link>
                <Link href="/auth/signup" className="block">
                  <Button className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700">
                    Get Started
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}
