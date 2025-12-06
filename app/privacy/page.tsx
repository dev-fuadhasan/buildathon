"use client";

import Layout from "@/components/Layout";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguage } from "@/lib/i18n";
import { useState } from "react";

export default function PrivacyPage() {
  const t = useTranslation();
  const [lang] = useState(() => getLanguage());
  const isBn = lang === "bn";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <h1 className="text-4xl font-bold text-purple-600">
          {isBn ? "গোপনীয়তা নীতি" : "Privacy Policy & Data Ethics"}
        </h1>

        <div className="prose max-w-none space-y-6">
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              {isBn ? "ডেটা সংগ্রহ এবং ব্যবহার" : "Data Collection & Use"}
            </h2>
            <p className="text-slate-700 leading-relaxed">
              {isBn
                ? "MomsCare গর্ভাবস্থা এবং মাতৃস্বাস্থ্য সম্পর্কিত তথ্য প্রদানের জন্য আপনার ব্যক্তিগত স্বাস্থ্য তথ্য সংগ্রহ করে। আমরা শুধুমাত্র প্রয়োজনীয় তথ্য সংগ্রহ করি এবং এটি শুধুমাত্র আপনার যত্নের জন্য ব্যবহার করি।"
                : "MomsCare collects personal health information to provide pregnancy and maternal health guidance. We only collect necessary information and use it solely for your care."}
            </p>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              {isBn ? "সম্মতি" : "Consent"}
            </h2>
            <p className="text-slate-700 leading-relaxed">
              {isBn
                ? "আমাদের পরিষেবা ব্যবহার করার মাধ্যমে, আপনি আমাদের গোপনীয়তা নীতিতে সম্মত হচ্ছেন। আপনি যে কোনো সময় আপনার তথ্য দেখতে, সম্পাদনা করতে বা মুছে ফেলতে পারেন।"
                : "By using our service, you consent to our privacy policy. You can view, edit, or delete your information at any time."}
            </p>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              {isBn ? "ডেটা সুরক্ষা" : "Data Security"}
            </h2>
            <p className="text-slate-700 leading-relaxed">
              {isBn
                ? "আমরা আপনার তথ্য সুরক্ষিত রাখতে এনক্রিপশন এবং নিরাপদ স্টোরেজ ব্যবহার করি। আপনার তথ্য তৃতীয় পক্ষের সাথে শেয়ার করা হয় না।"
                : "We use encryption and secure storage to protect your information. Your data is not shared with third parties."}
            </p>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              {isBn ? "চিকিৎসা পরামর্শ" : "Medical Advice Disclaimer"}
            </h2>
            <p className="text-slate-700 leading-relaxed">
              {isBn
                ? "MomsCare AI চ্যাটবট পেশাদার চিকিৎসা পরামর্শের বিকল্প নয়। জরুরী অবস্থার জন্য অবিলম্বে চিকিৎসা সহায়তা নিন।"
                : "MomsCare AI chatbot is not a substitute for professional medical advice. Seek immediate medical assistance for emergencies."}
            </p>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              {isBn ? "আপনার অধিকার" : "Your Rights"}
            </h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>{isBn ? "আপনার তথ্য অ্যাক্সেস করার অধিকার" : "Right to access your information"}</li>
              <li>{isBn ? "আপনার তথ্য সংশোধন করার অধিকার" : "Right to correct your information"}</li>
              <li>{isBn ? "আপনার তথ্য মুছে ফেলার অধিকার" : "Right to delete your information"}</li>
              <li>{isBn ? "ডেটা পোর্টেবিলিটির অধিকার" : "Right to data portability"}</li>
            </ul>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              {isBn ? "যোগাযোগ" : "Contact"}
            </h2>
            <p className="text-slate-700">
              {isBn
                ? "গোপনীয়তা সম্পর্কিত প্রশ্নের জন্য, অনুগ্রহ করে আমাদের সাথে যোগাযোগ করুন।"
                : "For privacy-related questions, please contact us."}
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}

