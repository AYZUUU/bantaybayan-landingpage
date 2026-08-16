/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./app/tabs/**/*.{js,jsx,ts,tsx}",
    "./app/(auth)/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FFFFFF",
        secondary: "#FF0000",
        box: "#2A4C7C",
        accent: "#000000",
      },
    },
  },
  plugins: [],
};