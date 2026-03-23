"use client"

import { motion } from "framer-motion"
import { staggerContainer, fadeInUp } from "@/components/animations/variants"

const steps = [
  {
    number: "01",
    title: "Setup Your Organization",
    description: "Create your company workspace and invite team members in minutes.",
    icon: "🏢"
  },
  {
    number: "02",
    title: "Configure Performance Metrics",
    description: "Define KPIs and performance categories aligned with your business goals.",
    icon: "📊"
  },
  {
    number: "03",
    title: "Launch Performance Reviews",
    description: "Employees and managers collaborate on goals, PDPs, and regular feedback.",
    icon: "💬"
  },
  {
    number: "04",
    title: "Get Insights & Recognize",
    description: "Access real-time analytics and automatically celebrate top performers.",
    icon: "🎉"
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-28 md:py-40 bg-gradient-to-b from-slate-50/50 to-white">
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
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span className="text-sm font-medium text-slate-700">Simple Process</span>
          </motion.div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-balance text-slate-900">Simple, Powerful Workflow</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Get started in 4 simple steps. Most organizations see results within the first month.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div
          className="grid md:grid-cols-4 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {steps.map((step, index) => (
            <motion.div key={index} className="relative group" variants={fadeInUp} whileHover={{ y: -8 }}>
              {/* Card */}
              <div 
                className="relative h-full rounded-2xl p-8 bg-white border border-slate-200 group-hover:border-blue-300 transition-all"
                style={{
                  boxShadow: "inset 0 1px 3px rgba(255,255,255,0.7), 0 8px 16px rgba(0,0,0,0.06)"
                }}
              >
                {/* Number badge */}
                <motion.div
                  className="text-6xl font-bold text-slate-200 mb-6 group-hover:text-blue-200 transition-colors"
                  animate={{ opacity: [0.4, 0.7, 0.4] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, delay: index * 0.2 }}
                >
                  {step.number}
                </motion.div>

                {/* Icon */}
                <div className="text-4xl mb-4">{step.icon}</div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-3 text-slate-900">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.description}</p>
              </div>

              {/* Connecting line */}
              {index < steps.length - 1 && (
                <motion.div
                  className="hidden md:block absolute top-1/2 -right-4 w-8 h-1 bg-gradient-to-r from-blue-400 to-blue-200"
                  animate={{ scaleX: [0, 1] }}
                  transition={{ duration: 1, delay: 0.3 + index * 0.15 }}
                  style={{
                    transformOrigin: "left",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                  }}
                ></motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
