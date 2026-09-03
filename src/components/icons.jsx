// 统一描边图标系统：viewBox 24x24，stroke=currentColor，strokeWidth 1.6~1.8
// 取代 emoji，保证同一套线宽/风格在全应用一致

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
};

export function IconFolder(props) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6.5a1.5 1.5 0 0 1 1.5-1.5h4.4l1.8 2H19.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-11Z" />
    </svg>
  );
}

export function IconPlay(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 4.5v15l14-7.5-14-7.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconClose(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function IconCheck(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function IconSliders(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h13M21 18h-1" />
      <circle cx="13" cy="6" r="2" />
      <circle cx="7" cy="12" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  );
}

export function IconImage(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M3.5 17 9 12l3 3 4-4 4.5 4.5" />
    </svg>
  );
}

export function IconLayers(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" strokeLinejoin="round" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </svg>
  );
}

export function IconFilm(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M3 15h18M8 4v16M16 4v16" />
    </svg>
  );
}

export function IconEye(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconClipboard(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M8.5 10h7M8.5 14h7M8.5 18h4" />
    </svg>
  );
}

export function IconGear(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M4.6 6.6l1.8 1.8M17.6 15.6l1.8 1.8M3 12h2.5M18.5 12H21M4.6 17.4l1.8-1.8M17.6 8.4l1.8-1.8" />
    </svg>
  );
}

export function IconTrash(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconArrowRight(props) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}

export function IconChevronLeft(props) {
  return (
    <svg {...base} {...props}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

export function IconChevronRight(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconPause(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 5v14M16 5v14" />
    </svg>
  );
}

export function IconDownload(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v11M8 11l4 4 4-4M4 19h16" />
    </svg>
  );
}

export function IconInfo(props) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8v.01" />
    </svg>
  );
}

export function IconWindow(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <circle cx="6.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconSave(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 4h11l3 3v13H5V4Z" strokeLinejoin="round" />
      <path d="M8 4v5h8V4M8 14h8v6H8v-6Z" />
    </svg>
  );
}

export function IconRefresh(props) {
  return (
    <svg {...base} {...props}>
      <path d="M20 11a8 8 0 0 0-14.3-4.5M4 5v5h5" />
      <path d="M4 13a8 8 0 0 0 14.3 4.5M20 19v-5h-5" />
    </svg>
  );
}

export function IconPhoto(props) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="M3.5 16.5 9 11l3 3 4-4L20.5 14" />
    </svg>
  );
}

export function IconVideoCamera(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="6" width="13" height="12" rx="2" />
      <path d="M15.5 10.5 21 8v8l-5.5-2.5" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSkipBack(props) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6v12M18 12 7 6v12l11-6Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconSkipForward(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 6v12M6 12l11-6v12L6 12Z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChevronDown(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconChevronUp(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6 15l6-6 6 6" />
    </svg>
  );
}
