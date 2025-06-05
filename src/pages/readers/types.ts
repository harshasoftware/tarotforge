import { User } from '../../types'; // Assuming User type is in a global types file

export type SortOption = 'level-asc' | 'level-desc' | 'price-asc' | 'price-desc' | 'none';
export type ActiveFilter = 'all' | 'new' | 'top-rated' | 'advanced';

export interface CachedReaders {
  data: User[];
  timestamp: number;
} 