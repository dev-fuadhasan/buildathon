-- Doctor Time Slots and Bookings System
-- Allows doctors to create time slots and patients to book consultations

-- ============================================
-- 1. DOCTOR TIME SLOTS TABLE
-- ============================================
-- Stores available time slots created by doctors

DROP TABLE IF EXISTS time_slots CASCADE;

CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id TEXT NOT NULL,  -- References user ID (doctor)
  date DATE NOT NULL,        -- Date of the slot (YYYY-MM-DD)
  start_time TIME NOT NULL,  -- Start time (HH:MM:SS)
  end_time TIME NOT NULL,    -- End time (HH:MM:SS)
  duration_minutes INTEGER NOT NULL DEFAULT 30,  -- Duration in minutes
  max_bookings INTEGER NOT NULL DEFAULT 1,       -- Max bookings per slot
  current_bookings INTEGER NOT NULL DEFAULT 0,   -- Current number of bookings
  status TEXT NOT NULL DEFAULT 'available',      -- 'available', 'full', 'cancelled'
  slot_type TEXT DEFAULT 'consultation',         -- Type of appointment
  notes TEXT,                                     -- Doctor's notes about the slot
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX idx_time_slots_doctor_id ON time_slots(doctor_id);
CREATE INDEX idx_time_slots_date ON time_slots(date);
CREATE INDEX idx_time_slots_status ON time_slots(status);
CREATE INDEX idx_time_slots_doctor_date ON time_slots(doctor_id, date);

-- Unique constraint: Doctor can't have overlapping time slots
CREATE UNIQUE INDEX idx_time_slots_no_overlap 
  ON time_slots(doctor_id, date, start_time, end_time)
  WHERE status != 'cancelled';


-- ============================================
-- 2. CONSULTATION BOOKINGS TABLE
-- ============================================
-- Stores consultation bookings made by patients

DROP TABLE IF EXISTS consultation_bookings CASCADE;

CREATE TABLE consultation_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  doctor_id TEXT NOT NULL,           -- References user ID (doctor)
  mother_id TEXT NOT NULL,           -- References user ID (mother/patient)
  consultation_id TEXT,              -- Links to existing consultation if exists
  issue_description TEXT NOT NULL,   -- What the patient wants to discuss
  additional_notes TEXT,             -- Any additional information
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'approved', 'rejected', 'completed', 'cancelled'
  booking_reference TEXT UNIQUE NOT NULL,  -- 8-digit booking reference
  booked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,          -- When doctor approved/rejected
  completed_at TIMESTAMPTZ,          -- When consultation was completed
  cancellation_reason TEXT,          -- Reason for cancellation if cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX idx_consultation_bookings_time_slot ON consultation_bookings(time_slot_id);
CREATE INDEX idx_consultation_bookings_doctor ON consultation_bookings(doctor_id);
CREATE INDEX idx_consultation_bookings_mother ON consultation_bookings(mother_id);
CREATE INDEX idx_consultation_bookings_status ON consultation_bookings(status);
CREATE INDEX idx_consultation_bookings_reference ON consultation_bookings(booking_reference);

-- Function to generate 8-digit booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TEXT AS $$
DECLARE
  ref TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 8-digit number
    ref := LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
    
    -- Check if it already exists
    SELECT EXISTS(SELECT 1 FROM consultation_bookings WHERE booking_reference = ref) INTO exists;
    
    IF NOT exists THEN
      RETURN ref;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate booking reference
CREATE OR REPLACE FUNCTION set_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_reference IS NULL OR NEW.booking_reference = '' THEN
    NEW.booking_reference := generate_booking_reference();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_booking_reference ON consultation_bookings;
CREATE TRIGGER trigger_set_booking_reference
  BEFORE INSERT ON consultation_bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_booking_reference();


-- ============================================
-- 3. UPDATE TRIGGERS
-- ============================================
-- Auto-update updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_time_slots_updated_at ON time_slots;
CREATE TRIGGER trigger_time_slots_updated_at
  BEFORE UPDATE ON time_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_consultation_bookings_updated_at ON consultation_bookings;
CREATE TRIGGER trigger_consultation_bookings_updated_at
  BEFORE UPDATE ON consultation_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 4. BOOKING COUNT TRIGGER
-- ============================================
-- Auto-update time_slot.current_bookings when booking is created/updated

CREATE OR REPLACE FUNCTION update_slot_booking_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    -- Increment count when booking is approved
    UPDATE time_slots 
    SET current_bookings = current_bookings + 1,
        status = CASE 
          WHEN current_bookings + 1 >= max_bookings THEN 'full'
          ELSE 'available'
        END
    WHERE id = NEW.time_slot_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
      -- Newly approved
      UPDATE time_slots 
      SET current_bookings = current_bookings + 1,
          status = CASE 
            WHEN current_bookings + 1 >= max_bookings THEN 'full'
            ELSE 'available'
          END
      WHERE id = NEW.time_slot_id;
      
    ELSIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
      -- No longer approved (cancelled/rejected)
      UPDATE time_slots 
      SET current_bookings = GREATEST(current_bookings - 1, 0),
          status = 'available'
      WHERE id = NEW.time_slot_id AND status != 'cancelled';
    END IF;
    
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN
    -- Decrement count when approved booking is deleted
    UPDATE time_slots 
    SET current_bookings = GREATEST(current_bookings - 1, 0),
        status = 'available'
    WHERE id = OLD.time_slot_id AND status != 'cancelled';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_slot_booking_count ON consultation_bookings;
CREATE TRIGGER trigger_update_slot_booking_count
  AFTER INSERT OR UPDATE OR DELETE ON consultation_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_booking_count();


-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Doctors can view own time slots" ON time_slots;
DROP POLICY IF EXISTS "Doctors can create own time slots" ON time_slots;
DROP POLICY IF EXISTS "Doctors can update own time slots" ON time_slots;
DROP POLICY IF EXISTS "Doctors can delete own time slots" ON time_slots;
DROP POLICY IF EXISTS "Mothers can view available slots for their doctors" ON time_slots;

DROP POLICY IF EXISTS "Doctors can view bookings for their slots" ON consultation_bookings;
DROP POLICY IF EXISTS "Mothers can view their own bookings" ON consultation_bookings;
DROP POLICY IF EXISTS "Mothers can create bookings" ON consultation_bookings;
DROP POLICY IF EXISTS "Doctors can update bookings for their slots" ON consultation_bookings;
DROP POLICY IF EXISTS "Mothers can update their own pending bookings" ON consultation_bookings;

-- Time Slots Policies
CREATE POLICY "Doctors can view own time slots"
  ON time_slots FOR SELECT
  USING (doctor_id = auth.uid()::text);

CREATE POLICY "Doctors can create own time slots"
  ON time_slots FOR INSERT
  WITH CHECK (doctor_id = auth.uid()::text);

CREATE POLICY "Doctors can update own time slots"
  ON time_slots FOR UPDATE
  USING (doctor_id = auth.uid()::text);

CREATE POLICY "Doctors can delete own time slots"
  ON time_slots FOR DELETE
  USING (doctor_id = auth.uid()::text);

CREATE POLICY "Mothers can view available slots for their doctors"
  ON time_slots FOR SELECT
  USING (
    status = 'available' 
    AND date >= CURRENT_DATE
  );

-- Consultation Bookings Policies
CREATE POLICY "Doctors can view bookings for their slots"
  ON consultation_bookings FOR SELECT
  USING (doctor_id = auth.uid()::text);

CREATE POLICY "Mothers can view their own bookings"
  ON consultation_bookings FOR SELECT
  USING (mother_id = auth.uid()::text);

CREATE POLICY "Mothers can create bookings"
  ON consultation_bookings FOR INSERT
  WITH CHECK (mother_id = auth.uid()::text);

CREATE POLICY "Doctors can update bookings for their slots"
  ON consultation_bookings FOR UPDATE
  USING (doctor_id = auth.uid()::text);

CREATE POLICY "Mothers can update their own pending bookings"
  ON consultation_bookings FOR UPDATE
  USING (mother_id = auth.uid()::text AND status = 'pending');


-- ============================================
-- 6. SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment to insert sample data

-- INSERT INTO time_slots (doctor_id, date, start_time, end_time, duration_minutes, max_bookings, notes)
-- VALUES 
--   ('doctor-id-1', '2026-01-20', '09:00:00', '09:30:00', 30, 1, 'Morning consultation'),
--   ('doctor-id-1', '2026-01-20', '10:00:00', '10:30:00', 30, 1, 'Morning consultation'),
--   ('doctor-id-1', '2026-01-20', '14:00:00', '14:30:00', 30, 1, 'Afternoon consultation');
