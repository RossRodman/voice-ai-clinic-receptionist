import { Alert, Button, Skeleton, Stack } from "@mui/material";
import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";

interface QueryStateProps<T> {
  query: UseQueryResult<T>;
  rows?: number;
  children: (data: T) => ReactNode;
}

export function QueryState<T>({ query, rows = 3, children }: QueryStateProps<T>) {
  if (query.data !== undefined) return children(query.data);

  if (query.isError) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void query.refetch()}>
            Retry
          </Button>
        }
      >
        {query.error.message}
      </Alert>
    );
  }

  return (
    <Stack spacing={1} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} variant="rounded" height={48} />
      ))}
    </Stack>
  );
}
