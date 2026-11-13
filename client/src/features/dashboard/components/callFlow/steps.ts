import CallRounded from "@mui/icons-material/CallRounded";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import HeadsetMicOutlined from "@mui/icons-material/HeadsetMicOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import StorageOutlined from "@mui/icons-material/StorageOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

export interface CallStep {
  title: string;
  detail: string;
  icon: SvgIconComponent;
}

export const CALL_STEPS: CallStep[] = [
  {
    title: "The call",
    detail: "Vapi picks up, turns speech into text and speaks the answers back.",
    icon: CallRounded,
  },
  {
    title: "Questions",
    detail: "Services, prices, hours and insurance come from the knowledge base, never guessed.",
    icon: MenuBookOutlined,
  },
  {
    title: "Booking",
    detail: "Free slots from Google Calendar; the slot is checked again before the event is made.",
    icon: EventAvailableOutlined,
  },
  {
    title: "Transfer",
    detail: "Urgent, clinical or just wants a person: the live call goes to the front desk.",
    icon: HeadsetMicOutlined,
  },
  {
    title: "Call log",
    detail: "Transcript, recording, summary, outcome and every tool call are saved in Supabase.",
    icon: StorageOutlined,
  },
];
