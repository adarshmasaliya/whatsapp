export interface Rule {
  id: string;
  keyword: string;
  reply: string;
  imageUrl?: string;
}

export interface Log {
  id: string;
  time: string;
  to: string;
  msg: string;
  reply: string;
  hasImage?: boolean;
}

export interface Status {
  connected: boolean;
  qr: string | null;
}

export interface MenuOption {
  id: string;
  label: string;
  action: 'text' | 'info' | 'booking' | 'submenu' | 'support';
  value?: string;
}

export interface Menu {
  id: string;
  name: string;
  trigger: string;
  text: string;
  options: MenuOption[];
  enabled: boolean;
  isRoot: boolean;
}

export interface Booking {
  id: string;
  phone: string;
  date: string;
  time: string;
  userId: string;
  createdAt: string;
}

export interface Message {
  id: string;
  from: string;
  text: string;
  time: string;
  fromMe: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}
