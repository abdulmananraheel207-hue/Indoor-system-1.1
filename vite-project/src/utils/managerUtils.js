// utils/managerUtils.js
export const checkManagerPermission = (permission) => {
    const managerData = localStorage.getItem("managerData");
    if (!managerData) return false;

    try {
        const manager = JSON.parse(managerData);
        return manager.permissions[permission] === true;
    } catch (error) {
        return false;
    }
};

export const getManagerInfo = () => {
    const managerData = localStorage.getItem("managerData");
    if (!managerData) return null;

    try {
        return JSON.parse(managerData);
    } catch (error) {
        return null;
    }
};

export const isManagerLoggedIn = () => {
    const token = localStorage.getItem("managerToken");
    const role = localStorage.getItem("userRole");
    return !!token && role === "manager";
};