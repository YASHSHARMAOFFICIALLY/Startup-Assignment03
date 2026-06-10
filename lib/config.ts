/** App-wide configuration. Override via environment variables. */
export const APP_CONFIG = {
  userName: process.env.NEXT_PUBLIC_USER_NAME ?? "User",
  userAvatar: process.env.NEXT_PUBLIC_USER_AVATAR ?? "https://i.pravatar.cc/40?img=11",
} as const;
