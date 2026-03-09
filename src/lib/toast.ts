import { toast } from "sonner";

export const notify = {
  success(title: string, description?: string) {
    toast.success(title, { description });
  },

  error(title: string, description?: string) {
    toast.error(title, { description });
  },

  info(title: string, description?: string) {
    toast(title, { description });
  },

  loading(title: string, description?: string) {
    return toast.loading(title, { description });
  },

  dismiss: toast.dismiss,

  promise: toast.promise,
};
