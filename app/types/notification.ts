// Notificación de producto por vencer
export type ExpiringProductNotification = {
  id: string;
  product_id: string;
  batch_id?: string | null;
  product_name: string;
  batch_number?: string | null;
  barcode?: string | null;
  expiration_date: string;  // DATE
  days_until_expiration: number;
  type: 'producto' | 'lote';
  quantity: number;
  unit_of_measure?: string | null;
  notification_status: 'pending' | 'read' | 'dismissed';
  severity: 'critical' | 'warning' | 'info';  // critical: <=7 días, warning: <=30 días, info: >30 días
  notification_message: string;
  created_at: string;
  read_at?: string | null;
  dismissed_at?: string | null;
};

// Contexto de notificación para pasar a modales
export type NotificationContext = {
  fromNotification: boolean;
  highlightedBatchId?: string | null;
};

// Respuesta de la API de notificaciones
export type NotificationsResponse = {
  notifications: ExpiringProductNotification[];
  unreadCount: number;
  criticalCount: number;
};

// Payload para marcar como leído/descartado
export type NotificationAction = {
  notificationId: string;
  action: 'read' | 'dismiss';
};
