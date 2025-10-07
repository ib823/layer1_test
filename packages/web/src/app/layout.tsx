import type { Metadata } from "next";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import "../styles/design-system.css";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { AuthProvider } from "@/lib/auth/AuthContext";

export const metadata: Metadata = {
  title: "SAP GRC Platform",
  description: "Governance, Risk, and Compliance platform for SAP environments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AntdRegistry>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#1890ff',
                borderRadius: 8,
                fontSize: 14,
              },
              components: {
                Button: {
                  controlHeight: 40,
                  controlHeightLG: 48,
                },
                Input: {
                  controlHeight: 40,
                  controlHeightLG: 48,
                },
              },
            }}
          >
            <AuthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}