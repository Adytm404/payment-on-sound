import { Icon } from "./Icon";

type Props = {
  title: string;
  description?: string;
  icon?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon = "inbox",
  action,
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-3xl bg-white px-6 py-10 text-center shadow-soft ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-alt text-ink-muted">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-[280px] text-xs text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
