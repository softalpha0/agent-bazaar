'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function Header() {
  const path = usePathname();
  const onDash = path === '/dashboard';

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-zinc-900 bg-black/80 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/logo.png" alt="AgentBazaar" width={28} height={28} className="rounded-md" />
          <span className="text-sm font-semibold tracking-tight">AgentBazaar</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
            TESTNET
          </span>
        </Link>
        <nav className="flex items-center gap-6 text-xs text-zinc-400">
          {!onDash && (
            <>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
              <a href="#catalogue" className="hover:text-white transition-colors">Registry</a>
            </>
          )}
          <Link
            href={onDash ? '/' : '/dashboard'}
            className="px-3 py-1.5 bg-white text-black text-xs font-medium rounded-lg hover:bg-zinc-100 transition-colors"
          >
            {onDash ? 'Registry' : 'Dashboard'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
