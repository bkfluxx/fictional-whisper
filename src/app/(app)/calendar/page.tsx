import { redirect } from "next/navigation";

// Calendar is now the timeline view on the journal home page.
export default function CalendarPage() {
  redirect("/journal");
}
