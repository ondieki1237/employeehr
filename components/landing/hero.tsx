"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function Hero() {
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 pb-20">
      {/* Enhanced gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50"></div>
      
      {/* Neumorphic animated elements */}
      <motion.div
        className="absolute top-32 right-12 w-80 h-80 bg-gradient-to-br from-white via-blue-100 to-white rounded-full blur-3xl opacity-40 shadow-2xl"
        animate={{
          y: [0, 60, 0],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      ></motion.div>

      <motion.div
        className="absolute bottom-20 left-12 w-96 h-96 bg-gradient-to-br from-green-100 via-white to-green-50 rounded-full blur-3xl opacity-30 shadow-2xl"
        animate={{
          y: [0, -60, 0],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 10,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      ></motion.div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-10">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            className="space-y-8" 
            variants={staggerContainer} 
            initial="hidden" 
            animate="visible"
          >
            {/* Badge */}
            <motion.div
              className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-full shadow-md hover:shadow-lg transition-shadow"
              variants={fadeInUp}
              style={{
                boxShadow: "inset 0 1px 3px rgba(255,255,255,0.5), 0 8px 16px rgba(0,0,0,0.08)"
              }}
            >
              <motion.div
                className="w-2 h-2 rounded-full bg-green-500"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
              />
              <span className="text-sm font-medium text-slate-700">AI-Powered Performance Management</span>
            </motion.div>

            {/* Heading */}
            <motion.h1 
              className="text-6xl md:text-7xl font-bold leading-tight text-balance text-slate-900" 
              variants={fadeInUp}
            >
              Transform Your{" "}
              <motion.span
                className="inline-block bg-gradient-to-r from-blue-600 via-green-500 to-blue-600 bg-clip-text text-transparent"
                animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
              >
                Employee
              </motion.span>{" "}
              Performance
            </motion.h1>

            {/* Description */}
            <motion.p 
              className="text-xl text-slate-600 max-w-2xl leading-relaxed" 
              variants={fadeInUp}
            >
              Elevate combines performance tracking, personal development plans, employee recognition, and powerful
              analytics into one integrated platform trusted by forward-thinking companies worldwide.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div className="flex flex-col sm:flex-row gap-5 pt-4" variants={fadeInUp}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/auth/signup">
                  <Button 
                    size="lg" 
                    className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all h-14 px-8 text-base font-semibold"
                    style={{
                      boxShadow: "0 12px 24px rgba(37, 99, 235, 0.3)"
                    }}
                  >
                    Start Free Trial
                    <ArrowRight size={20} className="ml-2" />
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="#demo">
                  <Button
                    size="lg"
                    className="border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-md hover:shadow-lg transition-all h-14 px-8 text-base font-semibold"
                    style={{
                      boxShadow: "inset 0 1px 3px rgba(255,255,255,0.5), 0 8px 16px rgba(0,0,0,0.08)"
                    }}
                  >
                    Watch Demo
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Trust indicators */}
            <motion.p className="text-sm text-slate-500 flex items-center gap-2" variants={fadeInUp}>
              <span className="text-lg">✓</span> 14-day free trial
              <span className="text-slate-300 mx-2">•</span>
              <span className="text-lg">✓</span> No credit card required
              <span className="text-slate-300 mx-2">•</span>
              <span className="text-lg">✓</span> Full feature access
            </motion.p>
          </motion.div>

          {/* Hero Image */}
          <motion.div 
            className="relative h-96 md:h-full min-h-96" 
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-white to-green-400/20 rounded-3xl border border-slate-200"
              animate={{
                boxShadow: [
                  "0 0 40px rgba(37, 99, 235, 0.15)",
                  "0 0 60px rgba(37, 99, 235, 0.25)",
                  "0 0 40px rgba(37, 99, 235, 0.15)",
                ],
              }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
              }}
              style={{
                boxShadow: "inset 0 1px 3px rgba(255,255,255,0.8), 0 20px 60px rgba(0,0,0,0.12)"
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200/30 via-transparent to-slate-300/20 rounded-3xl" />
            </motion.div>

            {/* Placeholder content area */}
            <div className="relative w-full h-full flex items-center justify-center rounded-3xl p-8">
              <motion.div
                className="flex flex-col items-center justify-center space-y-4"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center text-white text-2xl shadow-lg">📊</div>
                <p className="text-slate-600 font-semibold">Real-time Analytics Dashboard</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
