import React from "react";

export default function Basket({
  items,
  products,
  onChangeQuantity,
  onRemove,
  onContinueShopping,
  onProceedToCheckout,
}) {
  const total = items.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  return (
    <section className="basket-page" aria-label="Shopping basket">
      <h2>Your Shopping Basket</h2>

      {items.length === 0 ? (
        <>
          <p>Your basket is empty.</p>
          <button type="button" onClick={onContinueShopping}>
            Continue Shopping
          </button>
        </>
      ) : (
        <>
          <div className="basket-items">
            {items.map((item) => {
              const product = products.find((p) => p.id === item.id);
              const availableStock = product?.stock ?? item.quantity;

              return (
                <article className="basket-item" key={item.id}>
                  <div>
                    <h3>{item.name}</h3>
                    <p>£{Number(item.price).toFixed(2)} each</p>
                    <p>
                      Subtotal: £
                      {(Number(item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  <div className="basket-actions">
                    <button
                      type="button"
                      aria-label={`Decrease ${item.name} quantity`}
                      disabled={item.quantity <= 1}
                      onClick={() => onChangeQuantity(item.id, -1)}
                    >
                      −
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      aria-label={`Increase ${item.name} quantity`}
                      disabled={item.quantity >= availableStock}
                      onClick={() => onChangeQuantity(item.id, 1)}
                    >
                      +
                    </button>

                    <button
                      type="button"
                      className="remove-button"
                      onClick={() => onRemove(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <h3 className="basket-total">Total: £{total.toFixed(2)}</h3>

          <div className="basket-footer">
            <button type="button" onClick={onContinueShopping}>
              Continue Shopping
            </button>

            <button type="button" onClick={onProceedToCheckout}>
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </section>
  );
}
