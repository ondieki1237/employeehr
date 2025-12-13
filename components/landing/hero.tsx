"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { fadeInUp, fadeInRight, staggerContainer } from "@/components/animations/variants"

export default function Hero() {
  return (
    <section className="relative min-h-[600px] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5"></div>

      {/* Animated decorative elements */}
      <motion.div
        className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
        animate={{
          y: [0, 40, 0],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 8,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      ></motion.div>

      <motion.div
        className="absolute bottom-0 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl"
        animate={{
          y: [0, -40, 0],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 10,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      ></motion.div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div className="space-y-6" variants={staggerContainer} initial="hidden" animate="visible">
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-secondary rounded-full border border-border"
              variants={fadeInUp}
            >
              <Sparkles size={16} className="text-accent" />
              <span className="text-sm text-secondary-foreground">AI-Powered Performance Management</span>
            </motion.div>

            <motion.h1 className="text-5xl md:text-6xl font-bold leading-tight text-balance" variants={fadeInUp}>
              Transform Your{" "}
              <motion.span
                className="text-primary inline-block"
                animate={{ color: ["#2563eb", "#059669", "#2563eb"] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
              >
                Employee
              </motion.span>{" "}
              Performance
            </motion.h1>

            <motion.p className="text-lg text-muted-foreground max-w-xl leading-relaxed" variants={fadeInUp}>
              Elevate combines performance tracking, personal development plans, employee recognition, and powerful
              analytics into one integrated platform trusted by forward-thinking companies.
            </motion.p>

            <motion.div className="flex flex-col sm:flex-row gap-4 pt-4" variants={fadeInUp}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/auth/signup" className="flex items-center gap-2">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                    Start Free Trial
                    <ArrowRight size={18} />
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-border hover:bg-secondary bg-transparent w-full sm:w-auto"
                >
                  <Link href="#demo">Watch Demo</Link>
                </Button>
              </motion.div>
            </motion.div>

            <motion.p className="text-sm text-muted-foreground" variants={fadeInUp}>
              ✓ 14-day free trial • ✓ No credit card required • ✓ Full access to all features
            </motion.p>
          </motion.div>

          <motion.div className="relative h-96 md:h-full" variants={fadeInRight} initial="hidden" animate="visible">
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(37, 99, 235, 0.1)",
                  "0 0 40px rgba(37, 99, 235, 0.2)",
                  "0 0 20px rgba(37, 99, 235, 0.1)",
                ],
              }}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
              }}
            ></motion.div>
            <img
              src="/employee-performance-dashboard.jpg"
              alt="Performance Dashboard"
              className="relative w-full h-full object-cover rounded-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
