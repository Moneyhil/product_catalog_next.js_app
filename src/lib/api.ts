import type { Product } from "./types";

const BASE_URL = "https://fakestoreapi.com/products";

async function fetchJson<T>(url: string, errorMessage: string): Promise<T> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`${errorMessage}: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${errorMessage}: ${message}`);
  }
}

export async function getAllProducts(): Promise<Product[]> {
  return fetchJson<Product[]>(BASE_URL, "Failed to fetch all products");
}

export async function getProductById(id: string | number): Promise<Product> {
  return fetchJson<Product>(
    `${BASE_URL}/${id}`,
    `Failed to fetch product with id ${id}`
  );
}

export async function getCategories(): Promise<string[]> {
  return fetchJson<string[]>(`${BASE_URL}/categories`, "Failed to fetch categories");
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  return fetchJson<Product[]>(
    `${BASE_URL}/category/${category}`,
    `Failed to fetch products for category ${category}`
  );
}