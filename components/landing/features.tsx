"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, Target, Award, Users, BarChart3, MessageSquare, BookOpen, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { staggerContainer, scaleIn } from "@/components/animations/variants"

const features = [
  {
    icon: TrendingUp,
    title: "Real-time Performance Tracking",
    description: "Monitor KPIs and employee progress in real-time with automated scoring and insights.",
  },
  {
    icon: Target,
    title: "Personal Development Plans",
    description: "Create SMART goals and milestones with built-in progress tracking and manager feedback.",
  },
  {
    icon: Award,
    title: "Employee Recognition",
    description: "Automatically identify and celebrate top performers with transparent scoring algorithms.",
  },
  {
    icon: Users,
    title: "360° Feedback & Reviews",
    description: "Gather peer reviews and comprehensive feedback to support employee growth.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description: "Visualize team performance trends, skill gaps, and growth metrics with interactive dashboards.",
  },
  {
    icon: MessageSquare,
    title: "Manager Coaching Tools",
    description: "Empower managers with feedback templates, coaching guides, and actionable insights.",
  },
  {
    icon: BookOpen,
    title: "Learning & Development",
    description: "Connect training opportunities to development plans and track learning outcomes.",
  },
  {
    icon: Zap,
    title: "Automated Workflows",
    description: "Eliminate manual processes with automatic notifications, reminders, and report generation.",
  },
]

export default function Features() {
  return (
    <section id="features" className="py-28 md:py-40 bg-gradient-to-b from-white via-slate-50/50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full mb-6 shadow-sm"
            style={{
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.05)"
            }}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-sm font-medium text-slate-700">Powerful Features</span>
          </motion.div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-balance text-slate-900">
            Everything You Need to Elevate Performance
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            A comprehensive platform that covers every aspect of employee performance management and development.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                variants={scaleIn}
                whileHover={{
                  y: -12,
                  transition: { duration: 0.3 }
                }}
              >
                <div 
                  className="relative h-full p-8 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-all duration-300 group cursor-pointer"
                  style={{
                    boxShadow: "inset 0 1px 3px rgba(255,255,255,0.7), 0 8px 20px rgba(0,0,0,0.08)"
                  }}
                >
                  {/* Icon Container */}
                  <motion.div
                    className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-100 to-green-100 flex items-center justify-center mb-6 group-hover:from-blue-200 group-hover:to-green-200 transition-all"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    style={{
                      boxShadow: "inset 0 2px 4px rgba(255,255,255,0.5)"
                    }}
                  >
                    <Icon className="w-7 h-7 text-blue-600" />
                  </motion.div>
                  
                  {/* Content */}
                  <h3 className="font-semibold text-lg mb-3 text-slate-900">{feature.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                  
                  {/* Hover indicator */}
                  <motion.div 
                    className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-green-500 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                  />
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
