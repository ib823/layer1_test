import Link from 'next/link';

/**
 * Root level 404 Not Found handler
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="text-center max-w-md">
        <div className="text-9xl font-bold text-gray-300 mb-4">404</div>
        <h2 className="text-3xl font-bold mb-4 text-gray-800">
          Page Not Found
        </h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="btn btn-primary">
            Go to Homepage
          </Link>
          <Link href="/dashboard" className="btn btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
