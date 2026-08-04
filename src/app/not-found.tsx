import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">404 Error</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Product Not Found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The product you’re looking for doesn’t exist or may have been removed.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
