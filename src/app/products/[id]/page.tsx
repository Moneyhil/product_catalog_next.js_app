import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getProductById,
  getRelatedProducts,
} from "@/lib/api";
import FavoriteButton from "@/components/FavoriteButton";
import RatingStars from "@/components/RatingStars";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let product;

  try {
    product = await getProductById(id);
  } catch {
    notFound();
  }

  if (!product) notFound();

  const relatedProducts = await getRelatedProducts(
    product.category,
    product.id
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">

      <Link
        href="/"
        className="mb-8 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to Products
      </Link>

      <section className="grid gap-10 rounded-3xl border bg-white p-8 shadow-sm lg:grid-cols-2">

        <div className="flex items-center justify-center rounded-2xl bg-slate-50 p-10">
          <img
            src={product.image}
            alt={product.title}
            className="max-h-[450px] object-contain transition duration-300 hover:scale-105"
          />
        </div>

        <div className="flex flex-col">

          <span className="mb-4 w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold uppercase">
            {product.category}
          </span>

          <h1 className="text-4xl font-bold text-slate-900">
            {product.title}
          </h1>

          <div className="mt-4 flex items-center gap-3">
            <RatingStars rating={product.rating.rate} />
            <span className="text-sm text-slate-500">
              ({product.rating.count} Reviews)
            </span>
          </div>

          <div className="mt-6 text-4xl font-extrabold text-indigo-600">
            PKR {Math.round(product.price * 83)}
          </div>

          <div className="mt-8 rounded-xl border bg-slate-50 p-5">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Product Description
            </h2>

            <p className="leading-8 text-slate-600">
              {product.description}
            </p>
          </div>

          <div className="mt-8">
            <FavoriteButton product={product} />
          </div>

        </div>

      </section>

      {relatedProducts.length > 0 && (
        <section className="mt-14">

          <h2 className="mb-6 text-2xl font-bold">
            Related Products
          </h2>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-indigo">

            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.id}`}
                className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg text-indigo-900"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="mx-auto h-40 object-contain "
                />

                <h3 className="mt-4 line-clamp-2 font-semibold">
                  {item.title}
                </h3>

                <p className="mt-2 font-bold text-indigo-600">
                  PKR {Math.round(item.price * 83)}
                </p>

                <div className="mt-2">
                  <RatingStars rating={item.rating.rate} />
                </div>
              </Link>
            ))}

          </div>

        </section>
      )}

    </main>
  );
}