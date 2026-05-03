"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  X,
  Camera,
} from "lucide-react"

export default function SellerProfilePage() {
  const router = useRouter()
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "+213 555 123 456",
    location: "Algiers, Algeria",
    bio: "Passionate seller with years of experience in fashion and accessories. Committed to providing quality products and excellent customer service.",
  })

  useEffect(() => {
    if (!user) return
    setFormData((prev) => ({
      ...prev,
      name: user.name,
      email: user.email,
    }))
  }, [user?.id, user?.name, user?.email])

  if (!user) {
    router.push("/login")
    return null
  }

  const handleSave = async () => {
    try {
      await updateProfile({ name: formData.name, email: formData.email })
      setIsEditing(false)
      toast({
        title: "Profile saved",
        description: "Your name and email were updated.",
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save profile."
      toast({ title: "Save failed", description: msg, variant: "destructive" })
    }
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
          <h1 className="text-2xl font-bold text-foreground mb-1">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and account settings
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="rounded-xl gap-2">
            <Edit className="w-4 h-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleCancel} variant="outline" className="rounded-xl gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} className="rounded-xl gap-2">
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
              <div className="w-full h-full rounded-full border-4 border-background shadow-lg overflow-hidden bg-secondary flex items-center justify-center">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-14 h-14 text-muted-foreground" aria-hidden />
                )}
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors">
                  <Camera className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Name & Role */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-1">{user.name}</h2>
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full capitalize">
                {user.role}
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
                <span className="text-sm text-muted-foreground">Total Products</span>
                <span className="font-medium text-foreground">45</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Sales</span>
                <span className="font-medium text-foreground">DZD 125,000</span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Personal Information</h3>
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
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Location
                </label>
                {isEditing ? (
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="rounded-xl"
                  />
                ) : (
                  <p className="text-muted-foreground">{formData.location}</p>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">About Me</h3>
            {isEditing ? (
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="rounded-xl min-h-[120px]"
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-muted-foreground leading-relaxed">{formData.bio}</p>
            )}
          </div>

          {/* Account Actions */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">Account Actions</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-xl">
                Change Password
              </Button>
              <Button variant="outline" className="rounded-xl">
                Export Data
              </Button>
              <Button variant="outline" className="rounded-xl text-destructive border-destructive hover:bg-destructive/10">
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
