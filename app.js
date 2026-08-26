/* ========================================
   CEDON PICKLEBALL COURT - BOOKING SYSTEM
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // ========================================
    // CONFIG
    // ========================================
    const CONFIG = {
        OPERATING_HOURS: {
            morning: { start: 5, end: 7 },
            evening: { start: 16, end: 24 }
        },
        RATES: {
            morning: 150,
            evening: 200
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
    const today = new Date();
    const state = {
        today: today,
        currentMonth: new Date(today.getFullYear(), today.getMonth(), 1),
        selectedDate: null,
        selectedSlot: null,
        bookings: loadBookings()
    };

    // ========================================
    // DOM ELEMENTS
    // ========================================
    const $ = id => document.getElementById(id);

    const el = {
        // Views
        calendarView: $('calendarView'),
        scheduleView: $('scheduleView'),

        // Calendar
        monthYear: $('monthYear'),
        prevMonth: $('prevMonth'),
        nextMonth: $('nextMonth'),
        daysGrid: $('daysGrid'),

        // Schedule
        backToCalendar: $('backToCalendar'),
        selectedDateDisplay: $('selectedDateDisplay'),
        timeSlots: $('timeSlots'),

        // Bottom Sheet
        bookingPrompt: $('bookingPrompt'),
        promptSlotInfo: $('promptSlotInfo'),
        cancelSelection: $('cancelSelection'),
        confirmBooking: $('confirmBooking'),

        // Receipt Modal
        receiptModal: $('receiptModal'),
        receiptDate: $('receiptDate'),
        receiptTime: $('receiptTime'),
        receiptRate: $('receiptRate'),
        receiptTotal: $('receiptTotal'),
        cancelReceipt: $('cancelReceipt'),
        continuePayment: $('continuePayment'),

        // Payment Options Modal
        paymentOptionsModal: $('paymentOptionsModal'),
        paymentMethodsList: $('paymentMethodsList'),
        qrCodeSection: $('qrCodeSection'),
        qrAmount: $('qrAmount'),
        hostedGatewayBtn: $('hostedGatewayBtn'),
        gcashQRBtn: $('gcashQRBtn'),
        confirmManualPayment: $('confirmManualPayment'),
        backToReceipt: $('backToReceipt'),

        // Success Modal
        successModal: $('successModal'),
        successDate: $('successDate'),
        successTime: $('successTime'),
        backToCalendarSuccess: $('backToCalendarSuccess'),

        // Toast
        toast: $('toast'),
        toastMessage: $('toastMessage')
    };

    // ========================================
    // UTILITIES
    // ========================================
    function fmtDate(date) {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }

    function fmtShortDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    function fmtMonthYear(date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }

    function fmtTime(hour) {
        const ampm = h => h >= 12 ? 'PM' : 'AM';
        const display = h => h % 12 === 0 ? 12 : h % 12;
        return display(hour) + ':00 ' + ampm(hour) + ' – ' + display(hour + 1) + ':00 ' + ampm(hour + 1);
    }

    function dateKey(date) {
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }

    function sameDay(d1, d2) {
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    }

    function isPast(date) {
        const t = new Date(state.today.getFullYear(), state.today.getMonth(), state.today.getDate());
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        return d < t;
    }

    function isToday(date) {
        return sameDay(date, state.today);
    }

    function slotIsPast(date, hour) {
        if (!sameDay(date, state.today)) return false;
        return hour < state.today.getHours();
    }

    function slotIsBooked(date, hour) {
        const key = dateKey(date);
        return state.bookings[key] && state.bookings[key].includes(hour);
    }

    function getRate(hour) {
        if (hour >= CONFIG.OPERATING_HOURS.morning.start && hour < CONFIG.OPERATING_HOURS.morning.end) {
            return { rate: CONFIG.RATES.morning, label: 'Morning Rate' };
        }
        if (hour >= CONFIG.OPERATING_HOURS.evening.start && hour < CONFIG.OPERATING_HOURS.evening.end) {
            return { rate: CONFIG.RATES.evening, label: 'Evening Rate' };
        }
        return null;
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
        const bookings = {};
        const t = today;

        const todayKey = dateKey(t);
        bookings[todayKey] = [17, 19, 20];

        const tomorrow = new Date(t);
        tomorrow.setDate(tomorrow.getDate() + 1);
        bookings[dateKey(tomorrow)] = [5, 18, 22];

        const nextWeek = new Date(t);
        nextWeek.setDate(nextWeek.getDate() + 5);
        bookings[dateKey(nextWeek)] = [16, 20, 23];

        return bookings;
    }

    function showToast(msg) {
        el.toastMessage.textContent = msg;
        el.toast.classList.add('active');
        setTimeout(() => el.toast.classList.remove('active'), 3000);
    }

    // ========================================
    // CALENDAR
    // ========================================
    function renderCalendar() {
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth();

        el.monthYear.textContent = fmtMonthYear(state.currentMonth);

        // Nav buttons
        const todayMonthStart = new Date(state.today.getFullYear(), state.today.getMonth(), 1);
        const currentMonthStart = new Date(year, month, 1);
        const maxMonth = new Date(state.today.getFullYear(), state.today.getMonth() + CONFIG.MAX_MONTHS_AHEAD, 1);

        el.prevMonth.disabled = currentMonthStart.getTime() <= todayMonthStart.getTime();
        el.nextMonth.disabled = currentMonthStart.getTime() >= maxMonth.getTime();

        // Build grid
        el.daysGrid.innerHTML = '';

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty cells before 1st
        for (let i = 0; i < firstDay; i++) {
            const cell = document.createElement('div');
            cell.className = 'day-cell empty';
            el.daysGrid.appendChild(cell);
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
            if (isPast(date)) {
                cell.classList.add('past');
            } else {
                cell.addEventListener('click', function() {
                    selectDate(date);
                });
            }
            if (state.selectedDate && sameDay(date, state.selectedDate)) {
                cell.classList.add('selected-day');
            }

            el.daysGrid.appendChild(cell);
        }
    }

    function selectDate(date) {
        if (isPast(date)) {
            showToast('Cannot book past dates');
            return;
        }
        state.selectedDate = date;
        state.selectedSlot = null;
        hideBookingPrompt();
        renderCalendar();
        switchView('schedule');
        renderSchedule();
    }

    function switchView(name) {
        el.calendarView.classList.remove('active');
        el.scheduleView.classList.remove('active');
        if (name === 'calendar') {
            el.calendarView.classList.add('active');
        } else {
            el.scheduleView.classList.add('active');
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ========================================
    // SCHEDULE
    // ========================================
    function renderSchedule() {
        if (!state.selectedDate) return;
        el.selectedDateDisplay.textContent = fmtDate(state.selectedDate);
        el.timeSlots.innerHTML = '';

        const slots = [];
        const { morning, evening } = CONFIG.OPERATING_HOURS;

        for (let h = morning.start; h < morning.end; h++) {
            slots.push({ hour: h, rate: CONFIG.RATES.morning, rateLabel: 'Morning Rate' });
        }
        for (let h = evening.start; h < evening.end; h++) {
            slots.push({ hour: h, rate: CONFIG.RATES.evening, rateLabel: 'Evening Rate' });
        }

        slots.forEach(function(slot) {
            const isPast = slotIsPast(state.selectedDate, slot.hour);
            const isBooked = slotIsBooked(state.selectedDate, slot.hour);
            const isSelected = state.selectedSlot && state.selectedSlot.hour === slot.hour;

            const div = document.createElement('div');
            div.className = 'time-slot';
            if (isPast) div.classList.add('past-slot');

            let statusClass = 'open';
            let statusText = 'Open';
            let clickable = true;

            if (isPast) {
                statusClass = 'past';
                statusText = '';
                clickable = false;
            } else if (isBooked) {
                statusClass = 'booked';
                statusText = 'Booked';
                clickable = false;
            } else if (isSelected) {
                statusClass = 'selected';
                statusText = 'Selected';
            }

            div.innerHTML = '<div class="slot-info">' +
                '<span class="slot-time">' + fmtTime(slot.hour) + '</span>' +
                (!isPast ? '<span class="slot-rate">₱' + slot.rate + ' · ' + slot.rateLabel + '</span>' : '') +
                '</div>' +
                (statusText ? '<span class="slot-status ' + statusClass + '" data-hour="' + slot.hour + '">' + statusText + '</span>' : '<span></span>');

            if (clickable && statusText) {
                div.querySelector('.slot-status').addEventListener('click', function(e) {
                    e.stopPropagation();
                    selectSlot(slot);
                });
            }

            el.timeSlots.appendChild(div);
        });
    }

    function selectSlot(slot) {
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
    // BOTTOM SHEET
    // ========================================
    function showBookingPrompt(slot) {
        el.promptSlotInfo.textContent = fmtShortDate(state.selectedDate) + ' · ' + fmtTime(slot.hour) + ' · ₱' + slot.rate;
        el.bookingPrompt.classList.add('active');
    }

    function hideBookingPrompt() {
        el.bookingPrompt.classList.remove('active');
    }

    // ========================================
    // RECEIPT MODAL
    // ========================================
    function showReceipt() {
        if (!state.selectedSlot || !state.selectedDate) return;
        const slot = state.selectedSlot;
        el.receiptDate.textContent = fmtDate(state.selectedDate);
        el.receiptTime.textContent = fmtTime(slot.hour);
        el.receiptRate.textContent = '₱' + slot.rate + ' / hour';
        el.receiptTotal.textContent = '₱' + slot.rate;
        el.receiptModal.classList.add('active');
        hideBookingPrompt();
    }

    function hideReceipt() {
        el.receiptModal.classList.remove('active');
    }

    // ========================================
    // PAYMENT OPTIONS MODAL
    // ========================================
    function showPaymentOptions() {
        el.paymentOptionsModal.classList.add('active');
        el.paymentMethodsList.classList.remove('hidden');
        el.qrCodeSection.classList.add('hidden');
        el.backToReceipt.textContent = 'Back';
    }

    function hidePaymentOptions() {
        el.paymentOptionsModal.classList.remove('active');
    }

    function showQRCode() {
        el.paymentMethodsList.classList.add('hidden');
        el.qrCodeSection.classList.remove('hidden');
        el.qrAmount.textContent = '₱' + state.selectedSlot.rate;
        el.backToReceipt.textContent = 'Back to Methods';
    }

    function showPaymentMethods() {
        el.paymentMethodsList.classList.remove('hidden');
        el.qrCodeSection.classList.add('hidden');
        el.backToReceipt.textContent = 'Back';
    }

    // ========================================
    // PAYMENT FLOW
    // ========================================
    function processHostedPayment() {
        const slot = state.selectedSlot;
        const amount = slot.rate;
        const dKey = dateKey(state.selectedDate);
        const hour = slot.hour;
        const baseUrl = window.location.href.split('?')[0];
        const redirectUrl = encodeURIComponent(baseUrl + '?payment=success&date=' + dKey + '&hour=' + hour + '&amount=' + amount);
        const paymentUrl = 'gcash-payment.html?amount=' + amount + '&redirect=' + redirectUrl + '&ref=CEDON-' + Date.now();
        window.location.href = paymentUrl;
    }

    function confirmManualGCashPayment() {
        const date = state.selectedDate;
        const hour = state.selectedSlot.hour;
        const key = dateKey(date);

        if (!state.bookings[key]) state.bookings[key] = [];
        if (!state.bookings[key].includes(hour)) state.bookings[key].push(hour);
        saveBookings();

        hidePaymentOptions();
        hideReceipt();
        state.selectedSlot = null;

        el.successDate.textContent = fmtDate(date);
        el.successTime.textContent = fmtTime(hour);
        el.successModal.classList.add('active');
    }

    function handlePaymentReturn() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('payment') === 'success') {
            const dKey = params.get('date');
            const hour = parseInt(params.get('hour'));

            if (dKey && !isNaN(hour)) {
                if (!state.bookings[dKey]) state.bookings[dKey] = [];
                if (!state.bookings[dKey].includes(hour)) state.bookings[dKey].push(hour);
                saveBookings();

                const date = new Date(dKey + 'T00:00:00');
                el.successDate.textContent = fmtDate(date);
                el.successTime.textContent = fmtTime(hour);
                el.successModal.classList.add('active');
                state.selectedSlot = null;
                state.selectedDate = date;
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    function hideSuccessModal() {
        el.successModal.classList.remove('active');
        switchView('calendar');
        renderCalendar();
    }

    // ========================================
    // EVENT LISTENERS
    // ========================================
    function initEventListeners() {
        // Calendar nav
        el.prevMonth.addEventListener('click', function() {
            state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
            renderCalendar();
        });
        el.nextMonth.addEventListener('click', function() {
            state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
            renderCalendar();
        });

        // Back button
        el.backToCalendar.addEventListener('click', function() {
            state.selectedSlot = null;
            hideBookingPrompt();
            switchView('calendar');
            renderCalendar();
        });

        // Bottom sheet
        el.cancelSelection.addEventListener('click', deselectSlot);
        el.confirmBooking.addEventListener('click', showReceipt);

        // Receipt modal
        el.cancelReceipt.addEventListener('click', function() {
            hideReceipt();
            state.selectedSlot = null;
            renderSchedule();
        });
        el.continuePayment.addEventListener('click', showPaymentOptions);

        // Close buttons
        document.querySelectorAll('.modal-close').forEach(function(btn) {
            btn.addEventListener('click', hideReceipt);
        });
        document.querySelectorAll('.modal-overlay').forEach(function(overlay) {
            overlay.addEventListener('click', function(e) {
                if (e.target === overlay) {
                    hideReceipt();
                    hidePaymentOptions();
                    hideSuccessModal();
                }
            });
        });

        // Payment options
        el.hostedGatewayBtn.addEventListener('click', processHostedPayment);
        el.gcashQRBtn.addEventListener('click', showQRCode);
        el.backToReceipt.addEventListener('click', function() {
            if (el.qrCodeSection.classList.contains('hidden')) {
                hidePaymentOptions();
            } else {
                showPaymentMethods();
            }
        });
        el.confirmManualPayment.addEventListener('click', confirmManualGCashPayment);

        const paymentCloseBtn = document.querySelector('.modal-close-payment');
        if (paymentCloseBtn) {
            paymentCloseBtn.addEventListener('click', hidePaymentOptions);
        }

        // Success modal
        el.backToCalendarSuccess.addEventListener('click', hideSuccessModal);

        // Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                hideReceipt();
                hidePaymentOptions();
                hideSuccessModal();
            }
        });
    }

    // ========================================
    // INIT
    // ========================================
    function init() {
        initEventListeners();
        handlePaymentReturn();
        renderCalendar();
        console.log('Cedon Pickleball Court - Ready');
        console.log('Location:', CONFIG.LOCATION.name);
        console.log('Today:', fmtDate(state.today));
    }

    init();
});
