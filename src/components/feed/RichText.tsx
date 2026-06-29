import { Link } from "@tanstack/react-router";

// Parses @username and #hashtag and turns them into clickable links.
// Username: letters, digits, underscores, dots (2-30 chars).
// Hashtag: letters, digits, underscores (1-50 chars, unicode-aware).
const TOKEN_RE = /(@[A-Za-z0-9._]{2,30})|(#[\p{L}\p{N}_]{1,50})/gu;

export function RichText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    const token = m[0];
    if (token.startsWith("@")) {
      const handle = token.slice(1);
      parts.push(
        <Link
          key={`m-${i++}`}
          to="/u/$username"
          params={{ username: handle }}
          className="font-semibold text-gold hover:underline"
        >
          {token}
        </Link>,
      );
    } else {
      const tag = token.slice(1).toLowerCase();
      parts.push(
        <Link
          key={`h-${i++}`}
          to="/tag/$tag"
          params={{ tag }}
          className="font-semibold text-sky-400 hover:underline"
        >
          {token}
        </Link>,
      );
    }
    last = idx + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={className}>{parts}</span>;
}
