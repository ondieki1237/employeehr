"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function CTA() {
  return (
    <section className="py-28 md:py-40 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="relative rounded-3xl p-12 md:p-20 text-center overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-green-600"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          style={{
            boxShadow: "0 25px 60px rgba(37, 99, 235, 0.3), inset 0 1px 3px rgba(255,255,255,0.2)"
          }}
        >
          {/* Animated background decorations */}
          <motion.div
            className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 blur-2xl"
            animate={{
              rotate: [0, 360],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          ></motion.div>
          <motion.div
            className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full -ml-40 -mb-40 blur-2xl"
            animate={{
              rotate: [360, 0],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 25,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          ></motion.div>

          <motion.div
            className="relative z-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 text-balance">
              Ready to Transform Performance?
            </h2>
            <p className="text-xl text-white/95 max-w-2xl mx-auto mb-12">
              Join hundreds of companies using Elevate to drive employee growth, increase engagement, and achieve better
              business outcomes.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    className="bg-white hover:bg-slate-50 text-blue-600 h-14 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                    style={{
                      boxShadow: "0 8px 16px rgba(0,0,0,0.15)"
                    }}
                  >
                    Start Your Free Trial
                    <ArrowRight size={20} className="ml-2" />
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="#demo">
                  <Button
                    size="lg"
                    className="border-2 border-white bg-transparent hover:bg-white/10 text-white h-14 px-8 text-base font-semibold transition-all"
                    style={{
                      boxShadow: "inset 0 1px 3px rgba(255,255,255,0.2)"
                    }}
                  >
                    Schedule a Demo
                  </Button>
                </Link>
              </motion.div>
            </div>

            <p className="text-sm text-white/80 mt-10 tracking-wide">
              ✓ No credit card required • ✓ 14-day free trial • ✓ Full feature access
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
