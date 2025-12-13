import React, { useState } from 'react';

const UserTeams = () => {
    const [activeTab, setActiveTab] = useState('opponent');
    const [teams] = useState([
        { id: 1, name: 'Thunder Strikers', sport: 'Cricket', players: 11, rating: 4.5 },
        { id: 2, name: 'City United', sport: 'Futsal', players: 7, rating: 4.3 },
        { id: 3, name: 'Ace Smashers', sport: 'Badminton', players: 4, rating: 4.7 },
        { id: 4, name: 'Net Kings', sport: 'Tennis', players: 2, rating: 4.2 },
    ]);

    const [myTeams] = useState([
        { id: 1, name: 'My Cricket Team', sport: 'Cricket', members: 8, captain: true },
        { id: 2, name: 'Weekend Warriors', sport: 'Futsal', members: 6, captain: false },
    ]);

    const [showCreateTeam, setShowCreateTeam] = useState(false);
    const [teamForm, setTeamForm] = useState({
        name: '',
        sport: 'Cricket',
        description: ''
    });

    const handleChallenge = (teamId) => {
        console.log('Challenge team:', teamId);
        // Implement challenge logic
    };

    const handleCreateTeam = (e) => {
        e.preventDefault();
        console.log('Create team:', teamForm);
        // Implement create team logic
        setShowCreateTeam(false);
        setTeamForm({ name: '', sport: 'Cricket', description: '' });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Teams</h1>
                <p className="text-gray-600 mb-8">Find opponents or manage your team</p>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('opponent')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'opponent'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Opponent Teams
                        </button>
                        <button
                            onClick={() => setActiveTab('myteam')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'myteam'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            My Team
                        </button>
                    </nav>
                </div>

                {/* Opponent Teams Tab */}
                {activeTab === 'opponent' && (
                    <div>
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">Available Teams</h2>
                            <div className="flex space-x-4">
                                <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                    <option>All Sports</option>
                                    <option>Cricket</option>
                                    <option>Futsal</option>
                                    <option>Badminton</option>
                                </select>
                                <input
                                    type="text"
                                    placeholder="Search teams..."
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teams.map((team) => (
                                <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                                            <div className="flex items-center mt-1">
                                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                    {team.sport}
                                                </span>
                                                <span className="ml-2 text-sm text-gray-600">{team.players} players</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center">
                                            <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                            </svg>
                                            <span className="ml-1 font-semibold">{team.rating}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            onClick={() => handleChallenge(team.id)}
                                            className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                        >
                                            Challenge Team
                                        </button>
                                        <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* My Team Tab */}
                {activeTab === 'myteam' && (
                    <div>
                        <div className="mb-6 flex justify-between items-center">
                            <h2 className="text-lg font-semibold text-gray-900">My Teams</h2>
                            <button
                                onClick={() => setShowCreateTeam(true)}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                            >
                                + Create New Team
                            </button>
                        </div>

                        {myTeams.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <h3 className="mt-2 text-sm font-medium text-gray-900">No teams yet</h3>
                                <p className="mt-1 text-sm text-gray-500">Get started by creating your first team.</p>
                                <div className="mt-6">
                                    <button
                                        onClick={() => setShowCreateTeam(true)}
                                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                                    >
                                        + Create Team
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {myTeams.map((team) => (
                                    <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                                                <div className="flex items-center mt-2 space-x-2">
                                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                                        {team.sport}
                                                    </span>
                                                    {team.captain && (
                                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                                            Captain
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="text-sm text-gray-600">{team.members} members</span>
                                        </div>

                                        <div className="space-y-3">
                                            <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                                Edit Team
                                            </button>
                                            <button className="w-full px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors">
                                                Invite Players
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Create Team Modal */}
                {showCreateTeam && (
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Team</h3>
                                <form onSubmit={handleCreateTeam}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Team Name
                                            </label>
                                            <input
                                                type="text"
                                                value={teamForm.name}
                                                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                                placeholder="Enter team name"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Sport
                                            </label>
                                            <select
                                                value={teamForm.sport}
                                                onChange={(e) => setTeamForm({ ...teamForm, sport: e.target.value })}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                            >
                                                <option value="Cricket">Cricket</option>
                                                <option value="Futsal">Futsal</option>
                                                <option value="Badminton">Badminton</option>
                                                <option value="Tennis">Tennis</option>
                                                <option value="Basketball">Basketball</option>
                                                <option value="Padel">Padel</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Description (Optional)
                                            </label>
                                            <textarea
                                                value={teamForm.description}
                                                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                                                rows="3"
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                                placeholder="Describe your team..."
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateTeam(false)}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                        >
                                            Create Team
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserTeams;