"use client"

import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"
import { motion } from "framer-motion"
import { staggerContainer, scaleIn } from "@/components/animations/variants"

const testimonials = [
  {
    name: "Sarah Johnson",
    role: "HR Director at TechCorp",
    content:
      "Elevate transformed how we manage performance. Our managers now spend less time on admin and more time coaching. Engagement scores jumped 42% in 6 months.",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "CEO at Growth Industries",
    content:
      "The PDP module alone justified the investment. Employees have clarity on their growth path, and we're seeing better retention across the board.",
    rating: 5,
  },
  {
    name: "Emma Rodriguez",
    role: "Operations Manager at Scale Up Co",
    content:
      "The analytics dashboard gave us insights we never had before. We can now identify high performers and skill gaps in seconds.",
    rating: 5,
  },
]

export default function Testimonials() {
  return (
    <section className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">Trusted by Leading Organizations</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See what HR leaders and business executives have to say about Elevate.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={scaleIn}
              whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)" }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-8 border-border h-full">
                <motion.div
                  className="flex gap-1 mb-4"
                  animate={{ rotate: [0, 5, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.2 }}
                >
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} size={16} className="fill-accent text-accent" />
                  ))}
                </motion.div>
                <p className="text-foreground mb-6 leading-relaxed italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
