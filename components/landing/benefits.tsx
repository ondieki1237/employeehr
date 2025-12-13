"use client"

import { Check } from "lucide-react"
import { motion } from "framer-motion"
import { fadeInLeft, fadeInRight, staggerContainer } from "@/components/animations/variants"

const benefits = [
  { title: "Increase Productivity", stats: "34% improvement in team performance" },
  { title: "Reduce Turnover", stats: "28% lower employee attrition rate" },
  { title: "Boost Engagement", stats: "5x more connected employees" },
  { title: "Accelerate Growth", stats: "Clear development pathways" },
]

export default function Benefits() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance" variants={fadeInLeft}>
              Drive Real Business Results
            </motion.h2>
            <motion.p className="text-lg text-muted-foreground mb-8 leading-relaxed" variants={fadeInLeft}>
              Organizations using Elevate see measurable improvements in performance, retention, and employee
              satisfaction. Our platform helps leaders invest in their most valuable asset: their people.
            </motion.p>

            <motion.div
              className="space-y-4"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {benefits.map((benefit, index) => (
                <motion.div key={index} className="flex gap-4" variants={fadeInLeft} whileHover={{ x: 8 }}>
                  <motion.div
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center mt-1"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.1 }}
                  >
                    <Check size={16} className="text-accent" />
                  </motion.div>
                  <div>
                    <h4 className="font-semibold text-foreground">{benefit.title}</h4>
                    <p className="text-sm text-muted-foreground">{benefit.stats}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            className="relative h-96"
            variants={fadeInRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-accent/10 via-primary/10 to-accent/5 rounded-2xl"
              animate={{
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
              }}
            ></motion.div>
            <img
              src="/team-collaboration.jpg"
              alt="Business Results"
              className="relative w-full h-full object-cover rounded-2xl"
            />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
