import "./globals.css";
import Header from "../components/Header";
import { NeracaAccessProvider } from "../components/NeracaAccessContext";
import { GlobalLoadingProvider } from "../components/GlobalLoadingContext";

export const metadata = {
  title: "SIMFONI — Sistem Monitoring Fenomena Ekonomi",
  description: "Dashboard monitoring fenomena ekonomi BPS Kabupaten Raja Ampat",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        <GlobalLoadingProvider>
          <NeracaAccessProvider>
            <Header />
            <main className="max-w-full desktop:max-w-[1240px] wide:max-w-[1440px] mx-auto px-4 tablet:px-6 pb-16">
              {children}
            </main>
          </NeracaAccessProvider>
        </GlobalLoadingProvider>
      </body>
    </html>
  );
}
