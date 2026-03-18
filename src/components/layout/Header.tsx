interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-6 border-b border-warm-beige/50 bg-white">
      <div>
        <h2 className="text-xl font-semibold text-charcoal">{title}</h2>
        {subtitle && <p className="text-sm text-soft-gray mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
