import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductById } from "@/lib/api";
import FavoriteButton from "@/components/FavoriteButton";

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

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="mb-6 text-sm font-medium text-slate-600 transition hover:text-slate-900"
      >
        ← Back to products
      </Link>

      <article className="grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
        <div className="flex items-center justify-center rounded-xl bg-slate-50 p-6">
          <img
            src={product.image}
            alt={product.title}
            className="max-h-96 w-full object-contain"
          />
        </div>

        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium uppercase tracking-wide text-slate-600">
              {product.category}
            </span>
            <h1 className="text-3xl font-semibold text-slate-900">
              {product.title}
            </h1>
            <p className="text-lg leading-7 text-slate-600">
              {product.description}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="font-medium text-slate-900">
                Price: PKR {product.price * 83}
              </span>
              <span>Rating: {product.rating?.rate ?? 0}/5</span>
              <span>Rated by {product.rating?.count ?? 0} users</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <FavoriteButton product={product} />
          </div>
        </div>
      </article>
    </main>
  );
}