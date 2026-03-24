/\*\*

- SMART HOSPITAL EXPANDABLE APPOINTMENT CARD SYSTEM
-
- Professional, doctor-friendly appointment management
- All data real-time from backend, no dummy values
  \*/

// ============================================================================
// FILE STRUCTURE
// ============================================================================

/_
frontend/
src/
components/
appointments/
├─ AppointmentCard.jsx (ENHANCED - expandable)
├─ CancelAppointmentModal.jsx (NEW)
├─ StatusBadge.jsx (existing)
├─ QueueIndicator.jsx (existing)
└─ DelayTag.jsx (existing)
pages/
doctor/
└─ Appointments.jsx (UPDATED - expand state management)
_/

// ============================================================================
// COMPONENT HIERARCHY
// ============================================================================

/\*
Appointments.jsx (Doctor Dashboard Page)
├─ State: expandedCardId, appointments[], filters
├─ Behavior: Manages which card is expanded
├─ Polling: Auto-refresh every 15 seconds
│
└─ AppointmentCard (rendered in grid)
├─ Props:
│ - appointment (data from backend)
│ - isExpanded (true if this card's ID matches expandedCardId)
│ - onToggleExpand (callback to toggle expand)
│ - onConsultationUpdate (callback to refresh list)
│
├─ COLLAPSED VIEW:
│ ├─ Avatar + Patient Name
│ ├─ Date | Time | Type
│ ├─ Queue # | Est. Time | Delay (if any)
│ └─ (Click to expand)
│
├─ EXPANDED VIEW:
│ ├─ Full Symptoms/Reason (warning box)
│ ├─ Session (Morning/Afternoon/Evening)
│ ├─ Priority (Emergency/Follow-up/Normal)
│ ├─ Time Boxes (Est. / Actual Start / Actual End)
│ ├─ Delay Warning (if running late)
│ ├─ Error Message (if API error)
│ └─ Action Buttons:
│ ├─ Start Consultation (POST /appointments/:id/start)
│ ├─ End Consultation (POST /appointments/:id/end)
│ └─ Cancel Appointment (opens modal)
│
└─ CancelAppointmentModal
├─ Appointment info display
├─ Cancellation reason textarea
├─ Validation & error messages
└─ Submit to PUT /appointments/:id

\*/

// ============================================================================
// KEY FEATURES
// ============================================================================

/\*

1. ACCORDION BEHAVIOR
   - Click card header → Expands
   - Click expanded card header → Collapses
   - Click different card → Closes previous, opens new
   - Only ONE card expanded at time

2. SMOOTH ANIMATIONS
   - Expand/Collapse: 300ms transition
   - Chevron icon rotates 180°
   - Card border/ring animates
   - Avatar color changes
   - No layout shift (proper spacing)

3. DATA-DRIVEN
   - All fields map from appointment object
   - Backend is single source of truth
   - Real-time polling every 15 seconds
   - No hardcoded values anywhere

4. DOCTOR-FRIENDLY
   - Clear visual hierarchy
   - Color-coded status/priority
   - Key info always visible (collapsed)
   - Full details on expand
   - One-click actions
   - Confirmation modal for cancellations

5. MOBILE RESPONSIVE
   - 1 column on mobile (< 640px)
   - 2 columns on tablet (640px - 1024px)
   - 3 columns on desktop (> 1024px)
   - Adaptive padding & text sizes
   - Buttons stack on small screens

\*/

// ============================================================================
// API INTEGRATION
// ============================================================================

/\*

START CONSULTATION
POST /appointments/:id/start
Backend Updates: - consultationState = "in_progress" - status = "ongoing" - actualStartTime = current date/time - doctor.currentConsultationId = appointmentId
UI Response: - Button changes to "End Consultation" - Card highlights with blue border - Avatar turns blue

END CONSULTATION
POST /appointments/:id/end
Backend Updates: - consultationState = "completed" - status = "completed" - actualEndTime = current date/time - Calculates real delayInMinutes - Updates doctor.delayFactor (EMA)
UI Response: - Buttons disappear - Card shows completed state - Time boxes show start/end times

CANCEL APPOINTMENT
PUT /appointments/:id
Body: { status: 'cancelled', cancellationReason: 'reason...' }
UI Response: - Modal closes - Card becomes transparent (opacity-60) - List refreshes

\*/

// ============================================================================
// STATE MANAGEMENT (APPOINTMENTS.jsx)
// ============================================================================

/\*

const [expandedCardId, setExpandedCardId] = useState(null);

const handleToggleExpand = (cardId) => {
// If clicking same card: toggle close
// If clicking different card: close old, open new
setExpandedCardId(prevId => prevId === cardId ? null : cardId);
};

// In render:
<AppointmentCard
appointment={app}
isExpanded={expandedCardId === app.\_id}
onToggleExpand={handleToggleExpand}
onConsultationUpdate={() => fetchData(true)}
/>

\*/

// ============================================================================
// STYLING APPROACH
// ============================================================================

/\*

TAILWIND UTILITIES USED:

Colors:

- Primary: Primary-600 (brand color)
- Success: Emerald-600 (completed)
- Warning: Amber-600 (symptoms), Orange-600 (delay)
- Danger: Red-600 (cancel, end)
- Info: Blue-600 (ongoing)
- Neutral: Gray-600 (inactive)

Animations:

- transition-all duration-300 (expand/collapse)
- rotate-180 (chevron)
- animate-spin (loading)
- opacity-60 (cancelled state)

Shadows:

- shadow-sm (default)
- shadow-md (hover)
- shadow-lg (expanded)

Borders:

- border-gray-200 (default)
- border-primary-300 (expanded)
- border-blue-300 (ongoing)
- ring-2 ring-primary-100 (expanded highlight)

Spacing:

- p-4 sm:p-5 (padding)
- gap-3 sm:gap-4 (spacing)
- mb-3 pb-4 (margins between sections)

Responsive:

- grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 (card layout)
- grid-cols-1 sm:grid-cols-2 (button layout in expanded)
- text-sm sm:text-base (text sizes)

\*/

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/\*

EXAMPLE 1: Basic Rendering
<AppointmentCard
appointment={{
      _id: 'apt-123',
      patientName: 'John Doe',
      date: '3/23/2026',
      time: '10:00 AM',
      type: 'in-person',
      status: 'confirmed',
      consultationState: 'not_started',
      queueNumber: 1,
      estimatedTime: '10:00 AM',
      delay: 0,
      priority: 'normal',
      symptoms: 'Fever and cough'
    }}
isExpanded={true}
onToggleExpand={(id) => console.log('Toggle', id)}
onConsultationUpdate={(data) => console.log('Updated', data)}
/>

EXAMPLE 2: Cancel Modal
<CancelAppointmentModal
appointment={appointmentData}
isOpen={showCancelModal}
onClose={() => setShowCancelModal(false)}
onCancelSuccess={(data) => {
setShowCancelModal(false);
onConsultationUpdate(data);
}}
/>

\*/

// ============================================================================
// TESTING CHECKLIST
// ============================================================================

/\*

EXPAND/COLLAPSE:
☐ Click card → expands smoothly with animation
☐ Click expanded card → collapses smoothly
☐ Click different card → previous closes, new opens
☐ Chevron rotates 180° on expand
☐ Card border changes color

START CONSULTATION:
☐ "Start Consultation" button visible when status=confirmed
☐ Button disabled when loading
☐ Shows loading spinner during API call
☐ On success → button changes to "End Consultation"
☐ Card refreshes with actual start time
☐ Card highlights with blue border

END CONSULTATION:
☐ "End Consultation" button visible when ongoing
☐ On success → shows completed state
☐ Displays actual start & end times
☐ Calculates and shows real delay
☐ Updates doctor profile (EMA delay factor)

CANCEL APPOINTMENT:
☐ "Cancel Appointment" button visible when status=pending/confirmed
☐ Opens modal without collapsing card
☐ Modal shows appointment info
☐ Requires cancellation reason
☐ On submit → POST to backend
☐ On success → card becomes transparent
☐ List refreshes

RESPONSIVE:
☐ Mobile (1 column): All content visible
☐ Tablet (2 columns): Proper spacing
☐ Desktop (3 columns): Full layout
☐ Buttons stack on mobile

DATA:
☐ All fields from backend appointment object
☐ No hardcoded values
☐ Real delay calculation from actual times
☐ Real consultation states
☐ Proper time formatting

ERRORS:
☐ API errors display in error box
☐ Loading states work correctly
☐ Modal validation shows errors
☐ Buttons disable during operations

\*/

// ============================================================================
// FUTURE ENHANCEMENTS
// ============================================================================

/\*

1. QUEUE AUTO-SHUFFLE
   - When consultation ends, next patient's queue position updates
   - Notification: "Next: [Patient Name]"

2. WEBSOCKET REAL-TIME
   - Replace 15-second polling with Socket.io
   - Instant updates across all doctors
   - Real-time patient notifications

3. PATIENT DETAILS MODAL
   - Click "View Details" to see full patient history
   - Previous appointments, notes, prescriptions
   - Allergies and medical conditions

4. BULK ACTIONS
   - Select multiple appointments
   - Batch actions: cancel, reschedule, notify

5. DRAG & DROP RESCHEDULING
   - Drag appointment to different time slot
   - Automatic conflict detection
   - Patient notification

\*/

export default AppointmentCard;
