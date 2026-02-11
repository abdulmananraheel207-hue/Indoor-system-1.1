// Create new file: src/hooks/useRequireAuth.js
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const useRequireAuth = () => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);

    // Get auth state from your context/props
    // You'll need to pass auth from App.jsx or use context
    const isGuest = localStorage.getItem("isGuest") === "true";
    const isAuthenticated = !!localStorage.getItem("token");

    const requireAuth = (action, actionName = "perform this action") => {
        if (isGuest) {
            setPendingAction({ action, actionName });
            setShowModal(true);
            return false;
        }

        if (!isAuthenticated) {
            navigate("/auth/user");
            return false;
        }

        if (action) {
            action();
        }
        return true;
    };

    const closeModal = () => {
        setShowModal(false);
        setPendingAction(null);
    };

    const handleSignUp = () => {
        setShowModal(false);
        // Store the intended action in sessionStorage to execute after signup
        if (pendingAction) {
            sessionStorage.setItem("pendingAction", JSON.stringify({
                actionName: pendingAction.actionName,
                timestamp: Date.now()
            }));
        }
        navigate("/auth/user");
    };

    const Modal = () => {
        if (!showModal) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                        <h3 className="text-xl font-bold">✨ Unlock Full Access</h3>
                        <p className="text-blue-100 mt-1">
                            Sign up to {pendingAction?.actionName || "perform this action"}
                        </p>
                    </div>

                    <div className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
                                <span className="text-2xl">🎯</span>
                                <div>
                                    <p className="font-medium text-gray-900">Join thousands of players</p>
                                    <p className="text-sm text-gray-600">Book courts, create teams, challenge others and more!</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                                <div className="flex items-center">
                                    <span className="text-green-500 mr-2">✓</span> Book arenas
                                </div>
                                <div className="flex items-center">
                                    <span className="text-green-500 mr-2">✓</span> Create teams
                                </div>
                                <div className="flex items-center">
                                    <span className="text-green-500 mr-2">✓</span> Join tournaments
                                </div>
                                <div className="flex items-center">
                                    <span className="text-green-500 mr-2">✓</span> Leave reviews
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col space-y-3">
                            <button
                                onClick={handleSignUp}
                                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Sign Up Now - It's Free!
                            </button>
                            <button
                                onClick={closeModal}
                                className="w-full border border-gray-300 text-gray-700 font-medium py-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Continue as Guest
                            </button>
                        </div>

                        <p className="mt-4 text-xs text-center text-gray-500">
                            Already have an account?{' '}
                            <button
                                onClick={() => {
                                    closeModal();
                                    navigate("/auth/user");
                                }}
                                className="text-blue-600 hover:text-blue-500 font-medium"
                            >
                                Sign in
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return { requireAuth, Modal, showModal };
};

export default useRequireAuth;