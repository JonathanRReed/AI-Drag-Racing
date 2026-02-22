/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        oled: '#000000',
        asphalt: '#0b0d10',
        'asphalt-light': '#13161b',
        text: '#FAFAFA',
        cyan: '#22d3ee',
        magenta: '#e879f9',
        yellow: '#facc15',
        'race-red': '#ef4444',
        'race-yellow': '#facc15',
        'race-green': '#22c55e',
        card: '#111111'
      },
    },
  },
  plugins: [],
}
