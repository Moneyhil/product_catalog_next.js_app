'use client';

import Link from 'next/link';
import { SignOutButton, useAuth } from '@clerk/nextjs';
import { useFavorites } from '@/hooks/useFavorites';
import { useCart } from '@/hooks/useCart';

export default function Navbar({ showMyAccountLink = false }) {
  const { favorites } = useFavorites();
  const { itemCount } = useCart();
  const { isSignedIn } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            Product Catalog
          </Link>
          <ul className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <li>
              <Link href="/cart" className="flex items-center gap-2 transition hover:text-slate-900">
                Cart
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                  {itemCount}
                </span>
              </Link>
            </li>
            <li>
              <Link href="/favorites" className="flex items-center gap-2 transition hover:text-slate-900">
                Favorites
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                  {favorites.length}
                </span>
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          {showMyAccountLink && isSignedIn && (
            <Link href="/account" className="transition hover:text-slate-900">
              Order History
            </Link>
          )}
          {isSignedIn ? (
            <>
              <Link href="/profile" className="transition hover:text-slate-900">
                Profile
              </Link>
              <SignOutButton redirectUrl="/">
                <button type="button" className="transition hover:text-slate-900">
                  Sign Out
                </button>
              </SignOutButton>
            </>
          ) : (
            <Link href="/sign-in" className="transition hover:text-slate-900">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
