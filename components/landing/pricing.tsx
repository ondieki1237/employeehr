"use client"

import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import { motion } from "framer-motion"
import { staggerContainer, scaleIn } from "@/components/animations/variants"

const plans = [
  {
    name: "Starter",
    price: "$399",
    period: "/month",
    description: "Perfect for small teams",
    features: ["Up to 50 employees", "Basic performance tracking", "PDP module", "Standard reports", "Email support"],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Professional",
    price: "$899",
    period: "/month",
    description: "For growing companies",
    features: [
      "Up to 500 employees",
      "Advanced analytics",
      " 360° feedback system",
      "Custom reports",
      "Award automation",
      "Priority support",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    description: "For large organizations",
    features: [
      "Unlimited employees",
      "All Professional features",
      "Custom integrations",
      "Dedicated account manager",
      "White-label options",
      "24/7 phone support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-28 md:py-40 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/50">
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
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            <span className="text-sm font-medium text-slate-700">Transparent Pricing</span>
          </motion.div>
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-balance text-slate-900">Flexible Plans for Every Scale</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Choose the plan that fits your organization. All plans include a 14-day free trial.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          className="grid md:grid-cols-3 gap-10 max-w-5xl mx-auto"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.3 }
              }}
            >
              <div
                className={`relative h-full rounded-2xl p-8 transition-all duration-300 ${
                  plan.popular 
                    ? "bg-gradient-to-br from-blue-50 to-green-50 border-2 border-blue-300" 
                    : "bg-white border border-slate-200 hover:border-slate-300"
                }`}
                style={{
                  boxShadow: plan.popular
                    ? "inset 0 1px 3px rgba(255,255,255,0.7), 0 20px 40px rgba(37,99,235,0.15)"
                    : "inset 0 1px 3px rgba(255,255,255,0.7), 0 8px 16px rgba(0,0,0,0.06)"
                }}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <motion.div
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  >
                    <div className="px-4 py-1 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-full text-sm font-semibold shadow-lg">
                      Most Popular
                    </div>
                  </motion.div>
                )}

                {/* Plan Info */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-slate-600 mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <motion.div
                      key={i}
                      className="flex items-start gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      viewport={{ once: true }}
                    >
                      <Check size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </motion.div>
                  ))}
                </div>

                {/* CTA Button */}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full">
                  <Button
                    className={`w-full h-12 font-semibold text-base rounded-xl transition-all ${
                      plan.popular
                        ? "bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white shadow-lg"
                        : "bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-900"
                    }`}
                    style={{
                      boxShadow: plan.popular
                        ? "0 8px 16px rgba(37,99,235,0.3)"
                        : "inset 0 1px 2px rgba(255,255,255,0.5), 0 4px 8px rgba(0,0,0,0.08)"
                    }}
                  >
                    {plan.cta}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
