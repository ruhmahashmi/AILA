// app/components/WeekSelector.js
export default function WeekSelector({ totalWeeks = 10, selectedWeek, onSelect }) {
  return (
    <aside className="w-36 p-2 border-r h-full">
      <div className="font-semibold mb-2">Weeks</div>
      <ul className="space-y-2">
        {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(week => (
          <li key={week}>
            <button
              className={`w-full p-2 text-left rounded ${week === selectedWeek ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
              onClick={() => onSelect(week)}
            >Week {week}</button>
          </li>
        ))}
      </ul>
    </aside>
  );
}