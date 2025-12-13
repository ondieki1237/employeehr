"use client"

import { motion } from "framer-motion"
import { staggerContainer, fadeInUp } from "@/components/animations/variants"

const steps = [
  {
    number: "01",
    title: "Setup Your Organization",
    description: "Create your company workspace and invite team members in minutes.",
  },
  {
    number: "02",
    title: "Configure Performance Metrics",
    description: "Define KPIs and performance categories aligned with your business goals.",
  },
  {
    number: "03",
    title: "Launch Performance Reviews",
    description: "Employees and managers collaborate on goals, PDPs, and regular feedback.",
  },
  {
    number: "04",
    title: "Get Insights & Recognize",
    description: "Access real-time analytics and automatically celebrate top performers.",
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Simple, Powerful Workflow</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in 4 simple steps. Most organizations see results within the first month.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-4 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {steps.map((step, index) => (
            <motion.div key={index} className="relative" variants={fadeInUp} whileHover={{ y: -4 }}>
              <div className="mb-6">
                <motion.div
                  className="text-5xl font-bold text-primary/20 mb-2"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, delay: index * 0.2 }}
                >
                  {step.number}
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>

              {index < steps.length - 1 && (
                <motion.div
                  className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-gradient-to-r from-border to-transparent"
                  animate={{ scaleX: [0, 1] }}
                  transition={{ duration: 1, delay: 0.3 + index * 0.2 }}
                ></motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
