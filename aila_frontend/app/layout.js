// app/layout.js

import '../styles/globals.css';
import Navbar from './components/Navbar';

export const metadata = {
  title: 'AILA',
  description: 'An Intelligent Lecturing Assistant',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-gray-900">
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
