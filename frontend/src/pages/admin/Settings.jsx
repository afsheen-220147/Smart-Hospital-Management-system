import React, { useState } from 'react'
import {
    Bell, Lock, Palette, ShieldCheck, Globe, Trash2, Save,
    User, Mail, Phone, Building2, Key, Eye, EyeOff, CheckCircle, AlertTriangle
} from 'lucide-react'
import { showSuccess } from '../../utils/toast'
import { useTheme } from '../../contexts/ThemeContext'

const TABS = [
    { id: 'profile', label: 'Hospital Profile', icon: Building2 },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
]

export default function AdminSettings() {
    const [tab, setTab] = useState('profile')
    const [showPass, setShowPass] = useState(false)
    const { theme, setTheme } = useTheme()

    const [profile, setProfile] = useState({
        hospitalName: 'NeoTherapy Hospital',
        email: 'admin@neotherapy.com',
        phone: '+91 40 4444 5555',
        address: 'Kondapur, Hyderabad, Telangana – 500084',
        website: 'www.neotherapy.com',
        regNumber: 'HYD-MED-2001-1234',
    })

    const [notifications, setNotifications] = useState({
        newAppointment: true,
        appointmentCancel: true,
        newPatient: true,
        doctorLeave: false,
        dailyReport: true,
        weeklyAnalytics: true,
    })

    const [appearance, setAppearance] = useState({
        theme: theme,
        primaryColor: '#2563EB',
        language: 'English',
        timezone: 'Asia/Kolkata',
    })

    const handleSave = () => {
        showSuccess('Settings saved successfully!')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="section-title">Settings</h1>
                <p className="section-subtitle">Configure hospital system preferences and security</p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Tabs */}
                <div className="md:w-56 flex-shrink-0">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-2 space-y-0.5">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${tab === t.id ? 'bg-violet-50 text-violet-700 font-semibold dark:bg-violet-900/30 dark:text-violet-300' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700'}`}>
                                <t.icon size={16} className={tab === t.id ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400'} />
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1">
                    {/* Hospital Profile */}
                    {tab === 'profile' && (
                        <div className="card space-y-5">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <Building2 size={18} className="text-violet-600" /> Hospital Profile
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { label: 'Hospital Name', key: 'hospitalName', icon: Building2 },
                                    { label: 'Admin Email', key: 'email', icon: Mail },
                                    { label: 'Phone Number', key: 'phone', icon: Phone },
                                    { label: 'Website', key: 'website', icon: Globe },
                                    { label: 'Registration No.', key: 'regNumber', icon: ShieldCheck },
                                ].map(f => (
                                    <div key={f.key} className="form-group">
                                        <label className="form-label">{f.label}</label>
                                        <div className="relative">
                                            <f.icon size={15} className="absolute left-3 top-3 text-gray-400" />
                                            <input className="form-input pl-9" value={profile[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} />
                                        </div>
                                    </div>
                                ))}
                                <div className="form-group md:col-span-2">
                                    <label className="form-label">Address</label>
                                    <textarea className="form-input" rows={2} value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} />
                                </div>
                            </div>
                            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                                <Save size={16} /> Save Profile
                            </button>
                        </div>
                    )}

                    {/* Security */}
                    {tab === 'security' && (
                        <div className="card space-y-5">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <Lock size={18} className="text-violet-600" /> Security Settings
                            </h2>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
                                <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-800">For security, changing password will log out all active sessions.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="form-group">
                                    <label className="form-label">Current Password</label>
                                    <div className="relative">
                                        <Key size={15} className="absolute left-3 top-3 text-gray-400" />
                                        <input type={showPass ? 'text' : 'password'} className="form-input pl-9 pr-10" placeholder="Enter current password" />
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                                            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">New Password</label>
                                    <input type="password" className="form-input" placeholder="Minimum 8 characters" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirm New Password</label>
                                    <input type="password" className="form-input" placeholder="Re-enter new password" />
                                </div>
                            </div>
                            <div className="pt-2 space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-medium text-gray-900 text-sm">Two-Factor Authentication</p>
                                        <p className="text-xs text-gray-400">Adds an extra layer of security</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" />
                                        <div className="w-10 h-5 bg-gray-300 peer-checked:bg-violet-500 rounded-full transition-all after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:top-0.5 after:left-0.5 peer-checked:after:left-5 after:rounded-full after:transition-all" />
                                    </label>
                                </div>
                            </div>
                            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                                <Save size={16} /> Update Password
                            </button>
                        </div>
                    )}

                    {/* Notifications */}
                    {tab === 'notifications' && (
                        <div className="card space-y-5">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <Bell size={18} className="text-violet-600" /> Notification Preferences
                            </h2>
                            <div className="space-y-2">
                                {[
                                    { key: 'newAppointment', label: 'New Appointment Booked', desc: 'When a patient books an appointment' },
                                    { key: 'appointmentCancel', label: 'Appointment Cancellation', desc: 'When an appointment is cancelled' },
                                    { key: 'newPatient', label: 'New Patient Registration', desc: 'When a new patient registers' },
                                    { key: 'doctorLeave', label: 'Doctor Leave Requests', desc: 'When a doctor requests leave' },
                                    { key: 'dailyReport', label: 'Daily Summary Report', desc: 'End-of-day report via email' },
                                    { key: 'weeklyAnalytics', label: 'Weekly Analytics Digest', desc: 'Weekly stats and performance metrics' },
                                ].map(n => (
                                    <div key={n.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-violet-200 transition-all">
                                        <div>
                                            <p className="font-medium text-gray-900 text-sm">{n.label}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{n.desc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={notifications[n.key]}
                                                onChange={e => setNotifications(p => ({ ...p, [n.key]: e.target.checked }))} />
                                            <div className="w-10 h-5 bg-gray-300 peer-checked:bg-violet-500 rounded-full transition-all after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:top-0.5 after:left-0.5 peer-checked:after:left-5 after:rounded-full after:transition-all" />
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                                <Save size={16} /> Save Preferences
                            </button>
                        </div>
                    )}

                    {/* Appearance */}
                    {tab === 'appearance' && (
                        <div className="card space-y-5">
                            <h2 className="font-bold text-gray-900 flex items-center gap-2">
                                <Palette size={18} className="text-violet-600" /> Appearance
                            </h2>
                            <div className="form-group">
                                <label className="form-label">Theme</label>
                                <div className="flex gap-3">
                                    {['light', 'dark'].map(t => (
                                        <button key={t} onClick={() => { setAppearance(p => ({ ...p, theme: t })); setTheme(t) }}
                                            className={`flex-1 py-3 rounded-xl border-2 font-medium capitalize text-sm transition-all ${(theme === t) ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:border-violet-400 dark:text-violet-300' : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-500'}`}>
                                            {t === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Primary Color</label>
                                <div className="flex items-center gap-3">
                                    <input type="color" className="w-12 h-10 rounded-xl cursor-pointer border border-gray-200 p-1" value={appearance.primaryColor}
                                        onChange={e => setAppearance(p => ({ ...p, primaryColor: e.target.value }))} />
                                    <span className="text-sm text-gray-600 font-mono">{appearance.primaryColor}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label className="form-label">Language</label>
                                    <select className="form-input" value={appearance.language} onChange={e => setAppearance(p => ({ ...p, language: e.target.value }))}>
                                        <option>English</option><option>Telugu</option><option>Hindi</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Timezone</label>
                                    <select className="form-input" value={appearance.timezone} onChange={e => setAppearance(p => ({ ...p, timezone: e.target.value }))}>
                                        <option>Asia/Kolkata</option><option>UTC</option>
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                                <Save size={16} /> Save Appearance
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="card border-red-200 bg-red-50">
                <h3 className="font-bold text-red-700 flex items-center gap-2 mb-3">
                    <AlertTriangle size={18} /> Danger Zone
                </h3>
                <p className="text-sm text-red-600 mb-4">These actions are irreversible. Proceed with extreme caution.</p>
                <div className="flex flex-wrap gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border-2 border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-all">
                        <Trash2 size={15} /> Clear All Data
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all">
                        <Lock size={15} /> Lock System
                    </button>
                </div>
            </div>
        </div>
    )
}
