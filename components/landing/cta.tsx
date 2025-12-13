"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export default function CTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-12 md:p-16 text-center relative overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {/* Animated background decorations */}
          <motion.div
            className="absolute top-0 right-0 w-72 h-72 bg-primary-foreground/10 rounded-full -mr-36 -mt-36"
            animate={{
              rotate: [0, 360],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 20,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          ></motion.div>
          <motion.div
            className="absolute bottom-0 left-0 w-72 h-72 bg-primary-foreground/10 rounded-full -ml-36 -mb-36"
            animate={{
              rotate: [360, 0],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 25,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          ></motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4 text-balance">
              Ready to Transform Performance?
            </h2>
            <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto mb-8">
              Join hundreds of companies using Elevate to drive employee growth, increase engagement, and achieve better
              business outcomes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="/auth/signup" className="flex items-center gap-2">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="bg-primary-foreground hover:bg-primary-foreground/90 text-primary w-full sm:w-auto"
                  >
                    Start Your Free Trial
                    <ArrowRight size={18} />
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link href="#demo">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 bg-transparent w-full sm:w-auto"
                  >
                    Schedule a Demo
                  </Button>
                </Link>
              </motion.div>
            </div>

            <p className="text-sm text-primary-foreground/80 mt-6">
              No credit card required • 14-day free trial • Full feature access
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
