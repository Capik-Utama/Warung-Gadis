-- Store the actor role so visibility rules remain explicit and auditable.
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role TEXT;
UPDATE public.audit_logs al SET actor_role = u.role
FROM public.users u
WHERE al.actor_user_id = u.id AND al.actor_role IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role ON public.audit_logs(actor_role, created_at DESC);
