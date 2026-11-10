import { Toaster } from "sonner";

/** Global toast host (Sonner), styled to the brand palette. */
export function ToastNotification() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: "#25221F",
          color: "#F8F5EF",
          border: "1px solid #B99559",
          fontFamily: "'DM Sans', sans-serif",
        },
      }}
    />
  );
}
