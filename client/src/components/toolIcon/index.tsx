import CallEndRounded from "@mui/icons-material/CallEndRounded";
import CallSplitRounded from "@mui/icons-material/CallSplitRounded";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import EventNoteOutlined from "@mui/icons-material/EventNoteOutlined";
import FunctionsRounded from "@mui/icons-material/FunctionsRounded";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import type { SvgIconComponent } from "@mui/icons-material";
import type { SvgIconProps } from "@mui/material";

const ICONS: Record<string, SvgIconComponent> = {
  search_knowledge_base: MenuBookOutlined,
  check_availability: EventNoteOutlined,
  book_appointment: EventAvailableOutlined,
  transferCall: CallSplitRounded,
  endCall: CallEndRounded,
};

export function ToolIcon({ name, ...props }: SvgIconProps & { name: string }) {
  const Icon = ICONS[name] ?? FunctionsRounded;

  return <Icon {...props} />;
}
