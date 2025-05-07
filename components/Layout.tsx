import React from 'react';
import DotMatrixBackground from './DotMatrixBackground';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <DotMatrixBackground />
      <div className="content-wrapper">
        <main>{children}</main>
      </div>
      <style>{`
        .content-wrapper {
          position: relative; /* Establishes a stacking context */
          z-index: 1;       /* Ensures content is above the fixed background */
          min-height: 100vh; /* Optional: Ensures footer is pushed down if content is short */
          display: flex; /* Optional: For more complex layouts with headers/footers */
          flex-direction: column; /* Optional: For header/main/footer stacking */
        }
        main {
          flex-grow: 1; /* Optional: Ensures main content takes available space */
        }
      `}</style>
    </>
  );
};

export default Layout;
