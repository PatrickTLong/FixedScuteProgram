/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'scute-bg': '#28282B',
        'scute-card': '#363639',
        'scute-card-light': '#424245',
        'scute-border': '#4a4a4d',
        'scute-cyan': '#22d3ee',
        'scute-cyan-dark': '#0891b2',
        'scute-green': '#22c55e',
        'scute-green-dark': '#16a34a',
        'scute-gray': '#9ca3af',
        'scute-gray-dark': '#6b7280',
        'scute-yellow': '#fbbf24',
        'scute-red': '#ef4444',
      },
      fontFamily: {
        'nunito': ['Nunito-SemiBold'],
        'nunito-light': ['Nunito-SemiBold'],
        'nunito-bold': ['Nunito-SemiBold'],
        'nunito-semibold': ['Nunito-SemiBold'],
      },
    },
  },
  plugins: [],
}
