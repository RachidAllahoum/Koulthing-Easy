"use client"

import Link from "next/link"
import { Clock3, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ComingSoonProps {
  title: string
  description: string
  backHref?: string
  backLabel?: string
}

export function ComingSoon({ title, description, backHref = "/", backLabel = "Back to home" }: ComingSoonProps) {
  return (
    <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
      <div className="max-w-2xl mx-auto text-center bg-card border border-border rounded-2xl p-8 md:p-10">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-5">
          <Clock3 className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{title}</h1>
        <p className="text-muted-foreground mb-8">{description}</p>
        <Button asChild className="rounded-full gap-2">
          <Link href={backHref}>
            {backLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
