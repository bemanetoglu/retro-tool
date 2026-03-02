// Room page functionality with WebSocket support
let socket;
let roomCode;
let isCreator = false;
let timeRemaining = null;
let timeInterval = null;
let timerStarted = false;
let timeExpiredModalShown = false;
let terminatedModalShown = false;

document.addEventListener('DOMContentLoaded', function() {
    roomCode = RetroToolCommon.getCurrentRoomCode();
    
    if (!roomCode) {
        RetroToolCommon.showError(RetroToolCommon.getText('invalid_room_link', 'Geçersiz oda linki'));
        setTimeout(() => {
            RetroToolCommon.goHome();
        }, 2000);
        return;
    }
    
    // Initialize WebSocket connection
    initializeSocket();
    
    // Load initial room data
    loadRoomData();
    
    // Set up timer update from server (clear any existing interval first)
    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }
    // Update timer from server every 1 second
    timeInterval = setInterval(updateTimerFromServer, 1000);
});

// Clean up timer when leaving page
window.addEventListener('beforeunload', function() {
    if (timeInterval) {
        clearInterval(timeInterval);
        timeInterval = null;
    }
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
        RetroToolCommon.showError(RetroToolCommon.getText('connection_error', 'Bağlantı hatası') + ': ' + error);
    });
    
    socket.on('roomState', function(data) {
        updateRoomDisplay(data);
        isCreator = data.isCreator;
        
        if (isCreator) {
            document.getElementById('creatorActions').style.display = 'block';
            // Show/hide start button based on timer status
            const startBtn = document.getElementById('startTimerBtn');
            if (startBtn) {
                if (data.started) {
                    startBtn.style.display = 'none';
                    timerStarted = true;
                } else if (data.timeLimit) {
                    startBtn.style.display = 'inline-block';
                    timerStarted = false;
                }
            }
        }
    });
    
    socket.on('timerStarted', function(data) {
        timerStarted = true;
        const startBtn = document.getElementById('startTimerBtn');
        if (startBtn) {
            startBtn.style.display = 'none';
        }
        RetroToolCommon.showSuccess(RetroToolCommon.getText('timer_started', 'Süre başlatıldı!'));
        // Update timer immediately
        loadRoomData();
    });
    
    socket.on('newEntry', function(data) {
        // Check if entry already exists in DOM to prevent duplicates
        const existingEntry = document.querySelector(`[data-entry-id="${data.entry.id}"]`);
        if (!existingEntry) {
            addEntryToDOM(data.category, data.entry);
        } else {
            // Update existing entry if it exists - this handles rating updates
            updateEntryInDOM(data.category, data.entry);
        }
    });
    
    // entryUnpublished event handler removed - no longer needed
    // Entry visibility is now handled by updateEntryInDOM function
    
    socket.on('participantUpdate', function(data) {
        updateParticipantCount(data.count, data.limit);
        updateParticipantsList(data.participants);
    });
    
    socket.on('timeExtended', function(data) {
        RetroToolCommon.showSuccess(RetroToolCommon.getText('time_extended', 'Zaman uzatıldı!'));
        // Update timer directly from socket data
        if (data.timeRemaining) {
            timeRemaining = data.timeRemaining;
        }
    });
    
    socket.on('roomReopened', function() {
        RetroToolCommon.showSuccess(RetroToolCommon.getText('room_reopened', 'Oda yeniden açıldı!'));
        // Room reopen removes time limit
        timeRemaining = null;
        timeExpiredModalShown = false; // Reset flag
        const timeElement = document.getElementById('timeRemaining');
        timeElement.textContent = '';
        RetroToolCommon.closeModal('timeExpiredModal');
    });
    
    socket.on('timeExpired', function() {
        // Show time expired modal for all participants
        if (!timeExpiredModalShown) {
            timeExpiredModalShown = true;
            RetroToolCommon.showModal('timeExpiredModal');
        }
    });
    
    socket.on('entryToggled', function(data) {
        updateEntrySelection(data.category, data.entryId, data.selected);
    });
    
    socket.on('entryDeleted', function(data) {
        removeEntryFromDOM(data.category, data.entryId);
    });
    
    socket.on('roomTerminated', function() {
        // Store terminated status globally
        window.roomTerminated = true;
        terminatedModalShown = true;
        
        // Show terminated modal and disable inputs
        RetroToolCommon.showModal('terminatedModal');
        // Stop the timer
        if (timeInterval) {
            clearInterval(timeInterval);
            timeInterval = null;
        }
        timeRemaining = 0;
        timerStarted = false;
        updateTimer();
        
        // Reload entries to show ratings
        loadRoomData();
        
        // Disable all input fields (except modal buttons and export button)
        document.querySelectorAll('textarea, button').forEach(el => {
            // Check if button has onclick="exportSelected()" or data attribute
            const isExportButton = el.getAttribute('onclick') && el.getAttribute('onclick').includes('exportSelected');
            if (!el.classList.contains('modal') && !el.closest('.modal') && el.id !== 'startTimerBtn' && !isExportButton) {
                el.disabled = true;
            } else if (isExportButton) {
                // Make sure export button stays enabled
                el.disabled = false;
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
        
        // Update timer started status
        timerStarted = room.started || false;
        
        // Only update timeRemaining if timer has been started
        if (timerStarted) {
            if (timeRemaining === null || (room.timeRemaining && Math.abs(timeRemaining - room.timeRemaining) > 10000)) {
                timeRemaining = room.timeRemaining;
            }
        } else {
            // Timer not started, don't show countdown
            timeRemaining = null;
        }
        
        // Store current username from server response
        window.currentUsername = room.currentUsername;
        
        // Show creator actions if user is creator
        if (isCreator) {
            document.getElementById('creatorActions').style.display = 'block';
            // Show/hide start button
            const startBtn = document.getElementById('startTimerBtn');
            if (startBtn) {
                if (timerStarted || !room.timeLimit) {
                    startBtn.style.display = 'none';
                } else {
                    startBtn.style.display = 'inline-block';
                }
            }
        }
        
        // Update participant count and list
        updateParticipantCount(room.participantCount, room.participantLimit);
        updateParticipantsList(room.participants);
        
        // Store room terminated status globally
        const wasTerminated = window.roomTerminated || false;
        const isTerminated = room.terminated || false;
        window.roomTerminated = isTerminated;
        
        // Check if room is terminated - only show modal if status changed from false to true
        // This prevents showing modal every time page loads or refreshes
        if (isTerminated && !wasTerminated) {
            // Only show modal if status just changed to terminated (transition from false to true)
            terminatedModalShown = true;
            RetroToolCommon.showModal('terminatedModal');
            
            // Stop the timer
            if (timeInterval) {
                clearInterval(timeInterval);
                timeInterval = null;
            }
            timeRemaining = 0;
            timerStarted = false;
            updateTimer();
            
            // Disable all input fields (except modal buttons and export button)
            document.querySelectorAll('textarea, button').forEach(el => {
                // Check if button has onclick="exportSelected()" or data attribute
                const isExportButton = el.getAttribute('onclick') && el.getAttribute('onclick').includes('exportSelected');
                if (!el.classList.contains('modal') && !el.closest('.modal') && el.id !== 'startTimerBtn' && !isExportButton) {
                    el.disabled = true;
                } else if (isExportButton) {
                    // Make sure export button stays enabled
                    el.disabled = false;
                }
            });
        } else {
            // Room is not terminated, reset terminated flag and close modal
            terminatedModalShown = false;
            window.roomTerminated = false;
            RetroToolCommon.closeModal('terminatedModal');
            // Re-enable input fields
            document.querySelectorAll('textarea, button').forEach(el => {
                if (!el.classList.contains('modal') && !el.closest('.modal')) {
                    el.disabled = false;
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
            RetroToolCommon.showError(RetroToolCommon.getText('access_denied', 'Önce odaya katılmanız gerekiyor'));
            setTimeout(() => {
                window.location.href = `/join/${roomCode}`;
            }, 2000);
        } else {
            RetroToolCommon.showError(RetroToolCommon.getText('room_data_error', 'Oda verileri yüklenirken hata oluştu'));
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
    
    // Debug logging removed
    
    // If this is not user's own entry and it's not published, don't show it
    if (!isOwnEntry && !entry.published) {
        entryElement.style.display = 'none';
    }
    
    // Add draft/published styling
    let publishButton = '';
    let draftIndicator = '';
    let editDeleteButtons = '';
    
    if (isOwnEntry) {
        if (entry.published) {
            entryElement.classList.add('published');
            draftIndicator = '<span class="published-indicator">✅ ' + RetroToolCommon.getText('published', 'Yayınlandı') + '</span>';
        } else {
            entryElement.classList.add('draft');
            draftIndicator = '<span class="draft-indicator">📝 ' + RetroToolCommon.getText('draft', 'Taslak') + '</span>';
        }
        
        publishButton = `
            <button class="publish-btn ${entry.published ? 'published' : 'draft'}" 
                    onclick="togglePublish('${category}', '${entry.id}', ${entry.published})">
                ${entry.published ? '🔓 ' + RetroToolCommon.getText('unpublish', 'Geri Al') : '📢 ' + RetroToolCommon.getText('publish', 'Yayınla')}
            </button>
        `;
        
        // Add edit and delete buttons for own entries
        editDeleteButtons = `
            <div class="entry-actions">
                ${!entry.published ? `<button class="edit-btn" onclick="editEntry('${category}', '${entry.id}', ${JSON.stringify(entry.text).replace(/"/g, '&quot;')})" title="${RetroToolCommon.getText('edit', 'Düzenle')}">✏️</button>` : ''}
                <button class="delete-btn" onclick="deleteEntry('${category}', '${entry.id}')" title="${RetroToolCommon.getText('delete', 'Sil')}">🗑️</button>
            </div>
        `;
    }
    
    // Rating display - only show for published entries
    // Only owner sees average ratings, others can rate after retro ends
    let ratingDisplay = '';
    const retroEnded = (timeRemaining === 0 && timerStarted) || window.roomTerminated || false;
    const canShowRatings = isCreator && retroEnded && entry.published;
    const canRate = !isOwnEntry && entry.published && retroEnded;
    
    if (canShowRatings) {
        // Calculate average rating excluding entry owner
        let averageRating = 0;
        if (entry.ratings && Object.keys(entry.ratings).length > 0) {
            const ratingsArray = Object.entries(entry.ratings)
                .filter(([username]) => username !== entry.username)
                .map(([, rating]) => rating);
            if (ratingsArray.length > 0) {
                averageRating = ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length;
            }
        }
        
        ratingDisplay = `
            <div class="entry-rating">
                <span class="rating-average">${RetroToolCommon.getText('average', 'Ortalama')}: ${averageRating.toFixed(1)}</span>
            </div>
        `;
    } else if (canRate) {
        // Show rating stars for other users' published entries after retro ends
        const currentUserRating = entry.ratings && entry.ratings[getCurrentUsername()] ? entry.ratings[getCurrentUsername()] : 0;
        ratingDisplay = `
            <div class="entry-rating">
                <div class="rating-stars" data-entry-id="${entry.id}" data-category="${category}">
                    ${[1, 2, 3, 4, 5].map(star => `
                        <span class="star ${star <= currentUserRating ? 'filled' : ''}" 
                              data-rating="${star}" 
                              onclick="rateEntry('${category}', '${entry.id}', ${star})"
                              title="${star} ${RetroToolCommon.getText('stars', 'yıldız')}">
                            ${star <= currentUserRating ? '⭐' : '☆'}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    entryElement.innerHTML = `
        <div class="entry-content">${RetroToolCommon.sanitizeHTML(entry.text)}</div>
        <div class="entry-meta">
            <span class="entry-username">${RetroToolCommon.sanitizeHTML(entry.username)}</span>
            ${draftIndicator}
            ${isCreator ? `<input type="checkbox" class="entry-checkbox" ${entry.selected ? 'checked' : ''} onchange="toggleEntry('${category}', '${entry.id}')">` : ''}
        </div>
        ${ratingDisplay}
        ${publishButton}
        ${editDeleteButtons}
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

// Update existing entry in DOM
function updateEntryInDOM(category, entry) {
    const entryElement = document.querySelector(`[data-entry-id="${entry.id}"]`);
    if (!entryElement) {
        // Entry doesn't exist in DOM, add it
        addEntryToDOM(category, entry);
        return;
    }
    
    // Check if this is current user's entry
    const isOwnEntry = entry.username === getCurrentUsername();
    
    // If this is not user's own entry and it's not published, hide it
    if (!isOwnEntry && !entry.published) {
        entryElement.style.display = 'none';
        return;
    } else {
        entryElement.style.display = 'block';
    }
    
    // Update entry classes
    entryElement.classList.remove('draft', 'published');
    if (entry.selected) {
        entryElement.classList.add('selected');
    } else {
        entryElement.classList.remove('selected');
    }
    
    // Update draft/published styling
    if (isOwnEntry) {
        if (entry.published) {
            entryElement.classList.add('published');
        } else {
            entryElement.classList.add('draft');
        }
        
        // Update publish button and indicator
        const publishBtn = entryElement.querySelector('.publish-btn');
        const draftIndicator = entryElement.querySelector('.draft-indicator, .published-indicator');
        
        if (publishBtn) {
            if (entry.published) {
                publishBtn.textContent = '🔓 ' + RetroToolCommon.getText('unpublish', 'Geri Al');
                publishBtn.classList.remove('draft');
                publishBtn.classList.add('published');
            } else {
                publishBtn.textContent = '📢 ' + RetroToolCommon.getText('publish', 'Yayınla');
                publishBtn.classList.remove('published');
                publishBtn.classList.add('draft');
            }
        }
        
        if (draftIndicator) {
            if (entry.published) {
                draftIndicator.textContent = '✅ ' + RetroToolCommon.getText('published', 'Yayınlandı');
                draftIndicator.className = 'published-indicator';
            } else {
                draftIndicator.textContent = '📝 ' + RetroToolCommon.getText('draft', 'Taslak');
                draftIndicator.className = 'draft-indicator';
            }
        }
        
        // Update edit/delete buttons
        let entryActions = entryElement.querySelector('.entry-actions');
        if (!entryActions && isOwnEntry) {
            // Create actions container if it doesn't exist
            entryActions = document.createElement('div');
            entryActions.className = 'entry-actions';
            entryElement.appendChild(entryActions);
        }
        
        if (entryActions) {
            entryActions.innerHTML = '';
            if (!entry.published) {
                const editBtn = document.createElement('button');
                editBtn.className = 'edit-btn';
                editBtn.textContent = '✏️';
                editBtn.title = RetroToolCommon.getText('edit', 'Düzenle');
                editBtn.onclick = () => editEntry(category, entry.id, entry.text);
                entryActions.appendChild(editBtn);
            }
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = RetroToolCommon.getText('delete', 'Sil');
            deleteBtn.onclick = () => deleteEntry(category, entry.id);
            entryActions.appendChild(deleteBtn);
        }
        
        // Update entry content
        const entryContent = entryElement.querySelector('.entry-content');
        if (entryContent) {
            entryContent.textContent = entry.text;
        }
        
        // Update rating display - ALWAYS update when entry changes
        // Get current retro ended status from multiple sources
        const retroEnded = (timeRemaining === 0 && timerStarted) || window.roomTerminated || false;
        const canShowRatings = isCreator && retroEnded && entry.published;
        const canRate = !isOwnEntry && entry.published && retroEnded;
        
        // Always update rating container if entry is published and retro has ended
        let ratingContainer = entryElement.querySelector('.entry-rating');
        if ((canShowRatings || canRate) && entry.published) {
            if (!ratingContainer) {
                ratingContainer = document.createElement('div');
                ratingContainer.className = 'entry-rating';
                // Insert before publish button or at end
                const publishBtn = entryElement.querySelector('.publish-btn');
                if (publishBtn) {
                    entryElement.insertBefore(ratingContainer, publishBtn);
                } else {
                    entryElement.appendChild(ratingContainer);
                }
            }
            
            if (canShowRatings) {
                // Show average rating for owner
                let averageRating = 0;
                if (entry.ratings && Object.keys(entry.ratings).length > 0) {
                    const ratingsArray = Object.entries(entry.ratings)
                        .filter(([username]) => username !== entry.username)
                        .map(([, rating]) => rating);
                    if (ratingsArray.length > 0) {
                        averageRating = ratingsArray.reduce((sum, r) => sum + r, 0) / ratingsArray.length;
                    }
                }
                ratingContainer.innerHTML = `<span class="rating-average">${RetroToolCommon.getText('average', 'Ortalama')}: ${averageRating.toFixed(1)}</span>`;
            } else if (canRate) {
                // Show rating stars for others - ALWAYS update with latest rating data
                const currentUserRating = entry.ratings && entry.ratings[getCurrentUsername()] ? entry.ratings[getCurrentUsername()] : 0;
                ratingContainer.innerHTML = `
                    <div class="rating-stars" data-entry-id="${entry.id}" data-category="${category}">
                        ${[1, 2, 3, 4, 5].map(star => `
                            <span class="star ${star <= currentUserRating ? 'filled' : ''}" 
                                  data-rating="${star}" 
                                  onclick="rateEntry('${category}', '${entry.id}', ${star})"
                                  title="${star} ${RetroToolCommon.getText('stars', 'yıldız')}">
                                ${star <= currentUserRating ? '⭐' : '☆'}
                            </span>
                        `).join('')}
                    </div>
                `;
            }
        } else if (ratingContainer && !canShowRatings && !canRate) {
            ratingContainer.remove();
        }
    }
    
    // Update checkbox state for creators
    const checkbox = entryElement.querySelector('.entry-checkbox');
    if (checkbox) {
        checkbox.checked = entry.selected;
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
        
        // Socket eventi DOM'u güncelleyecek, burada sadece başarı mesajı gösterelim
        if (response.published) {
            RetroToolCommon.showSuccess(RetroToolCommon.getText('entry_published', 'Giriş yayınlandı!'));
        } else {
            RetroToolCommon.showSuccess(RetroToolCommon.getText('entry_unpublished', 'Giriş taslağa alındı!'));
        }
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Delete entry
async function deleteEntry(category, entryId) {
    if (!confirm(RetroToolCommon.getText('delete_entry_confirm', 'Bu girişi silmek istediğinizden emin misiniz?'))) {
        return;
    }
    
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/entry/${entryId}`, {
            method: 'DELETE'
        });
        
        RetroToolCommon.showSuccess(RetroToolCommon.getText('entry_deleted', 'Giriş silindi!'));
        // Socket event will handle DOM removal
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Edit entry - show modal instead of prompt
function editEntry(category, entryId, currentText) {
    // Set the current values to the modal inputs
    document.getElementById('editEntryInput').value = currentText;
    document.getElementById('editEntryId').value = entryId;
    document.getElementById('editEntryCategory').value = category;
    
    // Show the modal
    RetroToolCommon.showModal('editEntryModal');
    
    // Focus on the textarea
    setTimeout(() => {
        const textarea = document.getElementById('editEntryInput');
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 100);
}

// Confirm edit entry from modal
function confirmEditEntry() {
    const entryId = document.getElementById('editEntryId').value;
    const category = document.getElementById('editEntryCategory').value;
    const newText = document.getElementById('editEntryInput').value.trim();
    
    if (!newText) {
        RetroToolCommon.showError(RetroToolCommon.getText('enter_text', 'Lütfen bir metin girin'));
        return;
    }
    
    // Close the modal
    RetroToolCommon.closeModal('editEntryModal');
    
    // Update the entry
    updateEntry(category, entryId, newText);
}

// Update entry on server
async function updateEntry(category, entryId, text) {
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/entry/${entryId}`, {
            method: 'PUT',
            body: JSON.stringify({
                text: text
            })
        });
        
        RetroToolCommon.showSuccess(RetroToolCommon.getText('entry_updated', 'Giriş güncellendi!'));
        // Socket event will handle DOM update
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Rate entry
async function rateEntry(category, entryId, rating) {
    // Check if retro has ended
    const isRetroEnded = (timeRemaining === 0 && timerStarted) || window.roomTerminated || false;
    
    // Get room data to check terminated status
    try {
        const roomResponse = await RetroToolCommon.apiRequest(`/api/room/${roomCode}`);
        const room = roomResponse.room;
        const retroEnded = (room.timeRemaining === 0 && room.started) || room.terminated;
        
        // Update global terminated status
        window.roomTerminated = room.terminated || false;
        
        if (!retroEnded) {
            RetroToolCommon.showError(RetroToolCommon.getText('ratings_only_after_end', 'Puan verme sadece retrospektif bittikten sonra yapılabilir'));
            return;
        }
    } catch (error) {
        RetroToolCommon.showError(error.message);
        return;
    }
    
    try {
        const response = await RetroToolCommon.apiRequest(`/api/room/${roomCode}/entry/${entryId}/rate`, {
            method: 'POST',
            body: JSON.stringify({
                rating: rating
            })
        });
        
        // Socket event will handle DOM update automatically
        // But also manually trigger update to ensure rating is visible immediately
        RetroToolCommon.showSuccess(RetroToolCommon.getText('rating_added', 'Puan verildi!'));
        
        // Force refresh the entry to show updated rating
        // Socket event should handle this, but we ensure it's updated
        setTimeout(() => {
            loadRoomData();
        }, 100);
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Update participant count
function updateParticipantCount(count, limit) {
    const participantElement = document.getElementById('participantCount');
    
    if (limit) {
        participantElement.textContent = `👥 ${count}/${limit} ${RetroToolCommon.getText('participants_count', 'katılımcı')}`;
    } else {
        participantElement.textContent = `👥 ${count} ${RetroToolCommon.getText('participants_count', 'katılımcı')}`;
    }
}

// Update participants list
function updateParticipantsList(participants) {
    const participantsList = document.getElementById('participantsList');
    
    if (!participants || participants.length === 0) {
        participantsList.innerHTML = '<div class="participant-item">' + RetroToolCommon.getText('no_participants', 'Henüz katılımcı yok') + '</div>';
        return;
    }
    
    participantsList.innerHTML = '';
    
    participants.forEach(participant => {
        const participantItem = document.createElement('div');
        participantItem.className = `participant-item ${participant.isCreator ? 'creator' : ''}`;
        
        participantItem.innerHTML = `
            <span class="participant-icon">${participant.isCreator ? '👑' : '👤'}</span>
            <span class="participant-name">${RetroToolCommon.sanitizeHTML(participant.username)}</span>
            ${participant.isCreator ? '<span class="creator-badge">' + RetroToolCommon.getText('room_owner', 'Sahip') + '</span>' : ''}
        `;
        
        participantsList.appendChild(participantItem);
    });
}

// Update timer display - now server-side driven
function updateTimer() {
    // Only show timer if it has been started
    if (!timerStarted) {
        const timeElement = document.getElementById('timeRemaining');
        timeElement.textContent = '';
        return;
    }
    
    // Only update display, don't countdown locally
    if (timeRemaining !== null && timeRemaining > 0) {
        const timeElement = document.getElementById('timeRemaining');
        timeElement.textContent = RetroToolCommon.formatTimeRemaining(timeRemaining);
    } else if (timeRemaining === null) {
        // If no time limit, don't show timer
        const timeElement = document.getElementById('timeRemaining');
        timeElement.textContent = '';
    } else if (timeRemaining === 0 && !timeExpiredModalShown) {
        // Time expired - show modal only once
        window.roomTerminated = true; // Mark as ended for rating purposes
        const timeElement = document.getElementById('timeRemaining');
        timeElement.textContent = '';
        timeExpiredModalShown = true;
        RetroToolCommon.showModal('timeExpiredModal');
        // Reload entries to show ratings
        loadRoomData();
    }
}

// Update timer from server
async function updateTimerFromServer() {
    try {
        const response = await RetroToolCommon.apiRequest(`/api/room/${roomCode}/timer`);
        
        // Update started status
        if (response.started !== timerStarted) {
            timerStarted = response.started || false;
            const startBtn = document.getElementById('startTimerBtn');
            if (startBtn && isCreator) {
                if (timerStarted || !response.timeLimit) {
                    startBtn.style.display = 'none';
                } else {
                    startBtn.style.display = 'inline-block';
                }
            }
        }
        
        // Only update time remaining if timer has been started
        if (timerStarted && response.timeRemaining !== timeRemaining) {
            timeRemaining = response.timeRemaining;
            updateTimer();
        } else if (!timerStarted) {
            timeRemaining = null;
            updateTimer();
        }
        
        // If room is terminated, stop the timer
        if (response.terminated) {
            clearInterval(timeInterval);
            timeInterval = null;
            timeRemaining = 0;
            timerStarted = false;
            updateTimer();
        }
    } catch (error) {
        // Silent fail - timer will continue with current value
        console.warn('Failed to update timer from server:', error);
    }
}

// Start timer (creator only)
async function startTimer() {
    if (!isCreator) return;
    
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/start`, {
            method: 'POST'
        });
        
        RetroToolCommon.showSuccess(RetroToolCommon.getText('timer_started', 'Süre başlatıldı!'));
        timerStarted = true;
        const startBtn = document.getElementById('startTimerBtn');
        if (startBtn) {
            startBtn.style.display = 'none';
        }
        // Refresh room data to get updated timer
        loadRoomData();
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Add entry function
async function addEntry(category) {
    const input = document.getElementById(`${category}Input`);
    const text = input.value.trim();
    
    // Check if input is disabled (room terminated)
    if (input.disabled) {
        RetroToolCommon.showError(RetroToolCommon.getText('retro_terminated', 'Retrospektif sonlandırıldı, yeni giriş yapılamaz'));
        return;
    }
    
    if (!text) {
        RetroToolCommon.showError(RetroToolCommon.getText('enter_text', 'Lütfen bir metin girin'));
        input.focus();
        return;
    }
    
    if (text.length > 500) {
        RetroToolCommon.showError(RetroToolCommon.getText('text_too_long', 'Metin 500 karakterden uzun olamaz'));
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
function extendTime() {
    if (!isCreator) return;
    
    RetroToolCommon.showModal('extendTimeModal');
    const input = document.getElementById('extendTimeInput');
    input.focus();
}

// Confirm extend time
async function confirmExtendTime() {
    const input = document.getElementById('extendTimeInput');
    const minutes = parseInt(input.value);
    
    if (isNaN(minutes) || minutes < 1 || minutes > 60) {
        RetroToolCommon.showError(RetroToolCommon.getText('extend_time_invalid', 'Geçerli bir dakika değeri girin (1-60)'));
        input.focus();
        return;
    }
    
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/extend-time`, {
            method: 'POST',
            body: JSON.stringify({
                additionalMinutes: minutes
            })
        });
        
        RetroToolCommon.closeModal('extendTimeModal');
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Reopen room (creator only)
function reopenRoom() {
    if (!isCreator) return;
    
    RetroToolCommon.showModal('reopenRoomModal');
}

// Confirm reopen room
async function confirmReopenRoom() {
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/reopen`, {
            method: 'POST'
        });
        
        RetroToolCommon.closeModal('reopenRoomModal');
        
    } catch (error) {
        RetroToolCommon.showError(error.message);
    }
}

// Terminate room (creator only)
function terminateRoom() {
    if (!isCreator) return;
    
    RetroToolCommon.showModal('terminateRoomModal');
}

// Confirm terminate room
async function confirmTerminateRoom() {
    try {
        await RetroToolCommon.apiRequest(`/api/room/${roomCode}/terminate`, {
            method: 'POST'
        });
        
        RetroToolCommon.closeModal('terminateRoomModal');
        RetroToolCommon.showSuccess(RetroToolCommon.getText('room_terminated', 'Retrospektif sonlandırıldı'));
        
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
            throw new Error(RetroToolCommon.getText('export_failed', 'Export başarısız'));
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
        
        RetroToolCommon.showSuccess(RetroToolCommon.getText('excel_downloaded', 'Excel dosyası indirildi!'));
        
    } catch (error) {
        RetroToolCommon.showError(RetroToolCommon.getText('export_failed', 'Export başarısız') + ': ' + error.message);
    }
}

// Close modal
function closeModal(modalId) {
    RetroToolCommon.closeModal(modalId);
}

// Close time expired modal
function closeTimeExpiredModal() {
    timeExpiredModalShown = false;
    RetroToolCommon.closeModal('timeExpiredModal');
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