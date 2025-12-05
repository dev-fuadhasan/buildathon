# MomsCare Comprehensive Improvement Plan

## 🎯 Overview
Complete redesign and enhancement of MomsCare platform to production-ready standards with full i18n support.

---

## 📋 Phase 1: Doctor Profile System (CRITICAL)

### 1.1 Expand Doctor Data Model
**File: `lib/data.ts`**
- Add fields to `DoctorProfile`:
  - `phone?: string`
  - `bmdcNumber?: string` (BMDC Registration Number)
  - `clinicName?: string`
  - `clinicAddress?: string`
  - `profilePicture?: string` (R2 URL)
  - `qualification?: string`
  - `experience?: string`
  - `verificationComment?: string` (Admin's comment)
  - `pendingVerification?: boolean` (Flag for re-verification after edit)

### 1.2 Doctor Registration Enhancement
**Files: `app/doctor/register/page.tsx`, `app/api/auth/doctor/register/route.ts`**
- Add all new fields to registration form
- Add profile picture upload during registration
- Validate BMDC number format
- Store all information in R2

### 1.3 Doctor Profile Page
**New File: `app/doctor/profile/page.tsx`**
- View current profile with all details
- Edit profile functionality
- Profile picture upload/update
- When profile is edited:
  - Set `pendingVerification = true`
  - Set `status = "pending"`
  - Clear `verificationComment`
  - Show message: "Profile updated. Waiting for admin verification."

### 1.4 Doctor Profile API
**New File: `app/api/doctor/profile/route.ts`**
- GET: Fetch doctor profile
- PUT: Update doctor profile (triggers re-verification)

### 1.5 Admin Comment System
**Files: `app/api/admin/doctors/route.ts`, `app/admin/dashboard/page.tsx`**
- Add comment field when approving/rejecting
- Store comment in `verificationComment`
- Display comment on doctor dashboard if status is pending/rejected

### 1.6 Doctor Dashboard Updates
**File: `app/doctor/dashboard/page.tsx`**
- Show admin comment if status is pending/rejected
- Link to profile page
- Show verification status

---

## 📋 Phase 2: List Views Redesign

### 2.1 Admin Dashboard Lists
**File: `app/admin/dashboard/page.tsx`**
- **Doctors List**: Show only name, email, status badge
- **Mothers List**: Show only name, email, weeks pregnant
- Add "View Details" button for each item
- Modal/drawer to show full details

### 2.2 Doctor Dashboard Lists
**File: `app/doctor/dashboard/page.tsx`**
- **Questions List**: Show only patient name, question preview, status
- Add "View Details" button
- Modal to show full question, patient details, prescriptions

### 2.3 Mother Dashboard Lists
**File: `app/mother/dashboard/page.tsx`**
- Already has good structure, but improve prescription list
- Add "View Details" for questions

### 2.4 Reusable Detail Modal Component
**New File: `components/DetailModal.tsx`**
- Reusable modal for showing full details
- Works with any data type
- Responsive design

---

## 📋 Phase 3: Full Site i18n Implementation

### 3.1 Expand Translation File
**File: `lib/i18n.ts`**
- Add all missing translations
- Doctor profile translations
- Admin comment translations
- Form labels
- Error messages
- Success messages

### 3.2 Update All Pages
**All page files**
- Replace hardcoded text with `t.` translations
- Use `useTranslation` hook or `getTranslations`
- Ensure proper language switching

### 3.3 Bangla UI Adaptations
**File: `app/globals.css`**
- Add Bangla font support
- Adjust spacing for longer Bangla text
- Ensure proper alignment
- RTL support if needed (though Bangla can be LTR)

---

## 📋 Phase 4: Professional UI/UX Redesign

### 4.1 Design System
**File: `app/globals.css`**
- Consistent spacing scale
- Professional color palette
- Typography scale
- Shadow system
- Border radius consistency

### 4.2 Component Improvements
**All component files**
- Better card designs
- Improved form layouts
- Better button styles
- Consistent spacing
- Professional icons

### 4.3 Layout Improvements
**File: `components/Layout.tsx`**
- Better navigation
- Improved header
- Footer addition
- Better responsive breakpoints

### 4.4 Page-Specific Improvements
- Homepage: Hero section, better CTAs
- Dashboards: Better grid layouts, cards
- Forms: Better validation, error states
- Lists: Better table/card layouts

---

## 📋 Phase 5: Missing Fields & Validation

### 5.1 Doctor Fields
- Phone number (required)
- BMDC Number (required, validated)
- Clinic/Hospital name (required)
- Clinic address (required)
- Profile picture (required)
- Qualifications (required)
- Years of experience (required)

### 5.2 Mother Fields
- Phone number (already added, verify)
- All other fields verified

### 5.3 Form Validation
- Client-side validation
- Server-side validation
- Clear error messages
- Success feedback

---

## 📋 Phase 6: Additional Features

### 6.1 Profile Picture Upload
**New API: `app/api/doctor/profile-picture/route.ts`**
- Upload to R2
- Generate signed URL
- Update doctor profile

### 6.2 Admin Dashboard Enhancements
- Better statistics
- Search functionality
- Filter options
- Export capabilities (future)

### 6.3 Notification System
- Show admin comments to doctors
- Show verification status changes
- Email notifications (future)

---

## 🎨 Design Principles

1. **Consistency**: Same design patterns throughout
2. **Clarity**: Clear hierarchy, readable text
3. **Accessibility**: Proper contrast, keyboard navigation
4. **Responsiveness**: Works on all devices
5. **Performance**: Fast loading, smooth interactions
6. **Internationalization**: Proper support for both languages

---

## 📊 Implementation Order

1. ✅ Expand data models (DoctorProfile)
2. ✅ Update doctor registration
3. ✅ Create doctor profile page
4. ✅ Add admin comment system
5. ✅ Redesign list views
6. ✅ Implement full i18n
7. ✅ UI/UX improvements
8. ✅ Testing and refinement

---

## 🚀 Expected Outcomes

- Professional, production-ready UI/UX
- Complete doctor profile system with verification
- Full English/Bangla support
- Clean, minimal list views with detail modals
- All required fields implemented
- Better user experience across all roles

