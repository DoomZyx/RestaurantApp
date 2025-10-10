import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { fr } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./AppointmentsCalendar.scss";

// Configuration date-fns en français
const localizer = dateFnsLocalizer({
  format: (date, formatStr) => format(date, formatStr, { locale: fr }),
  parse: (dateStr, formatStr) => parse(dateStr, formatStr, new Date(), { locale: fr }),
  startOfWeek: (date) => startOfWeek(date, { locale: fr }),
  getDay,
  locales: {
    fr: fr,
  },
});

// Messages en français pour le calendrier
const messages = {
  allDay: "Toute la journée",
  previous: "‹",
  next: "›",
  today: "Aujourd'hui",
  month: "Mois",
  week: "Semaine",
  day: "Jour",
  agenda: "Agenda",
  date: "Date",
  time: "Heure",
  event: "Rendez-vous",
  noEventsInRange: "Aucun rendez-vous dans cette période",
  showMore: (total) => `+ ${total} de plus`,
};

function AppointmentsCalendar({
  appointments,
  onSelectAppointment,
  onSelectSlot,
}) {
  // Transformer les rendez-vous en événements pour le calendrier
  const events = appointments.map((appointment) => {
    const [hours, minutes] = appointment.heure.split(":");
    const startDate = new Date(appointment.date);
    startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const endDate = new Date(startDate);
    endDate.setMinutes(startDate.getMinutes() + appointment.duree);

    return {
      id: appointment._id,
      title: `${appointment.client?.prenom} ${appointment.client?.nom} - ${appointment.type}`,
      start: startDate,
      end: endDate,
      resource: appointment,
      // Style selon le statut
      className: getEventClass(appointment.statut),
    };
  });

  // Classes CSS selon le statut
  function getEventClass(statut) {
    const classes = {
      confirme: "event-confirmed",
      en_cours: "event-in-progress",
      termine: "event-completed",
      annule: "event-cancelled",
      reporte: "event-postponed",
      planifie: "event-planned",
    };
    return classes[statut] || "event-planned";
  }

  // Style des événements
  const eventStyleGetter = (event) => {
    let backgroundColor = "#7cfc00";
    let borderColor = "#7cfc00";
    let color = "#000";

    switch (event.resource.statut) {
      case "confirme":
        backgroundColor = "#7cfc00";
        borderColor = "#32cd32";
        color = "#000";
        break;
      case "en_cours":
        backgroundColor = "#ffa500";
        borderColor = "#ff8c00";
        color = "#000";
        break;
      case "termine":
        backgroundColor = "#32cd32";
        borderColor = "#228b22";
        color = "#000";
        break;
      case "annule":
        backgroundColor = "#ff6b6b";
        borderColor = "#ff5252";
        color = "#fff";
        break;
      case "reporte":
        backgroundColor = "#9e9e9e";
        borderColor = "#757575";
        color = "#fff";
        break;
      default:
        backgroundColor = "#2196f3";
        borderColor = "#1976d2";
        color = "#fff";
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color,
        border: `2px solid ${borderColor}`,
        borderRadius: "4px",
        fontSize: "0.85rem",
        fontWeight: "500",
      },
    };
  };

  // Gestion du clic sur un événement
  const handleSelectEvent = (event) => {
    if (onSelectAppointment) {
      onSelectAppointment(event.resource);
    }
  };

  // Gestion du clic sur un créneau vide
  const handleSelectSlot = (slotInfo) => {
    if (onSelectSlot) {
      onSelectSlot({
        start: slotInfo.start,
        end: slotInfo.end,
        date: format(slotInfo.start, "yyyy-MM-dd"),
        time: format(slotInfo.start, "HH:mm"),
      });
    }
  };

  return (
    <div className="appointments-calendar">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        messages={messages}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        eventPropGetter={eventStyleGetter}
        style={{ height: 600 }}
        views={["month", "week", "day", "agenda"]}
        defaultView="month"
        step={30}
        timeslots={2}
        min={new Date(2023, 0, 1, 8, 0)} // 8h00
        max={new Date(2023, 0, 1, 19, 0)} // 19h00
        formats={{
          timeGutterFormat: "HH:mm",
          eventTimeRangeFormat: ({ start, end }) =>
            `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
          agendaTimeFormat: "HH:mm",
          agendaDateFormat: "eeee dd MMMM yyyy",
          dayHeaderFormat: "eeee dd MMMM yyyy",
          dayRangeHeaderFormat: ({ start, end }) =>
            `${format(start, "dd MMM")} - ${format(end, "dd MMM yyyy")}`,
          monthHeaderFormat: "MMMM yyyy",
          weekdayFormat: "eeee",
        }}
        popup
        popupOffset={30}
      />
    </div>
  );
}

export default AppointmentsCalendar;
