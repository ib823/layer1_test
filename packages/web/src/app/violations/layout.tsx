// Force dynamic rendering for violations pages
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ViolationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
