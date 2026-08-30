import { Link } from "react-router-dom";
import { Wallet, MessageCircle, Search } from "lucide-react";
import { Wordmark } from "./Wordmark";

interface TopHeaderProps {
  showTagline?: boolean;
}

export function TopHeader({ showTagline = false }: TopHeaderProps) {
  return (
    <header className="px-4 pt-6 pb-3 sticky top-0 bg-canvas z-30 border-b border-border flex items-center justify-between">
      <Link to="/search" className="text-ink-muted">
        <Search size={22} />
      </Link>
      <Wordmark size="sm" showTagline={showTagline} />
      <div className="flex items-center gap-3">
        <Link to="/messages" className="text-ink-muted">
          <MessageCircle size={22} />
        </Link>
        <Link to="/wallet" className="text-ink-muted">
          <Wallet size={22} />
        </Link>
      </div>
    </header>
  );
}
