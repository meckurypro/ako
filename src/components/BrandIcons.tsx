// src/components/BrandIcons.tsx
//
// Simple, generic circle glyphs standing in for WhatsApp/Facebook/X in
// the share sheet's "send to an app" row — not reproductions of the
// official marks, just enough visual shorthand (color + a recognizable
// simplified icon) for someone scanning the row to find the app they
// want.

export function WhatsAppGlyph() {
  return (
    <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
        <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3a8.2 8.2 0 1 1 7.2 3.9zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8.9-.2.2-.3.2-.5.1a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.2 0-.4.1-.5l.4-.4c.1-.1.2-.3.2-.4.1-.2 0-.3 0-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.5 3.8.6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" />
      </svg>
    </div>
  );
}

export function FacebookGlyph() {
  return (
    <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
        <path d="M13.5 21v-7.7h2.6l.4-3h-3v-1.9c0-.9.2-1.5 1.5-1.5h1.6V4.2C15.9 4.1 15 4 13.9 4c-2.3 0-3.9 1.4-3.9 4v2.3H7.4v3H10V21h3.5z" />
      </svg>
    </div>
  );
}

export function XGlyph() {
  return (
    <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center flex-shrink-0">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
        <path d="M18.3 3H21l-6.4 7.3L22.2 21h-6.5l-5-6.6L4.7 21H2l6.9-7.8L1.8 3h6.6l4.6 6.1L18.3 3zm-1.1 16.2h1.8L7 4.7H5.1L17.2 19.2z" />
      </svg>
    </div>
  );
}
