import {
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';

export function Table({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="border-outline-variant bg-surface-container-lowest overflow-x-auto rounded-2xl border">
      <table
        className={['w-full text-left text-sm', className]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={[
        'border-outline-variant bg-surface-container-low border-b',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody
      className={['divide-outline-variant divide-y', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </tbody>
  );
}

export function TableRow({
  className = '',
  children,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={['hover:bg-surface-container-low transition-colors', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </tr>
  );
}

export function Th({
  className = '',
  children,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={[
        'text-on-surface-variant px-5 py-3 text-xs font-semibold tracking-wide uppercase',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </th>
  );
}

export function Td({
  className = '',
  children,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={['text-on-surface px-5 py-4', className]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </td>
  );
}
