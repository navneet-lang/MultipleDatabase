import { useEffect, useState } from "react";
import api from "../api/axios";

export default function ProductCatalog() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sahi API endpoint update kar diya gaya hai
    api.get("/products/") 
      .then((res) => {
        // Backend se jo data aayega, usko state mein set karenge
        setProducts(res.data);
        console.log("Products data:", res.data); // Console me check karne ke liye
      })
      .catch((err) => {
        console.error("Products fetch karne mein error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-3xl font-extrabold text-indigo-900 mb-6">Our Products</h1>
      
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <p className="text-slate-500 font-medium">Loading products...</p>
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product.id || product._id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col">
              {/* Image Section */}
              <div className="h-48 bg-slate-100 rounded-md mb-4 flex items-center justify-center overflow-hidden">
                {product.image ? (
                   <img src={product.image} alt={product.name} className="object-cover w-full h-full" />
                ) : (
                   <span className="text-slate-400">No Image</span>
                )}
              </div>
              
              {/* Product Details */}
              <h2 className="text-lg font-bold text-slate-800 line-clamp-1">{product.name || product.title || "Product Name"}</h2>
              <p className="text-indigo-600 font-extrabold mt-1 text-xl">₹{product.price || "0"}</p>
              
              {/* Add to Cart Button */}
              <button className="mt-auto pt-4 w-full bg-indigo-900 text-white py-2 rounded-lg font-medium hover:bg-indigo-800 transition">
                Add to Cart
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center mt-10">
          <p className="text-slate-500 text-lg">Koi products nahi mile.</p>
        </div>
      )}
    </div>
  );
}