'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import ProductCard from './ProductCard';
import SearchBar from './SearchBar';
import CategoryFilter from './CategoryFilter';

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  console.log("Products:", products);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return products.filter((product) => {
      const searchableText = [
        product.title,
        product.description,
        product.category,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        normalizedQuery.length === 0 || searchableText.includes(normalizedQuery);
      const matchesCategory =
        selectedCategory === 'all' ||
        product.category.toLowerCase() === selectedCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="md:w-64">
          <CategoryFilter
            value={selectedCategory}
            onChange={(category) => setSelectedCategory(category || 'all')}
          />
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          No products found
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
