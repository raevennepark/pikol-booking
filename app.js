/* ========================================
   CEDON PICKLEBALL COURT - BOOKING SYSTEM
   JavaScript Application
   ======================================== */

(function() {
    'use strict';

    // ========================================
    // CONFIGURATION
    // ========================================
    const CONFIG = {
        OPERATING_HOURS: {
            morning: { start: 5, end: 7 },    // 5AM - 7AM
            evening: { start: 16, end: 24 }   // 4PM - 12AM
        },
        RATES: {
            morning: 150,   // 5AM-7AM
            evening: 200    // 4PM-12AM
        },
        LOCATION: {
            name: 'P5, San Francisco, Talibon, Bohol',
            coords: '10.160850,124.309307'
        },
        STORAGE_KEY: 'cedon_bookings_v1',
        MAX_MONTHS_AHEAD: 1
    };

    // ========================================
    // STATE
    // ========================================
    const state = {
        today: new Date(),
        currentMonth: new Date(),
        selectedDate: null,
        selectedSlot: null,
        bookings: loadBookings()
    };

    // Ensure we're working with the correct date context
    // (The system date is 2026-08-25)
    state.today = new Date(2026, 7, 25, 23, 59); // Aug 25, 2026, 11:59 PM
    state.currentMonth = new Date(2026, 7, 1);    // Aug 1, 2026

    // ========================================
    // DOM ELEMENTS
    // ========================================
    const elements = {
        // Views
        calendarView: document.getElementById('calendarView'),
        scheduleView: document.getElementById('scheduleView'),

        // Calendar
        monthYear: document.getElementById('monthYear'),
        prevMonth: document.getElementById('prevMonth'),
        nextMonth: document.getElementById('nextMonth'),
        daysGrid: document.getElementById('daysGrid'),

        // Schedule
        backToCalendar: document.getElementById('backToCalendar'),
        selectedDateDisplay: document.getElementById('selectedDateDisplay'),
        timeSlots: document.getElementById('timeSlots'),

        // Bottom Sheet
        bookingPrompt: document.getElementById('bookingPrompt'),
        promptSlotInfo: document.getElementById('promptSlotInfo'),
        cancelSelection: document.getElementById('cancelSelection'),
        confirmBooking: document.getElementById('confirmBooking'),

        // Receipt Modal
        receiptModal: document.getElementById('receiptModal'),
        receiptDate: document.getElementById('receiptDate'),
        receiptTime: document.getElementById('receiptTime'),
        receiptRate: document.getElementById('receiptRate'),
        receiptTotal: document.getElementById('receiptTotal'),
        cancelReceipt: document.getElementById('cancelReceipt'),
        continuePayment: document.getElementById('continuePayment'),
        modalClose: document.querySelector('.modal-close'),
        modalOverlay: document.querySelector('.modal-overlay'),

        // Success Modal
        successModal: document.getElementById('successModal'),
        successDate: document.getElementById('successDate'),
        successTime: document.getElementById('successTime'),
        backToCalendarSuccess: document.getElementById('backToCalendarSuccess'),

        // Toast
        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toastMessage')
    };

    // ========================================
    // UTILITY FUNCTIONS
    // ========================================
    function formatDate(date) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function formatShortDate(date) {
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function formatMonthYear(date) {
        const options = { year: 'numeric', month: 'long' };
        return date.toLocaleDateString('en-US', options);
    }

    function formatTime(hour) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        const nextHour = (hour + 1) % 24;
        const nextPeriod = nextHour >= 12 ? 'PM' : 'AM';
        const nextDisplayHour = nextHour % 12 === 0 ? 12 : nextHour % 12;
        return `${displayHour}:00 ${period} – ${nextDisplayHour}:00 ${nextPeriod}`;
    }

    function getDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function isSameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    function isPastDay(date) {
        const todayStart = new Date(state.today.getFullYear(), state.today.getMonth(), state.today.getDate());
        const checkStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return checkStart < todayStart;
    }

    function isToday(date) {
        return isSameDay(date, state.today);
    }

    function getRateForHour(hour) {
        if (hour >= CONFIG.OPERATING_HOURS.morning.start && hour < CONFIG.OPERATING_HOURS.morning.end) {
            return { rate: CONFIG.RATES.morning, label: 'Morning Rate' };
        }
        if (hour >= CONFIG.OPERATING_HOURS.evening.start && hour < CONFIG.OPERATING_HOURS.evening.end) {
            return { rate: CONFIG.RATES.evening, label: 'Evening Rate' };
        }
        return null;
    }

    function isSlotPast(date, hour) {
        if (!isToday(date)) return false;
        return hour < state.today.getHours();
    }

    function isSlotBooked(date, hour) {
        const key = getDateKey(date);
        return state.bookings[key] && state.bookings[key].includes(hour);
    }

    function loadBookings() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            return stored ? JSON.parse(stored) : generateDemoBookings();
        } catch (e) {
            return generateDemoBookings();
        }
    }

    function saveBookings() {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state.bookings));
    }

    function generateDemoBookings() {
        // Generate some demo bookings for realism
        const bookings = {};
        const today = state.today;

        // Book a few slots for today (before current time)
        const todayKey = getDateKey(today);
        bookings[todayKey] = [17, 19, 20]; // 5PM, 7PM, 8PM booked

        // Book some slots for tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = getDateKey(tomorrow);
        bookings[tomorrowKey] = [5, 18, 22]; // 5AM, 6PM, 10PM booked

        // Book some slots for next week
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 5);
        const nextWeekKey = getDateKey(nextWeek);
        bookings[nextWeekKey] = [16, 20, 23];

        return bookings;
    }

    function showToast(message) {
        elements.toastMessage.textContent = message;
        elements.toast.classList.add('active');
        setTimeout(() => {
            elements.toast.classList.remove('active');
        }, 3000);
    }

    // ========================================
    // CALENDAR FUNCTIONS
    // ========================================
    function renderCalendar() {
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth();

        elements.monthYear.textContent = formatMonthYear(state.currentMonth);

        // Navigation buttons
        const todayMonthStart = new Date(state.today.getFullYear(), state.today.getMonth(), 1);
        const currentMonthStart = new Date(year, month, 1);

        elements.prevMonth.disabled = currentMonthStart <= todayMonthStart;

        const maxMonth = new Date(state.today.getFullYear(), state.today.getMonth() + CONFIG.MAX_MONTHS_AHEAD, 1);
        elements.nextMonth.disabled = currentMonthStart >= maxMonth;

        // Generate days
        elements.daysGrid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            elements.daysGrid.appendChild(emptyCell);
        }

        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const cell = document.createElement('div');
            cell.className = 'day-cell';
            cell.textContent = day;

            if (isToday(date)) {
                cell.classList.add('today');
            }

            if (isPastDay(date)) {
                cell.classList.add('past');
            } else {
                cell.addEventListener('click', () => selectDate(date));
            }

            if (state.selectedDate && isSameDay(date, state.selectedDate)) {
                cell.classList.add('selected-day');
            }

            elements.daysGrid.appendChild(cell);
        }
    }

    function selectDate(date) {
        if (isPastDay(date)) {
            showToast('Cannot book past dates');
            return;
        }

        state.selectedDate = date;
        state.selectedSlot = null;
        hideBookingPrompt();

        // Update calendar selection highlight
        renderCalendar();

        // Switch to schedule view
        switchView('schedule');
        renderSchedule();
    }

    function switchView(viewName) {
        elements.calendarView.classList.remove('active');
        elements.scheduleView.classList.remove('active');

        if (viewName === 'calendar') {
            elements.calendarView.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            elements.scheduleView.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // ========================================
    // SCHEDULE FUNCTIONS
    // ========================================
    function renderSchedule() {
        if (!state.selectedDate) return;

        elements.selectedDateDisplay.textContent = formatDate(state.selectedDate);
        elements.timeSlots.innerHTML = '';

        const slots = generateTimeSlots();

        slots.forEach(slot => {
            const slotEl = createSlotElement(slot);
            elements.timeSlots.appendChild(slotEl);
        });
    }

    function generateTimeSlots() {
        const slots = [];
        const { morning, evening } = CONFIG.OPERATING_HOURS;

        // Morning slots: 5AM-7AM
        for (let h = morning.start; h < morning.end; h++) {
            slots.push({
                hour: h,
                rate: CONFIG.RATES.morning,
                rateLabel: 'Morning Rate',
                isPast: isSlotPast(state.selectedDate, h),
                isBooked: isSlotBooked(state.selectedDate, h)
            });
        }

        // Evening slots: 4PM-12AM
        for (let h = evening.start; h < evening.end; h++) {
            slots.push({
                hour: h,
                rate: CONFIG.RATES.evening,
                rateLabel: 'Evening Rate',
                isPast: isSlotPast(state.selectedDate, h),
                isBooked: isSlotBooked(state.selectedDate, h)
            });
        }

        return slots;
    }

    function createSlotElement(slot) {
        const div = document.createElement('div');
        div.className = 'time-slot';

        const timeStr = formatTime(slot.hour);

        if (slot.isPast) {
            div.classList.add('past-slot');
        }

        // Determine status
        let statusClass = 'open';
        let statusText = 'Open';
        let clickable = true;

        if (slot.isPast) {
            statusClass = 'past';
            statusText = '';
            clickable = false;
        } else if (slot.isBooked) {
            statusClass = 'booked';
            statusText = 'Booked';
            clickable = false;
        } else if (state.selectedSlot && state.selectedSlot.hour === slot.hour) {
            statusClass = 'selected';
            statusText = 'Selected';
        }

        div.innerHTML = `
            <div class="slot-info">
                <span class="slot-time">${timeStr}</span>
                ${!slot.isPast ? `<span class="slot-rate">₱${slot.rate} · ${slot.rateLabel}</span>` : ''}
            </div>
            ${statusText ? `<span class="slot-status ${statusClass}" data-hour="${slot.hour}">${statusText}</span>` : '<span></span>'}
        `;

        if (clickable && statusText) {
            const statusBtn = div.querySelector('.slot-status');
            if (statusBtn) {
                statusBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectSlot(slot);
                });
            }
        }

        return div;
    }

    function selectSlot(slot) {
        // Deselect if already selected
        if (state.selectedSlot && state.selectedSlot.hour === slot.hour) {
            deselectSlot();
            return;
        }

        state.selectedSlot = slot;
        renderSchedule();
        showBookingPrompt(slot);
    }

    function deselectSlot() {
        state.selectedSlot = null;
        hideBookingPrompt();
        renderSchedule();
    }

    // ========================================
    // BOOKING PROMPT (BOTTOM SHEET)
    // ========================================
    function showBookingPrompt(slot) {
        const timeStr = formatTime(slot.hour);
        elements.promptSlotInfo.textContent = `${formatShortDate(state.selectedDate)} · ${timeStr} · ₱${slot.rate}`;
        elements.bookingPrompt.classList.add('active');
    }

    function hideBookingPrompt() {
        elements.bookingPrompt.classList.remove('active');
    }

    // ========================================
    // RECEIPT MODAL
    // ========================================
    function showReceipt() {
        if (!state.selectedSlot || !state.selectedDate) return;

        const slot = state.selectedSlot;
        elements.receiptDate.textContent = formatDate(state.selectedDate);
        elements.receiptTime.textContent = formatTime(slot.hour);
        elements.receiptRate.textContent = `₱${slot.rate} / hour`;
        elements.receiptTotal.textContent = `₱${slot.rate}`;

        elements.receiptModal.classList.add('active');
        hideBookingPrompt();
    }

    function hideReceipt() {
        elements.receiptModal.classList.remove('active');
    }

    // ========================================
    // PAYMENT FLOW
    // ========================================
    function processPayment() {
        if (!state.selectedSlot || !state.selectedDate) return;

        const slot = state.selectedSlot;
        const amount = slot.rate;
        const dateKey = getDateKey(state.selectedDate);
        const hour = slot.hour;

        // Build redirect URL for after payment
        const redirectUrl = encodeURIComponent(window.location.origin + window.location.pathname + `?payment=success&date=${dateKey}&hour=${hour}&amount=${amount}`);

        // In production, replace this with your actual payment gateway URL
        // Examples:
        // - Xendit: https://api.xendit.co/v2/invoices (via your backend)
        // - PayMongo: https://api.paymongo.com/v1/links (via your backend)
        // - GCash via PayMongo/Xendit hosted checkout

        // For demo, redirect to mock payment page
        const paymentUrl = `gcash-payment.html?amount=${amount}&redirect=${redirectUrl}&ref=CEDON-${Date.now()}`;
        window.location.href = paymentUrl;
    }

    function handlePaymentReturn() {
        const params = new URLSearchParams(window.location.search);

        if (params.get('payment') === 'success') {
            const dateKey = params.get('date');
            const hour = parseInt(params.get('hour'));
            const amount = params.get('amount');

            if (dateKey && !isNaN(hour)) {
                // Save booking
                if (!state.bookings[dateKey]) {
                    state.bookings[dateKey] = [];
                }
                if (!state.bookings[dateKey].includes(hour)) {
                    state.bookings[dateKey].push(hour);
                }
                saveBookings();

                // Show success modal
                const date = new Date(dateKey + 'T00:00:00');
                elements.successDate.textContent = formatDate(date);
                elements.successTime.textContent = formatTime(hour);
                elements.successModal.classList.add('active');

                // Clear selection
                state.selectedSlot = null;
                state.selectedDate = date;

                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    function hideSuccessModal() {
        elements.successModal.classList.remove('active');
        switchView('calendar');
        renderCalendar();
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================
    function initEventListeners() {
        // Calendar navigation
        elements.prevMonth.addEventListener('click', () => {
            state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
            renderCalendar();
        });

        elements.nextMonth.addEventListener('click', () => {
            state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
            renderCalendar();
        });

        // Back button
        elements.backToCalendar.addEventListener('click', () => {
            state.selectedSlot = null;
            hideBookingPrompt();
            switchView('calendar');
            renderCalendar();
        });

        // Bottom sheet actions
        elements.cancelSelection.addEventListener('click', deselectSlot);
        elements.confirmBooking.addEventListener('click', showReceipt);

        // Receipt modal actions
        elements.cancelReceipt.addEventListener('click', () => {
            hideReceipt();
            state.selectedSlot = null;
            renderSchedule();
        });

        elements.continuePayment.addEventListener('click', processPayment);

        elements.modalClose.addEventListener('click', hideReceipt);
        elements.modalOverlay.addEventListener('click', hideReceipt);

        // Success modal
        elements.backToCalendarSuccess.addEventListener('click', hideSuccessModal);

        // Close modals on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideReceipt();
                hideSuccessModal();
            }
        });
    }

    // ========================================
    // INITIALIZATION
    // ========================================
    function init() {
        initEventListeners();
        handlePaymentReturn();
        renderCalendar();

        // If returning from payment with selected date, show schedule
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            // Success modal will be shown by handlePaymentReturn
        }

        console.log('🎾 Cedon Pickleball Court Booking System initialized');
        console.log('📍 Location:', CONFIG.LOCATION.name);
        console.log('📅 Today:', formatDate(state.today));
    }

    // Start the app
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
