# Responsive Doctor Dashboard Implementation Guide

## Overview

We have replaced the card-based list view with a professional **Master-Detail Dashboard** layout. This new design provides a split view on large screens and a drill-down navigation on mobile devices.

## 📱 Responsive Strategy

### Desktop & Large Tablets (≥md / 768px)

- **Split View Layout**:
  - **Left Panel (35-30%)**: Scrollable list of appointments with quick status indicators.
  - **Right Panel (65-70%)**: Dedicated workspace for the selected patient.
- **Always Visible**: The list is always available for fast switching between patients.

### Mobile (<768px)

- **Stacked Navigation**:
  - **Screen 1**: Full-width appointment list.
  - **Screen 2**: Full-screen patient details (slides in/activates when an item is tapped).
- **Back Navigation**: A dedicated "Back" button appears in the detail view to return to the list.
- **Fixed Actions**: Action buttons (Start, Cancel) are fixed to the bottom of the screen for easy thumb reach.

## 🧩 Component Architecture

### 1. `DoctorAppointments` (Page Controller)

- Manages state: `appointments`, `selectedId`, `filters`.
- Handles data fetching and polling (every 15s).
- Controls the layout switching logic using Tailwind responsive classes (`hidden md:flex`).

### 2. `AppointmentList` (List View)

- Renders the scrollable list of `AppointmentItem` components.
- Highlights the `selectedId` on desktop.

### 3. `AppointmentDetail` (Workspace View)

- Displays all patient information (Symptoms, Queue #, Delays).
- Contains the Action Bar logic (Start, End, Cancel).
- Includes the mobile "Back" button header.

### 4. `CancelAppointmentModal`

- Reused existing modal for consistent cancellation workflows.
- Handles the API call and error states internally.

## 🎨 Key Features

- **Real-Time Delays**: Visual indicator (Yellow alert) if an appointment is running late.
- **Smart Actions**: Buttons change based on state (Start → End).
- **Optimistic Updates**: UI updates instantly on action, then background refreshes ensure consistency.
- **Clean UI**: Uses whitespace, rounded corners (`rounded-xl`), and soft shadows as requested.

## 🛠️ Maintenance

To modify the layout, check `frontend/src/pages/doctor/Appointments.jsx`.
The split behavior is controlled by:

```jsx
{/* Left Panel */}
<div className={`${selectedId ? 'hidden md:flex' : 'flex'} ...`}>

{/* Right Panel */}
<div className={`${selectedId ? 'flex' : 'hidden md:flex'} ...`}>
```
