const en = {
    // Common
    "language": "English",
    "language_code": "en",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "cancel": "Cancel",
    "ok": "OK",
    "close": "Close",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "remove": "Remove",
    "yes": "Yes",
    "no": "No",
    
    // Navigation
    "home": "Home",
    "create_room": "Create Room",
    "join_room": "Join Room",
    "room": "Room",
    
    // Index page
    "welcome_title": "Welcome to Retro Tool",
    "welcome_subtitle": "Tool designed for team retrospectives",
    "create_room_description": "Create a new retrospective room and invite your team members",
    "join_room_description": "Enter the room code to join an existing room",
    "footer_description": "Conduct retrospective meetings in Mad, Sad, Glad format",
    "get_started": "Get Started",
    "create_new_room": "Create New Room",
    "join_existing_room": "Join Existing Room",
    "how_it_works": "How It Works?",
    "step1": "Create a room or join an existing one",
    "step2": "Share your experiences with team members",
    "step3": "Categorize and analyze your feedback",
    
    // Create room page
    "create_room_title": "Create New Retrospective Room",
    "room_name": "Room Name",
    "room_name_placeholder": "Enter retrospective name",
    "participant_limit": "Participant Limit",
    "participant_limit_placeholder": "Maximum number of participants (optional)",
    "time_limit": "Time Limit",
    "time_limit_placeholder": "In minutes (optional)",
    "create_room_button": "Create Room",
    "room_name_required": "Room Name *",
    "participant_limit_optional": "Participant Limit (Optional)",
    "time_limit_optional": "Time Limit (Minutes, Optional)",
    "back_to_home": "← Back to Home",
    "room_created": "Room created!",
    "invite_link": "Invite Link",
    "copy_link": "Copy Link",
    "go_to_room": "Go to Room",
    "room_code": "Room Code",
    
    // Join room page
    "join_room_title": "Join Room",
    "room_code_label": "Room Code",
    "room_code_placeholder": "Enter 6-digit room code",
    "username": "Username",
    "username_placeholder": "Enter your name",
    "join_room_button": "Join Room",
    "invalid_room_code": "Invalid room code",
    "username_taken": "This username is already taken",
    "room_full": "Room is full, cannot join",
    "room_not_found": "Room not found",
    
    // Room page
    "participants": "Participants",
    "no_participants": "No participants yet",
    "room_owner": "Owner",
    "extend_time": "Extend Time",
    "reopen_room": "Reopen Room",
    "terminate_retro": "Terminate Retro",
    "download_excel": "Download Excel",
    "participants_count": "participants",
    "time_remaining": "remaining",
    "copied_to_clipboard": "Copied to clipboard!",
    "copy_failed": "Copy failed",
    "copy_error": "Copy error",
    "unknown_error": "Unknown error",
    "network_error": "Connection error. Please check your internet connection.",
    "submit": "Submit",
    "generic_error": "An error occurred. Please try again.",
    
    // Retro categories
    "mad": "Mad",
    "sad": "Sad",
    "glad": "Glad",
    "mad_placeholder": "What made you angry?",
    "sad_placeholder": "What made you sad?",
    "glad_placeholder": "What made you happy?",
    
    // Entry management
    "draft": "Draft",
    "published": "Published",
    "publish": "Publish",
    "unpublish": "Unpublish",
    "entry_published": "Entry published!",
    "entry_unpublished": "Entry moved to draft!",
    "select_all": "Select All",
    "deselect_all": "Deselect All",
    "add_button": "Add",
    "export_excel": "Download Excel",
    
    // Modals
    "time_expired_title": "⏰ Time Expired!",
    "time_expired": "Time Expired!",
    "time_expired_message": "The time set for the retrospective has ended. No new entries can be made.",
    "terminated_title": "🛑 Retrospective Terminated",
    "retro_terminated": "Retrospective Terminated",
    "retro_terminated_message": "The room owner has terminated the retrospective. No new entries can be made.",
    "terminated_message": "The room owner has terminated the retrospective. No new entries can be made.",
    
    // Actions and confirmations
    "extend_time_prompt": "How many minutes would you like to add?",
    "extend_time_invalid": "Enter a valid minute value (1-60)",
    "reopen_room_confirm": "Are you sure you want to reopen the room? This will remove the time limit.",
    "terminate_room_confirm": "Are you sure you want to terminate the retrospective? This action cannot be undone and will prevent all participants from making new entries.",
    "time_extended": "Time extended!",
    "room_reopened": "Room reopened!",
    "room_terminated": "Retrospective terminated",
    "excel_downloaded": "Excel file downloaded!",
    "export_failed": "Export failed:",
    "no_selected_entries": "No selected and published entries",
    
    // Errors
    "invalid_room_link": "Invalid room link",
    "access_denied": "You need to join the room first",
    "room_data_error": "Error loading room data",
    "connection_error": "Connection error:",
    "retro_terminated": "Retrospective terminated, no new entries allowed",
    "time_limit_expired": "Time limit expired",
    "enter_text": "Please enter text",
    "text_too_long": "Text cannot be longer than 500 characters",
    "only_owner_can_extend": "Only room owner can extend time",
    "only_owner_can_reopen": "Only room owner can reopen room",
    "only_owner_can_terminate": "Only room owner can terminate retrospective",
    "only_owner_can_export": "Only room owner can export",
    "room_name_required": "Room name is required",
    "room_code_username_required": "Room code and username are required",
    "no_time_limit": "Room has no time limit",
    "own_entries_only": "You can only publish your own entries",
    "room_name_length_error": "Room name must be between 2-50 characters",
    "participant_limit_error": "Participant limit must be between 1-50",
    "time_limit_error": "Time limit must be between 1-300 minutes",
    "username_validation_error": "Username must be 2-20 characters and contain only letters, numbers, and spaces",
    "characters": "characters"
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = en;
} else {
    window.en = en;
} 