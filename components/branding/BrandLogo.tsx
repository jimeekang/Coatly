import Image from 'next/image';
import { APP_NAME } from '@/config/constants';

type BrandLogoProps = {
  variant?: 'light' | 'dark';
  mode?: 'full' | 'icon';
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

const FULL_LOGO_SRC = {
  light: '/icons/Coatly_Logo_Primary_Light.svg',
  dark: '/icons/Coatly_Logo_Primary_Dark.svg',
} as const;

export function BrandLogo({
  variant = 'light',
  mode = 'full',
  width,
  height,
  className,
  priority = false,
}: BrandLogoProps) {
  const src =
    mode === 'icon' ? '/icons/Coatly_Icon_512.svg' : FULL_LOGO_SRC[variant];

  const resolvedWidth = width ?? (mode === 'icon' ? 40 : 160);
  const resolvedHeight = height ?? (mode === 'icon' ? 40 : 36);

  return (
    <Image
      src={src}
      alt={mode === 'icon' ? `${APP_NAME} icon` : `${APP_NAME} logo`}
      width={resolvedWidth}
      height={resolvedHeight}
      priority={priority}
      className={className}
    />
  );
}
