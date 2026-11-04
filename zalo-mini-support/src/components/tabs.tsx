import { BottomNavigation, Icon } from "zmp-ui";

const TABS = [
  { key: "todo", label: "Cần gửi", icon: "zi-clock-1", to: "/" },
  { key: "sent", label: "Đã gửi", icon: "zi-check", to: "/sent" },
  { key: "people", label: "Khách", icon: "zi-user", to: "/people" },
  { key: "me", label: "Tài khoản", icon: "zi-admin", to: "/me" },
] as const;

export function Tabs({ tab }: { tab: (typeof TABS)[number]["key"] }) {
  return (
    <BottomNavigation fixed activeKey={tab}>
      {TABS.map((item) => (
        <BottomNavigation.Item key={item.key} itemKey={item.key} label={item.label} icon={<Icon icon={item.icon} />} linkTo={item.to} />
      ))}
    </BottomNavigation>
  );
}
