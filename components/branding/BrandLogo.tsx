import Image from 'next/image';
import { APP_NAME } from '@/config/constants';

type BrandLogoProps = {
  mode?: 'full' | 'icon';
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

// 다크모드 토글 미지원(docs/DESIGN.md) — dark 로고 variant는 dead code라 제거.
const FULL_LOGO_SRC = '/icons/Coatly_Logo_Primary_Light.svg';

export function BrandLogo({
  mode = 'full',
  width,
  height,
  className,
  priority = false,
}: BrandLogoProps) {
  const src = mode === 'icon' ? '/icons/Coatly_Icon_512.svg' : FULL_LOGO_SRC;

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
