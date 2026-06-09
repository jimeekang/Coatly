import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';

export function Table({ className = '', children, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-outline bg-white">
      <table
        className={['w-full text-left text-sm', className].filter(Boolean).join(' ')}
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
      className={['border-b border-outline bg-surface-container-low', className].filter(Boolean).join(' ')}
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
      className={['divide-y divide-outline', className].filter(Boolean).join(' ')}
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
      className={['transition-colors hover:bg-success-container', className].filter(Boolean).join(' ')}
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
        'px-5 py-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant',
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
      className={['px-5 py-4 text-on-surface', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </td>
  );
}
