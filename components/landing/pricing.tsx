"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import Link from "next/link"
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
    <section id="pricing" className="py-20 md:py-28 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Transparent, Flexible Pricing</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your organization. All plans include a 14-day free trial.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-8"
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
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
              }}
              transition={{ duration: 0.3 }}
            >
              <Card
                className={`p-8 flex flex-col border-border transition ${plan.popular ? "border-primary ring-1 ring-primary/20" : ""}`}
              >
                {plan.popular && (
                  <motion.div
                    className="mb-4 inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium w-fit"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  >
                    Most Popular
                  </motion.div>
                )}

                <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

                <div className="mb-6">
                  <motion.span
                    className="text-4xl font-bold text-foreground"
                    animate={{ color: plan.popular ? "#2563eb" : "currentColor" }}
                  >
                    {plan.price}
                  </motion.span>
                  <span className="text-muted-foreground ml-2">{plan.period}</span>
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    size="lg"
                    className={`w-full mb-8 ${plan.popular ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "border-border"}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    <Link href="/signup">{plan.cta}</Link>
                  </Button>
                </motion.div>

                <motion.div
                  className="space-y-3 flex-1"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  {plan.features.map((feature, i) => (
                    <motion.div
                      key={i}
                      className="flex gap-3"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      viewport={{ once: true }}
                    >
                      <Check size={20} className="text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
