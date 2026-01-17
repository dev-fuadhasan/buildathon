"use client";

import Layout from "@/components/Layout";
import MessagePopup from "@/components/MessagePopup";
import Icon from "@/components/Icon";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DoctorRegister() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "doctor" as "doctor" | "others",
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
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/google?role=doctor");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to initiate Google registration");
        return;
      }
      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex-1 flex flex-col justify-center py-8 sm:py-16 px-4 animate-in fade-in duration-700 w-full">
        <div className="mx-auto w-full max-w-4xl space-y-6 sm:space-y-8">
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-100 mb-2 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <Icon name="doctor" size={40} className="brightness-0 invert" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Practitioner <span className="text-blue-600">Enlistment</span>
              </h1>
              <p className="text-slate-500 font-medium max-w-md mx-auto leading-relaxed text-sm sm:text-base">
                Join our network of healthcare professionals providing expert guidance to mothers.
              </p>
            </div>
          </div>

          <MessagePopup
            isOpen={popup.isOpen}
            onClose={() => setPopup({ ...popup, isOpen: false })}
            type={popup.type}
            title={popup.title}
            message={popup.message}
          />

          <form onSubmit={onSubmit} className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(59,130,246,0.08)] border border-blue-50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32 opacity-60" />
            
            <div className="p-5 sm:p-10 md:p-12 space-y-6 sm:space-y-10 relative z-10">
              {/* Role Selection */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Icon name="profile" size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Select Your Role</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={`relative flex items-center gap-4 cursor-pointer p-5 border-2 rounded-2xl transition-all duration-300 ${form.role === "doctor" ? "border-blue-500 bg-blue-50/50 shadow-md ring-4 ring-blue-50" : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"}`}>
                    <input
                      type="radio"
                      name="role"
                      value="doctor"
                      checked={form.role === "doctor"}
                      onChange={(e) => setForm({ ...form, role: e.target.value as "doctor" | "others" })}
                      className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-black uppercase tracking-widest text-xs">Medical Doctor</span>
                      <span className="text-[10px] text-slate-500 font-medium">Full clinical access & consultations</span>
                    </div>
                  </label>
                  <label className={`relative flex items-center gap-4 cursor-pointer p-5 border-2 rounded-2xl transition-all duration-300 ${form.role === "others" ? "border-blue-500 bg-blue-50/50 shadow-md ring-4 ring-blue-50" : "border-slate-100 hover:border-blue-200 hover:bg-slate-50"}`}>
                    <input
                      type="radio"
                      name="role"
                      value="others"
                      checked={form.role === "others"}
                      onChange={(e) => setForm({ ...form, role: e.target.value as "doctor" | "others" })}
                      className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-black uppercase tracking-widest text-xs">Health Worker</span>
                      <span className="text-[10px] text-slate-500 font-medium">Supportive care & monitoring</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Icon name="secure" size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Account Information</h3>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="group/input">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-blue-500 transition-colors">Full Name</label>
                    <input
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-300"
                      placeholder="Dr. Jane Smith"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="group/input">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-blue-500 transition-colors">Clinical Email</label>
                    <input
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-300"
                      placeholder="doctor@clinic.com"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="group/input">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-blue-500 transition-colors">Phone Number</label>
                    <input
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-300"
                      placeholder="+880 1XXX XXXXXX"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="group/input">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-blue-500 transition-colors">Security Password</label>
                    <div className="relative">
                      <input
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-5 pr-12 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-300"
                        placeholder="Min. 6 characters"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
                      >
                        <Icon name="view" size={18} className={showPassword ? "opacity-100" : "opacity-40"} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Icon name="info" size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Professional Credentials</h3>
                </div>
                <div className="grid gap-6">
                  <div className="group/input">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-blue-500 transition-colors">Hospital / Clinic Name</label>
                    <input
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-300"
                      placeholder="Enter official hospital or clinic name"
                      value={form.hospitalClinicName}
                      onChange={(e) => setForm({ ...form, hospitalClinicName: e.target.value })}
                      required
                    />
                  </div>

                  {form.role === "doctor" && (
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="group/input">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-blue-500 transition-colors">Specialty</label>
                        <input
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-300"
                          placeholder="e.g., Obstetrics & Gynecology"
                          value={form.specialty}
                          onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                          required
                        />
                      </div>
                      <div className="group/input">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-blue-500 transition-colors">BMDC Registration No.</label>
                        <input
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-300"
                          placeholder="BMDC-XXXXX"
                          value={form.bmdcNumber}
                          onChange={(e) => setForm({ ...form, bmdcNumber: e.target.value })}
                          required
                        />
                      </div>
                      <div className="group/input">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-blue-500 transition-colors">Qualifications</label>
                        <input
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-300"
                          placeholder="e.g., MBBS, FCPS"
                          value={form.qualification}
                          onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                          required
                        />
                      </div>
                      <div className="group/input">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-blue-500 transition-colors">Years of Experience</label>
                        <input
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-300"
                          placeholder="e.g., 10"
                          type="number"
                          min="0"
                          value={form.experience}
                          onChange={(e) => setForm({ ...form, experience: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  )}
                  
                  {form.role === "doctor" && (
                    <div className="group/input">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 group-focus-within/input:text-blue-500 transition-colors">Clinic Address</label>
                      <textarea
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-5 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 outline-none transition-all duration-300 min-h-[100px] resize-none"
                        placeholder="Full official address of the medical facility"
                        value={form.clinicAddress}
                        onChange={(e) => setForm({ ...form, clinicAddress: e.target.value })}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Documents */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <Icon name="upload" size={20} />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">Verification</h3>
                </div>
                <div className="group/input p-8 border-2 border-dashed border-slate-200 rounded-[2rem] bg-slate-50/50 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300">
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400">
                        <Icon name="upload" size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-700 uppercase tracking-widest">Upload Profile Image</p>
                        <p className="text-[10px] text-slate-500 font-medium tracking-wide">JPG, PNG, or WEBP (Max 5MB)</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        required
                      />
                      {profilePicture ? (
                        <div className="mt-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl text-xs font-bold animate-in fade-in scale-in duration-300">
                          ✓ {profilePicture.name}
                        </div>
                      ) : (
                        <div className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-colors">
                          Select File
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-sm text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100 animate-in shake-in duration-300">
                  <Icon name="error" size={18} />
                  <p className="font-bold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="group/btn relative w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white py-5 rounded-2xl text-base font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:shadow-2xl hover:shadow-blue-200 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
                disabled={loading}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-3">
                  {loading ? (
                    <>
                      <Icon name="sync" size={20} className="animate-spin" />
                      <span>Processing Application...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application for Approval</span>
                      <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                    </>
                  )}
                </span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center justify-center py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative bg-white px-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">OR</span>
                </div>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleRegister}
                disabled={googleLoading || loading}
                className="group/google relative w-full bg-white border-2 border-slate-200 text-slate-700 py-5 rounded-2xl text-base font-black uppercase tracking-widest shadow-sm hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
              >
                <div className="absolute inset-0 bg-slate-50 translate-y-full group-hover/google:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-3">
                  {googleLoading ? (
                    <>
                      <Icon name="sync" size={20} className="animate-spin text-slate-600" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </span>
              </button>

              <p className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest leading-loose">
                By submitting, you agree to our clinical service terms.<br />
                All applications undergo verification before system access.
              </p>
            </div>
          </form>

          <div className="text-center space-y-6 pb-12">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Already have an account?</p>
            <Link 
              href="/doctor/login" 
              className="inline-flex items-center justify-center gap-3 px-8 py-3 bg-white text-slate-900 border-2 border-slate-100 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-sm hover:border-blue-200 hover:bg-blue-50/50 hover:text-pink-600 transition-all duration-300 active:scale-95 group"
            >
              Sign In to Portal
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            
            <div className="bg-slate-900 border-2 border-slate-800 rounded-[2rem] p-6 max-w-sm mx-auto relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                  <Icon name="info" size={16} />
                </div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Clinical Demo Access</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 text-left">
                  <p className="text-[9px] font-black uppercase text-slate-500">Email</p>
                  <p className="text-[11px] font-bold text-slate-200">demo@doctor.com</p>
                </div>
                <div className="space-y-1 text-left">
                  <p className="text-[9px] font-black uppercase text-slate-500">Password</p>
                  <p className="text-[11px] font-bold text-slate-200">123456</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
