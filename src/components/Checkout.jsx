import React from "react";
import { createDemoOrder } from "../services/orderService.js";

export default function Checkout({ items, onOrderSuccess }) {
  const [paymentMethod, setPaymentMethod] = React.useState("demo_card");

  const [simulateFailure, setSimulateFailure] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [failureMessage, setFailureMessage] = React.useState("");

  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  async function handleCheckout() {
    setError("");
    setFailureMessage("");

    if (!items.length) {
      setError("Your shopping cart is empty.");
      return;
    }

    setLoading(true);

    try {
      const order = await createDemoOrder({
        items,
        paymentMethod,
        simulateFailure: paymentMethod === "demo_card" && simulateFailure,
      });

      // A simulated card failure creates a cancelled order.
      if (order.order_status === "cancelled") {
        setFailureMessage(
          "Payment failed. Your order was cancelled and stock was not reduced. Please try again.",
        );
        return;
      }

      // Notify the parent component about the successful order.
      if (onOrderSuccess) {
        onOrderSuccess(order);
      }
    } catch (checkoutError) {
      console.error("Checkout error:", checkoutError);
      setError(
        checkoutError.message ||
          "Unable to complete your order. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="checkout-section" aria-label="Checkout">
      <h2>Checkout</h2>

      <div className="checkout-summary">
        <h3>Order Summary</h3>

        {items.map((item) => (
          <div className="checkout-summary-item" key={item.id}>
            <span>
              {item.name} × {item.quantity}
            </span>

            <span>£{(Number(item.price) * item.quantity).toFixed(2)}</span>
          </div>
        ))}

        <h3 className="checkout-total">Total: £{total.toFixed(2)}</h3>
      </div>

      <div className="payment-options">
        <h3>Select Payment Method</h3>

        <label className="payment-option">
          <input
            type="radio"
            name="paymentMethod"
            value="demo_card"
            checked={paymentMethod === "demo_card"}
            onChange={() => {
              setPaymentMethod("demo_card");
              setFailureMessage("");
            }}
          />
          <span>Demo Card Payment</span>
        </label>

        <label className="payment-option">
          <input
            type="radio"
            name="paymentMethod"
            value="cash_on_delivery"
            checked={paymentMethod === "cash_on_delivery"}
            onChange={() => {
              setPaymentMethod("cash_on_delivery");
              setSimulateFailure(false);
              setFailureMessage("");
            }}
          />
          <span>Cash on Delivery</span>
        </label>

        {paymentMethod === "demo_card" && (
          <label className="payment-option demo-failure-option">
            <input
              type="checkbox"
              checked={simulateFailure}
              onChange={(event) => setSimulateFailure(event.target.checked)}
            />
            <span>Simulate a failed card payment (testing)</span>
          </label>
        )}
      </div>

      {error && (
        <p className="checkout-error" role="alert">
          {error}
        </p>
      )}

      {failureMessage && (
        <p className="checkout-error" role="alert">
          {failureMessage}
        </p>
      )}

      <button
        type="button"
        className="checkout-button"
        onClick={handleCheckout}
        disabled={loading || items.length === 0}
      >
        {loading ? "Processing order..." : "Place Order"}
      </button>

      <p className="checkout-demo-note">
        This is a demonstration checkout. No real payments are processed.
      </p>
    </section>
  );
}
