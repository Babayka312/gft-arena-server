export type TelegramAdminPayload = {
  id: string;
  initData: string;
  user?: unknown;
};

export type CheckTelegramAdminOptions = {
  botToken: string;
  adminTelegramId: string;
  maxAgeSec?: number;
};

