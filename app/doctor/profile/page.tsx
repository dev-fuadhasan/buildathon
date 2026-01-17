"use client";

import DashboardCard from "@/components/DashboardCard";
import Layout from "@/components/Layout";
import MessagePopup from "@/components/MessagePopup";
import Icon from "@/components/Icon";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  specialty?: string;
  bmdcNumber?: string;
  referenceNumber?: string;
  clinicName?: string;
  clinicAddress?: string;
  profilePicture?: string;
  qualification?: string;
  experience?: string;
  status: "pending" | "approved" | "rejected";
  verificationComment?: string;
  pendingVerification?: boolean;
};

export default function DoctorProfile() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [popup, setPopup] = useState<{ isOpen: boolean; type: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  useEffect(() => {
    const t = localStorage.getItem("doctorToken") || "";
    setToken(t);
    if (t) fetchProfile(t);
  }, []);

  const headers = (t = token) => (t ? { Authorization: `Bearer ${t}` } : undefined);

  const fetchProfile = async (t = token) => {
    const res = await fetch("/api/doctor/profile", { headers: headers(t) });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      setEditForm(data.profile);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage("❌ Profile picture must be less than 5MB");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/doctor/profile-picture", {
        method: "POST",
        headers: headers(),
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("✅ Profile picture uploaded successfully!");
        fetchProfile();
      } else {
        setMessage(`❌ ${data.error || "Upload failed"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/doctor/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...headers(),
        },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (res.ok) {
        const msg = data.message || "Profile updated successfully!";
        
        // Always logout after profile edit
        if (data.requiresLogout) {
          setPopup({
            isOpen: true,
            type: "warning",
            title: "Profile Updated",
            message: msg + "\n\nYou have been logged out. Please use your new email to log in after admin approval.",
          });
          // Clear token and redirect to login after popup
          setTimeout(() => {
            localStorage.removeItem("doctorToken");
            router.push("/doctor/login");
          }, 4000);
        } else {
          setMessage("✅ " + msg);
        }
      } else {
        setMessage(`❌ ${data.error || "Could not save profile"}`);
      }
    } catch (err) {
      setMessage("❌ Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-3xl font-bold mb-4">Doctor Profile</h1>
          <p className="text-slate-600 mb-6">Please log in to continue.</p>
          <Link href="/doctor/login" className="btn-primary inline-block">
            Login
          </Link>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  const statusColors = {
    approved: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <Layout>
      <div className="space-y-6">
        <MessagePopup
          isOpen={popup.isOpen}
          onClose={() => setPopup({ ...popup, isOpen: false })}
          type={popup.type}
          title={popup.title}
          message={popup.message}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-600">My Profile</h1>
            <p className="text-slate-600 mt-2">Manage your professional information</p>
          </div>
          <Link href="/doctor/dashboard" className="btn-secondary w-fit">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Status Alert */}
        <div className={`rounded-lg border-2 p-4 ${statusColors[profile.status]}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                Status: {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
              </p>
              {profile.pendingVerification && (
                <p className="text-sm mt-1">
                  <span className="flex items-center gap-2">
                    <Icon name="warning" size={16} />
                    Your profile has been updated and is pending admin verification.
                  </span>
                </p>
              )}
              {profile.verificationComment && (
                <div className="mt-2 p-2 bg-white/50 rounded">
                  <p className="text-sm font-medium">Admin Comment:</p>
                  <p className="text-sm">{profile.verificationComment}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div className={`rounded-lg p-4 ${
            message.includes("successfully") || message.includes("Success") 
              ? "bg-green-50 text-green-800 border border-green-200" 
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            {message}
          </div>
        )}

        {/* Profile Picture */}
        <DashboardCard title="Profile Picture">
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-200 bg-slate-100 flex items-center justify-center">
              {profile.profilePicture ? (
                <img
                  src={profile.profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Icon name="doctor" size={64} className="text-slate-400" />
              )}
            </div>
            <div>
              <label className="btn-secondary cursor-pointer inline-block">
                {uploading ? "Uploading..." : (
                  <span className="flex items-center gap-2">
                    <Icon name="upload" size={18} />
                    Change Picture
                  </span>
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">Max 5MB, PNG/JPG/WEBP</p>
            </div>
          </div>
        </DashboardCard>

        {/* Profile Form */}
        <DashboardCard 
          title={isEditing ? "Edit Profile" : "Profile Information"}
          action={
            !isEditing ? (
              <button 
                onClick={() => setIsEditing(true)} 
                className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all border border-blue-200 hover:border-blue-300 active:scale-95"
              >
                <Icon name="edit" size={16} />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
              </button>
            ) : undefined
          }
        >
          {isEditing ? (
            <form onSubmit={saveProfile} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    className="input w-full"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email *
                  </label>
                  <input
                    className="input w-full"
                    type="email"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    <span className="flex items-start gap-2">
                      <Icon name="warning" size={16} className="mt-0.5" />
                      <span>Changing your email will update your login credentials. You'll need to log in again with the new email.</span>
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    className="input w-full"
                    type="tel"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Specialty *
                  </label>
                  <input
                    className="input w-full"
                    value={editForm.specialty || ""}
                    onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    BMDC Number *
                  </label>
                  <input
                    className="input w-full"
                    value={editForm.bmdcNumber || ""}
                    onChange={(e) => setEditForm({ ...editForm, bmdcNumber: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Qualifications *
                  </label>
                  <input
                    className="input w-full"
                    value={editForm.qualification || ""}
                    onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Years of Experience *
                  </label>
                  <input
                    className="input w-full"
                    type="number"
                    min="0"
                    value={editForm.experience || ""}
                    onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Clinic/Hospital Name *
                  </label>
                  <input
                    className="input w-full"
                    value={editForm.clinicName || ""}
                    onChange={(e) => setEditForm({ ...editForm, clinicName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Clinic Address *
                </label>
                <textarea
                  className="input w-full h-24"
                  value={editForm.clinicAddress || ""}
                  onChange={(e) => setEditForm({ ...editForm, clinicAddress: e.target.value })}
                  required
                />
              </div>
              <div className="flex gap-3">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : (
                    <span className="flex items-center gap-2">
                      <Icon name="save" size={18} />
                      Save Changes
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm(profile);
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
              {profile.status === "approved" && (
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                  <p className="text-sm text-yellow-800">
                    <span className="flex items-start gap-2">
                      <Icon name="warning" size={16} className="mt-0.5" />
                      <span>Note: Editing your profile will require admin re-verification.</span>
                    </span>
                  </p>
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-slate-600">Full Name</p>
                  <p className="text-lg font-semibold text-slate-800">{profile.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Email</p>
                  <p className="text-lg font-semibold text-slate-800">{profile.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Phone</p>
                  <p className="text-lg font-semibold text-slate-800">{profile.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Specialty</p>
                  <p className="text-lg font-semibold text-slate-800">{profile.specialty || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">BMDC Number</p>
                  <p className="text-lg font-semibold text-slate-800">{profile.bmdcNumber || "N/A"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-slate-600">Reference Number for Patient Consultations</p>
                  <div className="mt-2 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <p className="text-3xl font-black text-blue-600 mb-2">{profile.referenceNumber || "Generating..."}</p>
                    <p className="text-sm text-slate-600">
                      <strong>Share this 8-digit number with your patients</strong> so they can request consultations with you.
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Qualifications</p>
                  <p className="text-lg font-semibold text-slate-800">{profile.qualification || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Experience</p>
                  <p className="text-lg font-semibold text-slate-800">
                    {profile.experience ? `${profile.experience} years` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Clinic/Hospital</p>
                  <p className="text-lg font-semibold text-slate-800">{profile.clinicName || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Clinic Address</p>
                <p className="text-lg font-semibold text-slate-800">{profile.clinicAddress || "N/A"}</p>
              </div>
            </div>
          )}
        </DashboardCard>
      </div>
    </Layout>
  );
}

