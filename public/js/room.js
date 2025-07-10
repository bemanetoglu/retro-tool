// Room page functionality with WebSocket support
let socket;
let roomCode;
let isCreator = false;
let timeRemaining = null;
let timeInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    roomCode = RetroToolCommon.getCurrentRoomCode();
    
    if (!roomCode) {
        RetroToolCommon.showError('Geçersiz oda linki');
        setTimeout(() => {
            RetroToolCommon.goHome();
        }, 2000);
        return;
    }
    
    // Initialize WebSocket connection
    initializeSocket();
    
    // Load initial room data
    loadRoomData();
    
    // Set up timer update
    setInterval(updateTimer, 1000);
});

// Initialize Socket.IO connection
function initializeSocket() {
    socket = io();
    
    socket.on('connect', function() {
        console.log('Connected to server');
        socket.emit('joinRoom', roomCode);
    });
    
    socket.on('disconnect', function() {
        console.log('Disconnected from server');
        // Try to reconnect
        setTimeout(() => {
            if (socket.disconnected) {
                socket.connect();
            }
        }, 1000);
    });
    
    socket.on('error', function(error) {
        console.error('Socket error:', error);
        RetroToolCommon.showError('Bağlantı hatası: ' + error);
    });
    
    socket.on('roomState', function(data) {
        updateRoomDisplay(data);
        isCreator = data.isCreator;
        
        if (isCreator) {
            document.getElementById('creatorActions').style.display = 'block';
        }
    });
    
    socket.on('newEntry', function(data) {
        addEntryToDOM(data.category, data.entry);
    });
    
    socket.on('entryUnpublished', function(data) {
        removeEntryFromDOM(data.category, data.entryId);
    });
    
    socket.on('participantUpdate', function(data) {
        updateParticipantCount(data.count, data.limit);
        updateParticipantsList(data.participants);
    });
    
    socket.on('timeExtended', function(data) {
        RetroToolCommon.showSuccess('Zaman uzatıldı!');
        // Will be updated by next timer tick
    });
    
    socket.on('roomReopened', function() {
        RetroToolCommon.showSuccess('Oda yeniden açıldı!');
        // Refresh room data
        loadRoomData();
    });
    
    socket.on('entryToggled', function(data) {
        updateEntrySelection(data.category, data.entryId, data.selected);
    });
    
    socket.on('roomTerminated', function() {
        RetroToolCommon.showModal('terminatedModal');
        // Disable all input fields
        document.querySelectorAll('textarea, button').forEach(el => {
            if (!el.classList.contains('modal') && !el.closest('.modal')) {
                el.disabled = true;
            }
        });
    });
}

// Load room data from server
async function loadRoomData() {
    try {
        const response = await RetroToolCommon.apiRequest(`/api/room/${roomCode}`);
        const room = response.room;
        
        // Update room info
        document.getElementById('roomName').textContent = room.name;
        isCreator = room.isCreator;
        timeRemaining = room.timeRemaining;
        
        // Store current username for entry comparison
        // Try to get from participants first, then from entries
        if (room.participants && room.participants.length > 0) {
            const currentUser = room.participants.find(p => p.isCreator === room.isCreator);
            if (currentUser) {
                window.currentUsername = currentUser.username;
            } else {
                window.currentUsername = await getCurrentUsernameFromParticipants();
            }
        } else {
            window.currentUsername = getCurrentUsernameFromEntries(room.entries);
        }
        
        // Show creator actions if user is creator
        if (isCreator) {
            document.getElementById('creatorActions').style.display = 'block';
        }
        
        // Update participant count and list
        updateParticipantCount(room.participantCount, room.participantLimit);
        updateParticipantsList(room.participants);
        
        // Check if room is terminated
        if (room.terminated) {
            RetroToolCommon.showModal('terminatedModal');
            // Disable all input fields
            document.querySelectorAll('textarea, button').forEach(el => {
                if (!el.classList.contains('modal') && !el.closest('.modal')) {
                    el.disabled = true;
                }
            });
        }
        
        // Load entries
        updateRoomDisplay({
            entries: room.entries,
            isCreator: isCreator,
            shouldShowAllEntries: room.shouldShowAllEntries
        });
        
    } catch (error) {
        console.error('Error loading room data:', error);
        
        // If user is not authenticated (hasn't joined), redirect to join page
        if (error.message.includes('Access denied') || error.message.includes('403')) {
            RetroToolCommon.showError('Önce odaya katılmanız gerekiyor');
            setTimeout(() => {
                window.location.href = `/join/${roomCode}`;
            }, 2000);
        } else {
            RetroToolCommon.showError('Oda verileri yüklenirken hata oluştu');
            setTimeout(() => {
                RetroToolCommon.goHome();
            }, 3000);
        }
    }
}

// Update room display
function updateRoomDisplay(data) {
    const categories = ['mad', 'sad', 'glad'];
    
    categories.forEach(category => {
        const entriesContainer = document.getElementById(`${category}Entries`);
        entriesContainer.innerHTML = '';
        
        if (data.entries && data.entries[category]) {
            data.entries[category].forEach(entry => {
                addEntryToDOM(category, entry, true);
            });
        }
    });
}

// Add entry to DOM
function addEntryToDOM(category, entry, isInitial = false) {
    const entriesContainer = document.getElementById(`${category}Entries`);
    const entryElement = document.createElement('div');
    entryElement.className = `entry ${category}`;
    entryElement.dataset.entryId = entry.id;
    
    if (entry.selected) {
        entryElement.classList.add('selected');
    }
    
    // Check if this is current user's entry
    const isOwnEntry = entry.username === getCurrentUsername();
    
    // Add draft/published styling
    let publishButton = '';
    let draftIndicator = '';
    
    if (isOwnEntry) {
        if (entry.draft) {
            entryElement.classList.add('draft');
            draftIndicator = '<span class="draft-indicator">📝 Taslak</span>';
        } else {
            entryElement.classList.add('published');
            draftIndicator = '<span class="published-indicator">✅ Yayınlandı</span>';
        }
        
        publishButton = `
            <button class="publish-btn ${entry.published ? 'published' : 'draft'}" 
                    onclick="togglePublish('${category}', '${entry.id}', ${entry.published})">
                ${entry.published ? '🔓 Geri Al' : '📢 Yayınla'}
            </button>
        `;
    }
    
    entryElement.innerHTML = `
        <div class="entry-content">${RetroToolCommon.sanitizeHTML(entry.text)}</div>
        <div class="entry-meta">
            <span class="entry-username">${RetroToolCommon.sanitizeHTML(entry.username)}</span>
            ${draftIndicator}
            ${isCreator ? `<input type="checkbox" class="entry-checkbox" ${entry.selected ? 'checked' : ''} onchange="toggleEntry('${category}', '${entry.id}')">` : ''}
        </div>
        ${publishButton}
    `;
    
    entriesContainer.appendChild(entryElement);
    
    // Animate entry if it's new
    if (!isInitial) {
        entryElement.style.transform = 'translateX(-100%)';
        entryElement.style.opacity = '0';
        
        setTimeout(() => {
            entryElement.style.transition = 'all 0.3s ease';
            entryElement.style.transform = 'translateX(0)';
            entryElement.style.opacity = '1';
        }, 10);
    }
}

// Remove entry from DOM (for unpublished entries)
function removeEntryFromDOM(category, entryId) {
    const entryElement = document.querySelector(`[data-entry-id="${entryId}"]`);
    if (entryElement) {
        entryElement.style.transition = 'all 0.3s ease';
        entryElement.style.transform = 'translateX(100%)';
        entryElement.style.opacity = '0';
        
        setTimeout(() => {
            entryElement.remove();
        }, 300);
    }
}

// Get current username from session
function getCurrentUsername() {
    // We'll store the username when the page loads
    return window.currentUsername || 'Unknown';
}

// Toggle publish state for entry
async function togglePublish(category, entryId, isCurrentlyPublished) {
    try {
        const response = await RetroToolCommon.apiRequest(`/api/room/${roomCode}/entry/${entryId}/publish`, {
            method: 'POST'
        });
        
        // Update the entry in DOM
        const entryElement = document.querySelector(`[data-entry-id="${entryId}"]`);
        if (entryElement) {
            const publishBtn = entryElement.querySelector('.publish-btn');
            const draftIndicator = entryElement.querySelector('.draft-indicator, .published-indicator');
            
            if (response.published) {
                // Now published
                publishBtn.textContent = '🔓 Geri Al';
                publishBtn.classList.remove('draft');
                publishBtn.classList.add('published');
                
                if (draftIndicator) {
                    draftIndicator.textContent = '✅ Yayınlandı';
                    draftIndicator.className = 'published-indicator';
                }
                
                entryElement.classList.remove('draft');
                entryElement.classList.add('published');
                
                RetroToolCommon.showSuccess('Giriş yayınlandı!');
            } else {
                // Now draft
                publishBtn.textContent = '📢 Yayınla';
                publishBtn.classList.remove('published');
                publishBtn.classList.add('draft');
                
                if (draftIndicator) {
                    draftIndicator.textContent = '📝 Taslak';
                    draftIndicator.className = 'draft-indicator';
                }
                
                entryElement.classList.remove('published');
                entryElement.classList.add('draft');
                
                RetroToolCommon.showSuccess('Giriş taslağa alındı!');
            }
        }
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Update participant count
function updateParticipantCount(count, limit) {
    const participantElement = document.getElementById('participantCount');
    
    if (limit) {
        participantElement.textContent = `👥 ${count}/${limit} katılımcı`;
    } else {
        participantElement.textContent = `👥 ${count} katılımcı`;
    }
}

// Update participants list
function updateParticipantsList(participants) {
    const participantsList = document.getElementById('participantsList');
    
    if (!participants || participants.length === 0) {
        participantsList.innerHTML = '<div class="participant-item">Henüz katılımcı yok</div>';
        return;
    }
    
    participantsList.innerHTML = '';
    
    participants.forEach(participant => {
        const participantItem = document.createElement('div');
        participantItem.className = `participant-item ${participant.isCreator ? 'creator' : ''}`;
        
        participantItem.innerHTML = `
            <span class="participant-icon">${participant.isCreator ? '👑' : '👤'}</span>
            <span class="participant-name">${RetroToolCommon.sanitizeHTML(participant.username)}</span>
            ${participant.isCreator ? '<span class="creator-badge">Sahip</span>' : ''}
        `;
        
        participantsList.appendChild(participantItem);
    });
}

// Update timer display
function updateTimer() {
    if (timeRemaining !== null && timeRemaining > 0) {
        const timeElement = document.getElementById('timeRemaining');
        timeElement.textContent = RetroToolCommon.formatTimeRemaining(timeRemaining);
        timeRemaining -= 1000;
        
        if (timeRemaining <= 0) {
            RetroToolCommon.showModal('timeExpiredModal');
        }
    }
}

// Add entry function
async function addEntry(category) {
    const input = document.getElementById(`${category}Input`);
    const text = input.value.trim();
    
    // Check if input is disabled (room terminated)
    if (input.disabled) {
        RetroToolCommon.showError('Retrospektif sonlandırıldı, yeni giriş yapılamaz');
        return;
    }
    
    if (!text) {
        RetroToolCommon.showError('Lütfen bir metin girin');
        input.focus();
        return;
    }
    
    if (text.length > 500) {
        RetroToolCommon.showError('Metin 500 karakterden uzun olamaz');
        input.focus();
        return;
    }
    
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/entry`, {
            method: 'POST',
            body: JSON.stringify({
                category: category,
                text: text
            })
        });
        
        // Clear input
        input.value = '';
        
        // Success feedback
        input.style.borderColor = '#48bb78';
        setTimeout(() => {
            input.style.borderColor = '#e2e8f0';
        }, 1000);
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
        input.focus();
    }
}

// Toggle entry selection (creator only)
async function toggleEntry(category, entryId) {
    if (!isCreator) return;
    
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/toggle-entry`, {
            method: 'POST',
            body: JSON.stringify({
                category: category,
                entryId: entryId
            })
        });
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Update entry selection in DOM
function updateEntrySelection(category, entryId, selected) {
    const entryElement = document.querySelector(`[data-entry-id="${entryId}"]`);
    if (entryElement) {
        const checkbox = entryElement.querySelector('.entry-checkbox');
        if (checkbox) {
            checkbox.checked = selected;
        }
        
        if (selected) {
            entryElement.classList.add('selected');
        } else {
            entryElement.classList.remove('selected');
        }
    }
}

// Extend time (creator only)
async function extendTime() {
    if (!isCreator) return;
    
    const additionalMinutes = prompt('Kaç dakika eklemek istiyorsunuz?', '15');
    if (!additionalMinutes) return;
    
    const minutes = parseInt(additionalMinutes);
    if (isNaN(minutes) || minutes < 1 || minutes > 60) {
        RetroToolCommon.showError('Geçerli bir dakika değeri girin (1-60)');
        return;
    }
    
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/extend-time`, {
            method: 'POST',
            body: JSON.stringify({
                additionalMinutes: minutes
            })
        });
        
        // Refresh room data to get updated time
        loadRoomData();
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Reopen room (creator only)
async function reopenRoom() {
    if (!isCreator) return;
    
    if (!confirm('Odayı yeniden açmak istediğinizden emin misiniz? Bu durumda zaman sınırı kaldırılacaktır.')) {
        return;
    }
    
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/reopen`, {
            method: 'POST'
        });
        
        // Refresh room data
        loadRoomData();
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Terminate room (creator only)
async function terminateRoom() {
    if (!isCreator) return;
    
    if (!confirm('Retrospektifi sonlandırmak istediğinizden emin misiniz? Bu işlem geri alınamaz ve tüm katılımcılar için giriş engellenecektir.')) {
        return;
    }
    
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/terminate`, {
            method: 'POST'
        });
        
        RetroToolCommon.showSuccess('Retrospektif sonlandırıldı');
        
        // Refresh room data
        loadRoomData();
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Export selected entries (creator only)
async function exportSelected() {
    if (!isCreator) return;
    
    try {
        const response = await fetch(`/api/room/${roomCode}/export`);
        
        if (!response.ok) {
            throw new Error('Export failed');
        }
        
        // Create download link
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `retro-${roomCode}-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        RetroToolCommon.showSuccess('Excel dosyası indirildi!');
        
    } catch (error) {
        RetroToolCommon.showError('Export başarısız: ' + error.message);
    }
}

// Close modal
function closeModal(modalId) {
    RetroToolCommon.closeModal(modalId);
}

// Handle Enter key in textareas
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter' && !event.shiftKey && event.target.tagName === 'TEXTAREA') {
        event.preventDefault();
        
        // Find which category this textarea belongs to
        const textarea = event.target;
        const category = textarea.id.replace('Input', '');
        
        if (['mad', 'sad', 'glad'].includes(category)) {
            addEntry(category);
        }
    }
});

// Handle keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl+1, Ctrl+2, Ctrl+3 to focus on different categories
    if (event.ctrlKey || event.metaKey) {
        if (event.key === '1') {
            event.preventDefault();
            document.getElementById('madInput').focus();
        } else if (event.key === '2') {
            event.preventDefault();
            document.getElementById('sadInput').focus();
        } else if (event.key === '3') {
            event.preventDefault();
            document.getElementById('gladInput').focus();
        }
    }
    
    // Escape to go home
    if (event.key === 'Escape') {
        event.preventDefault();
        if (confirm('Odadan çıkmak istediğinizden emin misiniz?')) {
            RetroToolCommon.goHome();
        }
    }
});

// Add character counters to textareas
document.addEventListener('DOMContentLoaded', function() {
    const textareas = document.querySelectorAll('textarea');
    
    textareas.forEach(textarea => {
        const container = textarea.closest('.add-entry');
        const counter = document.createElement('small');
        counter.style.color = '#718096';
        counter.style.fontSize = '0.8rem';
        counter.style.float = 'right';
        counter.style.marginTop = '0.5rem';
        counter.textContent = '0/500 karakter';
        
        container.appendChild(counter);
        
        textarea.addEventListener('input', function() {
            const length = this.value.length;
            counter.textContent = `${length}/500 karakter`;
            
            if (length > 500) {
                counter.style.color = '#f56565';
                this.style.borderColor = '#f56565';
            } else if (length > 400) {
                counter.style.color = '#ed8936';
                this.style.borderColor = '#ed8936';
            } else {
                counter.style.color = '#718096';
                this.style.borderColor = '#e2e8f0';
            }
        });
    });
});

// Auto-resize textareas
document.addEventListener('DOMContentLoaded', function() {
    const textareas = document.querySelectorAll('textarea');
    
    textareas.forEach(textarea => {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = this.scrollHeight + 'px';
        });
    });
});

// Handle connection loss
window.addEventListener('beforeunload', function() {
    if (socket) {
        socket.disconnect();
    }
});

// Handle page visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, pause timer updates
        if (timeInterval) {
            clearInterval(timeInterval);
            timeInterval = null;
        }
    } else {
        // Page is visible, resume timer updates and refresh data
        if (!timeInterval) {
            setInterval(updateTimer, 1000);
        }
        loadRoomData();
    }
});

// Add tooltips for creator actions
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (isCreator) {
            const extendButton = document.querySelector('[onclick="extendTime()"]');
            const reopenButton = document.querySelector('[onclick="reopenRoom()"]');
            const terminateButton = document.querySelector('[onclick="terminateRoom()"]');
            const exportButton = document.querySelector('[onclick="exportSelected()"]');
            
            if (extendButton) {
                extendButton.title = 'Retrospektif süresini uzatın';
            }
            if (reopenButton) {
                reopenButton.title = 'Zaman sınırını kaldırıp odayı yeniden açın';
            }
            if (terminateButton) {
                terminateButton.title = 'Retrospektifi erken sonlandırın';
            }
            if (exportButton) {
                exportButton.title = 'Seçili girdileri Excel olarak indirin';
            }
        }
    }, 1000);
});

// Extract current username from entries
function getCurrentUsernameFromEntries(entries) {
    // Try to find an entry that belongs to current user
    // Since entries are now filtered, we need to be more careful
    
    // First, check if we have any entries at all
    const allEntries = [];
    for (const category of ['mad', 'sad', 'glad']) {
        if (entries[category]) {
            allEntries.push(...entries[category]);
        }
    }
    
    if (allEntries.length === 0) {
        return 'Unknown';
    }
    
    // Look for entries that are marked as drafts or have publish buttons
    // These are likely to be the current user's entries
    for (const entry of allEntries) {
        if (entry.draft || entry.published !== undefined) {
            return entry.username;
        }
    }
    
    // Fallback: use the first entry
    return allEntries[0].username || 'Unknown';
}

// Better approach: Get current username from participants list
async function getCurrentUsernameFromParticipants() {
    try {
        const response = await RetroToolCommon.apiRequest(`/api/room/${roomCode}`);
        const room = response.room;
        
        // Find current user in participants list
        const currentUser = room.participants.find(p => p.isCreator === room.isCreator);
        if (currentUser) {
            return currentUser.username;
        }
        
        // If we can't find in participants, try to get from entries
        return getCurrentUsernameFromEntries(room.entries);
    } catch (error) {
        console.error('Error getting username from participants:', error);
        return 'Unknown';
    }
} 