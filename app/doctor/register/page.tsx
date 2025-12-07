"use client";

import Layout from "@/components/Layout";
import MessagePopup from "@/components/MessagePopup";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DoctorRegister() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    specialty: "",
    bmdcNumber: "",
    clinicName: "",
    clinicAddress: "",
    qualification: "",
    experience: "",
  });
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<{ isOpen: boolean; type: "success" | "error" | "warning" | "info"; title: string; message: string }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Profile picture must be less than 5MB");
        return;
      }
      setProfilePicture(file);
      setError("");
    }
  };

  const parseJsonResponse = async (res: Response) => {
    try {
      const text = await res.text();
      if (!text) return {};
      return JSON.parse(text);
    } catch {
      return {};
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // First upload profile picture if provided
      let profilePictureUrl = "";
      if (profilePicture) {
        const formData = new FormData();
        formData.append("file", profilePicture);
        const picRes = await fetch("/api/doctor/profile-picture-register", {
          method: "POST",
          body: formData,
        });
        if (!picRes.ok) {
          const picData = await parseJsonResponse(picRes);
          throw new Error(picData.error || "Failed to upload profile picture");
        }
        const picData = await parseJsonResponse(picRes);
        if (!picData.key) {
          throw new Error("Failed to get profile picture key");
        }
        profilePictureUrl = picData.key; // Store the key, not the URL
      }

      // Then register doctor
      const res = await fetch("/api/auth/doctor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          profilePicture: profilePictureUrl,
        }),
      });

      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setPopup({
        isOpen: true,
        type: "success",
        title: "Application Submitted Successfully!",
        message: "Your application has been submitted. You can log in after admin approval. We'll notify you once your account is approved.",
      });
      
      // Redirect after popup is closed
      setTimeout(() => {
        router.push("/doctor/login");
      }, 3000);
    } catch (err: any) {
      setPopup({
        isOpen: true,
        type: "error",
        title: "Registration Failed",
        message: err.message || "An error occurred during registration. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">Doctor Application</h1>
          <p className="text-slate-600">Submit your details for admin approval</p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-6">
          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Personal Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  className="input w-full"
                  placeholder="Dr. John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email *
                </label>
                <input
                  className="input w-full"
                  placeholder="doctor@example.com"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number *
                </label>
                <input
                  className="input w-full"
                  placeholder="+880 1234 567890"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Password *
                </label>
                <input
                  className="input w-full"
                  placeholder="Create a strong password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Professional Information</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Specialty *
                </label>
                <input
                  className="input w-full"
                  placeholder="e.g., Obstetrics & Gynecology"
                  value={form.specialty}
                  onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  BMDC Registration Number *
                </label>
                <input
                  className="input w-full"
                  placeholder="BMDC-12345"
                  value={form.bmdcNumber}
                  onChange={(e) => setForm({ ...form, bmdcNumber: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Medical Qualifications *
                </label>
                <input
                  className="input w-full"
                  placeholder="e.g., MBBS, FCPS"
                  value={form.qualification}
                  onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Years of Experience *
                </label>
                <input
                  className="input w-full"
                  placeholder="e.g., 10"
                  type="number"
                  min="0"
                  value={form.experience}
                  onChange={(e) => setForm({ ...form, experience: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Clinic Information */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Clinic/Hospital Information</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Clinic/Hospital Name *
                </label>
                <input
                  className="input w-full"
                  placeholder="e.g., City Hospital"
                  value={form.clinicName}
                  onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Clinic Address *
                </label>
                <textarea
                  className="input w-full h-24"
                  placeholder="Full address of your clinic/hospital"
                  value={form.clinicAddress}
                  onChange={(e) => setForm({ ...form, clinicAddress: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* Profile Picture */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Profile Picture</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Upload Profile Picture (Max 5MB) *
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                className="input w-full"
                required
              />
              {profilePicture && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {profilePicture.name} selected
                </p>
              )}
            </div>
          </div>

          <MessagePopup
            isOpen={popup.isOpen}
            onClose={() => setPopup({ ...popup, isOpen: false })}
            type={popup.type}
            title={popup.title}
            message={popup.message}
          />

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full py-3 text-lg"
            disabled={loading}
          >
            {loading ? "Submitting..." : "Submit Application for Approval"}
          </button>

          <p className="text-xs text-slate-500 text-center">
            Your application will be reviewed by admin. You'll be notified once approved.
          </p>
        </form>
      </div>
    </Layout>
  );
}
