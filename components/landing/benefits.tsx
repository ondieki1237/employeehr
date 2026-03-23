"use client"

import { Check } from "lucide-react"
import { motion } from "framer-motion"

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const fadeInLeft = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
}

const fadeInRight = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
}

const benefits = [
  { title: "Increase Productivity", stats: "34% improvement in team performance", icon: "📈" },
  { title: "Reduce Turnover", stats: "28% lower employee attrition rate", icon: "🊏" },
  { title: "Boost Engagement", stats: "5x more connected employees", icon: "💫" },
  { title: "Accelerate Growth", stats: "Clear development pathways", icon: "🚀" },
]

export default function Benefits() {
  return (
    <section className="py-28 md:py-40 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.div
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full mb-6 shadow-sm"
              style={{
                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.5), 0 2px 4px rgba(0,0,0,0.05)"
              }}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              <span className="text-sm font-medium text-slate-700">Real Business Results</span>
            </motion.div>
            
            <motion.h2 className="text-5xl md:text-6xl font-bold mb-8 text-balance text-slate-900" variants={fadeInLeft}>
              Drive Real Business Results
            </motion.h2>
            
            <motion.p className="text-xl text-slate-600 mb-10 leading-relaxed" variants={fadeInLeft}>
              Organizations using Elevate see measurable improvements in performance, retention, and employee
              satisfaction. Our platform helps leaders invest in their most valuable asset: their people.
            </motion.p>

            {/* Benefits list */}
            <motion.div
              className="space-y-5"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {benefits.map((benefit, index) => (
                <motion.div 
                  key={index} 
                  className="flex gap-5 group cursor-default"
                  variants={fadeInLeft}
                  whileHover={{ x: 8, transition: { duration: 0.3 } }}
                >
                  <motion.div
                    className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mt-1 group-hover:from-green-200 group-hover:to-emerald-200 transition-all shadow-md"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, delay: index * 0.1 }}
                    style={{
                      boxShadow: "inset 0 1px 2px rgba(255,255,255,0.5)"
                    }}
                  >
                    <Check size={20} className="text-green-600" />
                  </motion.div>
                  <div>
                    <h4 className="font-semibold text-lg text-slate-900 mb-1">{benefit.title}</h4>
                    <p className="text-slate-600">{benefit.stats}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right image section */}
          <motion.div
            className="relative h-96 md:h-full min-h-96"
            variants={fadeInRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-purple-100/40 via-white to-blue-100/40 rounded-3xl border border-slate-200"
              animate={{
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{
                duration: 4,
                repeat: Number.POSITIVE_INFINITY,
              }}
              style={{
                boxShadow: "inset 0 1px 3px rgba(255,255,255,0.8), 0 16px 48px rgba(0,0,0,0.1)"
              }}
            ></motion.div>
            
            {/* Placeholder for image */}
            <div className="relative w-full h-full flex items-center justify-center rounded-3xl p-8 overflow-hidden">
              <motion.div
                className="text-center"
                animate={{ y: [0, 15, 0] }}
                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
              >
                <div className="text-6xl mb-4">🤝</div>
                <p className="text-slate-600 font-semibold">Team Collaboration</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
