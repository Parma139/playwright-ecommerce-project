import React from "react";

export default function OrderConfirmation({ order, onContinueShopping }) {
  if (!order) return null;

  return (
    <section
      className="checkout-section"
      aria-label="Order confirmation"
      role="status"
    >
      <h2>Order Confirmed!</h2>

      <p>Your order has been successfully placed.</p>

      <p>
        <strong>Order number:</strong> QA-
        {order.order_id.slice(0, 8).toUpperCase()}
      </p>

      <p>
        <strong>Total:</strong> £{Number(order.order_total).toFixed(2)}
      </p>

      <p>
        <strong>Payment method:</strong>{" "}
        {order.selected_payment_method === "demo_card"
          ? "Demo Card"
          : "Cash on Delivery"}
      </p>

      <p>
        <strong>Order status:</strong> {order.order_status}
      </p>

      <p>
        <strong>Payment status:</strong> {order.payment_status}
      </p>

      <button type="button" onClick={onContinueShopping}>
        Continue Shopping
      </button>
    </section>
  );
}
