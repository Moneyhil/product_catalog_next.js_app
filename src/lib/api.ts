import {
  collection,
  doc,
  type DocumentData,
  getDoc,
  getDocs,
  query,
  type QueryDocumentSnapshot,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { Product } from "./types";

const productsCollection = collection(db, "products");

function toProduct(productDocument: QueryDocumentSnapshot<DocumentData>): Product {
  return {
    ...(productDocument.data() as Omit<Product, "id">),
    id: Number(productDocument.id),
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const productsSnapshot = await getDocs(productsCollection);
  return productsSnapshot.docs.map(toProduct);
}

export async function getProductById(id: string | number): Promise<Product> {
  const productSnapshot = await getDoc(doc(db, "products", String(id)));

  if (!productSnapshot.exists()) {
    throw new Error(`Product with id ${id} was not found`);
  }

  return toProduct(productSnapshot);
}

export async function getCategories(): Promise<string[]> {
  const productsSnapshot = await getDocs(productsCollection);
  return [
    ...new Set(
      productsSnapshot.docs.map((productDocument) => productDocument.data().category),
    ),
  ].sort();
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const productsQuery = query(
    productsCollection,
    where("category", "==", category),
  );
  const productsSnapshot = await getDocs(productsQuery);

  return productsSnapshot.docs.map(toProduct);
}

export async function getRelatedProducts(
  category: string,
  currentId: number,
): Promise<Product[]> {
  const products = await getProductsByCategory(category);

  return products
    .filter((product) => product.id !== currentId)
    .slice(0, 4);
}
