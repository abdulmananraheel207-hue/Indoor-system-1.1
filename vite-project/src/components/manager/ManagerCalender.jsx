// components/manager/ManagerCalendar.jsx
import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ManagerCalendar = ({ arenas = [], permissions = {} }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedArena, setSelectedArena] = useState("");
    const [timeSlots, setTimeSlots] = useState([]);
    const [loading, setLoading] = useState(false);

    const canManageCalendar = permissions.manage_calendar;

    useEffect(() => {
        if (arenas.length > 0 && !selectedArena) {
            setSelectedArena(arenas[0].arena_id);
        }
    }, [arenas]);

    useEffect(() => {
        if (selectedArena) {
            fetchTimeSlots();
        }
    }, [selectedDate, selectedArena]);

    const fetchTimeSlots = async () => {
        try {
            const token = localStorage.getItem("token");
            const dateStr = selectedDate.toISOString().split("T")[0];
            const response = await fetch(
                `http://localhost:5000/api/managers/arenas/slots?arena_id=${selectedArena}&date=${dateStr}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const data = await response.json();
            if (response.ok) {
                setTimeSlots(data);
            }
        } catch (error) {
            console.error("Error fetching time slots:", error);
        }
    };

    const handleUpdateSlot = async (slotId, updates) => {
        if (!canManageCalendar) {
            alert("You don't have permission to manage calendar");
            return;
        }

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `http://localhost:5000/api/managers/arenas/${selectedArena}/slots`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        date: selectedDate.toISOString().split("T")[0],
                        slots: [{
                            ...updates,
                            slot_id: slotId
                        }]
                    }),
                }
            );

            if (response.ok) {
                alert("Time slot updated successfully");
                fetchTimeSlots();
            } else {
                const data = await response.json();
                alert(data.message || "Failed to update time slot");
            }
        } catch (error) {
            console.error("Error updating time slot:", error);
            alert("An error occurred");
        }
    };

    const formatDate = (date) => {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <div>
            <h1 className="text-xl font-bold text-gray-900 mb-4 md:text-2xl md:mb-6">
                Calendar & Time Slots
            </h1>

            {/* Arena Selection and Date Picker */}
            <div className="bg-white p-4 rounded-xl shadow mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Arena
                        </label>
                        <select
                            value={selectedArena}
                            onChange={(e) => setSelectedArena(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select an arena</option>
                            {arenas.map((arena) => (
                                <option key={arena.arena_id} value={arena.arena_id}>
                                    {arena.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Date
                        </label>
                        <DatePicker
                            selected={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            dateFormat="yyyy-MM-dd"
                            minDate={new Date()}
                        />
                    </div>
                </div>
            </div>

            {/* Time Slots Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="text-lg font-medium text-gray-900">
                        Time Slots for {formatDate(selectedDate)}
                    </h2>
                    <p className="text-sm text-gray-600">
                        {!canManageCalendar && "View-only mode - Contact owner for changes"}
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Time Slot
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Price (₹)
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {timeSlots.map((slot) => (
                                <tr key={slot.slot_id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-gray-900">
                                            {slot.start_time} - {slot.end_time}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-900">
                                            ₹{slot.price}/hour
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${slot.is_blocked_by_owner
                                                    ? "bg-red-100 text-red-800"
                                                    : slot.is_holiday
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : slot.is_available
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                }`}
                                        >
                                            {slot.is_blocked_by_owner
                                                ? "Blocked"
                                                : slot.is_holiday
                                                    ? "Holiday"
                                                    : slot.is_available
                                                        ? "Available"
                                                        : "Booked"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {canManageCalendar && (
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() => handleUpdateSlot(slot.slot_id, {
                                                        start_time: slot.start_time,
                                                        end_time: slot.end_time,
                                                        price: slot.price,
                                                        is_blocked: !slot.is_blocked_by_owner,
                                                        is_holiday: slot.is_holiday
                                                    })}
                                                    className={`px-3 py-1 text-xs rounded ${slot.is_blocked_by_owner
                                                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                                        }`}
                                                >
                                                    {slot.is_blocked_by_owner ? "Unblock" : "Block"}
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManagerCalendar;