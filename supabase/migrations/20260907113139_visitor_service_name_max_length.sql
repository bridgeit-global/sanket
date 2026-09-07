-- Cap visit-level service name at 200 characters.

UPDATE public."Visitor"
SET service_name = left(service_name, 200)
WHERE service_name IS NOT NULL AND char_length(service_name) > 200;

ALTER TABLE public."Visitor"
  ALTER COLUMN service_name TYPE varchar(200);
