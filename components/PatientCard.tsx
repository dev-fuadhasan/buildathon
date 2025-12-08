"use client";

import Icon from "@/components/Icon";
import { PatientData } from "@/lib/data";

type PatientCardProps = {
  patient: PatientData;
  onEdit: () => void;
  onDelete: () => void;
  onView?: () => void;
};

// Generate color based on name
const getAvatarColor = (name: string): string => {
  const colors = [
    "from-blue-500 to-blue-600",
    "from-green-500 to-green-600",
    "from-purple-500 to-purple-600",
    "from-pink-500 to-pink-600",
    "from-orange-500 to-orange-600",
    "from-cyan-500 to-cyan-600",
    "from-indigo-500 to-indigo-600",
    "from-teal-500 to-teal-600",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export default function PatientCard({ patient, onEdit, onDelete, onView }: PatientCardProps) {
  const avatarColor = getAvatarColor(patient.name);
  const lastUpdated = patient.updatedAt || patient.createdAt;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 p-3">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-semibold text-base shadow-md`}>
          {patient.name.charAt(0).toUpperCase()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800 text-sm mb-0.5">{patient.name}</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Icon name="profile" size={14} className="text-slate-400" />
                  {patient.phone}
                </span>
                {patient.age && (
                  <>
                    <span>•</span>
                    <span>Age: {patient.age}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500 mb-2">
            <span className="flex items-center gap-1">
              <Icon name="prescription" size={12} />
              {patient.prescriptions?.length || 0} Prescriptions
            </span>
            <span className="flex items-center gap-1">
              <Icon name="report" size={12} />
              {patient.reports?.length || 0} Reports
            </span>
            <span className="flex items-center gap-1">
              <Icon name="documents" size={12} />
              {patient.documents?.length || 0} Documents
            </span>
          </div>

          {/* Added by & Last Updated */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1.5">
            {patient.createdByName && (
              <span>Added by: {patient.createdByName}</span>
            )}
            {lastUpdated && (
              <>
                {patient.createdByName && <span>•</span>}
                <span>Updated: {new Date(lastUpdated).toLocaleDateString()}</span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 mt-2">
            {onView && (
              <button
                onClick={onView}
                className="text-[10px] px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium"
              >
                View
              </button>
            )}
            <button
              onClick={onEdit}
              className="text-[10px] px-2 py-0.5 rounded border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 font-medium"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="text-[10px] px-2 py-0.5 rounded bg-white text-red-600 hover:bg-red-50 font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

