/** @type {import('tailwindcss').Config} */
module.exports = {

  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins-Regular"],
        poppinsBold: ["Poppins-Bold"],
      },
      colors: {
        primary: "#FFFFFF",
        secondary: "#FF0000",
        box: "#2A4C7C",
        accent: "#000000",
        light: {
          100: "#BEBEBE",
          200: "#3E6BA1",
        },
      },
    },
  },
  plugins: [],
};
