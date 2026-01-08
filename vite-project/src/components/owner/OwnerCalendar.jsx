import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ownerAPI } from "../../services/api";

const OwnerCalendar = ({ arenas = [] }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedArena, setSelectedArena] = useState("");
  const [selectedCourt, setSelectedCourt] = useState(""); // ADD STATE FOR COURT
  const [courts, setCourts] = useState([]); // ADD STATE FOR COURTS LIST
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Add new slot form state
  const [showAddSlotForm, setShowAddSlotForm] = useState(false);
  const [newSlot, setNewSlot] = useState({
    start_time: "05:00",
    end_time: "06:00",
    price: 500,
  });

  // Edit slot modal state
  const [editingSlot, setEditingSlot] = useState(null);
  const [editForm, setEditForm] = useState({
    price: "",
    is_blocked: false,
  });

  useEffect(() => {
    if (arenas.length > 0 && !selectedArena) {
      setSelectedArena(arenas[0].arena_id);
    }
  }, [arenas]);

  // Fetch courts when arena changes
  useEffect(() => {
    if (selectedArena) {
      fetchCourts();
    }
  }, [selectedArena]);

  // Fetch time slots when date or court changes
  useEffect(() => {
    if (selectedArena) {
      fetchTimeSlots();
    }
  }, [selectedDate, selectedArena, selectedCourt]);

  const fetchCourts = async () => {
    try {
      const response = await ownerAPI.getCourts(selectedArena);
      if (response.data && response.data.length > 0) {
        setCourts(response.data);
        // Auto-select first court
        setSelectedCourt(response.data[0].court_id);
      } else {
        setCourts([]);
        setSelectedCourt("");
      }
    } catch (error) {
      console.error("Error fetching courts:", error);
      setCourts([]);
      setSelectedCourt("");
    }
  };

  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split("T")[0];

      // Pass court_id to API if selected
      const response = await ownerAPI.getTimeSlots(
        selectedArena,
        dateStr,
        selectedCourt || undefined
      );

      if (response.data && response.data.length > 0) {
        setTimeSlots(response.data);
      } else {
        // Generate auto slots based on arena registration settings
        generateAutoSlots();
      }
    } catch (error) {
      console.error("Error fetching time slots:", error);
      generateAutoSlots();
    } finally {
      setLoading(false);
    }
  };

  const generateAutoSlots = () => {
    const arena = arenas.find((a) => a.arena_id == selectedArena);
    if (!arena) return;

    const openingTime = arena.opening_time || "06:00";
    const closingTime = arena.closing_time || "22:00";
    const slotDuration = arena.slot_duration || 60;
    const basePrice = arena.base_price_per_hour || 500;

    const slots = [];
    let currentHour = parseInt(openingTime.split(":")[0]);
    let currentMinute = parseInt(openingTime.split(":")[1]);
    const endHour = parseInt(closingTime.split(":")[0]);
    const endMinute = parseInt(closingTime.split(":")[1]);

    // Generate auto slots
    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      let endHourCalc = currentHour;
      let endMinuteCalc = currentMinute + slotDuration;

      while (endMinuteCalc >= 60) {
        endHourCalc += 1;
        endMinuteCalc -= 60;
      }

      // Stop if exceeds closing time
      if (
        endHourCalc > endHour ||
        (endHourCalc === endHour && endMinuteCalc > endMinute)
      ) {
        break;
      }

      const startTimeStr = `${currentHour
        .toString()
        .padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
      const endTimeStr = `${endHourCalc
        .toString()
        .padStart(2, "0")}:${endMinuteCalc.toString().padStart(2, "0")}`;

      slots.push({
        start_time: startTimeStr,
        end_time: endTimeStr,
        price: basePrice,
        is_blocked: false,
        is_auto: true, // Mark as auto-generated
        slot_id: `auto_${startTimeStr}_${endTimeStr}`,
        court_id: selectedCourt, // Include court_id in auto-generated slots
      });

      currentHour = endHourCalc;
      currentMinute = endMinuteCalc;
    }

    setTimeSlots(slots);
  };

  const handleAddSlot = () => {
    if (!newSlot.start_time || !newSlot.end_time) {
      alert("Please enter start and end time");
      return;
    }

    // Check if slot overlaps with existing slots
    const isOverlap = timeSlots.some(
      (slot) =>
        (newSlot.start_time >= slot.start_time &&
          newSlot.start_time < slot.end_time) ||
        (newSlot.end_time > slot.start_time &&
          newSlot.end_time <= slot.end_time) ||
        (newSlot.start_time <= slot.start_time &&
          newSlot.end_time >= slot.end_time)
    );

    if (isOverlap) {
      alert("This time slot overlaps with an existing slot!");
      return;
    }

    const newSlotObj = {
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      price: newSlot.price || 500,
      is_blocked: false,
      is_auto: false, // Mark as manually added
      slot_id: `manual_${Date.now()}`,
      court_id: selectedCourt, // Include court_id in manual slots
    };

    // Add to beginning or sort by time
    const updatedSlots = [...timeSlots, newSlotObj].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );

    setTimeSlots(updatedSlots);
    setShowAddSlotForm(false);
    setNewSlot({ start_time: "05:00", end_time: "06:00", price: 500 });
  };

  const handleEditSlot = (slot) => {
    setEditingSlot(slot);
    setEditForm({
      price: slot.price,
      is_blocked: slot.is_blocked || false,
    });
  };

  const handleUpdateSlot = () => {
    if (!editingSlot) return;

    const updatedSlots = timeSlots.map((slot) =>
      slot.slot_id === editingSlot.slot_id ? { ...slot, ...editForm } : slot
    );

    setTimeSlots(updatedSlots);
    setEditingSlot(null);
  };

  const handleDeleteSlot = (slotId) => {
    if (!window.confirm("Are you sure you want to delete this time slot?"))
      return;

    // Don't allow deletion of auto-generated slots
    const slotToDelete = timeSlots.find((s) => s.slot_id === slotId);
    if (slotToDelete?.is_auto) {
      alert(
        "Auto-generated slots cannot be deleted. You can block them instead."
      );
      return;
    }

    const updatedSlots = timeSlots.filter((slot) => slot.slot_id !== slotId);
    setTimeSlots(updatedSlots);
  };

  const handleBlockAll = () => {
    const updatedSlots = timeSlots.map((slot) => ({
      ...slot,
      is_blocked: true,
    }));
    setTimeSlots(updatedSlots);
  };

  const handleUnblockAll = () => {
    const updatedSlots = timeSlots.map((slot) => ({
      ...slot,
      is_blocked: false,
    }));
    setTimeSlots(updatedSlots);
  };

  const handleSaveChanges = async () => {
    if (!selectedArena) {
      alert("Please select an arena first");
      return;
    }

    setSaving(true);
    try {
      const dateStr = selectedDate.toISOString().split("T")[0];

      const payload = {
        date: dateStr,
        court_id: selectedCourt || undefined, // Include court_id in payload
        slots: timeSlots.map((slot) => ({
          start_time: slot.start_time + ":00",
          end_time: slot.end_time + ":00",
          price: slot.price,
          is_blocked: slot.is_blocked,
          is_auto: slot.is_auto,
          court_id: slot.court_id || selectedCourt, // Include court_id for each slot
        })),
      };

      await ownerAPI.updateTimeSlots(selectedArena, payload);
      setSuccessMessage("Time slots saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error saving time slots:", error);
      alert(error.response?.data?.message || "Failed to save time slots");
    } finally {
      setSaving(false);
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

  const getArenaInfo = () => {
    return arenas.find((a) => a.arena_id == selectedArena);
  };

  const getCourtInfo = () => {
    return courts.find((c) => c.court_id == selectedCourt);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-4 md:text-2xl md:mb-6">
        Calendar & Time Slot Management
      </h1>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg
              className="h-5 w-5 text-green-400 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium text-green-800">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* Arena, Court Selection and Date Picker */}
      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Arena
            </label>
            <select
              value={selectedArena}
              onChange={(e) => {
                setSelectedArena(e.target.value);
                setSelectedCourt(""); // Reset court when arena changes
              }}
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
              Select Court
            </label>
            <select
              value={selectedCourt}
              onChange={(e) => setSelectedCourt(e.target.value)}
              disabled={!selectedArena || courts.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              {courts.length === 0 ? (
                <option value="">No courts found</option>
              ) : (
                courts.map((court) => (
                  <option key={court.court_id} value={court.court_id}>
                    {court.court_name || `Court ${court.court_number}`}
                  </option>
                ))
              )}
            </select>
            {courts.length === 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Single-court arena - court selection not needed
              </p>
            )}
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

          <div className="flex items-end">
            <button
              onClick={fetchTimeSlots}
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
            >
              {loading ? "Loading..." : "Refresh Slots"}
            </button>
          </div>
        </div>

        {/* Arena & Court Info */}
        {selectedArena && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-blue-900">
                  {getArenaInfo()?.name}
                  {selectedCourt && (
                    <span className="ml-2 text-blue-700">
                      •{" "}
                      {getCourtInfo()?.court_name ||
                        `Court ${getCourtInfo()?.court_number}`}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-blue-700">
                  Auto slots: {getArenaInfo()?.opening_time || "06:00"} to{" "}
                  {getArenaInfo()?.closing_time || "22:00"}
                  {selectedCourt && (
                    <span className="ml-2">
                      • Price: ₹
                      {getCourtInfo()?.price_per_hour ||
                        getArenaInfo()?.base_price_per_hour ||
                        500}
                      /hr
                    </span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {timeSlots.length} time slots
                  {courts.length > 1 && ` • ${courts.length} courts`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Time Slots Management */}
      <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Time Slots</h2>
            <p className="text-sm text-gray-600">
              Auto-generated slots are based on your arena's operating hours
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleBlockAll}
              className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Block All
            </button>
            <button
              onClick={handleUnblockAll}
              className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Unblock All
            </button>
          </div>
        </div>

        {/* Add New Slot Form */}
        {showAddSlotForm && (
          <div className="p-4 border-b bg-blue-50">
            <h3 className="font-medium text-blue-900 mb-3">
              Add New Time Slot
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, start_time: e.target.value })
                  }
                  className="w-full px-2 py-1.5 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={newSlot.end_time}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, end_time: e.target.value })
                  }
                  className="w-full px-2 py-1.5 border border-gray-300 rounded"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Price (₹)
                </label>
                <input
                  type="number"
                  value={newSlot.price}
                  onChange={(e) =>
                    setNewSlot({ ...newSlot, price: e.target.value })
                  }
                  className="w-full px-2 py-1.5 border border-gray-300 rounded"
                  min="0"
                />
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={handleAddSlot}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Slot
                </button>
                <button
                  onClick={() => setShowAddSlotForm(false)}
                  className="px-4 py-1.5 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Time Slots List */}
        <div className="divide-y">
          {timeSlots.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No time slots found. Click "Refresh Slots" to generate auto slots.
            </div>
          ) : (
            timeSlots.map((slot) => (
              <div
                key={slot.slot_id}
                className={`p-4 flex justify-between items-center ${
                  slot.is_blocked ? "bg-red-50" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">
                      {slot.start_time} - {slot.end_time}
                    </span>
                    {slot.is_auto && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                        Auto
                      </span>
                    )}
                    {!slot.is_auto && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                        Manual
                      </span>
                    )}
                    {slot.is_blocked && (
                      <span className="px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded">
                        Blocked
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    ₹{slot.price} per hour
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditSlot(slot)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  {!slot.is_auto && (
                    <button
                      onClick={() => handleDeleteSlot(slot.slot_id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Slot Button */}
        <div className="p-4 border-t">
          <button
            onClick={() => setShowAddSlotForm(true)}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            + Add Custom Time Slot
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="flex flex-col md:flex-row justify-between space-y-3 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="h-3 w-3 bg-red-100 border border-red-300 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Blocked Slot</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 bg-blue-100 border border-blue-300 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Auto-generated</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 bg-green-100 border border-green-300 rounded mr-2"></div>
              <span className="text-sm text-gray-600">Manual Slot</span>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSaveChanges}
              disabled={saving || !selectedArena}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-medium text-gray-900">
                Edit Time Slot: {editingSlot.start_time} -{" "}
                {editingSlot.end_time}
              </h3>
              <button
                onClick={() => setEditingSlot(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₹ per hour)
                </label>
                <input
                  type="number"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm({ ...editForm, price: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={editForm.is_blocked}
                  onChange={(e) =>
                    setEditForm({ ...editForm, is_blocked: e.target.checked })
                  }
                  className="h-4 w-4 text-red-600 rounded"
                  id="blockSlot"
                />
                <label
                  htmlFor="blockSlot"
                  className="ml-2 text-sm text-gray-700"
                >
                  Block this time slot (make it unavailable)
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSlot}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Update Slot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerCalendar;
