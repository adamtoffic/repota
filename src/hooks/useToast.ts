import { toast } from "sonner";

export type ToastType = "success" | "error" | "info";

function showToast(
  message: string,
  type: ToastType = "success",
  action?: { label: string; onClick: () => void },
  toastOptions?: { duration?: number },
) {
  const options =
    action || toastOptions?.duration !== undefined
      ? {
          ...(action
            ? {
                action: {
                  label: action.label,
                  onClick: action.onClick,
                },
              }
            : {}),
          ...(toastOptions?.duration !== undefined ? { duration: toastOptions.duration } : {}),
        }
      : undefined;

  switch (type) {
    case "success":
      toast.success(message, options);
      break;
    case "error":
      toast.error(message, options);
      break;
    case "info":
      toast.info(message, options);
      break;
  }
}

const TOAST_API = { showToast };

export function useToast() {
  return TOAST_API;
}
