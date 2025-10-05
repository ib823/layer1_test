import Link from 'next/link';

export interface BreadcrumbItem { label: string; href?: string; }
interface BreadcrumbsProps { items: BreadcrumbItem[]; }

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li><Link href="/" className="text-gray-400 hover:text-gray-600">Home</Link></li>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex items-center">
              <span className="mx-2 text-gray-400">/</span>
              {item.href && !isLast ? (
                <Link href={item.href} className="text-sm text-gray-600 hover:text-gray-900">{item.label}</Link>
              ) : (
                <span className="text-sm font-medium text-gray-900">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
