import LockOutlined from "@mui/icons-material/LockOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { type FormEvent, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";

import { Logo } from "@/components/layout/sidebar/logo";
import { useSession, useSignIn } from "@/hooks/useSession";

import { safeNext } from "../../next";

export function SignInPage() {
  const session = useSession();
  const signIn = useSignIn();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const next = safeNext(params.get("next"));

  if (session.isPending) {
    return <LinearProgress aria-label="Loading" />;
  }

  if (session.data && (!session.data.required || session.data.signedIn)) {
    return <Navigate to={next} replace />;
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();

    signIn.mutate(password, {
      onSuccess: () => {
        void navigate(next, { replace: true });
      },
      onError: () => {
        setPassword("");
      },
    });
  };

  return (
    <Box
      component="main"
      sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", px: 2, py: 6 }}
    >
      <Card sx={{ width: "100%", maxWidth: 400, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={3} component="form" onSubmit={submit} noValidate>
          <Logo />

          <Box>
            <Typography variant="h3" component="h1">
              Sign in
            </Typography>
            <Typography sx={{ color: "text.secondary", mt: 0.5 }}>
              Front Desk shows patients' calls and bookings. Enter the password set in
              FRONT_DESK_PASSWORD on the server.
            </Typography>
          </Box>

          {signIn.isError && <Alert severity="error">{signIn.error.message}</Alert>}

          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            startIcon={<LockOutlined />}
            disabled={!password || signIn.isPending}
          >
            {signIn.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </Stack>
      </Card>
    </Box>
  );
}
