BEGIN;

-- 1. Preserve original stock for the daily reset.
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS initial_stock integer;

UPDATE public.products
SET initial_stock = stock
WHERE initial_stock IS NULL;

ALTER TABLE public.products
    ALTER COLUMN initial_stock SET NOT NULL;

ALTER TABLE public.products
    ALTER COLUMN initial_stock DROP DEFAULT;

-- Set the baseline for products added in the future.
CREATE OR REPLACE FUNCTION public.set_initial_product_stock()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
    IF NEW.initial_stock IS NULL THEN
        NEW.initial_stock := NEW.stock;
    END IF;

    RETURN NEW;
END;
$function$;

ALTER FUNCTION public.set_initial_product_stock()
    OWNER TO postgres;

REVOKE ALL ON FUNCTION public.set_initial_product_stock()
    FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS set_initial_product_stock ON public.products;

CREATE TRIGGER set_initial_product_stock
BEFORE INSERT ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_initial_product_stock();

-- 2. Create orders and enforce unique checkout identifiers.
CREATE TABLE public.orders (
    id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
    checkout_id uuid NOT NULL UNIQUE,
    request_signature text NOT NULL,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total numeric(12,2) NOT NULL CHECK (total >= 0),
    payment_method text NOT NULL
        CHECK (payment_method IN ('demo_card', 'cash_on_delivery')),
    status text NOT NULL
        CHECK (status IN ('placed', 'completed', 'cancelled')),
    payment_status text NOT NULL
        CHECK (payment_status IN (
            'pending',
            'simulated_success',
            'simulated_failure'
        )),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id bigint REFERENCES public.products(id) ON DELETE SET NULL,
    product_name text NOT NULL,
    unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity integer NOT NULL CHECK (quantity > 0),
    line_total numeric(12,2) NOT NULL CHECK (line_total >= 0)
);

CREATE INDEX orders_user_created_idx
    ON public.orders (user_id, created_at DESC);

CREATE INDEX order_items_order_idx
    ON public.order_items (order_id);

-- 3. Restrict order history to its owner.
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Explicitly override broad default grants on these new tables.
REVOKE ALL ON TABLE public.orders
    FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON TABLE public.order_items
    FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE public.orders TO authenticated;
GRANT SELECT ON TABLE public.order_items TO authenticated;

CREATE POLICY "Users can read own orders"
ON public.orders
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can read own order items"
ON public.order_items
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.orders AS o
        WHERE o.id = order_items.order_id
          AND o.user_id = (SELECT auth.uid())
    )
);

-- Explicitly override broad default grants on the identity sequence.
REVOKE ALL ON SEQUENCE public.order_items_id_seq
    FROM PUBLIC, anon, authenticated, service_role;

-- 4. Create a transactional simulated checkout.
CREATE FUNCTION public.create_demo_order(
    p_checkout_id uuid,
    p_payment_method text,
    p_items jsonb,
    p_simulate_failure boolean DEFAULT false
)
RETURNS TABLE (
    order_id uuid,
    order_total numeric,
    order_status text,
    payment_status text,
    selected_payment_method text,
    order_created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_user_id uuid;
    v_existing public.orders%ROWTYPE;
    v_order public.orders%ROWTYPE;
    v_product public.products%ROWTYPE;
    v_item record;
    v_invalid_count integer;
    v_total numeric := 0;
    v_signature text;
    v_status text;
    v_payment_status text;
BEGIN
    v_user_id := auth.uid();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF p_checkout_id IS NULL THEN
        RAISE EXCEPTION 'Checkout identifier is required';
    END IF;

    IF p_payment_method IS NULL
       OR p_payment_method NOT IN ('demo_card', 'cash_on_delivery') THEN
        RAISE EXCEPTION 'Invalid payment method';
    END IF;

    IF p_simulate_failure IS NULL THEN
        RAISE EXCEPTION 'Payment outcome is required';
    END IF;

    IF p_simulate_failure AND p_payment_method <> 'demo_card' THEN
        RAISE EXCEPTION 'Failure simulation requires demo card payment';
    END IF;

    IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Cart items must be an array';
    END IF;

    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cart cannot be empty';
    END IF;

    SELECT count(*)
    INTO v_invalid_count
    FROM jsonb_to_recordset(p_items) AS x(product_id bigint, quantity integer)
    WHERE x.product_id IS NULL
       OR x.product_id <= 0
       OR x.quantity IS NULL
       OR x.quantity <= 0;

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION 'Invalid product or quantity';
    END IF;

    -- A stable signature prevents reusing a checkout ID for another request.
    SELECT md5(
        jsonb_build_object(
            'payment_method', p_payment_method,
            'simulate_failure', p_simulate_failure,
            'items', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'product_id', x.product_id,
                        'quantity', x.quantity
                    )
                    ORDER BY x.product_id
                )
                FROM (
                    SELECT product_id, SUM(quantity)::integer AS quantity
                    FROM jsonb_to_recordset(p_items)
                         AS i(product_id bigint, quantity integer)
                    GROUP BY product_id
                ) AS x
            )
        )::text
    )
    INTO v_signature;

    -- Shared with the reset function to avoid overlapping operations.
    PERFORM pg_advisory_xact_lock(867530901::bigint);

    SELECT o.*
    INTO v_existing
    FROM public.orders AS o
    WHERE o.checkout_id = p_checkout_id;

    IF FOUND THEN
        IF v_existing.user_id <> v_user_id
           OR v_existing.request_signature <> v_signature THEN
            RAISE EXCEPTION 'Checkout ID reused with a different request';
        END IF;

        RETURN QUERY
        SELECT v_existing.id, v_existing.total,
               v_existing.status, v_existing.payment_status,
               v_existing.payment_method, v_existing.created_at;
        RETURN;
    END IF;

    -- Validate stock using authoritative database prices and row locks.
    FOR v_item IN
        SELECT i.product_id, SUM(i.quantity)::integer AS quantity
        FROM jsonb_to_recordset(p_items) AS i(product_id bigint, quantity integer)
        GROUP BY i.product_id
        ORDER BY i.product_id
    LOOP
        SELECT p.*
        INTO v_product
        FROM public.products AS p
        WHERE p.id = v_item.product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product % not found', v_item.product_id;
        END IF;

        IF v_product.stock < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for %', v_product.name;
        END IF;

        v_total := v_total + round(v_product.price, 2) * v_item.quantity;
    END LOOP;

    v_total := round(v_total, 2);

    IF p_simulate_failure THEN
        v_status := 'cancelled';
        v_payment_status := 'simulated_failure';
    ELSIF p_payment_method = 'demo_card' THEN
        v_status := 'completed';
        v_payment_status := 'simulated_success';
    ELSE
        v_status := 'placed';
        v_payment_status := 'pending';
    END IF;

    INSERT INTO public.orders (
        checkout_id, request_signature, user_id, total,
        payment_method, status, payment_status
    )
    VALUES (
        p_checkout_id, v_signature, v_user_id, v_total,
        p_payment_method, v_status, v_payment_status
    )
    RETURNING * INTO v_order;

    INSERT INTO public.order_items (
        order_id, product_id, product_name,
        unit_price, quantity, line_total
    )
    SELECT
        v_order.id,
        p.id,
        p.name,
        round(p.price, 2),
        i.quantity,
        round(p.price, 2) * i.quantity
    FROM (
        SELECT product_id, SUM(quantity)::integer AS quantity
        FROM jsonb_to_recordset(p_items) AS x(product_id bigint, quantity integer)
        GROUP BY product_id
    ) AS i
    JOIN public.products AS p ON p.id = i.product_id;

    -- Failed simulated card attempts do not consume stock.
    IF NOT p_simulate_failure THEN
        UPDATE public.products AS p
        SET stock = p.stock - i.quantity
        FROM (
            SELECT product_id, SUM(quantity)::integer AS quantity
            FROM jsonb_to_recordset(p_items) AS x(product_id bigint, quantity integer)
            GROUP BY product_id
        ) AS i
        WHERE p.id = i.product_id;
    END IF;

    RETURN QUERY
    SELECT v_order.id, v_order.total,
           v_order.status, v_order.payment_status,
           v_order.payment_method, v_order.created_at;
END;
$function$;

ALTER FUNCTION public.create_demo_order(uuid, text, jsonb, boolean)
    OWNER TO postgres;

-- Explicitly override broad default function grants.
REVOKE ALL ON FUNCTION public.create_demo_order(uuid, text, jsonb, boolean)
    FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_demo_order(uuid, text, jsonb, boolean)
    TO authenticated;

-- 5. Daily reset function. Scheduling is configured separately.
CREATE FUNCTION public.reset_demo_shop_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    PERFORM pg_advisory_xact_lock(867530901::bigint);

    DELETE FROM public.orders;

    UPDATE public.products
    SET stock = initial_stock;
END;
$function$;

ALTER FUNCTION public.reset_demo_shop_daily()
    OWNER TO postgres;

REVOKE ALL ON FUNCTION public.reset_demo_shop_daily()
    FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
