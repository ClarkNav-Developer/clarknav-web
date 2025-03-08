declare module 'toastr' {
    export interface ToastrOptions {
      closeButton?: boolean;
      debug?: boolean;
      newestOnTop?: boolean;
      progressBar?: boolean;
      positionClass?: string;
      preventDuplicates?: boolean;
      onclick?: () => void;
      showDuration?: number;
      hideDuration?: number;
      timeOut?: number;
      extendedTimeOut?: number;
      showEasing?: string;
      hideEasing?: string;
      showMethod?: string;
      hideMethod?: string;
    }
  
    export function clear(): void;
    export function error(message: string, title?: string, options?: ToastrOptions): void;
    export function info(message: string, title?: string, options?: ToastrOptions): void;
    export function success(message: string, title?: string, options?: ToastrOptions): void;
    export function warning(message: string, title?: string, options?: ToastrOptions): void;
    export function remove(): void;
    export function options(options: ToastrOptions): void;
  }