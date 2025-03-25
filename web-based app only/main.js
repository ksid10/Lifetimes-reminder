const { invoke } = window.__TAURI__.core;

// Event Storage and Settings
let events = JSON.parse(localStorage.getItem('events')) || [];
let currentView = 'all'; // Default view: 'all', 'lifetimes', or 'events'
let currentEventToDelete = null;
let currentTheme = localStorage.getItem('theme') || 'light-theme';
let boxSettings = JSON.parse(localStorage.getItem('boxSettings')) || {
    shape: 'rectangle',
    size: 250
};
let reminderOrder = JSON.parse(localStorage.getItem('reminderOrder')) || [];

// DOM Elements
const lifetimesContainer = document.getElementById('lifetimesContainer');
const eventsContainer = document.getElementById('eventsContainer');
const eventModal = document.getElementById('eventModal');
const editEventModal = document.getElementById('editEventModal');
const deleteModal = document.getElementById('deleteModal');
const sizeModal = document.getElementById('sizeModal');
const toastNotification = document.getElementById('toastNotification');
const backupFileInput = document.getElementById('backupFileInput');
const navButtons = document.querySelectorAll('.nav-btn');
const sizeSlider = document.getElementById('sizeSlider');
const shapeButtons = document.querySelectorAll('.shape-btn');

// Initialize theme
document.documentElement.className = currentTheme;

// Initialize box settings
sizeSlider.value = boxSettings.size;
document.querySelectorAll('.shape-btn').forEach(btn => {
    if (btn.id === `${boxSettings.shape}Btn`) {
        btn.classList.add('active');
    } else {
        btn.classList.remove('active');
    }
});

// Initialize SortableJS for reminder drag and drop
let sortable = new Sortable(eventsContainer, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    onEnd: function(evt) {
        updatereminderOrder();
    }
});

/**
 * Update and save the reminder order after drag and drop
 */
function updatereminderOrder() {
    // Get all reminder cards
    const reminderCards = eventsContainer.querySelectorAll('.event-card');
    
    // Extract IDs in the new order
    const newOrder = Array.from(reminderCards).map(card => {
        return parseInt(card.getAttribute('data-id'));
    });
    
    // Save the new order
    reminderOrder = newOrder;
    localStorage.setItem('reminderOrder', JSON.stringify(reminderOrder));
    showToast('reminder priority updated');
}

/**
 * Apply box size and shape settings to all cards
 */
function applyBoxSettings() {
    document.querySelectorAll('.event-card').forEach(card => {
        // Remove both classes first
        card.classList.remove('square', 'rectangle');
        
        // Add the current shape class
        card.classList.add(boxSettings.shape);
        
        // Set the width/height based on size
        if (boxSettings.shape === 'square') {
            card.style.width = `${boxSettings.size}px`;
            card.style.height = `${boxSettings.size}px`;
        } else {
            card.style.width = `${boxSettings.size}px`;
            card.style.height = 'auto';
        }
    });
    
    // Save settings to localStorage
    localStorage.setItem('boxSettings', JSON.stringify(boxSettings));
}

// Theme Toggle Event Listeners
document.getElementById('lightThemeBtn').addEventListener('click', () => setTheme('light-theme'));
document.getElementById('darkThemeBtn').addEventListener('click', () => setTheme('dark-theme'));
document.getElementById('blueThemeBtn').addEventListener('click', () => setTheme('blue-theme'));

/**
 * Set the application theme
 * @param {string} theme - Theme name
 */
function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.className = theme;
    localStorage.setItem('theme', theme);
    showToast(`${theme.split('-')[0].charAt(0).toUpperCase() + theme.split('-')[0].slice(1)} theme applied`);
}

// Navigation Button Event Listeners
document.getElementById('allButton').addEventListener('click', () => {
    setActiveNavButton('allButton');
    currentView = 'all';
    renderEvents();
});

document.getElementById('lifetimesButton').addEventListener('click', () => {
    setActiveNavButton('lifetimesButton');
    currentView = 'lifetimes';
    renderEvents();
});

document.getElementById('remindersButton').addEventListener('click', () => {
    setActiveNavButton('remindersButton');
    currentView = 'events';
    renderEvents();
});

/**
 * Set active navigation button
 * @param {string} buttonId - ID of the active button
 */
function setActiveNavButton(buttonId) {
    navButtons.forEach(button => {
        if (button.id === buttonId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Size and Shape Controls
document.getElementById('sizeToggleBtn').addEventListener('click', () => {
    sizeModal.classList.remove('hidden');
    setTimeout(() => {
        sizeModal.querySelector('.modal-container').classList.add('show');
    }, 10);
});

document.getElementById('rectangleBtn').addEventListener('click', () => {
    setActiveShapeButton('rectangleBtn');
    boxSettings.shape = 'rectangle';
    applyBoxSettings();
});

document.getElementById('squareBtn').addEventListener('click', () => {
    setActiveShapeButton('squareBtn');
    boxSettings.shape = 'square';
    applyBoxSettings();
});

sizeSlider.addEventListener('input', () => {
    boxSettings.size = parseInt(sizeSlider.value);
    applyBoxSettings();
});

document.getElementById('closeBoxSizeBtn').addEventListener('click', () => {
    sizeModal.querySelector('.modal-container').classList.remove('show');
    setTimeout(() => {
        sizeModal.classList.add('hidden');
    }, 200);
    showToast('Box size settings applied');
});

/**
 * Set active shape button
 * @param {string} buttonId - ID of the active button
 */
function setActiveShapeButton(buttonId) {
    shapeButtons.forEach(button => {
        if (button.id === buttonId) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// Button Event Listeners
document.getElementById('addButton').addEventListener('click', () => {
    eventModal.classList.remove('hidden');
    setTimeout(() => {
        eventModal.querySelector('.modal-container').classList.add('show');
    }, 10);
});

document.getElementById('backupButton').addEventListener('click', exportEvents);
document.getElementById('restoreButton').addEventListener('click', () => {
    backupFileInput.click();
});

backupFileInput.addEventListener('change', importEvents);

document.getElementById('cancelAddBtn').addEventListener('click', () => {
    eventModal.querySelector('.modal-container').classList.remove('show');
    setTimeout(() => {
        eventModal.classList.add('hidden');
    }, 200);
});

document.getElementById('cancelEditBtn').addEventListener('click', () => {
    editEventModal.querySelector('.modal-container').classList.remove('show');
    setTimeout(() => {
        editEventModal.classList.add('hidden');
    }, 200);
});

document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    deleteModal.querySelector('.modal-container').classList.remove('show');
    setTimeout(() => {
        deleteModal.classList.add('hidden');
    }, 200);
});

document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
    if (currentEventToDelete !== null) {
        deleteEvent(currentEventToDelete);
        deleteModal.querySelector('.modal-container').classList.remove('show');
        setTimeout(() => {
            deleteModal.classList.add('hidden');
        }, 200);
        currentEventToDelete = null;
    }
});

// Form Submission Handlers
document.getElementById('eventForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const newEvent = {
        id: Date.now(),
        type: document.getElementById('eventType').value,
        name: document.getElementById('eventName').value,
        date: new Date(document.getElementById('eventDate').value).getTime(),
        description: document.getElementById('eventDescription').value,
        createdAt: Date.now() // Store creation time for progress calculation
    };

    events.push(newEvent);
    
    // If it's a reminder, add to the beginning of the order array
    if (newEvent.type === 'event') {
        reminderOrder.unshift(newEvent.id);
        localStorage.setItem('reminderOrder', JSON.stringify(reminderOrder));
    }
    
    saveEvents();
    
    eventModal.querySelector('.modal-container').classList.remove('show');
    setTimeout(() => {
        eventModal.classList.add('hidden');
    }, 200);
    
    this.reset();
    renderEvents();
    showToast(`${newEvent.type === 'lifetime' ? 'Lifetime' : 'reminder'} added successfully`);
});

document.getElementById('editEventForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const eventId = parseInt(document.getElementById('editEventId').value);
    const index = events.findIndex(event => event.id === eventId);
    
    if (index !== -1) {
        const oldType = events[index].type;
        const updatedEvent = {
            id: eventId,
            type: document.getElementById('editEventType').value,
            name: document.getElementById('editEventName').value,
            date: new Date(document.getElementById('editEventDate').value).getTime(),
            description: document.getElementById('editEventDescription').value,
            createdAt: events[index].createdAt || Date.now() // Preserve or create creation time
        };
        
        // If type has changed to 'event', add to reminderOrder if not present
        if (oldType !== 'event' && updatedEvent.type === 'event') {
            if (!reminderOrder.includes(eventId)) {
                reminderOrder.unshift(eventId);
                localStorage.setItem('reminderOrder', JSON.stringify(reminderOrder));
            }
        }
        
        // If type has changed from 'event', remove from reminderOrder
        if (oldType === 'event' && updatedEvent.type !== 'event') {
            reminderOrder = reminderOrder.filter(id => id !== eventId);
            localStorage.setItem('reminderOrder', JSON.stringify(reminderOrder));
        }
        
        events[index] = updatedEvent;
        saveEvents();
        renderEvents();
        showToast(`${updatedEvent.type === 'lifetime' ? 'Lifetime' : 'reminder'} updated successfully`);
    }
    
    editEventModal.querySelector('.modal-container').classList.remove('show');
    setTimeout(() => {
        editEventModal.classList.add('hidden');
    }, 200);
});

/**
 * Save events to localStorage
 */
function saveEvents() {
    localStorage.setItem('events', JSON.stringify(events));
}

/**
 * Show toast notification with message
 * @param {string} message - Message to display
 */
function showToast(message) {
    toastNotification.textContent = message;
    toastNotification.classList.add('show');
    
    setTimeout(() => {
        toastNotification.classList.remove('show');
    }, 3000);
}

/**
 * Export events and settings to a JSON file for backup
 */
function exportEvents() {
    // Create a complete backup object including events, settings and order
    const backupData = {
        events: events,
        reminderOrder: reminderOrder,
        boxSettings: boxSettings,
        theme: currentTheme
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `reminders-backup-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showToast('Backup downloaded successfully');
}

/**
 * Import events and settings from a JSON file
 */
function importEvents(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            
            // Check if it's the new format with settings
            if (importedData.events && Array.isArray(importedData.events)) {
                events = importedData.events;
                
                // Ensure all events have createdAt property
                events.forEach(event => {
                    if (!event.createdAt) {
                        event.createdAt = Date.now();
                    }
                });
                
                // Import reminder order if available
                if (importedData.reminderOrder && Array.isArray(importedData.reminderOrder)) {
                    reminderOrder = importedData.reminderOrder;
                    localStorage.setItem('reminderOrder', JSON.stringify(reminderOrder));
                }
                
                // Import box settings if available
                if (importedData.boxSettings) {
                    boxSettings = importedData.boxSettings;
                    localStorage.setItem('boxSettings', JSON.stringify(boxSettings));
                    
                    // Update UI
                    sizeSlider.value = boxSettings.size;
                    setActiveShapeButton(`${boxSettings.shape}Btn`);
                }
                
                // Import theme if available
                if (importedData.theme) {
                    setTheme(importedData.theme);
                }
                
                saveEvents();
                renderEvents();
                showToast('All data restored successfully');
            } 
            // Old format (just events array)
            else if (Array.isArray(importedData)) {
                events = importedData;
                
                // Create reminder order from events
                const reminderIds = events
                    .filter(e => e.type === 'event')
                    .map(e => e.id);
                    
                reminderOrder = reminderIds;
                localStorage.setItem('reminderOrder', JSON.stringify(reminderOrder));
                
                saveEvents();
                renderEvents();
                showToast('Events restored successfully');
            } else {
                throw new Error('Invalid data format');
            }
        } catch (error) {
            showToast('Error: Could not restore from backup file');
            console.error('Import error:', error);
        }
    };
    
    reader.readAsText(file);
    e.target.value = null; // Clear the input
}

/**
 * Open edit event modal with event data
 * @param {number} eventId - ID of event to edit
 */
window.editEvent = function(eventId) {
    const event = events.find(e => e.id === eventId);
    if (event) {
        document.getElementById('editEventId').value = event.id;
        document.getElementById('editEventType').value = event.type;
        document.getElementById('editEventName').value = event.name;
        
        // Format date for datetime-local input
        const date = new Date(event.date);
        const formattedDate = date.toISOString().slice(0, 16);
        document.getElementById('editEventDate').value = formattedDate;
        
        document.getElementById('editEventDescription').value = event.description;
        
        editEventModal.classList.remove('hidden');
        setTimeout(() => {
            editEventModal.querySelector('.modal-container').classList.add('show');
        }, 10);
    }
}

/**
 * Show delete confirmation modal
 * @param {number} eventId - ID of event to delete
 */
window.showDeleteConfirmation = function(eventId) {
    currentEventToDelete = eventId;
    deleteModal.classList.remove('hidden');
    setTimeout(() => {
        deleteModal.querySelector('.modal-container').classList.add('show');
    }, 10);
}

/**
 * Delete event by ID
 * @param {number} eventId - ID of event to delete
 */
function deleteEvent(eventId) {
    const index = events.findIndex(event => event.id === eventId);
    if (index !== -1) {
        const eventType = events[index].type === 'lifetime' ? 'Lifetime' : 'reminder';
        
        // If it's a reminder, remove from order array
        if (events[index].type === 'event') {
            reminderOrder = reminderOrder.filter(id => id !== eventId);
            localStorage.setItem('reminderOrder', JSON.stringify(reminderOrder));
        }
        
        events.splice(index, 1);
        saveEvents();
        renderEvents();
        showToast(`${eventType} deleted successfully`);
    }
}

/**
 * Get appropriate color for event based on type and time
 * @param {Object} event - Event object
 * @returns {string} Color code
 */
function getColorForEvent(event) {
    const now = Date.now();
    const timeDiff = event.date - now;
    const isPast = timeDiff < 0;
    const hoursDiff = Math.abs(timeDiff) / (1000 * 60 * 60);
    
    if (event.type === 'lifetime') {
        return 'var(--lifetime-color)';
    } else if (event.type === 'event') {
        if (isPast) {
            return 'var(--reminder-past-color)';
        } else if (hoursDiff < 24) {
            return 'var(--reminder-soon-color)';
        } else {
            return 'var(--reminder-future-color)';
        }
    }
}

/**
 * Format date and time for display
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
function formatDateTime(date) {
    return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Format time units for display
 * @param {Object} timeObj - Time units object
 * @returns {string} Formatted time string
 */
function formatTimeDisplay(timeObj) {
    const sign = timeObj.isNegative ? '-' : '';
    const parts = [];
    
    // Only include non-zero time units
    if (timeObj.years > 0) parts.push(`${timeObj.years} year${timeObj.years !== 1 ? 's' : ''}`);
    if (timeObj.months > 0) parts.push(`${timeObj.months} month${timeObj.months !== 1 ? 's' : ''}`);
    if (timeObj.days > 0) parts.push(`${timeObj.days} day${timeObj.days !== 1 ? 's' : ''}`);
    if (timeObj.hours > 0) parts.push(`${timeObj.hours} hour${timeObj.hours !== 1 ? 's' : ''}`);
    if (timeObj.minutes > 0) parts.push(`${timeObj.minutes} minute${timeObj.minutes !== 1 ? 's' : ''}`);
    
    // Always include seconds
    parts.push(`${timeObj.seconds} second${timeObj.seconds !== 1 ? 's' : ''}`);
    
    return sign + parts.join(' ');
}

/**
 * Calculate time units between now and target date
 * @param {number} targetDate - Target date timestamp
 * @returns {Object} Time units object
 */
function calculateTimeUnits(targetDate) {
    const now = new Date();
    const targetDateTime = new Date(targetDate);
    const isNegative = targetDateTime < now;
    
    // Clone dates to prevent modification
    let date1 = new Date(Math.min(now, targetDateTime));
    let date2 = new Date(Math.max(now, targetDateTime));
    
    let years = date2.getFullYear() - date1.getFullYear();
    let months = date2.getMonth() - date1.getMonth();
    
    if (months < 0) {
        years--;
        months += 12;
    }
    
    // Set date1 to the same year/month as date2, then calculate days difference
    date1.setFullYear(date2.getFullYear());
    date1.setMonth(date2.getMonth());
    
    let days = date2.getDate() - date1.getDate();
    
    if (days < 0) {
        months--;
        // Get last day of previous month
        date1.setMonth(date2.getMonth() - 1);
        const lastDay = new Date(date1.getFullYear(), date1.getMonth() + 1, 0).getDate();
        days += lastDay;
    }
    
    // Set date1 to the same year/month/day as date2, then calculate hours/minutes/seconds
    date1.setFullYear(date2.getFullYear());
    date1.setMonth(date2.getMonth());
    date1.setDate(date2.getDate());
    
    let hours = date2.getHours() - date1.getHours();
    if (hours < 0) {
        days--;
        hours += 24;
    }
    
    let minutes = date2.getMinutes() - date1.getMinutes();
    if (minutes < 0) {
        hours--;
        minutes += 60;
    }
    
    let seconds = date2.getSeconds() - date1.getSeconds();
    if (seconds < 0) {
        minutes--;
        seconds += 60;
    }
    
    return {
        isNegative,
        years,
        months,
        days,
        hours,
        minutes,
        seconds
    };
}

/**
 * Calculate progress percentage for event based on 24hr scale or creation-to-deadline scale
 * @param {Object} event - Event object
 * @returns {Object} Progress data object with percentage and status
 */
function calculateProgress(event) {
    const now = Date.now();
    
    if (event.type === 'lifetime') {
        // For lifetime events, show full progress with animation
        return {
            progress: 100,
            status: 'lifetime'
        };
    } else if (event.type === 'event') {
        const deadlineTime = event.date;
        const isPast = now > deadlineTime;
        
        if (isPast) {
            // For past events, show full progress
            return {
                progress: 100,
                status: 'done'
            };
        }
        
        // Determine if we should use 24hr scale or creation-to-deadline scale
        const timeUntilDeadline = deadlineTime - now;
        const creationTime = event.createdAt || (now - 86400000); // Default to 24hrs ago if not set
        const totalTimeSpan = deadlineTime - creationTime;
        
        // Use 24hr scale if deadline is within 24hrs
        if (timeUntilDeadline <= 86400000) { // 24 hours in milliseconds
            // Calculate time passed in current day (from midnight)
            const currentDate = new Date();
            const startOfDay = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate()
            ).getTime();
            
            const totalDayDuration = 86400000; // 24 hours in milliseconds
            const elapsedToday = now - startOfDay;
            
            // Calculate position of deadline in the day
            const deadlineDate = new Date(deadlineTime);
            const deadlineToday = deadlineDate.getHours() * 3600000 + 
                                 deadlineDate.getMinutes() * 60000 + 
                                 deadlineDate.getSeconds() * 1000;
            
            // If deadline is today
            if (deadlineDate.toDateString() === currentDate.toDateString()) {
                const progressPercentage = (elapsedToday / deadlineToday) * 100;
                
                // Determine status based on how close we are to deadline
                let status;
                if (progressPercentage < 50) {
                    status = 'early';
                } else if (progressPercentage < 80) {
                    status = 'mid';
                } else {
                    status = 'late';
                }
                
                return {
                    progress: Math.min(progressPercentage, 100),
                    status: status,
                    deadlinePosition: (deadlineToday / totalDayDuration) * 100
                };
            } else {
                // Deadline is tomorrow or later but within 24hrs
                return {
                    progress: (elapsedToday / totalDayDuration) * 100,
                    status: 'early',
                    deadlinePosition: 100 // Show at end
                };
            }
        } else {
            // Use creation-to-deadline scale for longer events
            const elapsedTime = now - creationTime;
            const progressPercentage = (elapsedTime / totalTimeSpan) * 100;
            
            // Determine status based on how close we are to deadline
            let status;
            if (progressPercentage < 50) {
                status = 'early';
            } else if (progressPercentage < 80) {
                status = 'mid';
            } else {
                status = 'late';
            }
            
            return {
                progress: Math.min(progressPercentage, 100),
                status: status,
                deadlinePosition: 100 // Show at end
            };
        }
    }
    
    return {
        progress: 0,
        status: 'early'
    };
}

/**
 * Create aquarium-style progress bar HTML with deadline indicator
 * @param {Object} progressData - Progress data object
 * @param {string} eventType - Type of event ('lifetime' or 'event')
 * @param {number} deadlineTimestamp - Deadline timestamp
 * @returns {string} HTML for progress bar
 */
function createAquariumProgressBar(progressData, eventType, deadlineTimestamp) {
    const deadlineDate = new Date(deadlineTimestamp);
    const formattedDeadline = formatDateTime(deadlineDate);
    const deadlineIndicator = eventType === 'event' ? 
        `<div class="deadline-indicator" style="left: ${progressData.deadlinePosition || 100}%;">
            <div class="deadline-tooltip">Deadline: ${formattedDeadline}</div>
         </div>` : '';
    
    return `
        <div class="progress-container">
            <div class="progress-fill ${progressData.status}" style="width: ${progressData.progress}%;">
                <div class="aquarium-water">
                    <div class="water-surface"></div>
                    <div class="bubble bubble-1"></div>
                    <div class="bubble bubble-2"></div>
                    <div class="bubble bubble-3"></div>
                    <div class="bubble bubble-4"></div>
                    <div class="water-flow ${eventType === 'lifetime' ? 'lifetime-water' : ''}"></div>
                </div>
            </div>
            ${deadlineIndicator}
        </div>
    `;
}

/**
 * Render all events based on current view
 */
function renderEvents() {
    // Sort events based on type and order
    let sortedEvents = [...events];
    
    // First separate lifetimes and reminders
    const lifetimeEvents = sortedEvents.filter(e => e.type === 'lifetime');
    const reminderEvents = sortedEvents.filter(e => e.type === 'event');
    
    // Sort lifetimes by date
    lifetimeEvents.sort((a, b) => a.date - b.date);
    
    // Sort reminders according to the order array
    reminderEvents.sort((a, b) => {
        const indexA = reminderOrder.indexOf(a.id);
        const indexB = reminderOrder.indexOf(b.id);
        
        // If both events are in the order array, sort by their position
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }
        
        // If only one is in the order array, prioritize it
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        
        // If neither is in the order array, sort by date
        return a.date - b.date;
    });
    
    // Combine lifetimes first, then reminders
    sortedEvents = [...lifetimeEvents, ...reminderEvents];

    // Clear containers
    lifetimesContainer.innerHTML = '';
    eventsContainer.innerHTML = '';
    
    // Hide containers based on current view
    if (currentView === 'lifetimes') {
        document.querySelector('.section-container:nth-child(1)').style.display = 'block';
        document.querySelector('.section-container:nth-child(2)').style.display = 'none';
    } else if (currentView === 'events') {
        document.querySelector('.section-container:nth-child(1)').style.display = 'none';
        document.querySelector('.section-container:nth-child(2)').style.display = 'block';
    } else {
        document.querySelector('.section-container:nth-child(1)').style.display = 'block';
        document.querySelector('.section-container:nth-child(2)').style.display = 'block';
    }

    // Render each event
    sortedEvents.forEach(event => {
        if ((currentView === 'all') || 
            (currentView === 'lifetimes' && event.type === 'lifetime') || 
            (currentView === 'events' && event.type === 'event')) {
            
            const baseColor = getColorForEvent(event);
            const progressData = calculateProgress(event);
            const timeUnits = calculateTimeUnits(event.date);
            const timeDisplay = formatTimeDisplay(timeUnits);
            const progressBar = createAquariumProgressBar(progressData, event.type, event.date);
            
            const card = document.createElement('div');
            card.className = `event-card p-4 mb-4 ${boxSettings.shape}`;
            card.style.backgroundColor = baseColor;
            card.setAttribute('data-id', event.id);
            
            // Apply size based on settings
            if (boxSettings.shape === 'square') {
                card.style.width = `${boxSettings.size}px`;
                card.style.height = `${boxSettings.size}px`;
            } else {
                card.style.width = `${boxSettings.size}px`;
                card.style.height = 'auto';
            }
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-bold title-text">${event.name}</h3>
                    <div class="flex gap-2">
                        <button onclick="editEvent(${event.id})" class="btn-edit focus:outline-none" title="Edit">
                            ✏️
                        </button>
                        <button onclick="showDeleteConfirmation(${event.id})" class="btn-delete focus:outline-none" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
                <p class="mb-3 description-text">${event.description}</p>
                ${progressBar}
                <p class="text-sm font-semibold">${timeDisplay}</p>
            `;
            
            // Add to appropriate container
            if (event.type === 'lifetime') {
                lifetimesContainer.appendChild(card);
            } else {
                eventsContainer.appendChild(card);
            }
        }
    });
    
    // Make sure the order includes all current reminder IDs
    const currentreminderIds = events
        .filter(e => e.type === 'event')
        .map(e => e.id);
        
    // Add any missing IDs to the order
    currentreminderIds.forEach(id => {
        if (!reminderOrder.includes(id)) {
            reminderOrder.push(id);
        }
    });
    
    // Remove any IDs that no longer exist
    reminderOrder = reminderOrder.filter(id => 
        currentreminderIds.includes(id)
    );
    
    localStorage.setItem('reminderOrder', JSON.stringify(reminderOrder));
}

// Create a basic about.html structure if it doesn't exist
function createAboutPage() {
    const content = `
<!DOCTYPE html>
<html lang="en" class="dark-theme">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About Eternal Echoes App</title>
    <link rel="stylesheet" href="styles.css">
    <style>
        :root {
            --primary: #3A86FF;
            --secondary: #FF3E6C;
            --dark: #001F3F;
            --light: #F8F9FA;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: var(--dark);
            background-color: var(--light);
        }
        
        .about-container {
            max-width: 800px;
            margin: 2rem auto;
            padding: 2rem;
            background-color: var(--card-bg);
            border-radius: 1rem;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        h1, h2, h3 {
            color: var(--primary);
        }
        
        .feature-list li {
            margin-bottom: 0.75rem;
            padding-left: 1.5rem;
            position: relative;
        }
        
        .feature-list li::before {
            content: '•';
            position: absolute;
            left: 0;
            color: var(--secondary);
        }
        
        .highlight {
            color: var(--secondary);
            font-weight: bold;
        }
        
        .back-link {
            display: inline-block;
            padding: 0.5rem 1rem;
            background-color: var(--primary);
            color: white;
            text-decoration: none;
            border-radius: 0.5rem;
            font-weight: bold;
            transition: all 0.3s ease;
        }
        
        .back-link:hover {
            background-color: var(--secondary);
        }
        
        .faq-section {
            margin-top: 2rem;
        }
        
        .faq-item {
            margin-bottom: 1rem;
            border-bottom: 1px solid var(--secondary);
            padding-bottom: 1rem;
        }
        
        .faq-question {
            font-weight: bold;
            color: var(--primary);
            cursor: pointer;
        }
        
        .faq-answer {
            margin-top: 0.5rem;
            display: none;
        }
    </style>
</head>
<body>
    <div class="about-container">
        <h1>About Eternal Echoes App</h1>
        <div class="about-container">
            <div class="about-section">
                <h2 class="text-xl font-bold mb-3">About Developer</h2>
                <p>As a passionate UI/UX designer, I've poured my heart and soul into crafting Eternal Echoes, an app that revolutionizes how we perceive and interact with time. My design methodology centers around two core principles: visual time awareness and dynamic progress tracking. These aren't just buzzwords – they're the foundation of an interface that transforms abstract temporal concepts into tangible, interactive experiences.</p>
                <p>In developing Eternal Echoes, I've strived to create more than just another productivity tool. I wanted to build a digital sanctuary where users can reflect on their journey through time, celebrate ongoing processes, and manage approaching deadlines with ease and clarity. Every element, from the soothing aquarium-style animations to the intuitive color-coding system, has been meticulously crafted to provide instant visual feedback without overwhelming the user. This approach marries form and function, turning time management from a chore into an engaging, almost meditative experience.</p>
            </div>
        
            <div class="about-section">
                <h2 class="text-xl font-bold mb-3">Bringing Eternal Echoes to Your Desktop</h2>
                <p>Eternal Echoes isn't just a web app – it's a full-fledged desktop application, thanks to the power of Tauri and Rust. By choosing Tauri, a toolkit for building small, fast, and secure desktop applications, I've been able to leverage the best of both worlds: the flexibility of web technologies and the performance of native code.</p>
                <p>Rust, the language powering Tauri, brings unparalleled speed and memory safety to Eternal Echoes. This means you get lightning-fast performance, even when dealing with complex time calculations or large datasets. The app's small footprint (typically under 10MB) ensures quick installation and minimal resource usage, while still providing a rich, responsive user experience. With Tauri's security-focused architecture, your time data remains private and protected, giving you peace of mind as you plan and reflect on your journey through time.</p>
            </div>
        </div>
        
                <div class="about-section">
                    <h2 class="text-xl font-bold mb-3">Core Features</h2>
                    <ul class="feature-list">
                        <li><strong>Dynamic Time Visualization:</strong> Watch as the aquarium-style progress bars fill with animated water, bubbles, and surface waves, providing an intuitive sense of time's passage.</li>
                        <li><strong>Dual Tracking Systems:</strong> Monitor both "Lifetimes" (ongoing events from the past) and "reminders" (upcoming deadlines).</li>
                        <li><strong>Adaptive Progress Calculation:</strong> Progress bars intelligently scale based on deadline proximity - using 24-hour scale for imminent deadlines and creation-to-deadline scale for longer-term events.</li>
                        <li><strong>Color-Coded Status:</strong> Events dynamically change color from green to yellow to red as deadlines approach, providing visual urgency cues.</li>
                        <li><strong>Drag-and-Drop Prioritization:</strong> Rearrange your reminders by dragging them to reflect your priorities, with order preserved across sessions.</li>
                        <li><strong>Deadline Indicators:</strong> Precise time markers show exactly when deadlines occur on the progress scale.</li>
                        <li><strong>Precise Time Calculations:</strong> Down-to-the-second counting for both elapsed time and time remaining.</li>
                        <li><strong>Theme Support:</strong> Choose between Light, Dark, and Blue themes to match your preference and reduce eye strain.</li>
                        <li><strong>Customizable Box Display:</strong> Adjust both the shape (square or rectangle) and size of your cards to optimize your view.</li>
                        <li><strong>Complete Data Backup:</strong> Export and import all your events, settings, and priority order in a single JSON file.</li>
                    </ul>
                </div>
        <div class="about-section">
            <h2>Design Philosophy</h2>
            <p>Eternal Echoes is designed to revolutionize how we perceive and interact with time. Our unique approach focuses on <span class="highlight">visual time awareness and dynamic progress tracking</span>, offering a fresh alternative to traditional calendar and todo applications.</p>
            <p>At the heart of our philosophy is the concept of <span class="highlight">"Lifetimes"</span> - a way to visualize and cherish the significant moments of your life. Whether it's tracking the years since a major milestone or counting down to a future event, Lifetimes allow you to see your cherished moments all in one place, celebrating how far you've come and anticipating what's ahead.</p>
            <p>By distinguishing between ongoing processes (Lifetimes) and approaching deadlines (Reminders), we help you both celebrate duration and manage upcoming obligations, creating a holistic view of your temporal landscape.</p>
        </div>
        
        <!-- Existing sections (Core Features, Time Visualization, etc.) remain unchanged -->

        
                
                <div class="about-section">
                    <h2 class="text-xl font-bold mb-3">Time Visualization</h2>
                    <p>The heart of the reminders app is our visual time tracking system:</p>
                    <ul class="feature-list">
                        <li><strong>Aquarium Animation:</strong> Watch as water flows with realistic movement, complete with rising bubbles and surface waves.</li>
                        <li><strong>Adaptive Progress:</strong> Progress bars intelligently adjust their filling rate based on deadline proximity.</li>
                        <li><strong>Color Transitions:</strong> reminders smoothly transition from green (early) to yellow (approaching) to red (urgent) as deadlines near.</li>
                        <li><strong>Deadline Markers:</strong> Hoverable indicators show exactly when a deadline will occur, with precise date and time information.</li>
                    </ul>
                </div>
                
                <div class="about-section">
                    <h2 class="text-xl font-bold mb-3">Customization Options</h2>
                    <p>Personalize your experience with multiple customization options:</p>
                    <ul class="feature-list">
                        <li><strong>Themes:</strong> Switch between Light theme (for daytime use), Dark theme (for reduced eye strain), and Blue theme (for a professional look).</li>
                        <li><strong>Card Shape:</strong> Choose between rectangle cards (more space for content) or square cards (uniform grid appearance).</li>
                        <li><strong>Card Size:</strong> Adjust how large your cards appear using the slider, from compact to spacious.</li>
                        <li><strong>View Filters:</strong> Toggle between viewing all items, only lifetimes, or only reminders.</li>
                        <li><strong>Priority Order:</strong> Drag and drop reminder cards to arrange them in your preferred order of importance.</li>
                    </ul>
                </div>
                
                <div class="about-section">
                    <h2 class="text-xl font-bold mb-3">Using the App</h2>
                    <h3 class="text-lg font-bold mb-2">Adding New Items</h3>
                    <p>Click the + button in the bottom-right corner to create new entries. You can choose between:</p>
                    <ul class="feature-list">
                        <li><strong>Lifetime:</strong> For tracking ongoing events or processes since they began, like "Years since graduation" or "Time at current job".</li>
                        <li><strong>reminder:</strong> For tracking upcoming deadlines or countdowns, like "Project deadline" or "Days until vacation".</li>
                    </ul>
                    
                    <h3 class="text-lg font-bold mb-2 mt-4">Managing Your Items</h3>
                    <ul class="feature-list">
                        <li><strong>Edit:</strong> Use the edit button (✏️) on any card to modify its details.</li>
                        <li><strong>Delete:</strong> Use the delete button (🗑️) to remove items you no longer need.</li>
                        <li><strong>Prioritize:</strong> Drag reminder cards to rearrange them in your preferred order.</li>
                        <li><strong>Filter View:</strong> Use the navigation buttons at the top to filter which types of items you see.</li>
                    </ul>
                    
                    <h3 class="text-lg font-bold mb-2 mt-4">Customizing Display</h3>
                    <ul class="feature-list">
                        <li>Click the size toggle button (📏) to adjust card size and shape.</li>
                        <li>Use the theme buttons (☀️, 🌙, 🔵) to switch between color themes.</li>
                    </ul>
                    
                    <h3 class="text-lg font-bold mb-2 mt-4">Data Management</h3>
                    <ul class="feature-list">
                        <li>Download a backup of all your data using the backup button (💾).</li>
                        <li>Restore your data from a backup file using the restore button (📤).</li>
                        <li>Your data is automatically stored in your browser's local storage between sessions.</li>
                    </ul>
                </div>
                
                <div class="about-section">
                    <h2 class="text-xl font-bold mb-3">Progress Bar System</h2>
                    <p>The reminders app uses an intelligent progress calculation system:</p>
                    <ul class="feature-list">
                        <li><strong>Lifetimes:</strong> Always show 100% progress with a flowing water animation, emphasizing the ongoing nature.</li>
                        <li><strong>24-Hour Scale:</strong> For deadlines within the next 24 hours, progress is calculated based on the current time of day relative to the deadline time.</li>
                        <li><strong>Long-term Scale:</strong> For deadlines further in the future, progress is calculated as the proportion of time elapsed since creation compared to the total time span.</li>
                        <li><strong>Dynamic Coloring:</strong> Progress bars change color based on completion percentage:
                            <ul>
                                <li>Green (< 50% complete): Plenty of time remaining</li>
                                <li>Yellow (50-80% complete): Approaching deadline</li>
                                <li>Red (> 80% complete): Urgent attention needed</li>
                                <li>Gray (100% complete): Deadline has passed</li>
                            </ul>
                        </li>
                    </ul>
                </div>
                
                <div class="about-section">
                    <h2 class="text-xl font-bold mb-3">Tips and Best Practices</h2>
                    <ul class="feature-list">
                        <li>Use Lifetimes to track meaningful ongoing processes in your life or career.</li>
                        <li>Use reminders to keep track of approaching deadlines or important events.</li>
                        <li>Drag your most important reminders to the top of the list.</li>
                        <li>Create regular backups to ensure you never lose your data.</li>
                        <li>Use the different themes based on your environment and time of day to reduce eye strain.</li>
                        <li>Hover over deadline indicators to see the exact date and time.</li>
                        <li>Check the app regularly to stay aware of approaching deadlines.</li>
                    </ul>
                
        <div class="faq-section">
            <h2>Frequently Asked Questions</h2>
            <div class="faq-item">
                <div class="faq-question">What makes Eternal Echoes different from other reminder apps?</div>
                <div class="faq-answer">Eternal Echoes stands out with its unique visual time awareness features, including aquarium-style progress bars and the concept of "Lifetimes" for long-term event tracking.</div>
            </div>
            <div class="faq-item">
                <div class="faq-question">Can I use Eternal Echoes on multiple devices?</div>
                <div class="faq-answer">While Eternal Echoes currently stores data locally, you can use the backup and restore feature to transfer your data between devices.</div>
            </div>
            <div class="faq-item">
                <div class="faq-question">How does the "Lifetimes" feature work?</div>
                <div class="faq-answer">Lifetimes allow you to track ongoing events or processes since they began, providing a visual representation of elapsed time and helping you cherish long-term memories or achievements.</div>
            </div>
            <div class="faq-item">
                <div class="faq-question">Is my data secure?</div>
                <div class="faq-answer">Your data is stored locally on your device. We recommend regularly using the backup feature to ensure you never lose your important information.</div>
            </div>
        </div>
        
        <a href="index.html" class="back-link">← Back to App</a>
    </div>
    
    <script>
        // Simple FAQ toggle functionality
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                answer.style.display = answer.style.display === 'block' ? 'none' : 'block';
            });
        });
    </script>
</body>
</html>


    `;
    
    try {
        const blob = new Blob([content], {type: 'text/html'});
        const url = URL.createObjectURL(blob);
        
        // Only create if user navigates to the know-me link and about.html doesn't exist
        document.querySelector('.know-me-link').addEventListener('click', function(e) {
            // Check if about.html exists (we can't reliably do this due to security restrictions)
            // Instead, we'll just open our generated version in a new tab
            const newTab = window.open(url, '_blank');
            if (!newTab) {
                showToast('Please allow popups to view the About page');
            }
            e.preventDefault();
        });
    } catch (e) {
        console.error('Could not create about page template', e);
    }
}

// Initialize app and update every second
// Set initial active button
setActiveNavButton('allButton');
renderEvents();
setInterval(renderEvents, 1000);
applyBoxSettings();
createAboutPage();
