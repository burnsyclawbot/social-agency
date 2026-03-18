interface CharCounterProps {
  current: number;
  limit: number;
}

export default function CharCounter({ current, limit }: CharCounterProps) {
  const percentage = (current / limit) * 100;
  const isOver = current > limit;
  const isWarning = percentage > 80 && !isOver;

  return (
    <span
      className={`text-xs font-mono ${
        isOver
          ? 'text-red-600 font-semibold'
          : isWarning
            ? 'text-amber-600'
            : 'text-soft-gray'
      }`}
    >
      {current}/{limit}
    </span>
  );
}
