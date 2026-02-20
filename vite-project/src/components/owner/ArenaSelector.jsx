
const ArenaSelector = ({ arenas, selectedArena, onArenaChange }) => {
    if (!arenas || arenas.length <= 1) return null;

    return (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center">
                <div className="mr-3 text-blue-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
                <div className="flex-1">
                    <label htmlFor="arena-select" className="block text-xs font-medium text-blue-700 mb-1">
                        Currently Viewing:
                    </label>
                    <select
                        id="arena-select"
                        value={selectedArena?.arena_id || ''}
                        onChange={(e) => {
                            const arena = arenas.find(a => a.arena_id === parseInt(e.target.value));
                            onArenaChange(arena);
                        }}
                        className="w-full md:w-96 px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {arenas.map((arena) => (
                            <option key={arena.arena_id} value={arena.arena_id}>
                                {arena.name} • {arena.address?.substring(0, 30)}...
                            </option>
                        ))}
                    </select>
                </div>
                <div className="ml-3 text-xs text-blue-600 bg-white px-2 py-1 rounded">
                    {arenas.length} Total
                </div>
            </div>
        </div>
    );
};

export default ArenaSelector;