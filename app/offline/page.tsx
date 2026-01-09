"use client";

import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
export default function OfflinePage() {

  return (
    <Layout>
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          You're Offline
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          No internet connection. Please check your connection.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
          <a
            href="/risk-detection"
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Icon name="health" size={18} />
            Risk Detection Tool
          </a>
        </div>
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900 mb-4">
            <span className="flex items-start gap-2">
              <Icon name="info" size={16} className="mt-0.5" />
              <span><strong>Offline Feature Available:</strong> You can still use the Risk Detection Tool even without internet connection. Click the button above to assess your pregnancy risk level.</span>
            </span>
          </p>
          <p className="text-sm text-blue-900">
            <span className="flex items-start gap-2">
              <Icon name="info" size={16} className="mt-0.5" />
              <span>Tip: Some features may work offline if you've visited the site before.</span>
            </span>
          </p>
        </div>
      </div>
    </Layout>
  );
}

