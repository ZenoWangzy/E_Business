/**
 * StyleSelector - Grid display of visual styles for AI image generation
 * Story 2.1: Style Selection & Generation Trigger
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { StyleOption, StyleType } from '@/types/image';

interface StyleSelectorProps {
    styles: StyleOption[];
    selectedStyle: StyleType | null;
    onSelect: (styleId: StyleType) => void;
    disabled?: boolean;
}

export function StyleSelector({
    styles,
    selectedStyle,
    onSelect,
    disabled = false,
}: StyleSelectorProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {styles.map((style) => {
                const isSelected = selectedStyle === style.id;

                return (
                    <Card
                        key={style.id}
                        data-testid={`style-${style.id}`}
                        className={`cursor-pointer transition-all duration-300 overflow-hidden group
                            ${isSelected
                                ? 'ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.02]'
                                : 'hover:shadow-lg hover:scale-[1.01]'
                            } 
                            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !disabled && onSelect(style.id)}
                    >
                        {/* Gradient Preview */}
                        <div
                            className="h-32 w-full transition-transform duration-300 group-hover:scale-105"
                            style={{ background: style.gradient }}
                        />

                        <CardContent className="p-4 text-center">
                            <h3 className="font-semibold text-lg mb-1">{style.name}</h3>
                            {style.description && (
                                <p className="text-sm text-muted-foreground">
                                    {style.description}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
