import { supabase } from "../supabase.js";

/**
 * Creates a simulated shop order in Supabase.
 *
 * @param {Object} options
 * @param {Array} options.items - Cart products and quantities.
 * @param {string} options.paymentMethod - demo_card or cash_on_delivery.
 * @param {boolean} options.simulateFailure - Simulate a failed card payment.
 * @param {string} options.checkoutId - Optional unique checkout identifier.
 */
export async function createDemoOrder({
  items,
  paymentMethod,
  simulateFailure = false,
  checkoutId = crypto.randomUUID(),
}) {
  // Confirm that the customer is logged in.
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (!sessionData.session) {
    throw new Error("Please log in before placing an order.");
  }

  // Validate the cart.
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Your shopping cart is empty.");
  }

  if (!["demo_card", "cash_on_delivery"].includes(paymentMethod)) {
    throw new Error("Invalid payment method.");
  }

  if (simulateFailure && paymentMethod !== "demo_card") {
    throw new Error("Payment failure simulation requires demo card.");
  }

  // Send only product IDs and quantities.
  // Supabase calculates prices using its own database records.
  const orderItems = items.map((item) => ({
    product_id: item.id,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase.rpc("create_demo_order", {
    p_checkout_id: checkoutId,
    p_payment_method: paymentMethod,
    p_items: orderItems,
    p_simulate_failure: simulateFailure,
  });

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error("No order confirmation was returned.");
  }

  return {
    ...data[0],
    checkoutId,
  };
}
/**
 * Retrieves order history for the logged-in customer.
 */
export async function getOrderHistory() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) throw sessionError;

  if (!sessionData.session) {
    throw new Error("Please log in to view your orders.");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      created_at,
      total,
      payment_method,
      status,
      payment_status,
      order_items (
        id,
        product_id,
        product_name,
        unit_price,
        quantity,
        line_total
      )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}

/**
 * Cancels an order and restores its stock through Supabase.
 *
 * @param {string} orderId - UUID of the order to cancel.
 */
export async function cancelDemoOrder(orderId) {
  if (!orderId) {
    throw new Error("Order ID is required.");
  }

  const { data, error } = await supabase.rpc("cancel_demo_order", {
    p_order_id: orderId,
  });

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error("No cancellation confirmation was returned.");
  }

  return data[0];
}
