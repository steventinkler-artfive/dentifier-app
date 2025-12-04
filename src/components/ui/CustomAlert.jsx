import React, { createContext, useContext, useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: "Notice",
    message: "",
    type: "alert", // "alert" or "confirm"
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = useCallback((message, title = "Notice") => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        title,
        message,
        type: "alert",
        onConfirm: () => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: null,
      });
    });
  }, []);

  const showConfirm = useCallback((message, title = "Confirm") => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        title,
        message,
        type: "confirm",
        onConfirm: () => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  }, []);

  const handleOpenChange = (open) => {
    if (!open) {
      if (alertState.type === "confirm" && alertState.onCancel) {
        alertState.onCancel();
      } else if (alertState.onConfirm) {
        alertState.onConfirm();
      }
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <AlertDialog open={alertState.isOpen} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">{alertState.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {alertState.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertState.type === "confirm" && (
              <AlertDialogCancel 
                onClick={alertState.onCancel}
                className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                Cancel
              </AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={alertState.onConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}