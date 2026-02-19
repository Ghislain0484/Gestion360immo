import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { clsx } from 'clsx';

export interface Photo {
    url: string;
    ordre?: number;
    legende?: string;
}

export interface PhotoCarouselProps {
    photos: Photo[];
    coverIndex?: number;
    showThumbnails?: boolean;
    onPhotoClick?: (index: number) => void;
    className?: string;
}

export const PhotoCarousel: React.FC<PhotoCarouselProps> = ({
    photos,
    coverIndex = 0,
    showThumbnails = true,
    onPhotoClick,
    className,
}) => {
    const [currentIndex, setCurrentIndex] = useState(coverIndex);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    if (!photos || photos.length === 0) {
        return (
            <div className={clsx('bg-gray-100 rounded-lg flex items-center justify-center', className)}>
                <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Aucune photo disponible</p>
                </div>
            </div>
        );
    }

    const handlePrevious = () => {
        setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
    };

    const handleThumbnailClick = (index: number) => {
        setCurrentIndex(index);
    };

    const handleImageClick = () => {
        if (onPhotoClick) {
            onPhotoClick(currentIndex);
        } else {
            setIsLightboxOpen(true);
        }
    };

    const currentPhoto = photos[currentIndex];

    return (
        <>
            <div className={clsx('relative', className)}>
                {/* Main Image */}
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden group">
                    <img
                        src={currentPhoto.url}
                        alt={currentPhoto.legende || `Photo ${currentIndex + 1}`}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
                        onClick={handleImageClick}
                    />

                    {/* Zoom Indicator */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20">
                        <div className="bg-white/90 backdrop-blur-sm rounded-full p-3">
                            <ZoomIn className="w-6 h-6 text-gray-900" />
                        </div>
                    </div>

                    {/* Navigation Arrows */}
                    {photos.length > 1 && (
                        <>
                            <button
                                onClick={handlePrevious}
                                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                aria-label="Photo précédente"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-900" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full p-2 shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                                aria-label="Photo suivante"
                            >
                                <ChevronRight className="w-5 h-5 text-gray-900" />
                            </button>
                        </>
                    )}

                    {/* Counter */}
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-full">
                        {currentIndex + 1} / {photos.length}
                    </div>

                    {/* Legend */}
                    {currentPhoto.legende && (
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white text-sm px-3 py-1 rounded-lg max-w-xs">
                            {currentPhoto.legende}
                        </div>
                    )}
                </div>

                {/* Thumbnails */}
                {showThumbnails && photos.length > 1 && (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                        {photos.map((photo, index) => (
                            <button
                                key={index}
                                onClick={() => handleThumbnailClick(index)}
                                className={clsx(
                                    'flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200',
                                    index === currentIndex
                                        ? 'border-primary-600 ring-2 ring-primary-200'
                                        : 'border-transparent hover:border-gray-300'
                                )}
                            >
                                <img
                                    src={photo.url}
                                    alt={photo.legende || `Miniature ${index + 1}`}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {isLightboxOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center animate-fade-in">
                    <button
                        onClick={() => setIsLightboxOpen(false)}
                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-2 transition-colors"
                        aria-label="Fermer"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <button
                        onClick={handlePrevious}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-3 transition-colors"
                        aria-label="Photo précédente"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <button
                        onClick={handleNext}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-full p-3 transition-colors"
                        aria-label="Photo suivante"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>

                    <div className="max-w-7xl max-h-[90vh] px-4">
                        <img
                            src={currentPhoto.url}
                            alt={currentPhoto.legende || `Photo ${currentIndex + 1}`}
                            className="max-w-full max-h-[90vh] object-contain"
                        />
                        {currentPhoto.legende && (
                            <p className="text-white text-center mt-4">{currentPhoto.legende}</p>
                        )}
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full">
                        {currentIndex + 1} / {photos.length}
                    </div>
                </div>
            )}
        </>
    );
};

// Missing import
import { Building2 } from 'lucide-react';

export default PhotoCarousel;
