import './globals.css' // <--- 必须有这一句，且路径不能错！
// import { Inter } from 'next/font/google' ...

export const metadata = {
  title: "Zageh's Chips Ranking",
  description: 'Built with Supabase & Next.js',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#DAE0E6]">
        {children}
      </body>
    </html>
  )
}