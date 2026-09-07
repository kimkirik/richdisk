type SpeciesIconProps = {
  name: string;
  className?: string;
};

function SpeciesDrawing({ name }: { name: string }) {
  switch (name) {
    case "낙지":
      return <>
        <ellipse cx="24" cy="15" rx="7" ry="9" fill="#b85b55" />
        <circle cx="21.5" cy="14" r="1.2" fill="#fff" stroke="none" /><circle cx="26.5" cy="14" r="1.2" fill="#fff" stroke="none" />
        <path d="M19 22c-4 5-7 9-10 12m12-11c-2 6-3 10-5 15m8-15v16m3-16c2 6 2 10 5 14m-1-15c4 5 5 9 9 11" fill="none" />
        <path d="M9 34c2 2 4 2 5 0m2 4c2 1 4 0 5-2m3 3c2 0 3-1 3-3m5 1c2 0 3-2 2-4m6 0c-1 2-3 3-5 2" fill="none" />
      </>;
    case "주꾸미":
      return <>
        <path d="M16 17c0-7 3-11 8-11s8 4 8 11c0 5-3 8-8 8s-8-3-8-8Z" fill="#a56bc1" />
        <circle cx="21" cy="16" r="1.3" fill="#fff" stroke="none" /><circle cx="27" cy="16" r="1.3" fill="#fff" stroke="none" />
        <path d="M18 23c-5 4-6 8-2 11 2 2 5 0 4-3m2-7c-3 7-1 12 3 11 3-1 2-4 1-5m3-7c5 4 7 8 4 11-2 2-5 1-5-2" fill="none" />
      </>;
    case "참문어":
      return <>
        <path d="M14 17c0-8 4-12 10-12s10 4 10 12c0 7-4 10-10 10S14 24 14 17Z" fill="#c85f55" />
        <circle cx="20.5" cy="16" r="1.4" fill="#fff" stroke="none" /><circle cx="27.5" cy="16" r="1.4" fill="#fff" stroke="none" />
        <path d="M17 24C8 28 8 39 15 39c4 0 5-5 2-6m4-7c-4 8-2 14 3 14s5-6 1-8m5-7c9 4 11 12 5 15-4 2-7-2-5-5m-2-8c6 7 3 14-2 12" fill="none" strokeWidth="2.2" />
      </>;
    case "꽃게":
      return <>
        <path d="M15 19c2-5 16-5 18 0l-2 10c-4 3-10 3-14 0Z" fill="#4e91b7" />
        <circle cx="19" cy="18" r="1.5" fill="#fff" stroke="none" /><circle cx="29" cy="18" r="1.5" fill="#fff" stroke="none" />
        <path d="M16 20 9 16l-4 4 4 4 4-2m20-2 6-4 4 4-4 4-4-2M16 25l-7 4m8-1-5 7m20-10 7 4m-8-1 5 7" fill="none" strokeWidth="2" />
      </>;
    case "소라":
      return <>
        <path d="M14 34 21 7l14 27Z" fill="#d79253" />
        <path d="M20 14h8m-10 7h13m-15 7h18" fill="none" stroke="#fff3d5" />
        <path d="M14 34c5-3 16-3 21 0-4 7-17 7-21 0Z" fill="#f0b56f" />
        <path d="M20 34c1-5 9-5 10 0-1 4-8 5-10 0Z" fill="#7e503f" />
      </>;
    case "골뱅이":
      return <>
        <path d="M10 29c0-10 7-17 17-17 8 0 13 5 13 12 0 9-8 15-18 15-7 0-12-4-12-10Z" fill="#c68a56" />
        <path d="M31 24c0-5-7-6-9-2-3 5 4 9 8 5 3-3 0-8-5-8" fill="none" stroke="#fff0ce" strokeWidth="2" />
        <path d="M13 32c5-2 10 0 13 6" fill="none" />
      </>;
    case "해삼":
      return <>
        <path d="M8 25c0-7 7-12 17-12 9 0 15 4 15 11s-6 11-16 11S8 32 8 25Z" fill="#7f9060" />
        <path d="m14 15-1-4m8 2-1-5m8 5 1-5m6 8 3-3M14 34l-1 4m9-3v5m8-6 2 4m6-9 4 1" fill="none" stroke="#6e6f47" />
        <circle cx="17" cy="23" r="1.3" fill="#d6c986" stroke="none" /><circle cx="25" cy="29" r="1.3" fill="#d6c986" stroke="none" /><circle cx="32" cy="21" r="1.3" fill="#d6c986" stroke="none" />
      </>;
    case "광어":
      return <>
        <path d="M7 25c5-10 18-14 28-8 5 3 6 8 2 13-7 8-23 8-30-5Z" fill="#ad8b63" />
        <path d="m36 22 8-6-1 10 1 7-8-4" fill="#9a7757" />
        <circle cx="16" cy="21" r="1.6" fill="#2c3c3a" stroke="none" /><circle cx="20" cy="19" r="1.4" fill="#2c3c3a" stroke="none" />
        <circle cx="25" cy="25" r="1" fill="#7e6147" stroke="none" /><circle cx="30" cy="21" r="1" fill="#7e6147" stroke="none" />
      </>;
    case "우럭":
      return <>
        <path d="M8 25c5-9 19-12 29-4v8c-10 8-24 5-29-4Z" fill="#536d72" />
        <path d="m36 22 8-7-1 10 1 9-8-6M17 17l2-6 3 5 3-7 3 7 4-5 1 7" fill="#455d63" />
        <circle cx="15" cy="23" r="1.7" fill="#eef4ef" stroke="none" />
        <path d="M18 29c5 2 10 2 15-1" fill="none" stroke="#9fb5b0" />
      </>;
    case "농어":
      return <>
        <path d="M5 24c7-8 24-9 34-2v6c-11 7-28 5-34-4Z" fill="#8eafb0" />
        <path d="m38 22 7-6-1 8 1 8-7-5M15 18l3-5 4 5 4-5 4 6" fill="#77999a" />
        <circle cx="12" cy="22" r="1.5" fill="#233a3d" stroke="none" />
        <path d="M10 27c9 1 18 1 27-1" fill="none" stroke="#e5d7a2" strokeWidth="1.7" />
      </>;
    case "숭어":
      return <>
        <path d="M6 24c8-7 24-7 33-1v5c-10 6-26 5-33-4Z" fill="#aebfc1" />
        <path d="m38 23 7-7-1 8 1 8-7-5" fill="#89a5aa" />
        <circle cx="13" cy="22" r="1.5" fill="#30474b" stroke="none" />
        <path d="M10 27h27M19 19l4-4 4 4 4-3 3 4" fill="none" stroke="#6e8d91" />
      </>;
    case "대하":
      return <>
        <path d="M11 28c4-12 19-17 28-8-1 11-11 17-22 14" fill="none" stroke="#df806e" strokeWidth="5" />
        <path d="M17 21l4 11m2-15 4 12m2-14 3 10" fill="none" stroke="#ffd0b5" />
        <circle cx="37" cy="20" r="1.6" fill="#273a3c" stroke="none" />
        <path d="M38 19c4-6 6-7 8-8m-8 10c5-2 7-2 9-1M13 29 5 23m8 6-5 8m22-7 2 7m-8-4-1 7" fill="none" />
      </>;
    case "새우":
      return <>
        <path d="M13 17c8-5 20 0 21 9 0 7-7 12-15 10-6-1-9-5-7-9 2-3 6-2 7 1" fill="none" stroke="#e99a57" strokeWidth="4.5" />
        <path d="M18 15v7m6-7-2 9m8-6-5 9" fill="none" stroke="#ffe0b3" />
        <circle cx="14" cy="16" r="1.6" fill="#263a3c" stroke="none" />
        <path d="M13 15 6 8m7 9-9-2m29 11 8-4m-8 5 7 4" fill="none" />
      </>;
    case "맛조개":
      return <>
        <path d="M12 10c4-2 8-1 10 2l13 25c-4 3-8 3-11 0L11 13Z" fill="#e8c18f" />
        <path d="M18 10c4-1 7 0 9 4l10 22c-1 2-3 3-5 3" fill="#f2d5aa" />
        <path d="m16 18 9-4m-6 10 9-4m-6 10 9-4m-6 10 9-4" fill="none" stroke="#bc8c5e" />
      </>;
    case "동죽":
      return <>
        <path d="M8 31c1-13 7-22 16-22s15 9 16 22c-7 9-25 9-32 0Z" fill="#d3a46d" />
        <path d="M11 27c8 4 18 4 26 0M14 20c6 3 14 3 20 0M18 14c4 2 8 2 12 0" fill="none" stroke="#f5dbb1" />
      </>;
    case "바지락":
      return <>
        <path d="M7 30C9 16 15 9 24 9s15 7 17 21c-6 10-28 10-34 0Z" fill="#9b9aa7" />
        <path d="M24 10v27M19 12l2 25M29 12l-2 25M14 16l5 20M34 16l-5 20M10 22l7 13M38 22l-7 13" fill="none" stroke="#d8d2dc" />
        <path d="M12 28c7 3 17 3 24 0" fill="none" stroke="#7d7185" />
      </>;
    case "백합":
      return <>
        <path d="M7 31C9 17 16 9 24 9s15 8 17 22c-7 10-27 10-34 0Z" fill="#fff8e6" stroke="#c99b47" strokeWidth="1.8" />
        <path d="M24 10v27M18 12l4 25M30 12l-4 25M13 17l7 20M35 17l-7 20M9 24l9 12M39 24l-9 12" fill="none" stroke="#e5c77e" />
        <path d="M9 31c8 3 22 3 30 0" fill="none" stroke="#c99b47" />
      </>;
    default:
      return <path d="M7 25c6-9 22-10 33-2v5c-11 8-27 6-33-3Zm32-2 7-6-1 8 1 8-7-5Z" fill="#6f9fa3" />;
  }
}

export function SpeciesIcon({ name, className = "" }: SpeciesIconProps) {
  return (
    <span className={`species-illustration ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 48 48" focusable="false">
        <g stroke="#334b4c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <SpeciesDrawing name={name} />
        </g>
      </svg>
    </span>
  );
}
