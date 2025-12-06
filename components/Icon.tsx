import Image from "next/image";

type IconProps = {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
};

/**
 * Icon component for displaying icons from public/icons/
 * Usage: <Icon name="profile" size={24} />
 */
export default function Icon({ name, size = 24, className = "", alt }: IconProps) {
  const iconPath = `/icons/${name}.png`;
  
  return (
    <Image
      src={iconPath}
      alt={alt || name}
      width={size}
      height={size}
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle" }}
      unoptimized
    />
  );
}

/**
 * Illustration component for displaying illustrations from public/images/
 * Usage: <Illustration name="pregnant-woman" width={400} height={400} />
 */
type IllustrationProps = {
  name: string;
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
};

export function Illustration({ name, width = 400, height = 400, className = "", alt }: IllustrationProps) {
  const imagePath = `/images/${name}.gif`;
  
  return (
    <Image
      src={imagePath}
      alt={alt || name}
      width={width}
      height={height}
      className={className}
      style={{ display: "inline-block" }}
      unoptimized
    />
  );
}

