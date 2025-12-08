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
  role?: "doctor" | "nurse" | "others";
  hospitalClinicName?: string;
  profilePicture?: string;
  status: "pending" | "approved" | "rejected";
  verificationComment?: string;
  pendingVerification?: boolean;
};

export default function NurseProfile() {
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
        if (data.requiresLogout) {
          setPopup({
            isOpen: true,
            type: "warning",
            title: "Profile Updated",
            message: data.message || "Profile updated. You will be logged out. Please wait for admin verification before logging in again.",
          });
          setTimeout(() => {
            localStorage.removeItem("doctorToken");
            location.href = "/";
          }, 3000);
        } else {
          setMessage("✅ Profile updated successfully!");
          setIsEditing(false);
          fetchProfile();
        }
      } else {
        setMessage(`❌ ${data.error || "Failed to update profile"}`);
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
          <h1 className="text-3xl font-bold mb-4">Nurse Profile</h1>
          <p className="text-slate-600 mb-6">Please log in to continue.</p>
          <button
            onClick={() => router.push("/doctor/login")}
            className="btn-primary inline-block"
          >
            Login
          </button>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="mx-auto max-w-xl text-center">
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold gradient-text mb-2 sm:mb-3">
              My Profile
            </h1>
            <p className="text-sm sm:text-lg text-neutral-600">
              Manage your profile information
            </p>
          </div>
          <div className="hidden md:flex flex-wrap gap-2 sm:gap-3">
            <Link href="/nurse/dashboard" className="btn-secondary flex items-center gap-2">
              <Icon name="overview" size={20} />
              Dashboard
            </Link>
            <button
              className="btn-ghost text-sm"
              onClick={() => {
                localStorage.removeItem("doctorToken");
                location.href = "/";
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <MessagePopup
          isOpen={popup.isOpen}
          onClose={() => setPopup({ ...popup, isOpen: false })}
          type={popup.type}
          title={popup.title}
          message={popup.message}
        />

        {message && (
          <div className={`rounded-xl p-4 border-2 ${
            message.includes("✅") ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"
          }`}>
            {message}
          </div>
        )}

        <DashboardCard
          title="Profile Information"
          action={
            !isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <Icon name="edit" size={16} />
                Edit Profile
              </button>
            ) : null
          }
        >
          {!isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                {profile.profilePicture ? (
                  <img
                    src={profile.profilePicture}
                    alt={profile.name || "Profile"}
                    className="w-24 h-24 rounded-full object-cover border-2 border-neutral-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl border-2 border-neutral-200">
                    {profile.name ? profile.name.charAt(0).toUpperCase() : "N"}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold">{profile.name || "No name"}</h2>
                  <p className="text-slate-600">{profile.email}</p>
                  {profile.role && (
                    <p className="text-sm text-slate-500 capitalize">{profile.role}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Phone</label>
                  <p className="text-slate-800">{profile.phone || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Hospital/Clinic Name</label>
                  <p className="text-slate-800">{profile.hospitalClinicName || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Status</label>
                  <p className={`font-semibold ${
                    profile.status === "approved" ? "text-green-600" :
                    profile.status === "pending" ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {profile.status.charAt(0).toUpperCase() + profile.status.slice(1)}
                  </p>
                </div>
              </div>

              {profile.verificationComment && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Admin Comment:</strong> {profile.verificationComment}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                {editForm.profilePicture ? (
                  <img
                    src={editForm.profilePicture}
                    alt={editForm.name || "Profile"}
                    className="w-24 h-24 rounded-full object-cover border-2 border-neutral-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-2xl border-2 border-neutral-200">
                    {editForm.name ? editForm.name.charAt(0).toUpperCase() : "N"}
                  </div>
                )}
                <div>
                  <label className="btn-secondary cursor-pointer inline-flex items-center gap-2">
                    <Icon name="upload" size={16} />
                    {uploading ? "Uploading..." : "Change Picture"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    className="input w-full"
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hospital/Clinic Name</label>
                  <input
                    type="text"
                    className="input w-full"
                    value={editForm.hospitalClinicName || ""}
                    onChange={(e) => setEditForm({ ...editForm, hospitalClinicName: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm(profile);
                    setMessage("");
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </DashboardCard>
      </div>
    </Layout>
  );
}

