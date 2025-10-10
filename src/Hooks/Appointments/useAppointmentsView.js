import { useState } from "react";

export function useAppointmentsView() {
  const [viewMode, setViewMode] = useState("list"); // "list" ou "calendar"

  const switchToList = () => {
    setViewMode("list");
  };

  const switchToCalendar = () => {
    setViewMode("calendar");
  };

  const toggleView = () => {
    setViewMode(prev => prev === "list" ? "calendar" : "list");
  };

  const isListView = viewMode === "list";
  const isCalendarView = viewMode === "calendar";

  return {
    viewMode,
    setViewMode,
    switchToList,
    switchToCalendar,
    toggleView,
    isListView,
    isCalendarView,
  };
}
