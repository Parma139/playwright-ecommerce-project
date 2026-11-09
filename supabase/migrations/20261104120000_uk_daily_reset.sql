
BEGIN;

-- 1. Create a protected table to track the last UK reset date.
CREATE TABLE IF NOT EXISTS public.demo_shop_reset_state (
    id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
    last_reset_date date NOT NULL
);

-- Initialise the tracker without resetting existing data.
INSERT INTO public.demo_shop_reset_state (id, last_reset_date)
VALUES (
    true,
    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.demo_shop_reset_state
ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.demo_shop_reset_state
FROM PUBLIC, anon, authenticated, service_role;


-- 2. Check the UK date and reset only once per day.
CREATE OR REPLACE FUNCTION public.reset_demo_shop_daily_if_needed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
    v_today date;
    v_last_reset date;
BEGIN
    v_today :=
        (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/London')::date;

    PERFORM pg_advisory_xact_lock(867530901);

    SELECT last_reset_date
    INTO v_last_reset
    FROM public.demo_shop_reset_state
    WHERE id = true
    FOR UPDATE;

    IF v_today > v_last_reset THEN
        PERFORM public.reset_demo_shop_daily();

        UPDATE public.demo_shop_reset_state
        SET last_reset_date = v_today
        WHERE id = true;
    END IF;
END;
$function$;

ALTER FUNCTION public.reset_demo_shop_daily_if_needed()
OWNER TO postgres;

REVOKE ALL ON FUNCTION public.reset_demo_shop_daily_if_needed()
FROM PUBLIC, anon, authenticated, service_role;


-- 3. Create the hourly UK reset-check job if it does not exist.
SELECT cron.schedule(
    'demo-shop-daily-reset-uk',
    '0 * * * *',
    'SELECT public.reset_demo_shop_daily_if_needed();'
)
WHERE NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'demo-shop-daily-reset-uk'
);

COMMIT;
