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
    role: "doctor" as "doctor" | "nurse" | "others",
    hospitalClinicName: "",
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
  const [showPassword, setShowPassword] = useState(false);
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

      // Then register health worker
      const res = await fetch("/api/auth/doctor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          hospitalClinicName: form.hospitalClinicName || form.clinicName, // Use hospitalClinicName if set, otherwise clinicName
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
          <h1 className="text-4xl font-bold text-blue-600 mb-2">Health Worker Application</h1>
          <p className="text-slate-600">Submit your details for admin approval</p>
        </div>

        {/* Demo Account Info */}
        <div className="bg-blue-50/60 border border-blue-200/60 rounded-lg p-4 space-y-3">
          <p className="text-sm text-blue-900/80 font-medium">
            You can easily create a new account, but it requires admin approval. If you want to check an account already created, use these credentials.
          </p>
          <div className="text-sm text-blue-800/70 space-y-2">
            <div>
              <p className="font-semibold mb-1">For doctor:</p>
              <p className="ml-2"><span className="font-medium">Email:</span> demo@doctor.com</p>
              <p className="ml-2"><span className="font-medium">Password:</span> 123456</p>
            </div>
            <div>
              <p className="font-semibold mb-1">For nurse:</p>
              <p className="ml-2"><span className="font-medium">Email:</span> demo@nurse1.com</p>
              <p className="ml-2"><span className="font-medium">Password:</span> 123456</p>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="card space-y-6">
          {/* Role Selection */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Role Selection</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex items-center space-x-2 cursor-pointer p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="doctor"
                  checked={form.role === "doctor"}
                  onChange={(e) => setForm({ ...form, role: e.target.value as "doctor" | "nurse" | "others" })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-700 font-medium">Doctor</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="nurse"
                  checked={form.role === "nurse"}
                  onChange={(e) => setForm({ ...form, role: e.target.value as "doctor" | "nurse" | "others" })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-700 font-medium">Nurse</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer p-4 border-2 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="role"
                  value="others"
                  checked={form.role === "others"}
                  onChange={(e) => setForm({ ...form, role: e.target.value as "doctor" | "nurse" | "others" })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-700 font-medium">Others</span>
              </label>
            </div>
          </div>

          {/* Hospital/Clinic Name */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Hospital/Clinic Information</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Hospital/Clinic Name *
                </label>
                <input
                  className="input w-full"
                  placeholder="Enter hospital or clinic name"
                  value={form.hospitalClinicName}
                  onChange={(e) => setForm({ ...form, hospitalClinicName: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  {form.role === "nurse" || form.role === "others" 
                    ? "If your hospital/clinic already exists, you'll be added to the same dashboard."
                    : "For doctors, this is your clinic/hospital name."}
                </p>
              </div>
            </div>
          </div>

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
                <div className="relative">
                  <input
                    className="input w-full pr-10"
                    placeholder="Create a strong password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Professional Information - Only for Doctors */}
          {form.role === "doctor" && (
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
          )}

          {/* Clinic Address - Only for Doctors */}
          {form.role === "doctor" && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Clinic Information</h3>
              <div className="grid gap-4">
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
          )}

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
