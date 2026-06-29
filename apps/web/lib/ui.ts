// Yengil toast + dialog (confirm/prompt) tizimi — native alert/confirm o'rniga.
// Modul darajasidagi event bus; <Toaster/> layout'da ulanadi.

export type ToastType = "success" | "error" | "info";
export type ToastMsg = { id: number; text: string; type: ToastType };
export type DialogReq = {
  id: number;
  kind: "confirm" | "prompt";
  text: string;
  defaultValue?: string;
  resolve: (v: boolean | string | null) => void;
};

let counter = 0;
const toastSubs = new Set<(t: ToastMsg) => void>();
const dialogSubs = new Set<(d: DialogReq) => void>();

export function subscribeToast(fn: (t: ToastMsg) => void) {
  toastSubs.add(fn);
  return () => {
    toastSubs.delete(fn);
  };
}
export function subscribeDialog(fn: (d: DialogReq) => void) {
  dialogSubs.add(fn);
  return () => {
    dialogSubs.delete(fn);
  };
}

export function toast(text: string, type: ToastType = "success") {
  const t: ToastMsg = { id: ++counter, text, type };
  toastSubs.forEach((fn) => fn(t));
}

export function confirmDialog(text: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    dialogSubs.forEach((fn) =>
      fn({
        id: ++counter,
        kind: "confirm",
        text,
        resolve: (v) => resolve(v === true),
      }),
    );
  });
}

export function promptDialog(
  text: string,
  defaultValue = "",
): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    dialogSubs.forEach((fn) =>
      fn({
        id: ++counter,
        kind: "prompt",
        text,
        defaultValue,
        resolve: (v) => resolve(typeof v === "string" ? v : null),
      }),
    );
  });
}
