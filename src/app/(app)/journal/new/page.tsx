import EntryForm from "@/components/entries/EntryForm";

export default async function NewEntryPage() {
  return (
    <div className="h-full flex flex-col">
      <EntryForm />
    </div>
  );
}
