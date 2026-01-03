import { isUuid } from '@/lib/utils';
import { isProductCategory, PRODUCT_CATEGORIES } from '@/types/product';

describe('isUuid', () => {
  it('accepts canonical UUID strings', () => {
    expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects non-UUID values', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid('not-a-uuid')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(123)).toBe(false);
  });
});

describe('isProductCategory', () => {
  it('accepts all known categories', () => {
    for (const c of PRODUCT_CATEGORIES) {
      expect(isProductCategory(c)).toBe(true);
    }
  });

  it('rejects unknown values', () => {
    expect(isProductCategory('invalid')).toBe(false);
    expect(isProductCategory('')).toBe(false);
    expect(isProductCategory(null)).toBe(false);
  });
});
