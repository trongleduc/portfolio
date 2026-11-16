import type { ImgHTMLAttributes } from "react";

/**
 * Plain <img> for CMS images (Supabase Storage URLs of unknown size), which
 * next/image cannot size or optimise without a remote-pattern config.
 */
export function Img({ alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} {...props} />;
}
