import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="container mx-auto flex flex-col gap-4 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/shipmint-logo.png"
            alt="shipmint"
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <span className="text-sm font-semibold tracking-tight">
            shipmint
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm text-white/60">
          <Link href="/help" className="transition-colors hover:text-white">
            Help
          </Link>
          <span>
            © shipmint
          </span>
        </div>
      </div>
    </footer>
  );
}
