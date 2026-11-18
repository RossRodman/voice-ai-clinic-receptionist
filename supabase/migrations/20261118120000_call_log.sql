-- The call log: every call the assistant takes, the functions it ran and what it booked.
--
-- Written by the webhook server with the secret (service role) key, which bypasses
-- row-level security. RLS is on with no policies, so the public (anon) key can read nothing:
-- transcripts and phone numbers never leave the server except through its own API.

create table public.calls (
  id               text primary key,                -- Vapi's call id
  status           text not null default 'in-progress'
                     check (status in ('in-progress', 'ended')),
  type             text,                            -- inboundPhoneCall, outboundPhoneCall, webCall
  customer_number  text,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_seconds integer check (duration_seconds >= 0),
  ended_reason     text,                            -- Vapi's endedReason, e.g. customer-ended-call
  outcome          text check (outcome in ('booked', 'transferred', 'answered', 'hung-up', 'failed')),
  summary          text,
  transcript       jsonb not null default '[]',     -- [{ role: "assistant" | "caller", text, secondsFromStart }]
  recording_url    text,
  cost             numeric(10, 4),                  -- USD, as Vapi reports it
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index calls_started_at_idx on public.calls (started_at desc);

create table public.tool_calls (
  id                 text primary key,              -- Vapi's toolCallId
  call_id            text not null references public.calls (id) on delete cascade,
  name               text not null,
  arguments          jsonb not null default '{}',
  result             jsonb,                         -- what the assistant got back
  error              text,                          -- or the error it got instead
  duration_ms        integer,
  seconds_from_start numeric(8, 2),                 -- where it happened in the call
  created_at         timestamptz not null default now()
);

create index tool_calls_call_id_idx on public.tool_calls (call_id, created_at);

create table public.bookings (
  id            text primary key,                   -- the calendar event's id
  call_id       text references public.calls (id) on delete set null,
  service_id    text not null,
  service       text not null,
  provider_id   text not null,
  provider      text not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  patient_name  text not null,
  patient_phone text not null,
  new_patient   boolean,
  notes         text,
  created_at    timestamptz not null default now()
);

create index bookings_call_id_idx on public.bookings (call_id);
create index bookings_starts_at_idx on public.bookings (starts_at);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger calls_touch_updated_at
  before update on public.calls
  for each row execute function public.touch_updated_at();

alter table public.calls enable row level security;
alter table public.tool_calls enable row level security;
alter table public.bookings enable row level security;
