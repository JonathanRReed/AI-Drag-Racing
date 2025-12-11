import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  // Developer console easter egg
  useEffect(() => {
    const ascii = `
    ___  ________  ________     
   |\\  \\|\\   __  \\|\\   __  \\    
   \\ \\  \\ \\  \\|\\  \\ \\  \\|\\  \\   
 __ \\ \\  \\ \\   _  _\\ \\   _  _\\  
|\\  \\\\_\\  \\ \\  \\\\  \\\\ \\  \\\\  \\|
\\ \\________\\ \\__\\\\ _\\\\ \\__\\\\ _\\
 \\|________|\\|__|\\|__|\\|__|\\|__|
                                
                                
                                
    `;
    console.log(ascii);
    console.log("Hey there. Interested in code?");
    console.log("Check out my GitHub: https://github.com/JonathanRReed");
    console.log("Most of my sites repos are open source.");
  }, []);

  return (
    <>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
