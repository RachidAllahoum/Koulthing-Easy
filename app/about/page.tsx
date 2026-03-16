import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Users, Target, Award, Globe } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 md:py-24 px-4 border-b border-border">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              About Koulthing
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Building a vibrant marketplace where creators, sellers, and buyers connect, share knowledge, and build sustainable businesses together.
            </p>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Our Mission</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To empower individuals and small businesses by providing a curated platform where knowledge meets commerce. We believe in democratizing access to quality products and expertise while supporting sellers in their journey to success.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold text-foreground">Our Vision</h2>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Our vision is to become the leading digital marketplace for local commerce, where discovering and buying products online is simple, transparent, and reliable.

We aim to empower small businesses and independent sellers by giving them the technology and visibility they need to grow, while providing customers with a modern and enjoyable shopping experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-16 md:py-24 px-4 bg-secondary/30">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-foreground mb-12 text-center">Our Core Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: "Trust & Transparency",
                  description: "We believe in honest dealings and transparent practices in every interaction."
                },
                {
                  title: "Community First",
                  description: "Our community's success is our success. We prioritize their needs above all."
                },
                {
                  title: "Quality Excellence",
                  description: "Every feature we build is designed to improve the experience of the people using our platform."
                },
                {
                  title: "Customer Focus",
                  description: "We continuously evolve to meet the changing needs of our users."
                },
              ].map((value, idx) => (
                <div key={idx} className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold text-foreground mb-12 text-center flex items-center justify-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              Our Team
            </h2>
            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              We're a passionate team of developers, designers, and business experts dedicated to creating the best marketplace experience. Though distributed globally, we work together daily to serve our community.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "Rachid Allahoum", role: "Founder & CEO", focus: "Strategic Vision" },
                { name: "Manid Zerguini", role: "Co-Founder & CTO", focus: "Technology" },
                
              ].map((member, idx) => (
                <div key={idx} className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                  <p className="text-xs text-accent mt-1">{member.focus}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 md:py-24 px-4 bg-primary text-primary-foreground">
          <div className="container mx-auto max-w-4xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-3xl md:text-4xl font-bold mb-2">5K+</p>
                <p className="text-sm opacity-90">Active Sellers</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold mb-2">50K+</p>
                <p className="text-sm opacity-90">Happy Customers</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold mb-2">200+</p>
                <p className="text-sm opacity-90">Product Categories</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold mb-2">2024</p>
                <p className="text-sm opacity-90">Year Founded</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-24 px-4">
          <div className="container mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-foreground mb-6">Join Our Community</h2>
            <p className="text-muted-foreground mb-8">
              Whether you're a buyer looking for quality products or a seller ready to reach new customers, Koulthing is the platform for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button className="rounded-lg px-8">Create Account</Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="rounded-lg px-8">Contact Us</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
