/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // 这一行非常重要！一定要覆盖到 src 目录
    './src/**/*.{js,ts,jsx,tsx,mdx}', 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}