export type ProductType = 'simple' | 'variable';

export type ProductStatus = 'publicado' | 'borrador' | 'papelera';

export interface ProductAttribute {
  id: string;
  name: string;
  createsVariation: boolean;
  values: string[];
  /** Texto crudo introducido en el input de valores, para no romper la experiencia de tipeo. */
  valuesText?: string;
}

export interface ProductVariation {
  id: string;
  sku?: string;
  costPrice: number;
  price: number;
  stock: number;
  imageUrl?: string;
  attributes: Record<string, string>;
}

export interface ProductBase {
  sku: string;
  name: string;
  description: string;
  costPrice: number;
  regularPrice: number;
  salePrice?: number;
  /** ID de la marca (colección brands) */
  brandId?: string;
  categories: string[];
  tags: string[];
  crossSellSkus: string[];
  status: ProductStatus;
  dimensions?: {
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
  };
  /** Imagen principal del producto. */
  featuredImage?: string;
  /** Galería de imágenes secundarias. */
  gallery: string[];
  type: ProductType;
  attributes: ProductAttribute[];
}

export interface SimpleProduct extends ProductBase {
  type: 'simple';
  stock: number;
}

export interface VariableProduct extends ProductBase {
  type: 'variable';
  variations: ProductVariation[];
}

export type ProductPayload = SimpleProduct | VariableProduct;
