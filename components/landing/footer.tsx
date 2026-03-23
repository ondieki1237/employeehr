"use client"

import Link from "next/link"
import { Mail, Linkedin, Twitter } from "lucide-react"
import { motion } from "framer-motion"

const footerLinks = [
  { category: "Product", links: ["Features", "Pricing", "Security"] },
  { category: "Company", links: ["About", "Blog", "Careers"] },
  { category: "Legal", links: ["Privacy", "Terms", "Contact"] },
]

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-white via-slate-50/50 to-slate-100/50 border-t border-slate-200 py-20 md:py-24" style={{
      boxShadow: "inset 0 1px 3px rgba(255,255,255,0.5)"
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-5 gap-12 mb-16">
          <motion.div
            className="md:col-span-1"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">E</span>
              </div>
              <span className="font-bold">Elevate</span>
            </Link>
            <p className="text-sm text-muted-foreground">Employee performance and development platform.</p>
          </motion.div>

          {footerLinks.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: (idx + 1) * 0.1 }}
              viewport={{ once: true }}
            >
              <h4 className="font-semibold mb-4">{section.category}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {section.links.map((link, i) => (
                  <motion.li key={i} whileHover={{ x: 4 }} transition={{ duration: 0.2 }}>
                    <Link href="#" className="hover:text-foreground transition">
                      {link}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <h4 className="font-semibold mb-4">Follow</h4>
            <div className="flex gap-4">
              {[Twitter, Linkedin, Mail].map((Icon, i) => (
                <motion.div key={i} whileHover={{ scale: 1.2, rotate: 10 }} whileTap={{ scale: 0.95 }}>
                  <Link href="#" className="text-muted-foreground hover:text-primary transition">
                    <Icon size={20} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          viewport={{ once: true }}
        >
          <p className="text-sm text-muted-foreground">© 2025 Elevate. All rights reserved.</p>
          <p className="text-sm text-muted-foreground mt-4 md:mt-0">Built with love for modern HR teams.</p>
        </motion.div>
      </div>
    </footer>
  )
}
