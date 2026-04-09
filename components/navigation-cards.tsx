"use client"

import Link from "next/link"
import { ArrowRight, FileText, Store } from "lucide-react"

interface NavigationCardProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  accentColor?: string
}

function NavigationCard({ href, icon, title, description }: NavigationCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col justify-between p-8 md:p-10 bg-card rounded-2xl border border-border overflow-hidden transition-all duration-500 hover:border-accent/50 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1"
    >
      {/* Background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        {/* Icon */}
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary text-foreground transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
          {icon}
        </div>

        {/* Content */}
        <h3 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 tracking-tight text-balance">
          {title}
        </h3>
        <p className="text-muted-foreground leading-relaxed text-balance">
          {description}
        </p>
      </div>

      {/* Arrow indicator */}
      <div className="relative z-10 mt-8 flex items-center gap-2 text-sm font-medium text-muted-foreground transition-all duration-300 group-hover:text-accent group-hover:gap-3">
        <span>Explore</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </div>

      {/* Corner accent */}
      <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-accent/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Link>
  )
}

export function NavigationCards() {
  const cards = [
    {
      href: "/articles",
      icon: <FileText className="h-7 w-7" />,
      title: "Browse Articles",
      description: "Discover curated content, stories, and insights from our community of creators and experts.",
    },
    {
      href: "/shops",
      icon: <Store className="h-7 w-7" />,
      title: "Browse Shops",
      description: "Explore unique shops and find products from talented sellers around the world.",
    },
    {
      href: "/register",
      icon: <Store className="h-7 w-7" />,
      title: "Create Account",
      description: "Sign up as a buyer or seller and use your dedicated experience.",
    },
  ]

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {cards.map((card) => (
            <NavigationCard key={card.href} {...card} />
          ))}
        </div>
      </div>
    </section>
  )
}
