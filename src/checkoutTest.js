import { createDemoOrder } from "./services/orderService.js";
import { supabase } from "./supabase";

export async function testSuccessfulCheckout() {
  // Confirm the existing login session.
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (!sessionData.session) {
    throw new Error("Please log in before testing checkout.");
  }

  // Use a unique checkout ID for this attempt.
  const checkoutId = crypto.randomUUID();

  const { data, error } = await supabase.rpc("create_demo_order", {
    p_checkout_id: checkoutId,
    p_payment_method: "demo_card",
    p_items: [
      {
        product_id: 1,
        quantity: 1,
      },
    ],
    p_simulate_failure: false,
  });

  if (error) throw error;

  console.log("Checkout result:", data);

  // Verify the updated stock.
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, price, stock")
    .eq("id", 1)
    .single();

  if (productError) throw productError;

  console.log("Updated Laptop:", product);

  return { order: data, product };
}

export async function testFailedCheckout() {
  const checkoutId = crypto.randomUUID();

  const { data, error } = await supabase.rpc("create_demo_order", {
    p_checkout_id: checkoutId,
    p_payment_method: "demo_card",
    p_items: [
      {
        product_id: 1,
        quantity: 1,
      },
    ],
    p_simulate_failure: true,
  });

  if (error) throw error;

  console.log("Failed payment result:", data);

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, price, stock")
    .eq("id", 1)
    .single();

  if (productError) throw productError;

  console.log("Laptop after failed payment:", product);

  return { order: data, product };
}
export async function testCashOnDelivery() {
  const checkoutId = crypto.randomUUID();

  const { data, error } = await supabase.rpc("create_demo_order", {
    p_checkout_id: checkoutId,
    p_payment_method: "cash_on_delivery",
    p_items: [
      {
        product_id: 1,
        quantity: 1,
      },
    ],
    p_simulate_failure: false,
  });

  if (error) throw error;

  console.log("COD order result:", data);

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, price, stock")
    .eq("id", 1)
    .single();

  if (productError) throw productError;

  console.log("Laptop after COD order:", product);

  return { order: data, product };
}
export async function testOrderHistory() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (!sessionData.session) {
    throw new Error("Please log in before testing order history.");
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  console.log("My order history:", data);
  console.log("Number of orders:", data.length);

  return data;
}
export async function testOrderService() {
  const order = await createDemoOrder({
    items: [
      {
        id: 1,
        quantity: 1,
      },
    ],
    paymentMethod: "demo_card",
    simulateFailure: false,
  });

  console.log("Order service test:", order);

  return order;
}
