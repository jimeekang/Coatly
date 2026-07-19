import { type HTMLAttributes } from 'react';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
}

const PADDING: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({
  padding = 'md',
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'border-outline-variant bg-surface-container-lowest rounded-2xl border',
        PADDING[padding],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={[
        'border-outline-variant flex items-center justify-between border-b pb-3',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={['text-on-surface text-base font-semibold', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardBody({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={['pt-3', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}
