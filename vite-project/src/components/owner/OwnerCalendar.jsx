import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Receive arenas as a prop from OwnerDashboard
const OwnerCalendar = ({ arenas = [] }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  // Removed internal 'arenas' state and fetchArenas useEffect/function
  const [selectedArena, setSelectedArena] = useState("");
  const [timeSlots, setTimeSlots] = useState([]);
  const [newSlots, setNewSlots] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isHoliday, setIsHoliday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Time slot templates
  const timeSlotTemplates = [
    { start: "06:00", end: "08:00" },
    { start: "08:00", end: "10:00" },
    { start: "10:00", end: "12:00" },
    { start: "12:00", end: "14:00" },
    { start: "14:00", end: "16:00" },
    { start: "16:00", end: "18:00" },
    { start: "18:00", end: "20:00" },
    { start: "20:00", end: "22:00" },
    { start: "22:00", end: "00:00" },
  ];

  // FIX: Initialize selectedArena from the prop list
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

  // Removed fetchArenas

  const fetchTimeSlots = async () => {
    try {
      const token = localStorage.getItem("token");
      const dateStr = selectedDate.toISOString().split("T")[0];
      const response = await fetch(
        `http://localhost:5000/api/owners/arenas/${selectedArena}/slots?date=${dateStr}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setTimeSlots(data);

        // FIX: Initialize new slots more robustly against existing slots
        const formattedDate = selectedDate.toISOString().split("T")[0];
        const arenaBasePrice =
          arenas.find((a) => a.arena_id == selectedArena)
            ?.base_price_per_hour || 500;

        const slots = timeSlotTemplates.map((template) => {
          // Find existing slot data to pre-populate current status
          const existingSlot = data.find(
            (ts) =>
              ts.start_time === template.start && ts.end_time === template.end
          );

          return {
            date: formattedDate,
            start_time: template.start,
            end_time: template.end,
            price: existingSlot?.price || arenaBasePrice,
            is_blocked: existingSlot?.is_blocked_by_owner || false,
            is_holiday: existingSlot?.is_holiday || false,
            slot_id: existingSlot?.slot_id, // Include slot_id if exists for updating
          };
        });

        setNewSlots(slots);
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
    }
  };

  const handleSlotChange = (index, field, value) => {
    const updatedSlots = [...newSlots];
    if (field === "price") {
      updatedSlots[index].price = parseInt(value) || 0;
    } else if (field === "is_blocked") {
      updatedSlots[index].is_blocked = value;
    } else if (field === "is_holiday") {
      updatedSlots[index].is_holiday = value;
    }
    setNewSlots(updatedSlots);
  };

  const handleApplyToAll = (field, value) => {
    const updatedSlots = newSlots.map((slot) => ({
      ...slot,
      [field]: value,
    }));
    setNewSlots(updatedSlots);
  };

  const handleSaveSlots = async () => {
    if (!selectedArena) {
      alert("Please select an arena first");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const dateStr = selectedDate.toISOString().split("T")[0];

      // Filter slots that have changes or are marked as blocked/holiday
      const arenaBasePrice =
        arenas.find((a) => a.arena_id == selectedArena)?.base_price_per_hour ||
        500;

      const slotsToSave = newSlots.map((slot) => ({
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        price: slot.price || arenaBasePrice,
        is_blocked: slot.is_blocked,
        is_holiday: slot.is_holiday,
      }));

      const payload = {
        date: dateStr,
        slots: slotsToSave,
        is_blocked: isBlocked,
        is_holiday: isHoliday,
      };

      const response = await fetch(
        `http://localhost:5000/api/owners/arenas/${selectedArena}/slots`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        setSuccessMessage("Time slots updated successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchTimeSlots(); // Refresh
      } else {
        const data = await response.json();
        alert(data.message || "Failed to update time slots");
      }
    } catch (error) {
      console.error("Error saving time slots:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSetHoliday = () => {
    const confirm = window.confirm(
      "Set this entire date as holiday? All time slots will be blocked."
    );
    if (confirm) {
      setIsHoliday(true);
      const updatedSlots = newSlots.map((slot) => ({
        ...slot,
        is_blocked: true,
        is_holiday: true,
      }));
      setNewSlots(updatedSlots);
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Calendar & Time Slot Management
      </h1>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Arena Selection and Date Picker */}
      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Arena Selection */}
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

          {/* Date Picker */}
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

          {/* Holiday Button */}
          <div className="flex items-end">
            <button
              onClick={handleSetHoliday}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Set as Holiday
            </button>
          </div>
        </div>

        {/* Selected Date Info */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg md:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">
                {formatDate(selectedDate)}
              </h3>
              <p className="text-sm text-blue-700">
                Managing time slots for{" "}
                {arenas.find((a) => a.arena_id == selectedArena)?.name ||
                  "selected arena"}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handleApplyToAll("is_blocked", true)}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Block All
              </button>
              <button
                onClick={() => handleApplyToAll("is_blocked", false)}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Unblock All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Time Slots Grid */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">
            Time Slots for {formatDate(selectedDate)}
          </h2>
          <p className="text-sm text-gray-600">
            Adjust prices and availability for each time slot
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Slot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price (₹)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Block Slot
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Holiday
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {newSlots.map((slot, index) => (
                <tr
                  key={index}
                  className={
                    slot.is_blocked
                      ? "bg-red-50"
                      : slot.is_holiday
                      ? "bg-yellow-50"
                      : ""
                  }
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {slot.start_time} - {slot.end_time}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={slot.price}
                      onChange={(e) =>
                        handleSlotChange(index, "price", e.target.value)
                      }
                      className="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                    />
                    <span className="ml-2 text-sm text-gray-500">₹/hour</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${
                                              slot.is_blocked
                                                ? "bg-red-100 text-red-800"
                                                : slot.is_holiday
                                                ? "bg-yellow-100 text-yellow-800"
                                                : "bg-green-100 text-green-800"
                                            }`}
                    >
                      {slot.is_blocked
                        ? "Blocked"
                        : slot.is_holiday
                        ? "Holiday"
                        : "Available"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={slot.is_blocked}
                      onChange={(e) =>
                        handleSlotChange(index, "is_blocked", e.target.checked)
                      }
                      className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={slot.is_holiday}
                      onChange={(e) =>
                        handleSlotChange(index, "is_holiday", e.target.checked)
                      }
                      className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="h-3 w-3 bg-red-100 border border-red-300 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Blocked Slot</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Holiday Slot</span>
              </div>
              <div className="flex items-center">
                <div className="h-3 w-3 bg-green-100 border border-green-300 rounded mr-2"></div>
                <span className="text-sm text-gray-600">Available Slot</span>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() =>
                  setNewSlots(
                    timeSlotTemplates.map((t) => ({
                      ...t,
                      date: selectedDate.toISOString().split("T")[0],
                      price:
                        arenas.find((a) => a.arena_id == selectedArena)
                          ?.base_price_per_hour || 500,
                      is_blocked: false,
                      is_holiday: false,
                    }))
                  )
                }
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Reset
              </button>
              <button
                onClick={handleSaveSlots}
                disabled={loading || !selectedArena}
                className={`px-4 py-2 rounded-md text-white ${
                  loading || !selectedArena
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleApplyToAll("is_blocked", true)}
            className="p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 text-left"
          >
            <div className="font-medium text-red-700">Block All Slots</div>
            <div className="text-sm text-red-600">
              Mark all time slots as unavailable
            </div>
          </button>
          <button
            onClick={() => handleApplyToAll("is_blocked", false)}
            className="p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 text-left"
          >
            <div className="font-medium text-green-700">Open All Slots</div>
            <div className="text-sm text-green-600">
              Mark all time slots as available
            </div>
          </button>
          <button
            onClick={() => {
              setIsHoliday(true);
              handleApplyToAll("is_holiday", true);
              handleApplyToAll("is_blocked", true);
            }}
            className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 text-left"
          >
            <div className="font-medium text-yellow-700">Set as Holiday</div>
            <div className="text-sm text-yellow-600">
              Block all slots and mark as holiday
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerCalendar;
