export type ToastType = 'success' | 'warning' | 'info' | 'error';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}
