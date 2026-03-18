interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-warm-beige/50 bg-white gap-2">
      <div className="min-w-0">
        <h2 className="text-lg sm:text-xl font-semibold text-charcoal truncate">{title}</h2>
        {subtitle && <p className="text-xs sm:text-sm text-soft-gray mt-0.5 sm:mt-1 truncate">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
