import LogoutRounded from "@mui/icons-material/LogoutRounded";
import { IconButton, Tooltip } from "@mui/material";

import { useSession, useSignOut } from "@/hooks/useSession";

export function SignOutButton() {
  const session = useSession();
  const signOut = useSignOut();

  if (!session.data?.required || !session.data.signedIn) {
    return null;
  }

  return (
    <Tooltip title="Sign out">
      <IconButton
        aria-label="Sign out"
        disabled={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        <LogoutRounded />
      </IconButton>
    </Tooltip>
  );
}
