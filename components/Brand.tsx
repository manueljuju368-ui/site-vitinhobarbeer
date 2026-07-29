import Image from 'next/image';
import Link from 'next/link';

type BrandProps = {
  href?: string;
  label?: string;
  className?: string;
};

export function BrandMark({className = ''}: {className?: string}) {
  return (
    <Image
      className={className}
      src="/logo-vitinho-compact-v1.webp"
      alt=""
      width={64}
      height={64}
      sizes="64px"
      loading="eager"
    />
  );
}

export default function Brand({href = '#inicio', label = 'BARBER', className = ''}: BrandProps) {
  return (
    <Link className={`brand ${className}`.trim()} href={href}>
      <span className="brandmark" aria-hidden="true"><BrandMark /></span>
      <b>VITINHO</b>
      <small>{label}</small>
    </Link>
  );
}
