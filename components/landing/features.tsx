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
    <section id="features" className="py-20 md:py-28 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">
            Everything You Need to Elevate Performance
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A comprehensive platform that covers every aspect of employee performance management and development.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
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
                  y: -8,
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
                }}
                transition={{ duration: 0.3 }}
              >
                <Card className="p-6 border-border hover:border-primary/50 group cursor-pointer h-full">
                  <motion.div
                    className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition"
                    whileHover={{ rotate: 10, scale: 1.1 }}
                  >
                    <Icon className="w-6 h-6 text-primary" />
                  </motion.div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
