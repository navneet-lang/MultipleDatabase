import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addToCart } from "../api/cart";
import {
  addProductReview,
  getProduct,
  getProductRating,
  getProductReviews,
} from "../api/products";
import { getShop } from "../api/shops";
import { useAuth } from "../context/AuthContext";

function Stars({ value }) {
  const rounded = Math.round(value || 0);

  return (
    <span aria-label={`${value || 0} out of 5 stars`} className="tracking-wide text-amber-500">
      {"★".repeat(rounded)}
      <span className="text-slate-300">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [shop, setShop] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsError, setReviewsError] = useState("");
  const [ratingError, setRatingError] = useState("");
  const [shopError, setShopError] = useState("");
  const [rating, setRating] = useState({ average_rating: null, review_count: 0 });
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      setImageFailed(false);

      try {
        const productResponse = await getProduct(id);
        if (!active) return;
        setProduct(productResponse.data);

        const [shopResult, reviewsResult, ratingResult] = await Promise.allSettled([
          getShop(productResponse.data.shop_id),
          getProductReviews(id),
          getProductRating(id),
        ]);

        if (!active) return;
        if (shopResult.status === "fulfilled") setShop(shopResult.value.data);
        else {
          console.error("Shop details load error:", shopResult.reason);
          setShopError("Shop details abhi load nahi ho paaye.");
        }
        if (reviewsResult.status === "fulfilled") setReviews(reviewsResult.value.data);
        else {
          console.error("Product reviews load error:", reviewsResult.reason);
          setReviewsError("Reviews load nahi ho paaye. Page refresh karke dobara try karein.");
        }
        if (ratingResult.status === "fulfilled") setRating(ratingResult.value.data);
        else {
          console.error("Product rating load error:", ratingResult.reason);
          setRatingError("Rating load nahi ho paayi.");
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.detail ||
              "Product details load nahi ho paaye. Thodi der baad dobara try karein."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const addProductToCart = async () => {
    setAddingToCart(true);
    setCartMessage("");
    try {
      await addToCart(product.id, quantity);
      window.dispatchEvent(new Event("cart:changed"));
      setCartMessage(`${quantity} item${quantity > 1 ? "s" : ""} added to cart.`);
    } catch (err) {
      setCartMessage(
        err.response?.data?.detail || "Cart mein product add nahi ho paya."
      );
    } finally {
      setAddingToCart(false);
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setReviewSubmitting(true);
    setReviewError("");

    try {
      await addProductReview(id, reviewForm);
      const [reviewsResponse, ratingResponse] = await Promise.all([
        getProductReviews(id),
        getProductRating(id),
      ]);
      setReviews(reviewsResponse.data);
      setRating(ratingResponse.data);
      setReviewForm({ rating: 5, comment: "" });
    } catch (err) {
      setReviewError(
        err.response?.data?.detail ||
          (err.response?.data ? JSON.stringify(err.response.data) : "Review submit nahi ho paya.")
      );
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-slate-500">Loading product...</div>;
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <p role="alert" className="text-red-600">{error || "Product nahi mila."}</p>
        <Link to="/products" className="mt-4 inline-block text-sm font-semibold text-indigo-700 hover:underline">
          ← Back to products
        </Link>
      </div>
    );
  }

  const averageRating = Number(rating.average_rating || 0);
  const alreadyReviewed = reviews.some((review) => review.username === user?.username);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Link to="/products" className="text-sm font-medium text-indigo-700 hover:underline">
          ← Continue shopping
        </Link>

        <section className="mt-5 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-2">
          <div className="flex min-h-80 items-center justify-center bg-slate-100 p-6 sm:min-h-[480px]">
            {product.image_url && !imageFailed ? (
              <img
                src={product.image_url}
                alt={product.name}
                onError={() => setImageFailed(true)}
                className="max-h-[440px] w-full object-contain"
              />
            ) : (
              <div className="flex h-full min-h-72 w-full items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-slate-200 text-center text-slate-500">
                <div>
                  <span aria-hidden="true" className="text-5xl">▧</span>
                  <p className="mt-2 text-sm">Product image unavailable</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col p-6 sm:p-9">
            <p className="text-sm font-semibold uppercase tracking-wider text-indigo-700">
              {product.category}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <Stars value={averageRating} />
              <span className="font-semibold text-slate-800">
                {rating.average_rating ? averageRating.toFixed(1) : "New"}
              </span>
              <a href="#reviews" className="text-slate-500 hover:text-indigo-700">
                ({rating.review_count} {rating.review_count === 1 ? "review" : "reviews"})
              </a>
            </div>

            <p className="mt-6 text-3xl font-extrabold text-indigo-900">
              ₹{Number(product.price).toLocaleString("en-IN")}
            </p>
            <p className={`mt-2 text-sm font-semibold ${product.stock > 0 ? "text-emerald-700" : "text-red-600"}`}>
              {product.stock > 0 ? `${product.stock} in stock` : "Currently out of stock"}
            </p>

            {product.description && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <h2 className="font-bold text-slate-900">About this product</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                  {product.description}
                </p>
              </div>
            )}

            {shop && (
              <Link
                to={`/store/${shop.id}`}
                className="mt-6 flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-indigo-300 hover:bg-indigo-50/50"
              >
                {shop.image_url ? (
                  <img src={shop.image_url} alt="" className="h-12 w-12 rounded-lg bg-slate-100 object-contain" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 font-bold text-indigo-800">
                    {shop.name?.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block text-xs text-slate-500">Sold by</span>
                  <span className="block truncate font-semibold text-slate-900">{shop.name}</span>
                  <span className="block truncate text-xs text-slate-500">{shop.address}</span>
                </span>
                <span aria-hidden="true" className="ml-auto text-indigo-700">→</span>
              </Link>
            )}
            {shopError && <p role="alert" className="mt-3 text-sm text-amber-700">{shopError}</p>}

            <div className="mt-auto pt-7">
              <div className="flex items-center gap-3">
                <label htmlFor="product-quantity" className="text-sm font-semibold text-slate-700">
                  Quantity
                </label>
                <input
                  id="product-quantity"
                  type="number"
                  min="1"
                  max={product.stock}
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                  className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-center"
                />
              </div>
              <button
                type="button"
                onClick={addProductToCart}
                disabled={product.stock < 1 || quantity > product.stock || addingToCart}
                className="mt-4 w-full rounded-xl bg-indigo-900 px-5 py-3 font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingToCart ? "Adding to cart..." : "Add to cart"}
              </button>
              {quantity > product.stock && (
                <p className="mt-2 text-sm text-red-600">Quantity stock se zyada nahi ho sakti.</p>
              )}
              {cartMessage && <p role="status" className="mt-2 text-sm text-indigo-800">{cartMessage}</p>}
            </div>
          </div>
        </section>

        <section id="reviews" className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-5">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Customer reviews</h2>
                <p className="mt-1 text-sm text-slate-500">Verified customers ke reviews</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-slate-900">
                  {rating.average_rating ? averageRating.toFixed(1) : "—"}
                </p>
                <Stars value={averageRating} />
              </div>
            </div>

            {ratingError && <p role="alert" className="mt-4 text-sm text-amber-700">{ratingError}</p>}
            {reviewsError && <p role="alert" className="mt-4 text-sm text-amber-700">{reviewsError}</p>}
            {reviewsError ? null : reviews.length === 0 ? (
              <p className="py-8 text-sm text-slate-500">Abhi koi review nahi hai. Purchase ke baad pehla review dein.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {reviews.map((review, index) => (
                  <article key={`${review.user_id}-${review.created_at || index}`} className="py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{review.username || "Customer"}</p>
                      <time className="text-xs text-slate-500">
                        {review.created_at ? new Date(review.created_at).toLocaleDateString() : ""}
                      </time>
                    </div>
                    <div className="mt-1"><Stars value={review.rating} /></div>
                    {review.comment && (
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                        {review.comment}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">Write a review</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              Reviews sirf verified customers de sakte hain, aur har product par ek review.
            </p>

            {alreadyReviewed ? (
              <p className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                Aap is product ko review kar chuke hain. Thank you!
              </p>
            ) : (
              <form onSubmit={submitReview} className="mt-5 space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Your rating
                  <select
                    value={reviewForm.rating}
                    onChange={(event) =>
                      setReviewForm({ ...reviewForm, rating: Number(event.target.value) })
                    }
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={value}>{value} star{value === 1 ? "" : "s"}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Comment (optional)
                  <textarea
                    value={reviewForm.comment}
                    onChange={(event) =>
                      setReviewForm({ ...reviewForm, comment: event.target.value })
                    }
                    maxLength={1000}
                    rows={4}
                    placeholder="Aapko product kaisa laga?"
                    className="mt-1.5 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal"
                  />
                </label>
                {reviewError && (
                  <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {reviewError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full rounded-lg bg-indigo-900 px-4 py-2.5 font-semibold text-white hover:bg-indigo-800 disabled:opacity-50"
                >
                  {reviewSubmitting ? "Submitting..." : "Submit review"}
                </button>
              </form>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
