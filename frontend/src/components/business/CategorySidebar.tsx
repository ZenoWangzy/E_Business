/**
 * CategorySidebar - Quick navigation sidebar for category selection
 */

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CategoryInfo, ProductCategory } from '@/types/product';

interface CategorySidebarProps {
    categories: CategoryInfo[];
    selectedCategory: ProductCategory | null;
    onSelect: (category: ProductCategory) => void;
}

export function CategorySidebar({
    categories,
    selectedCategory,
    onSelect,
}: CategorySidebarProps) {
    return (
        <div className="space-y-2">
            <h3 className="font-semibold text-lg mb-4">快速导航</h3>
            {categories.map((category) => (
                <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'ghost'}
                    className={cn(
                        'w-full justify-start',
                        selectedCategory !== category.id && 'text-left'
                    )}
                    onClick={() => onSelect(category.id)}
                >
                    {category.label}
                </Button>
            ))}
        </div>
    );
}
