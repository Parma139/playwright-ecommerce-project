import React from "react";
import { getOrderHistory } from "../services/orderService";

export default function OrderHistory() {
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [expandedOrder, setExpandedOrder] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        setLoading(true);
        setError("");

        const data = await getOrderHistory();

        if (mounted) {
          setOrders(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Could not load your orders.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatStatus(status) {
    return status ? status.replaceAll("_", " ") : "Unknown";
  }

  return (
    <section className="order-history" aria-label="Order history">
      <h2>My Orders</h2>
      <p>View your previous purchases and order details.</p>

      {loading && <p role="status">Loading your orders...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <p>You haven't placed any orders yet.</p>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-card" key={order.id}>
              <div className="order-card-header">
                <div>
                  <h3>QA-{order.id.slice(0, 8).toUpperCase()}</h3>
                  <p>{formatDate(order.created_at)}</p>
                </div>

                <span className="order-status">
                  {formatStatus(order.status)}
                </span>
              </div>

              <div className="order-card-summary">
                <p>
                  <strong>Total:</strong> £{Number(order.total).toFixed(2)}
                </p>

                <p>
                  <strong>Payment:</strong>{" "}
                  {order.payment_method === "demo_card"
                    ? "Demo Card"
                    : "Cash on Delivery"}
                </p>

                <p>
                  <strong>Payment status:</strong>{" "}
                  {formatStatus(order.payment_status)}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setExpandedOrder(expandedOrder === order.id ? null : order.id)
                }
                aria-expanded={expandedOrder === order.id}
              >
                {expandedOrder === order.id ? "Hide Details" : "View Details"}
              </button>

              {expandedOrder === order.id && (
                <div className="order-details">
                  <h4>Items Ordered</h4>

                  {order.order_items.map((item) => (
                    <div className="order-detail-item" key={item.id}>
                      <span>
                        {item.product_name} × {item.quantity}
                      </span>

                      <span>£{Number(item.line_total).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
