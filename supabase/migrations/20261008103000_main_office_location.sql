-- Correct the real office location from the supplied Google Maps embed.
ALTER TABLE public.offices_and_sites
  ADD COLUMN IF NOT EXISTS address text;

UPDATE public.offices_and_sites
SET
  name = 'Main Office Entrance',
  address = '1st Floor, Yash Signature, VN Purav Marg, opp. Telecom Factory Road, Anushakti Colony, Govandi East, Mumbai, Maharashtra 400088',
  latitude = 19.04455355295921,
  longitude = 72.91518627510871,
  geofence_radius_meters = 20
WHERE name = 'Main Office Entrance';

UPDATE public.offices_and_sites
SET is_active = false
WHERE name IN ('Administrative Office', 'Administrative Office (Demo)');
