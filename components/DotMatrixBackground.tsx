import React from 'react';

const DotMatrixBackground: React.FC = () => {
  return (
    <div className="blob-background-container">
      <style jsx>{`
        .blob-background-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          z-index: -1; /* Ensure it's in the background */
        }

        .glowing-blob {
          filter: blur(100px);
          width: 70%; /* Adjust size as needed */
          max-width: 600px; /* Or adjust as per visual preference */
        }

        .glowing-blob path {
          animation: colorChangeBlobFill 30s infinite linear; /* Changed from 15s to 30s */
        }
      `}</style>
      <style jsx global>{`
        @keyframes colorChangeBlobFill {
          0%, 100% { fill: #ff4dc4; } /* Pink */
          20% { fill: #3399ff; }    /* Blue */
          40% { fill: #ffd24d; }    /* Gold */
          60% { fill: #9933ff; }    /* Purple */
          80% { fill: #4dfff0; }    /* Cyan */
        }
      `}</style>
      <svg
        className="glowing-blob"
        viewBox="0 0 585 475" // From user's reference SVG
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d="M59.6878 70.4072C2.64247 112.7 -16.8108 220.14 15.7866 303.15C34.714 338.439 85.6079 417.473 137.764 451.308C202.958 493.601 346.492 482.305 380.666 392.728C414.841 303.151 608.848 251.138 582.56 142.122C556.271 33.1053 429.562 31.2664 323.621 6.83623C217.68 -17.5939 116.733 28.1141 59.6878 70.4072Z"
        />
      </svg>
    </div>
  );
};

export default DotMatrixBackground;
