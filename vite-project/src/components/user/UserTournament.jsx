import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const UserTournament = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    tournament_name: "",
    sport: "",
    arena_id: "",
    number_of_teams: 4,
    start_date: "",
    end_date: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/user/tournaments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        alert("Tournament request sent successfully!");
        navigate("/user/bookings");
      } else {
        const data = await response.json();
        alert(data.message || "Failed to create tournament");
      }
    } catch (error) {
      console.error("Error creating tournament:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Create Tournament
          </h1>
          <p className="text-gray-600">
            Organize a tournament and send request to arena owners
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  value={formData.tournament_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tournament_name: e.target.value,
                    })
                  }
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Summer Cricket League 2024"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sport *
                  </label>
                  <select
                    value={formData.sport}
                    onChange={(e) =>
                      setFormData({ ...formData, sport: e.target.value })
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">Select Sport</option>
                    <option value="Cricket">Cricket</option>
                    <option value="Football">Football</option>
                    <option value="Badminton">Badminton</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Basketball">Basketball</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Number of Teams *
                  </label>
                  <select
                    value={formData.number_of_teams}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        number_of_teams: parseInt(e.target.value),
                      })
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {[4, 8, 16, 32].map((num) => (
                      <option key={num} value={num}>
                        {num} Teams
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    required
                    min={formData.start_date}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Arena (Optional)
                </label>
                <input
                  type="text"
                  value={formData.arena_id}
                  onChange={(e) =>
                    setFormData({ ...formData, arena_id: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Search and select arena"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty to let arena owners bid for your tournament
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows="4"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Describe your tournament format, rules, prize details, etc."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-white ${
                loading
                  ? "bg-primary-400 cursor-not-allowed"
                  : "bg-primary-600 hover:bg-primary-700"
              }`}
            >
              {loading ? "Creating..." : "Create Tournament Request"}
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. Fill out the tournament details</li>
            <li>2. Submit your request</li>
            <li>3. Arena owners will receive your request</li>
            <li>4. Owners can bid or accept your tournament</li>
            <li>5. You'll receive notifications for responses</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserTournament;
