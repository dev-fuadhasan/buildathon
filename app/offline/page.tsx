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
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Try Again
        </button>
        <div className="mt-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-900">
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

