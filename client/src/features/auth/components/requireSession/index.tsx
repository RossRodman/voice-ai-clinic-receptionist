import { LinearProgress } from "@mui/material";
import { Navigate, Outlet, useLocation } from "react-router";

import { useSession } from "@/hooks/useSession";

import { signInPath } from "../../next";

export function RequireSession() {
  const session = useSession();
  const location = useLocation();

  if (session.isPending) {
    return (
      <LinearProgress aria-label="Loading" sx={{ position: "fixed", top: 0, left: 0, right: 0 }} />
    );
  }

  if (session.data?.required && !session.data.signedIn) {
    return <Navigate to={signInPath(location.pathname + location.search)} replace />;
  }

  return <Outlet />;
}
