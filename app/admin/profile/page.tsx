"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  User,
  Mail,
  Phone,
  Shield,
  Calendar,
  Edit,
  Save,
  X,
  Camera,
} from "lucide-react"

export default function AdminProfilePage() {
  const router = useRouter()
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: "+213 555 000 001",
  })

  if (!user || user.role !== "admin") {
    router.push("/login")
    return null
  }

  const handleSave = () => {
    updateProfile({ name: formData.name })
    setIsEditing(false)
    toast({
      title: "Profile Updated",
      description: "Your profile has been successfully updated.",
    })
  }

  const handleCancel = () => {
    setFormData({
      ...formData,
      name: user.name,
      email: user.email,
    })
    setIsEditing(false)
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Admin Profile</h1>
          <p className="text-muted-foreground">
            Manage your administrator account
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="rounded-xl gap-2 bg-amber-500 hover:bg-amber-600">
            <Edit className="w-4 h-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" className="rounded-xl gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} className="rounded-xl gap-2 bg-amber-500 hover:bg-amber-600">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-2xl p-6">
            {/* Avatar */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <img
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                alt={user.name}
                className="w-full h-full rounded-full object-cover border-4 border-amber-500/20 shadow-lg"
              />
              {isEditing && (
                <button className="absolute bottom-0 right-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-amber-600 transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Name & Role */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-1">{user.name}</h2>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-600 text-sm font-medium rounded-full">
                <Shield className="w-3 h-3" />
                Administrator
              </span>
            </div>

            {/* Quick Stats */}
            <div className="space-y-3 border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Member Since</span>
                <span className="font-medium text-foreground">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Shops Approved</span>
                <span className="font-medium text-foreground">24</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Actions Today</span>
                <span className="font-medium text-foreground">8</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="rounded-xl"
                  />
                ) : (
                  <p className="text-muted-foreground">{formData.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                {isEditing ? (
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="rounded-xl"
                    disabled
                  />
                ) : (
                  <p className="text-muted-foreground">{formData.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="rounded-xl"
                  />
                ) : (
                  <p className="text-muted-foreground">{formData.phone}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Role
                </label>
                <p className="text-muted-foreground">System Administrator</p>
              </div>
            </div>
          </div>

          {/* Account Actions */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Security</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-xl">
                Change Password
              </Button>
              <Button variant="outline" className="rounded-xl">
                Two-Factor Auth
              </Button>
              <Button variant="outline" className="rounded-xl">
                View Activity Log
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
