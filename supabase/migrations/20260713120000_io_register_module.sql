-- Merge the Inward and Outward registers into a single "I/O Register" module.
-- Any role or user that already had access to either legacy register should be
-- granted the new combined module key so nothing disappears from their sidebar.

-- Roles: (role_id, module_key) has a unique index, so ON CONFLICT is safe.
INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
SELECT DISTINCT rmp.role_id, 'io-register', true, now(), now()
FROM "RoleModulePermissions" rmp
WHERE rmp.module_key IN ('inward', 'outward')
  AND rmp.has_access = true
ON CONFLICT ("role_id", "module_key") DO UPDATE SET "has_access" = true, "updated_at" = now();

-- Users: no unique constraint on ("userId", module_key), so guard with NOT EXISTS.
INSERT INTO "UserModulePermissions" ("userId", "module_key", "has_access", "created_at", "updated_at")
SELECT DISTINCT ump."userId", 'io-register', true, now(), now()
FROM "UserModulePermissions" ump
WHERE ump.module_key IN ('inward', 'outward')
  AND ump.has_access = true
  AND NOT EXISTS (
    SELECT 1 FROM "UserModulePermissions" existing
    WHERE existing."userId" = ump."userId"
      AND existing.module_key = 'io-register'
  );

-- Grant io-register to the admin role by default.
INSERT INTO "RoleModulePermissions" ("role_id", "module_key", "has_access", "created_at", "updated_at")
SELECT r.id, 'io-register', true, now(), now()
FROM "Role" r WHERE r.name = 'admin'
ON CONFLICT ("role_id", "module_key") DO UPDATE SET "has_access" = true, "updated_at" = now();
