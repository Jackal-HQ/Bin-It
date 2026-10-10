-- Reset the demo back to the seeded baseline between rehearsals.
-- Run in the Neon Console SQL Editor (or: psql $env:DATABASE_URL -f db/reset_demo.sql).
--
-- Keeps:   seeded reports/tickets (device_id = 'seed', is_synthetic = true).
-- Removes: reports sent from the phone/curl while testing or rehearsing.
-- Resets:  ticket counts, severity and status that merges or PATCH calls changed.
--
-- Add other test device ids to the list below if you used any.

BEGIN;

DELETE FROM reports WHERE device_id IN ('test', 'demo');

-- tickets that only existed because of a removed report
DELETE FROM tickets t
 WHERE NOT EXISTS (SELECT 1 FROM reports r WHERE r.ticket_id = t.id);

-- recompute what merges changed on the surviving tickets
UPDATE tickets t SET
    report_count = (SELECT count(*) FROM reports r WHERE r.ticket_id = t.id),
    max_severity = COALESCE((SELECT max(r.severity) FROM reports r WHERE r.ticket_id = t.id), 0),
    last_seen    = COALESCE((SELECT max(r.created_at) FROM reports r WHERE r.ticket_id = t.id), t.last_seen),
    status       = 'received';

COMMIT;

-- sanity check: expect only seed tickets, all synthetic
SELECT t.id, t.label, t.max_severity, t.report_count, t.status,
       COALESCE((SELECT bool_and(r.is_synthetic) FROM reports r WHERE r.ticket_id = t.id), false) AS is_synthetic
  FROM tickets t
 ORDER BY t.max_severity DESC, t.report_count DESC;
