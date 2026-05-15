export type Platform = '번개장터' | '중고나라';

export interface Product {
  platform: Platform;
  title: string;
  price: string;
  priceNum: number;
  link: string;
  update_time: string;
  timestamp: number;
  status: string;
  image: string;
}

export type SortOption = 'latest' | 'price-asc' | 'price-desc';

export interface SearchResponse {
  keyword: string;
  timestamp: string;
  results: Product[];
  meta: {
    bunjang: 'success' | 'failed';
    joonggo: 'success' | 'failed';
  };
}

export interface PriceStats {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface FilterState {
  platform: 'all' | Platform;
  sort: SortOption;
  priceMin: number;
  priceMax: number;
}
