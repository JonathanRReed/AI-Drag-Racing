import React from 'react';

interface MainLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="flex h-screen w-screen bg-black text-gray-200">
      <aside className="w-1/4 max-w-xs h-full p-4 overflow-y-auto">
        {sidebar}
      </aside>
      <main className="flex-1 h-full p-4 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
