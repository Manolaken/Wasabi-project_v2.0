import { Inter } from 'next/font/google';
import "./globals.css";
import { Providers } from "./providers";
import Header from "./components/header/header";
import Navbar from "./components/navbar/navbar";
import Footer from "./components/footer/footer";
import { ClosePreventionProvider } from "./components/close-prevention-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "Wasabi Project",
  description: "Plataforma para la administración económica de los departamentos de Salesianos Zaragoza",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          <ClosePreventionProvider>
            <Navbar />
            <div className="ml-64 min-h-screen flex flex-col">
              <Header />
              <div className="flex-1">{children}</div>
              <Footer />
            </div>
          </ClosePreventionProvider>
        </Providers>
      </body>
    </html>
  );
}