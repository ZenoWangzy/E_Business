/**
 * CategoryGrid - Grid display of product categories for selection
 */

'use client';

import {
    Shirt,
    Laptop,
    Sparkles,
    Home,
    Apple,
    Trophy,
    Gamepad2,
    BookOpen,
    Car,
    Heart,
    MoreHorizontal,
    LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { CategoryInfo, ProductCategory } from '@/types/product';

interface CategoryGridProps {
    categories: CategoryInfo[];
    selectedCategory: ProductCategory | null;
    onSelect: (category: ProductCategory) => void;
    disabled?: boolean;
}

// Icon mapping from string names to Lucide components
const iconMap: Record<string, LucideIcon> = {
    Shirt,
    Laptop,
    Sparkles,
    Home,
    Apple,
    Trophy,
    Gamepad2,
    BookOpen,
    Car,
    Heart,
    MoreHorizontal,
};

export function CategoryGrid({
    categories,
    selectedCategory,
    onSelect,
    disabled = false,
}: CategoryGridProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category) => {
                const Icon = iconMap[category.icon] || MoreHorizontal;
                const isSelected = selectedCategory === category.id;

                return (
                    <Card
                        key={category.id}
                        data-testid={`category-${category.id}`}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${isSelected
                                ? 'ring-2 ring-primary bg-primary/5'
                                : 'hover:bg-accent'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !disabled && onSelect(category.id)}
                    >
                        <CardContent className="p-6 text-center">
                            <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                                <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="font-medium text-sm mb-1">{category.label}</h3>
                            {category.description && (
                                <p className="text-xs text-muted-foreground">
                                    {category.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
