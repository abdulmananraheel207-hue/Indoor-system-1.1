import React, { useState, useEffect } from "react";
import {
  BuildingStorefrontIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import integrationService from "../../services/integrationService";

const ArenasManagement = () => {
  const [arenas, setArenas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    is_blocked: "all",
  });

  useEffect(() => {
    const loadArenas = async () => {
      try {
        const data = await integrationService.getAdminArenas();
        setArenas(Array.isArray(data) ? data : data.arenas || []);
      } catch (error) {
        console.error("Failed to load arenas", error);
      } finally {
        setLoading(false);
      }
    };
    loadArenas();
  }, []);

  const filteredArenas = arenas.filter((arena) => {
    const matchesSearch =
      arena.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arena.owner_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filters.status === "all" ||
      (filters.status === "active" ? arena.is_active : !arena.is_active);

    const matchesBlocked =
      filters.is_blocked === "all" ||
      (filters.is_blocked === "blocked" ? arena.is_blocked : !arena.is_blocked);

    return matchesSearch && matchesStatus && matchesBlocked;
  });

  const toggleBlock = async (arenaId) => {
    const target = arenas.find((a) => a.arena_id === arenaId);
    const nextState = target ? !target.is_blocked : true;
    setArenas(
      arenas.map((arena) =>
        arena.arena_id === arenaId ? { ...arena, is_blocked: nextState } : arena
      )
    );
    try {
      await integrationService.toggleArenaBlock(
        arenaId,
        nextState,
        nextState ? "Blocked by admin" : "Unblocked by admin"
      );
    } catch (error) {
      console.error("Failed to toggle arena block", error);
    }
  };

  const deleteArena = (arenaId) => {
    if (
      window.confirm(
        "Are you sure you want to remove this arena? This action cannot be undone."
      )
    ) {
      setArenas(arenas.filter((arena) => arena.arena_id !== arenaId));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Arenas Management</h1>
        <p className="text-gray-600">
          Manage all arenas registered on the platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Arenas</p>
          <p className="text-2xl font-semibold text-gray-900">
            {arenas.length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Active Arenas</p>
          <p className="text-2xl font-semibold text-green-600">
            {arenas.filter((a) => a.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Blocked Arenas</p>
          <p className="text-2xl font-semibold text-red-600">
            {arenas.filter((a) => a.is_blocked).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Revenue</p>
          <p className="text-2xl font-semibold text-gray-900">
            Rs{" "}
            {arenas
              .reduce((sum, a) => sum + Number(a.total_revenue || 0), 0)
              .toLocaleString()}
          </p>{" "}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search arenas or owners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <select
              value={filters.is_blocked}
              onChange={(e) =>
                setFilters({ ...filters, is_blocked: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="blocked">Blocked</option>
              <option value="unblocked">Not Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {/* Arenas Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Arena Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statistics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredArenas.map((arena) => (
                <tr key={arena.arena_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-primary-100 flex items-center justify-center">
                        <BuildingStorefrontIcon className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {arena.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Rating: {arena.rating} ★
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {arena.owner_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {arena.owner_email}
                    </div>
                    <div className="text-sm text-gray-500">
                      {arena.owner_phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">
                        Bookings: {arena.total_bookings}
                      </div>
                      <div className="text-gray-900">
                        Revenue: Rs{" "}
                        {Number(arena.total_revenue || 0).toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          arena.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {arena.is_active ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          arena.is_blocked
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {arena.is_blocked ? "Blocked" : "Active"}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-1 text-gray-600 hover:text-gray-900"
                        title="View"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        className="p-1 text-gray-600 hover:text-blue-600"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => toggleBlock(arena.arena_id)}
                        className={`p-1 ${
                          arena.is_blocked
                            ? "text-green-600 hover:text-green-800"
                            : "text-yellow-600 hover:text-yellow-800"
                        }`}
                        title={arena.is_blocked ? "Unblock" : "Block"}
                      >
                        {arena.is_blocked ? (
                          <CheckCircleIcon className="h-5 w-5" />
                        ) : (
                          <XCircleIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => deleteArena(arena.arena_id)}
                        className="p-1 text-gray-600 hover:text-red-600"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
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

export default ArenasManagement;
