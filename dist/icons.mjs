  const paths = {
    cup:'<path d="M4 9h12v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z"/><path d="M16 10h2a3 3 0 0 1 0 6h-2M7 3v2m4-2v2m4-2v2"/>',
    home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
    card:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back:'<path d="m14 6-6 6 6 6"/>',
    x:'<path d="m6 6 12 12M18 6 6 18"/>',
    pin:'<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    time:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/>',
    queue:'<path d="M9 6h11M9 12h11M9 18h11M3 6h1M3 12h1M3 18h1"/>',
    leaf:'<path d="M20 3C4 2 2 12 7 17s15 3 13-14ZM4 21 16 9"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
    reset:'<path d="M3 10a9 9 0 1 1 1 8M3 4v6h6"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3" fill="currentColor"/><circle cx="16" cy="17" r="3" fill="currentColor"/>'
  };
  export const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.cup}</svg>`;
  export function art() {return `<svg class="coffee-art" viewBox="0 0 300 170" fill="none" aria-hidden="true"><ellipse cx="164" cy="141" rx="91" ry="10" fill="#d8d0ba" opacity=".6"/><path d="M83 135c23 14 125 14 151-1" stroke="#b39d72" stroke-width="2"/><path d="M105 64h102l-8 58c-3 23-83 23-86 0l-8-58Z" fill="#fcf9ee" stroke="#afa188" stroke-width="1.5"/><path d="M207 73h11c27 0 28 34-7 35h-10" stroke="#fcf9ee" stroke-width="13"/><path d="M207 73h11c27 0 28 34-7 35h-10" stroke="#afa188" stroke-width="1.5"/><ellipse cx="156" cy="64" rx="51" ry="10" fill="#ded1b6" stroke="#afa188" stroke-width="1.5"/><ellipse cx="156" cy="64" rx="44" ry="6" fill="#45362a"/><path d="M133 20c-12 12 9 15 0 29m23-37c-13 14 12 18 0 33m24-25c-12 12 9 15 0 29" stroke="#ae9165" stroke-width="2" stroke-linecap="round"/><path d="M133 92h46m-23-12v24m-12-20 24 16m0-16-24 16" stroke="#b7a177" stroke-width="1.3"/><path d="m74 44 2-5m-9 10-5 1m167-14 4-5m-1 14 7 1" stroke="#c09e62" stroke-width="2" stroke-linecap="round"/></svg>`;}
