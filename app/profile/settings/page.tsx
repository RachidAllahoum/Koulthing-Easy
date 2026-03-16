"use client"

import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, Bell, Lock, Eye, EyeOff } from "lucide-react"

export default function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  })
  const [notifications, setNotifications] = useState({
    orders: true,
    promotions: true,
    messages: true,
  })

  const handlePasswordChange = () => {
    if (passwordData.new !== passwordData.confirm) {
      alert("Passwords do not match")
      return
    }
    alert("Password changed successfully")
    setPasswordData({ current: "", new: "", confirm: "" })
    setShowPasswordForm(false)
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/profile">
              <Button variant="outline" size="sm" className="rounded-lg">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          </div>

          <div className="space-y-6">
            {/* Account Settings */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security
              </h2>

              <div className="space-y-4">
                {!showPasswordForm ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-lg"
                    onClick={() => setShowPasswordForm(true)}
                  >
                    Change Password
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 bg-secondary rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Current Password
                      </label>
                      <Input
                        type="password"
                        placeholder="Enter your current password"
                        value={passwordData.current}
                        onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                        className="rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        New Password
                      </label>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={passwordData.new}
                        onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                        className="rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          value={passwordData.confirm}
                          onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                          className="rounded-lg pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="rounded-lg"
                        onClick={handlePasswordChange}
                      >
                        Update Password
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => {
                          setShowPasswordForm(false)
                          setPasswordData({ current: "", new: "", confirm: "" })
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </h2>

              <div className="space-y-4">
                <label className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={notifications.orders}
                    onChange={(e) => setNotifications({ ...notifications, orders: e.target.checked })}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <div>
                    <p className="font-medium text-foreground">Order Updates</p>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications about your orders
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={notifications.messages}
                    onChange={(e) => setNotifications({ ...notifications, messages: e.target.checked })}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <div>
                    <p className="font-medium text-foreground">Messages</p>
                    <p className="text-xs text-muted-foreground">
                      Notifications for new messages from sellers
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-secondary/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={notifications.promotions}
                    onChange={(e) => setNotifications({ ...notifications, promotions: e.target.checked })}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                  <div>
                    <p className="font-medium text-foreground">Promotions & Offers</p>
                    <p className="text-xs text-muted-foreground">
                      Exclusive deals and discounts
                    </p>
                  </div>
                </label>

                <Button className="w-full rounded-lg mt-4">Save Preferences</Button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-card border border-destructive/30 rounded-2xl p-6">
              <h2 className="text-xl font-semibold text-destructive mb-6">Danger Zone</h2>
              <Button variant="destructive" className="w-full rounded-lg">
                Delete Account
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                This action cannot be undone. Please be certain.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
