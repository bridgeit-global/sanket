INSERT INTO public."OfficeAndSite" (
  name,
  address,
  type,
  latitude,
  longitude,
  geofence_radius_meters,
  is_active
)
SELECT
  'Main Office Entrance',
  '1st Floor, Yash Signature, VN Purav Marg, opp. Telecom Factory Road, Anushakti Colony, Govandi East, Mumbai, Maharashtra 400088',
  'office',
  19.04455355295921,
  72.91518627510871,
  20,
  true
WHERE NOT EXISTS (
  SELECT 1
  FROM public."OfficeAndSite"
  WHERE name = 'Main Office Entrance'
);

UPDATE public."OfficeAndSite"
SET
  address = '1st Floor, Yash Signature, VN Purav Marg, opp. Telecom Factory Road, Anushakti Colony, Govandi East, Mumbai, Maharashtra 400088',
  latitude = 19.04455355295921,
  longitude = 72.91518627510871,
  geofence_radius_meters = 20,
  is_active = true
WHERE name = 'Main Office Entrance';

UPDATE public."OfficeAndSite"
SET is_active = false
WHERE name IN ('Administrative Office', 'Administrative Office (Demo)');
