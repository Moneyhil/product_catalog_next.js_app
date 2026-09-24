import { getAllProductsServer } from '../lib/api-server';
import ProductGrid from "../components/ProductGrid";

export default async function Home() {
  const products = await getAllProductsServer();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold text-slate-900 dark:text-white">Product Catalog</h1>
      <ProductGrid products={products} />
    </main>
  );
}
