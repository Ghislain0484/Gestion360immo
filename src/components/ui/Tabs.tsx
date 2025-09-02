// src/components/ui/Tabs.tsx
import React, { useState } from 'react';
import clsx from 'clsx';

export const Tabs: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="w-full">{children}</div>;
};

export const TabList: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="flex flex-wrap gap-2 border-b mb-4">{children}</div>;
};

export const Tab: React.FC<{ children: React.ReactNode; onClick?: () => void; isActive?: boolean }> = ({ children, onClick, isActive }) => {
  return (
    <button
      className={clsx(
        'px-3 py-2 text-sm rounded-t-md',
        isActive ? 'bg-white border border-b-0' : 'bg-gray-100 hover:bg-gray-200 border-transparent'
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
};

export const TabPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="bg-white rounded-md border p-4">{children}</div>;
};

export const UseTabs: React.FC<{ labels: string[]; panels: React.ReactNode[] }> = ({ labels, panels }) => {
  const [idx, setIdx] = useState(0);
  return (
    <div>
      <TabList>
        {labels.map((l, i) => (
          <Tab key={l} isActive={i === idx} onClick={() => setIdx(i)}>{l}</Tab>
        ))}
      </TabList>
      <TabPanel>{panels[idx]}</TabPanel>
    </div>
  );
};
