-- Rename Department document type labels to Departmental / विभागीय

UPDATE "DocumentTypeMaster"
SET
  label_en = 'Departmental',
  label_mr = 'विभागीय',
  updated_at = now()
WHERE code = 'Department';
