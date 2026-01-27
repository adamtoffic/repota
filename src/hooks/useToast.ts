import { toast } from "sonner";

export type ToastType = "success" | "error" | "info";

export function useToast() {
  const showToast = (
    message: string,
    type: ToastType = "success",
    action?: { label: string; onClick: () => void },
  ) => {
    const options = action
      ? {
          action: {
            label: action.label,
            onClick: action.onClick,
          },
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
  };

  return { showToast };
}
