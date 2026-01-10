"use client";

import { useState } from "react";
import Icon from "./Icon";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (type: "overall" | "dateRange", startDate?: string, endDate?: string) => void;
  generating: boolean;
};

export default function GenerateReportModal({ isOpen, onClose, onGenerate, generating }: Props) {
  const [reportType, setReportType] = useState<"overall" | "dateRange">("overall");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (reportType === "dateRange") {
      if (!startDate || !endDate) {
        alert("Please select both start and end dates");
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        alert("Start date must be before end date");
        return;
      }
      onGenerate("dateRange", startDate, endDate);
    } else {
      onGenerate("overall");
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const maxDate = today;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Icon name="prescription" size={24} />
            Generate Medical Report
          </h2>
          <button
            onClick={onClose}
            disabled={generating}
            className="text-slate-400 hover:text-slate-600 transition-colors text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Report Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="reportType"
                  value="overall"
                  checked={reportType === "overall"}
                  onChange={(e) => setReportType(e.target.value as "overall" | "dateRange")}
                  className="w-5 h-5 text-pink-600"
                  disabled={generating}
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">Overall Report</div>
                  <div className="text-sm text-slate-600">
                    Complete medical history and current status
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="reportType"
                  value="dateRange"
                  checked={reportType === "dateRange"}
                  onChange={(e) => setReportType(e.target.value as "overall" | "dateRange")}
                  className="w-5 h-5 text-pink-600"
                  disabled={generating}
                />
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">Date Range Report</div>
                  <div className="text-sm text-slate-600">
                    Report for a specific time period
                  </div>
                </div>
              </label>
            </div>
          </div>

          {reportType === "dateRange" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={maxDate}
                  className="input w-full"
                  disabled={generating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={maxDate}
                  className="input w-full"
                  disabled={generating}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              disabled={generating}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || (reportType === "dateRange" && (!startDate || !endDate))}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Icon name="pending" size={18} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Icon name="save" size={18} />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

