import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MagicEden Airdrop Claim Tool",
  description: "Tool for claiming airdrop allocations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <Script id="wallet-conflict-handler" strategy="beforeInteractive">
          {`
            (function() {
              try {
                // Create immutable properties to prevent modifications
                Object.defineProperties(window, {
                  solana: {
                    value: undefined,
                    configurable: false,
                    writable: false
                  },
                  phantom: {
                    value: undefined,
                    configurable: false,
                    writable: false
                  },
                  ethereum: {
                    value: undefined,
                    configurable: false,
                    writable: false
                  }
                });

                // Suppress console errors
                const originalError = console.error;
                console.error = function(...args) {
                  const errorString = args.join(' ');
                  if (!errorString.includes('solana') && 
                      !errorString.includes('phantom') && 
                      !errorString.includes('wallet') &&
                      !errorString.includes('ethereum')) {
                    originalError.apply(console, args);
                  }
                };
              } catch (e) {
                // Silently fail if properties are already defined
              }
            })();
          `}
        </Script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
