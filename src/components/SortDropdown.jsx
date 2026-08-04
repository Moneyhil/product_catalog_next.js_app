"use client";

export default function SortDropdown({ onSortChange }) {
  const handleChange = (event) => {
    onSortChange?.(event.target.value);
  };

  return (
    <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-sm font-medium text-slate-600">Sort</span>
      <select
        defaultValue="default"
        onChange={handleChange}
        className="w-full border-none bg-transparent text-sm text-slate-700 outline-none"
      >
        <option value="default">Default</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="rating-desc">Rating: High to Low</option>
      </select>
    </label>
  );
}
