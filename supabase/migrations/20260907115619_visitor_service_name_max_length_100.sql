-- Cap visit-level service name at 100 characters.

UPDATE public."Visitor"
SET service_name = left(service_name, 100)
WHERE service_name IS NOT NULL AND char_length(service_name) > 100;

ALTER TABLE public."Visitor"
  ALTER COLUMN service_name TYPE varchar(100);
