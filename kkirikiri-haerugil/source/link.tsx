import type { AnchorHTMLAttributes } from "react";
const BASE = "/richdisk/kkirikiri-haerugil";
export default function Link({href = "", ...props}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const path = href.startsWith("/") && !href.startsWith("//") && href !== BASE && !href.startsWith(BASE + "/") ? BASE + (href.startsWith("/calendar?") ? href.replace("/calendar?", "/calendar/?") : href) : href;
  return <a href={path} {...props}/>;
}
