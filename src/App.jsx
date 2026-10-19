import React from "react";
import { supabase } from "./supabase.js";
import "./style.css";

export default function App() {
  const [products, setProducts] = React.useState([]);
  const [cart, setCart] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [cartMessage, setCartMessage] = React.useState("");

  React.useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, stock")
        .order("id");

      if (error) {
        setError(error.message);
      } else {
        setProducts(data ?? []);
      }

      setLoading(false);
    }

    loadProducts();
  }, []);

  function addToCart(product) {
    const existing = cart.find((item) => item.id === product.id);
    const currentQuantity = existing ? existing.quantity : 0;

    if (currentQuantity >= product.stock) {
      setCartMessage(`No more ${product.name} available in stock.`);
      return;
    }

    setCart((currentCart) => {
      const item = currentCart.find((item) => item.id === product.id);

      if (item) {
        return currentCart.map((cartItem) =>
          cartItem.id === product.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem,
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });

    setCartMessage(`${product.name} added to cart.`);
  }

  function changeQuantity(productId, change) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) return item;

        const product = products.find((p) => p.id === productId);
        const newQuantity = item.quantity + change;

        if (newQuantity < 1 || newQuantity > product.stock) {
          return item;
        }

        return { ...item, quantity: newQuantity };
      }),
    );
    setCartMessage("");
  }

  function removeFromCart(productId) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId),
    );
    setCartMessage("Product removed from cart.");
  }

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0,
  );

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>QA Shop</h1>
          <p>Your Playwright practice store</p>
        </div>
        <div className="cart" aria-label={`Shopping cart, ${cartCount} items`}>
          🛒 Cart: <span data-testid="cart-count">{cartCount}</span>
        </div>
      </header>

      <section className="welcome">
        <h2>Welcome to QA Shop</h2>
        <p>Explore our products and test your shopping experience.</p>
      </section>

      {loading && <p role="status">Loading products...</p>}
      {error && <p role="alert">Could not load products: {error}</p>}

      {!loading && !error && products.length === 0 && <p>No products found.</p>}

      {!loading && !error && (
        <section className="products" aria-label="Products">
          {products.map((product) => {
            const quantityInCart =
              cart.find((item) => item.id === product.id)?.quantity ?? 0;
            const outOfStock = quantityInCart >= product.stock;

            return (
              <article
                className="product-card"
                key={product.id}
                data-testid="product-card"
              >
                <div className="product-image" aria-hidden="true">
                  {product.name === "Laptop"
                    ? "💻"
                    : product.name === "Keyboard"
                      ? "⌨️"
                      : "🖱️"}
                </div>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <p className="price">£{Number(product.price).toFixed(2)}</p>
                <p className="stock">
                  In stock: {product.stock - quantityInCart}
                </p>

                <button
                  type="button"
                  aria-label={`Add ${product.name} to cart`}
                  disabled={product.stock === 0 || outOfStock}
                  onClick={() => addToCart(product)}
                >
                  {product.stock === 0
                    ? "Out of Stock"
                    : outOfStock
                      ? "Stock Limit Reached"
                      : "Add to Cart"}
                </button>
              </article>
            );
          })}
        </section>
      )}

      <section className="cart-section" aria-label="Shopping cart">
        <h2>Your Shopping Cart</h2>

        <p role="status" aria-live="polite">
          {cartMessage}
        </p>

        {cart.length === 0 ? (
          <p data-testid="empty-cart">Your cart is empty.</p>
        ) : (
          <>
            {cart.map((item) => (
              <article className="cart-item" key={item.id}>
                <div>
                  <h3>{item.name}</h3>
                  <p>£{Number(item.price).toFixed(2)} each</p>
                  <p>
                    Subtotal: £{(Number(item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>

                <div className="cart-actions">
                  <button
                    type="button"
                    aria-label={`Decrease ${item.name} quantity`}
                    disabled={item.quantity <= 1}
                    onClick={() => changeQuantity(item.id, -1)}
                  >
                    −
                  </button>

                  <span aria-label={`${item.name} quantity`}>
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    aria-label={`Increase ${item.name} quantity`}
                    disabled={
                      item.quantity >=
                      (products.find((p) => p.id === item.id)?.stock ?? 0)
                    }
                    onClick={() => changeQuantity(item.id, 1)}
                  >
                    +
                  </button>

                  <button
                    type="button"
                    className="remove-button"
                    onClick={() => removeFromCart(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}

            <h3 data-testid="cart-total">Total: £{cartTotal.toFixed(2)}</h3>
          </>
        )}
      </section>
    </main>
  );
}
