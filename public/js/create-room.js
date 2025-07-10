// Create room page functionality
document.addEventListener('DOMContentLoaded', function() {
    const createRoomForm = document.getElementById('createRoomForm');
    const roomNameInput = document.getElementById('roomName');
    const participantLimitInput = document.getElementById('participantLimit');
    const timeLimitInput = document.getElementById('timeLimit');
    const roomCreatedModal = document.getElementById('roomCreated');
    
    let createdRoomCode = null;
    
    // Handle form submission
    createRoomForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const roomName = roomNameInput.value.trim();
        const participantLimit = participantLimitInput.value.trim();
        const timeLimit = timeLimitInput.value.trim();
        
        // Validate room name
        if (!RetroToolCommon.validateInput(roomName, 2, 50)) {
            RetroToolCommon.showError('Oda adı 2-50 karakter arasında olmalıdır');
            roomNameInput.focus();
            return;
        }
        
        // Validate participant limit if provided
        if (participantLimit && (parseInt(participantLimit) < 1 || parseInt(participantLimit) > 50)) {
            RetroToolCommon.showError('Katılımcı sınırı 1-50 arasında olmalıdır');
            participantLimitInput.focus();
            return;
        }
        
        // Validate time limit if provided
        if (timeLimit && (parseInt(timeLimit) < 1 || parseInt(timeLimit) > 300)) {
            RetroToolCommon.showError('Zaman sınırı 1-300 dakika arasında olmalıdır');
            timeLimitInput.focus();
            return;
        }
        
        // Show loading state
        const submitButton = createRoomForm.querySelector('button[type="submit"]');
        const stopLoading = RetroToolCommon.showLoading(submitButton);
        
        try {
            // Create room
            const response = await RetroToolCommon.apiRequest('/api/create-room', {
                method: 'POST',
                body: JSON.stringify({
                    roomName: roomName,
                    participantLimit: participantLimit ? parseInt(participantLimit) : null,
                    timeLimit: timeLimit ? parseInt(timeLimit) : null
                })
            });
            
            // Store room code and show success modal
            createdRoomCode = response.roomCode;
            
            // Update modal content
            document.getElementById('roomCode').textContent = response.roomCode;
            document.getElementById('inviteLink').value = response.inviteLink;
            
            // Set creator status
            RetroToolCommon.setRoomCreator(true);
            
            // Store creator username
            RetroToolCommon.storeUsername('Oda Sahibi');
            
            // Show success modal
            RetroToolCommon.showModal('roomCreated');
            
        } catch (error) {
            stopLoading();
            RetroToolCommon.handleFormError(error, createRoomForm);
        }
    });
    
    // Real-time validation feedback
    roomNameInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        if (value.length === 0) {
            this.style.borderColor = '#e2e8f0';
        } else if (RetroToolCommon.validateInput(value, 2, 50)) {
            this.style.borderColor = '#48bb78';
        } else {
            this.style.borderColor = '#f56565';
        }
    });
    
    participantLimitInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        if (value.length === 0) {
            this.style.borderColor = '#e2e8f0';
        } else {
            const num = parseInt(value);
            if (num >= 1 && num <= 50) {
                this.style.borderColor = '#48bb78';
            } else {
                this.style.borderColor = '#f56565';
            }
        }
    });
    
    timeLimitInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        if (value.length === 0) {
            this.style.borderColor = '#e2e8f0';
        } else {
            const num = parseInt(value);
            if (num >= 1 && num <= 300) {
                this.style.borderColor = '#48bb78';
            } else {
                this.style.borderColor = '#f56565';
            }
        }
    });
});

// Modal action functions
function copyLink() {
    const inviteLink = document.getElementById('inviteLink').value;
    RetroToolCommon.copyToClipboard(inviteLink);
}

function joinRoom() {
    const roomCode = document.getElementById('roomCode').textContent;
    if (roomCode) {
        window.location.href = `/room/${roomCode}`;
    }
}

function goHome() {
    RetroToolCommon.goHome();
}

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Escape key to close modal
    if (event.key === 'Escape') {
        const roomCreatedModal = document.getElementById('roomCreated');
        if (roomCreatedModal.style.display === 'block') {
            event.preventDefault();
            joinRoom(); // Go to room when escaping from success modal
        }
    }
    
    // Ctrl+Enter to submit form
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        const createRoomForm = document.getElementById('createRoomForm');
        createRoomForm.dispatchEvent(new Event('submit'));
    }
});

// Auto-focus room name input
document.addEventListener('DOMContentLoaded', function() {
    const roomNameInput = document.getElementById('roomName');
    roomNameInput.focus();
});

// Handle back button behavior
window.addEventListener('beforeunload', function(event) {
    // Clear creator status if user leaves before joining the room
    const roomCreatedModal = document.getElementById('roomCreated');
    if (roomCreatedModal.style.display !== 'block') {
        RetroToolCommon.setRoomCreator(false);
    }
});

// Add form field character counters
document.addEventListener('DOMContentLoaded', function() {
    const roomNameInput = document.getElementById('roomName');
    
    // Add character counter for room name
    const roomNameGroup = roomNameInput.closest('.form-group');
    const counter = document.createElement('small');
    counter.style.color = '#718096';
    counter.style.fontSize = '0.8rem';
    counter.textContent = '0/50 karakter';
    roomNameGroup.appendChild(counter);
    
    roomNameInput.addEventListener('input', function() {
        const length = this.value.length;
        counter.textContent = `${length}/50 karakter`;
        
        if (length > 50) {
            counter.style.color = '#f56565';
        } else if (length > 40) {
            counter.style.color = '#ed8936';
        } else {
            counter.style.color = '#718096';
        }
    });
});

// Add suggestions for room names
document.addEventListener('DOMContentLoaded', function() {
    const roomNameInput = document.getElementById('roomName');
    
    const suggestions = [
        'Sprint 1 Retro',
        'Takım Retrospektifi',
        'Proje Değerlendirme',
        'Haftalık Retro',
        'Q1 Retrospektifi',
        'Geliştirme Takımı Retro'
    ];
    
    // Add datalist for suggestions
    const datalist = document.createElement('datalist');
    datalist.id = 'roomNameSuggestions';
    
    suggestions.forEach(suggestion => {
        const option = document.createElement('option');
        option.value = suggestion;
        datalist.appendChild(option);
    });
    
    document.body.appendChild(datalist);
    roomNameInput.setAttribute('list', 'roomNameSuggestions');
});

// Add time limit presets
document.addEventListener('DOMContentLoaded', function() {
    const timeLimitInput = document.getElementById('timeLimit');
    const timeLimitGroup = timeLimitInput.closest('.form-group');
    
    // Add preset buttons
    const presetContainer = document.createElement('div');
    presetContainer.style.marginTop = '0.5rem';
    
    const presets = [
        { label: '15 dk', value: 15 },
        { label: '30 dk', value: 30 },
        { label: '45 dk', value: 45 },
        { label: '60 dk', value: 60 }
    ];
    
    presets.forEach(preset => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-small';
        button.textContent = preset.label;
        button.style.marginRight = '0.5rem';
        button.style.marginBottom = '0.5rem';
        button.style.fontSize = '0.8rem';
        button.style.padding = '0.25rem 0.5rem';
        button.style.background = '#f7fafc';
        button.style.color = '#4a5568';
        button.style.border = '1px solid #e2e8f0';
        
        button.addEventListener('click', function() {
            timeLimitInput.value = preset.value;
            timeLimitInput.dispatchEvent(new Event('input'));
        });
        
        presetContainer.appendChild(button);
    });
    
    timeLimitGroup.appendChild(presetContainer);
}); 