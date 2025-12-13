import React from 'react';
import { GraduationCap, Stethoscope, Building2, UserRound, MapPin } from 'lucide-react';

type Doctor = {
  name: string;
  qualifications?: string;
  specialty?: string;
  designation?: string;
  hospital?: string;
};

interface DoctorCardProps {
  doctor: Doctor;
}

const DoctorCard: React.FC<DoctorCardProps> = ({ doctor }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
             <div className="bg-medical-100 p-2 rounded-full">
                <UserRound className="w-6 h-6 text-medical-600" />
             </div>
             <h3 className="text-xl font-bold text-gray-900">{doctor.name}</h3>
          </div>
        </div>

        <div className="space-y-3">
          {doctor.qualifications && (
            <div className="flex items-start space-x-3">
              <GraduationCap className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-600 font-medium">{doctor.qualifications}</p>
            </div>
          )}
          
          {doctor.specialty && (
            <div className="flex items-start space-x-3">
              <Stethoscope className="w-5 h-5 text-medical-500 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-700">{doctor.specialty}</p>
            </div>
          )}

          {doctor.designation && (
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                 <span className="block w-2 h-2 bg-gray-300 rounded-full" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mt-0.5">{doctor.designation}</p>
            </div>
          )}

          {doctor.hospital && (
            <div className="flex items-start space-x-3">
              <Building2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <p className="text-sm text-gray-600">{doctor.hospital}</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
        <button className="w-full bg-medical-600 hover:bg-medical-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
          <MapPin className="w-4 h-4" />
          See Chambers
        </button>
      </div>
    </div>
  );
};

export default DoctorCard;