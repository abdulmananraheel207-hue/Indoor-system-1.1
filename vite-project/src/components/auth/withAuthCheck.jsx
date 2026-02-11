// Create new file: src/components/auth/withAuthCheck.jsx
import React from "react";
import useRequireAuth from "../../hooks/useRequireAuth";

const withAuthCheck = (WrappedComponent, actionName = "perform this action") => {
    return function WithAuthCheckComponent(props) {
        const { requireAuth, Modal } = useRequireAuth();

        const createProtectedHandler = (handler) => {
            return (...args) => {
                const canProceed = requireAuth(() => {
                    if (handler) handler(...args);
                }, actionName);

                return canProceed;
            };
        };

        // Pass the protected handler creator to the wrapped component
        return (
            <>
                <WrappedComponent
                    {...props}
                    requireAuth={requireAuth}
                    createProtectedHandler={createProtectedHandler}
                    isGuest={localStorage.getItem("isGuest") === "true"}
                />
                <Modal />
            </>
        );
    };
};

export default withAuthCheck;