"use client";

import { Toaster } from "react-hot-toast";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";

// Montado no layout autenticado: fica ativo em qualquer tela da app.
export function TaskNotifications() {
  useTaskNotifications();
  return <Toaster position="top-right" />;
}
