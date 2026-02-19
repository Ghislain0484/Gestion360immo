import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { PropertyImage } from '../../types/db';

interface ImageGalleryProps {
    images: PropertyImage[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);

    // Keyboard navigation
    useEffect(() => {
        if (!isLightboxOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsLightboxOpen(false);
            } else if (e.key === 'ArrowLeft') {
                goToPrevious();
            } else if (e.key === 'ArrowRight') {
                goToNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isLightboxOpen, selectedIndex, images.length]);

    const goToPrevious = () => {
        setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    const goToNext = () => {
        setSelectedIndex((prev) => (prev + 1) % images.length);
    };

    if (images.length === 0) {
        return (
            <div className="h-96 bg-gray-100 dark:bg-slate-800 flex flex-col items-center justify-center rounded-lg">
                <Home className="w-16 h-16 text-gray-400 dark:text-slate-600 mb-4" />
                <p className="text-gray-500 dark:text-slate-400">Aucune image disponible</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Main Image */}
            <div
                className="relative h-96 bg-gray-100 dark:bg-slate-800 rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => setIsLightboxOpen(true)}
            >
                <img
                    src={images[selectedIndex].url}
                    alt={images[selectedIndex].description || 'Property image'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23f3f4f6" width="800" height="600"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                    }}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-4 py-2 rounded">
                        Cliquer pour agrandir
                    </span>
                </div>
                {images[selectedIndex].description && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                        <p className="text-white text-sm">{images[selectedIndex].description}</p>
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="grid grid-cols-6 gap-2">
                    {images.map((image, index) => (
                        <button
                            key={index}
                            onClick={() => setSelectedIndex(index)}
                            className={`relative h-20 rounded overflow-hidden border-2 transition-all ${index === selectedIndex
                                    ? 'border-blue-600 scale-105 shadow-md'
                                    : 'border-transparent hover:border-gray-300 dark:hover:border-slate-600'
                                }`}
                            aria-label={`Voir l'image ${index + 1}`}
                        >
                            <img
                                src={image.url}
                                alt={image.description || `Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="75"%3E%3Crect fill="%23f3f4f6" width="100" height="75"/%3E%3C/svg%3E';
                                }}
                            />
                            {index === selectedIndex && (
                                <div className="absolute inset-0 border-2 border-blue-600 rounded"></div>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Lightbox Modal */}
            {isLightboxOpen && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
                    onClick={() => setIsLightboxOpen(false)}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsLightboxOpen(false);
                        }}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                        aria-label="Fermer"
                    >
                        <X className="w-8 h-8" />
                    </button>

                    {images.length > 1 && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goToPrevious();
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                                aria-label="Image précédente"
                            >
                                <ChevronLeft className="w-12 h-12" />
                            </button>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    goToNext();
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
                                aria-label="Image suivante"
                            >
                                <ChevronRight className="w-12 h-12" />
                            </button>
                        </>
                    )}

                    <img
                        src={images[selectedIndex].url}
                        alt={images[selectedIndex].description || 'Property image'}
                        className="max-h-[90vh] max-w-[90vw] object-contain"
                        onClick={(e) => e.stopPropagation()}
                        onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect fill="%23374151" width="800" height="600"/%3E%3Ctext fill="%239ca3af" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EImage non disponible%3C/text%3E%3C/svg%3E';
                        }}
                    />

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-lg bg-black/50 px-4 py-2 rounded">
                        {selectedIndex + 1} / {images.length}
                    </div>

                    {images[selectedIndex].description && (
                        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded max-w-2xl text-center">
                            {images[selectedIndex].description}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
