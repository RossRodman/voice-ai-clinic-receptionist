import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import MenuBookOutlined from "@mui/icons-material/MenuBookOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

export interface NavItem {
  to: string;
  label: string;
  icon: SvgIconComponent;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: DashboardOutlined },
  { to: "/knowledge-base", label: "Knowledge base", icon: MenuBookOutlined },
  { to: "/schedule", label: "Schedule", icon: EventAvailableOutlined },
];
