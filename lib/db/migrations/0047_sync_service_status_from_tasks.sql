-- Migration: Sync BeneficiaryService status from VoterTask statuses
-- This ensures the service status is automatically updated when task statuses change
-- Created to fix mismatch between dashboard (showing service status) and task management (updating task status)

-- Function to calculate and update service status based on all its tasks
CREATE OR REPLACE FUNCTION sync_beneficiary_service_status()
RETURNS TRIGGER AS $$
DECLARE
    service_uuid uuid;
    task_statuses text[];
    new_service_status text;
    all_completed boolean;
    all_cancelled boolean;
    has_in_progress boolean;
    has_pending boolean;
    has_cancelled boolean;
    has_active boolean;
BEGIN
    -- Get the service_id from the trigger context
    -- NEW is available for INSERT/UPDATE, OLD for DELETE
    IF TG_OP = 'DELETE' THEN
        service_uuid := OLD.service_id;
    ELSE
        service_uuid := NEW.service_id;
    END IF;

    -- Skip if service_id is NULL
    IF service_uuid IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Get all task statuses for this service
    SELECT ARRAY_AGG(status)
    INTO task_statuses
    FROM "VoterTask"
    WHERE service_id = service_uuid;

    -- If no tasks exist, don't change service status (or set to pending if you prefer)
    IF task_statuses IS NULL OR array_length(task_statuses, 1) IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate flags
    all_completed := true;
    all_cancelled := true;
    has_in_progress := false;
    has_pending := false;
    has_cancelled := false;
    has_active := false;

    -- Check each status
    FOR i IN 1..array_length(task_statuses, 1) LOOP
        IF task_statuses[i] != 'completed' THEN
            all_completed := false;
        END IF;
        IF task_statuses[i] != 'cancelled' THEN
            all_cancelled := false;
        END IF;
        IF task_statuses[i] = 'in_progress' THEN
            has_in_progress := true;
        END IF;
        IF task_statuses[i] = 'pending' THEN
            has_pending := true;
        END IF;
        IF task_statuses[i] = 'cancelled' THEN
            has_cancelled := true;
        END IF;
        IF task_statuses[i] IN ('pending', 'in_progress') THEN
            has_active := true;
        END IF;
    END LOOP;

    -- Determine new service status based on task statuses
    -- Priority: completed > cancelled > in_progress > pending
    IF all_completed THEN
        new_service_status := 'completed';
    ELSIF all_cancelled THEN
        new_service_status := 'cancelled';
    ELSIF has_in_progress THEN
        new_service_status := 'in_progress';
    ELSIF has_pending THEN
        new_service_status := 'pending';
    ELSIF has_cancelled AND NOT has_active THEN
        -- Some cancelled, but no active tasks
        new_service_status := 'cancelled';
    ELSE
        -- Fallback to pending
        new_service_status := 'pending';
    END IF;

    -- Update the service status (only if it changed)
    UPDATE "BeneficiaryService"
    SET 
        status = new_service_status,
        updated_at = NOW(),
        completed_at = CASE 
            WHEN new_service_status = 'completed' AND completed_at IS NULL THEN NOW()
            WHEN new_service_status != 'completed' THEN NULL
            ELSE completed_at
        END
    WHERE id = service_uuid
      AND status != new_service_status;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after INSERT, UPDATE, or DELETE on VoterTask
CREATE TRIGGER sync_service_status_on_task_change
    AFTER INSERT OR UPDATE OF status OR DELETE
    ON "VoterTask"
    FOR EACH ROW
    EXECUTE FUNCTION sync_beneficiary_service_status();

-- Add comment for documentation
COMMENT ON FUNCTION sync_beneficiary_service_status() IS 
    'Automatically syncs BeneficiaryService status based on all associated VoterTask statuses. 
     Status priority: completed > cancelled > in_progress > pending';

