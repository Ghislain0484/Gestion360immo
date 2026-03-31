import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { clsx } from 'clsx';

interface ViewToggleProps {
    view: 'list' | 'grid';
    onChange: (view: 'list' | 'grid') => void;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ view, onChange }) => {
    return (
        <div className="flex p-1 bg-gray-100 rounded-lg">
            <button
                onClick={() => onChange('list')}
                className={clsx(
                    "p-1.5 rounded-md transition-all",
                    view === 'list' ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
                title="Vue Liste"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                onClick={() => onChange('grid')}
                className={clsx(
                    "p-1.5 rounded-md transition-all",
                    view === 'grid' ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
                title="Vue Grille"
            >
                <LayoutGrid className="w-4 h-4" />
            </button>
        </div>
    );
};
