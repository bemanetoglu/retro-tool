// Join room page functionality
document.addEventListener('DOMContentLoaded', function() {
    const joinRoomForm = document.getElementById('joinRoomForm');
    const usernameInput = document.getElementById('username');
    
    // Get room code from URL
    const roomCode = RetroToolCommon.getCurrentRoomCode();
    
    if (!roomCode) {
        RetroToolCommon.showError(RetroToolCommon.getText('invalid_room_link', 'Geçersiz oda linki.'));
        setTimeout(() => {
            RetroToolCommon.goHome();
        }, 2000);
        return;
    }
    
    // Don't auto-fill stored username for join page
    // Leave username input empty for better UX
    
    // Handle form submission
    joinRoomForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        
        // Validate username
        if (!RetroToolCommon.validateUsername(username)) {
            RetroToolCommon.showError(RetroToolCommon.getText('username_validation_error', 'Kullanıcı adı 2-20 karakter arasında olmalı ve sadece harf, rakam ve boşluk içermelidir'));
            usernameInput.focus();
            return;
        }
        
        // Show loading state
        const submitButton = joinRoomForm.querySelector('button[type="submit"]');
        const stopLoading = RetroToolCommon.showLoading(submitButton);
        
        try {
            // Attempt to join room
            const response = await RetroToolCommon.apiRequest('/api/join-room', {
                method: 'POST',
                body: JSON.stringify({
                    roomCode: roomCode,
                    username: username
                })
            });
            
            // Store username for future use
            RetroToolCommon.storeUsername(username);
            
            // Set creator status (false for joining)
            RetroToolCommon.setRoomCreator(false);
            
            // Redirect to room
            window.location.href = `/room/${roomCode}`;
            
        } catch (error) {
            stopLoading();
            RetroToolCommon.handleFormError(error, joinRoomForm);
        }
    });
    
    // Real-time validation feedback
    usernameInput.addEventListener('input', function() {
        const value = this.value.trim();
        
        if (value.length === 0) {
            this.style.borderColor = '#e2e8f0';
        } else if (RetroToolCommon.validateUsername(value)) {
            this.style.borderColor = '#48bb78';
        } else {
            this.style.borderColor = '#f56565';
        }
    });
    
    // Auto-focus username input
    usernameInput.focus();
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Escape key to go back
    if (event.key === 'Escape') {
        event.preventDefault();
        RetroToolCommon.goHome();
    }
    
    // Ctrl+Enter to submit form
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        const joinRoomForm = document.getElementById('joinRoomForm');
        joinRoomForm.dispatchEvent(new Event('submit'));
    }
});

// Add character counter for username
document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const usernameGroup = usernameInput.closest('.form-group');
    
    // Add character counter
    const counter = document.createElement('small');
    counter.style.color = '#718096';
    counter.style.fontSize = '0.8rem';
    counter.textContent = '0/20 ' + RetroToolCommon.getText('characters', 'karakter');
    usernameGroup.appendChild(counter);
    
    usernameInput.addEventListener('input', function() {
        const length = this.value.length;
        counter.textContent = `${length}/20 ${RetroToolCommon.getText('characters', 'karakter')}`;
        
        if (length > 20) {
            counter.style.color = '#f56565';
        } else if (length > 15) {
            counter.style.color = '#ed8936';
        } else {
            counter.style.color = '#718096';
        }
    });
});

// Username suggestions removed for cleaner UX
// Users will type their own names

// Handle placeholder animation
document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const placeholder = usernameInput.getAttribute('placeholder');
    
    // Simple placeholder animation
    if (placeholder) {
        let index = 0;
        const originalPlaceholder = placeholder;
        
        const animatePlaceholder = () => {
            if (document.activeElement !== usernameInput) {
                const currentText = originalPlaceholder.substring(0, index);
                usernameInput.setAttribute('placeholder', currentText);
                index++;
                
                if (index > originalPlaceholder.length) {
                    setTimeout(() => {
                        index = 0;
                        animatePlaceholder();
                    }, 2000);
                } else {
                    setTimeout(animatePlaceholder, 100);
                }
            }
        };
        
        setTimeout(animatePlaceholder, 1000);
    }
});

// Auto-submit form when Enter is pressed
document.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        const joinRoomForm = document.getElementById('joinRoomForm');
        if (joinRoomForm && document.activeElement === document.getElementById('username')) {
            event.preventDefault();
            joinRoomForm.dispatchEvent(new Event('submit'));
        }
    }
});

// Handle back button
window.addEventListener('beforeunload', function(event) {
    // Clear any temporary data
    RetroToolCommon.setRoomCreator(false);
});

// Add helpful tooltips
document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    
    // Add tooltip for username requirements
    usernameInput.addEventListener('focus', function() {
        if (!this.title) {
            this.title = 'Kullanıcı adı: 2-20 karakter, harf, rakam ve boşluk kullanabilirsiniz';
        }
    });
}); 