import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { PropertyImage } from '../../types/db';

interface ImageCarouselProps {
    images: PropertyImage[];
    autoPlay?: boolean;
    interval?: number;
    showControls?: boolean;
    showIndicators?: boolean;
    height?: string;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({
    images,
    autoPlay = false,
    interval = 3000,
    showControls = true,
    showIndicators = true,
    height = 'h-48'
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Auto-play logic
    useEffect(() => {
        if (!autoPlay || isPaused || images.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % images.length);
        }, interval);

        return () => clearInterval(timer);
    }, [autoPlay, isPaused, images.length, interval, currentIndex]);

    const goToPrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goToNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const goToIndex = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        setCurrentIndex(index);
    };

    if (images.length === 0) {
        return (
            <div className={`${height} bg-gray-100 dark:bg-slate-800 flex items-center justify-center`}>
                <Home className="w-12 h-12 text-gray-400 dark:text-slate-600" />
            </div>
        );
    }

    return (
        <div
            className={`relative ${height} overflow-hidden group`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Image */}
            <img
                src={images[currentIndex].url}
                alt={images[currentIndex].description || 'Property image'}
                className="w-full h-full object-cover transition-opacity duration-500"
                loading="lazy"
                onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="18" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                }}
            />

            {/* Navigation Buttons */}
            {showControls && images.length > 1 && (
                <>
                    <button
                        onClick={goToPrevious}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Image précédente"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Image suivante"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            {/* Indicators */}
            {showIndicators && images.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, index) => (
                        <button
                            key={index}
                            onClick={(e) => goToIndex(e, index)}
                            className={`h-2 rounded-full transition-all ${index === currentIndex
                                    ? 'bg-white w-6'
                                    : 'bg-white/50 hover:bg-white/75 w-2'
                                }`}
                            aria-label={`Aller à l'image ${index + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Image Counter */}
            {images.length > 1 && (
                <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                    {currentIndex + 1}/{images.length}
                </div>
            )}
        </div>
    );
};
