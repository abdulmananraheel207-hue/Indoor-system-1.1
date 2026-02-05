import React, { useState, useEffect } from "react";
import { managerAPI } from "../../services/managerAPI";

const ManagerArenaSettings = ({ permissions }) => {
    const [arenas, setArenas] = useState([]);
    const [courts, setCourts] = useState([]);
    const [loading, setLoading] = useState(false);

    // Permission checks
    const canViewArena = permissions?.view_arena;
    const canManageArena = permissions?.manage_arena;

    // If no permission to view arena at all
    if (!canViewArena && !canManageArena) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-700">
                    ❌ You don't have permission to view arena settings.
                    Contact the arena owner to get access.
                </p>
            </div>
        );
    }

    useEffect(() => {
        fetchArenas();
    }, []);

    const fetchArenas = async () => {
        try {
            const response = await managerAPI.getArenas();
            setArenas(response.data || []);
        } catch (error) {
            console.error("Error fetching arenas:", error);
        }
    };

    const fetchCourts = async (arenaId) => {
        if (!canManageArena) return;

        try {
            const response = await managerAPI.getCourts(arenaId);
            setCourts(response.data || []);
        } catch (error) {
            console.error("Error fetching courts:", error);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-gray-900">
                    Arena Settings
                </h1>
                {!canManageArena && (
                    <span className="text-sm text-gray-500">
                        (View Only - Cannot edit)
                    </span>
                )}
            </div>

            {/* Arena list */}
            <div className="bg-white rounded-xl shadow p-6 mb-6">
                <h2 className="text-lg font-medium mb-4">Arenas</h2>
                <div className="space-y-3">
                    {arenas.map((arena) => (
                        <div key={arena.arena_id} className="border rounded-lg p-4">
                            <h3 className="font-medium">{arena.name}</h3>
                            <p className="text-sm text-gray-600">{arena.address}</p>
                            <p className="text-sm text-gray-600">
                                Bookings: {arena.total_bookings || 0}
                            </p>

                            {canManageArena && (
                                <button
                                    onClick={() => fetchCourts(arena.arena_id)}
                                    className="mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                                >
                                    View Courts
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Courts section - only if can manage arena */}
            {canManageArena && courts.length > 0 && (
                <div className="bg-white rounded-xl shadow p-6">
                    <h2 className="text-lg font-medium mb-4">Courts</h2>
                    <div className="space-y-3">
                        {courts.map((court) => (
                            <div key={court.court_id} className="border rounded-lg p-4">
                                <h3 className="font-medium">{court.court_name}</h3>
                                <p className="text-sm text-gray-600">
                                    Size: {court.size_sqft} sq ft
                                </p>
                                <p className="text-sm text-gray-600">
                                    Price: Rs{court.price_per_hour}/hour
                                </p>
                                {court.sports_names && (
                                    <p className="text-sm text-gray-600">
                                        Sports: {court.sports_names}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerArenaSettings;