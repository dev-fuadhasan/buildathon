"use client";

import Layout from "@/components/Layout";
export default function PrivacyPage() {

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <h1 className="text-4xl font-bold text-purple-600">
          Privacy Policy & Data Ethics
        </h1>

        <div className="prose max-w-none space-y-6">
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              Data Collection & Use
            </h2>
            <p className="text-slate-700 leading-relaxed">
              MomsCare collects personal health information to provide pregnancy and maternal health guidance. We only collect necessary information and use it solely for your care.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              Consent
            </h2>
            <p className="text-slate-700 leading-relaxed">
              By using our service, you consent to our privacy policy. You can view, edit, or delete your information at any time.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              Data Security
            </h2>
            <p className="text-slate-700 leading-relaxed">
              We use encryption and secure storage to protect your information. Your data is not shared with third parties.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              Medical Advice Disclaimer
            </h2>
            <p className="text-slate-700 leading-relaxed">
              MomsCare AI chatbot is not a substitute for professional medical advice. Seek immediate medical assistance for emergencies.
            </p>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              Your Rights
            </h2>
            <ul className="list-disc list-inside space-y-2 text-slate-700">
              <li>Right to access your information</li>
              <li>Right to correct your information</li>
              <li>Right to delete your information</li>
              <li>Right to data portability</li>
            </ul>
          </section>

          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-purple-600 mb-4">
              Contact
            </h2>
            <p className="text-slate-700">
              For privacy-related questions, please contact us.
            </p>
          </section>
        </div>
      </div>
    </Layout>
  );
}

