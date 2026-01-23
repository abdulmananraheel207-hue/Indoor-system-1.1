// File: src/components/admin/Settings.jsx
import React, { useState } from 'react';
import {
    Cog6ToothIcon,
    ShieldCheckIcon,
    BellIcon,
    CreditCardIcon,
    ChartBarIcon,
    UsersIcon
} from '@heroicons/react/24/outline';

const Settings = () => {
    const [settings, setSettings] = useState({
        system: {
            site_name: 'ArenaFinder',
            site_email: 'admin@arenafinder.com',
            commission_rate: 5,
            max_photos_per_court: 3,
            auto_approve_bookings: false
        },
        notifications: {
            email_notifications: true,
            push_notifications: true,
            commission_reminders: true,
            new_booking_alerts: true,
            daily_reports: false
        },
        security: {
            require_2fa: false,
            session_timeout: 30,
            login_attempts: 5,
            ip_whitelist: ''
        },
        payments: {
            payment_methods: ['cash', 'bank_transfer'],
            payment_grace_period: 7,
            late_fee_percentage: 3,
            auto_block_threshold: 30
        }
    });

    const [activeTab, setActiveTab] = useState('system');
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const handleSave = async () => {
        setSaving(true);
        setSaveMessage('');

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSaveMessage('Settings saved successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            setSaveMessage('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'system', name: 'System', icon: Cog6ToothIcon },
        { id: 'notifications', name: 'Notifications', icon: BellIcon },
        { id: 'security', name: 'Security', icon: ShieldCheckIcon },
        { id: 'payments', name: 'Payments', icon: CreditCardIcon }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'system':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Site Name
                                    </label>
                                    <input
                                        type="text"
                                        value={settings.system.site_name}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            system: { ...settings.system, site_name: e.target.value }
                                        })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Admin Email
                                    </label>
                                    <input
                                        type="email"
                                        value={settings.system.site_email}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            system: { ...settings.system, site_email: e.target.value }
                                        })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Platform Commission Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={settings.system.commission_rate}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            system: { ...settings.system, commission_rate: parseInt(e.target.value) }
                                        })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="auto_approve"
                                        checked={settings.system.auto_approve_bookings}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            system: { ...settings.system, auto_approve_bookings: e.target.checked }
                                        })}
                                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="auto_approve" className="ml-2 block text-sm text-gray-900">
                                        Auto-approve bookings
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'notifications':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                            <div className="space-y-4">
                                {Object.entries(settings.notifications).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between">
                                        <div>
                                            <label className="text-sm text-gray-900 capitalize">
                                                {key.replace('_', ' ')}
                                            </label>
                                            <p className="text-xs text-gray-500">
                                                {getNotificationDescription(key)}
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={value}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    notifications: {
                                                        ...settings.notifications,
                                                        [key]: e.target.checked
                                                    }
                                                })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case 'security':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <label className="text-sm text-gray-900">
                                            Require Two-Factor Authentication
                                        </label>
                                        <p className="text-xs text-gray-500">
                                            Adds extra security for admin accounts
                                        </p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings.security.require_2fa}
                                            onChange={(e) => setSettings({
                                                ...settings,
                                                security: { ...settings.security, require_2fa: e.target.checked }
                                            })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Session Timeout (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        min="5"
                                        max="120"
                                        value={settings.security.session_timeout}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            security: { ...settings.security, session_timeout: parseInt(e.target.value) }
                                        })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Failed Login Attempts
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={settings.security.login_attempts}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            security: { ...settings.security, login_attempts: parseInt(e.target.value) }
                                        })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'payments':
                return (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Settings</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Payment Grace Period (days)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="30"
                                        value={settings.payments.payment_grace_period}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            payments: { ...settings.payments, payment_grace_period: parseInt(e.target.value) }
                                        })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Late Fee Percentage
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        step="0.5"
                                        value={settings.payments.late_fee_percentage}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            payments: { ...settings.payments, late_fee_percentage: parseFloat(e.target.value) }
                                        })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Auto-block Threshold (days overdue)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="90"
                                        value={settings.payments.auto_block_threshold}
                                        onChange={(e) => setSettings({
                                            ...settings,
                                            payments: { ...settings.payments, auto_block_threshold: parseInt(e.target.value) }
                                        })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const getNotificationDescription = (key) => {
        const descriptions = {
            email_notifications: 'Receive emails for important system events',
            push_notifications: 'Get browser notifications for real-time updates',
            commission_reminders: 'Daily reminders for overdue commission payments',
            new_booking_alerts: 'Notify when new bookings are created',
            daily_reports: 'Receive daily summary reports via email'
        };
        return descriptions[key] || '';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-600">Configure platform settings and preferences</p>
            </div>

            {/* Settings Panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-4 px-6" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg ${activeTab === tab.id
                                    ? 'bg-primary-100 text-primary-700'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <tab.icon className="h-5 w-5 mr-2" />
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {renderContent()}
                </div>

                {/* Save Button */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    {saveMessage && (
                        <span className={`text-sm ${saveMessage.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                            {saveMessage}
                        </span>
                    )}
                    <div className="ml-auto">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;