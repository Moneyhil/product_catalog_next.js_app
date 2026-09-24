import { adminDb } from "@/lib/firebase/admin";
import type { Product } from "./types";

type ProductDocument = Omit<Product, "id"> & { id?: string | number };

function toProduct(
  snapshot: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
): Product {
  const data = (snapshot.data() ?? {}) as ProductDocument;
  const rawId = typeof data.id !== "undefined" ? data.id : snapshot.id;
  return {
    ...(data as Omit<Product, "id">),
    id: Number(rawId),
  };
}

export async function getAllProductsServer(): Promise<Product[]> {
  const productsSnapshot = await adminDb.collection("products").get();
  return productsSnapshot.docs.map(toProduct);
}

export async function getProductByIdServer(id: string | number): Promise<Product> {
  const productSnapshot = await adminDb
    .collection("products")
    .doc(String(id))
    .get();

  if (!productSnapshot.exists) {
    throw new Error(`Product with id ${id} was not found`);
  }

  return toProduct(productSnapshot);
}

export async function getCategoriesServer(): Promise<string[]> {
  const productsSnapshot = await adminDb.collection("products").get();
  return [
    ...new Set(
      productsSnapshot.docs.map((productDocument) => {
        const value = productDocument.data()?.category;
        return typeof value === "string" ? value : "";
      }),
    ),
  ].filter((category) => category.length > 0).sort();
}

export async function getProductsByCategoryServer(category: string): Promise<Product[]> {
  const productsQuery = adminDb
    .collection("products")
    .where("category", "==", category);
  const productsSnapshot = await productsQuery.get();

  return productsSnapshot.docs.map(toProduct);
}

export async function getRelatedProductsServer(
  category: string,
  currentId: number,
): Promise<Product[]> {
  const products = await getProductsByCategoryServer(category);
  return products
    .filter((product) => product.id !== currentId)
    .slice(0, 4);
}
