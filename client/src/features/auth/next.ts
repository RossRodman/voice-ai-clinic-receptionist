export function signInPath(next: string): string {
  return next === "/" ? "/sign-in" : `/sign-in?${new URLSearchParams({ next })}`;
}

/** Where to go after signing in: only a path inside Front Desk, never another site. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/sign-in")) {
    return "/";
  }

  return next;
}
