const es = {
    // Common
    "language": "Español",
    "language_code": "es",
    "loading": "Cargando...",
    "error": "Error",
    "success": "Éxito",
    "cancel": "Cancelar",
    "ok": "OK",
    "close": "Cerrar",
    "save": "Guardar",
    "delete": "Eliminar",
    "edit": "Editar",
    "add": "Añadir",
    "remove": "Eliminar",
    "yes": "Sí",
    "no": "No",
    
    // Navigation
    "home": "Inicio",
    "create_room": "Crear Sala",
    "join_room": "Unirse a Sala",
    "room": "Sala",
    
    // Index page
    "welcome_title": "Bienvenido a Retro Tool",
    "welcome_subtitle": "Herramienta diseñada para retrospectivas de equipo",
    "create_room_description": "Crea una nueva sala retrospectiva e invita a los miembros de tu equipo",
    "join_room_description": "Ingresa el código de sala para unirte a una sala existente",
    "footer_description": "Realiza reuniones retrospectivas en formato Mad, Sad, Glad",
    "get_started": "Comenzar",
    "create_new_room": "Crear Nueva Sala",
    "join_existing_room": "Unirse a Sala Existente",
    "how_it_works": "¿Cómo Funciona?",
    "step1": "Crea una sala o únete a una existente",
    "step2": "Comparte tus experiencias con los miembros del equipo",
    "step3": "Categoriza y analiza tus comentarios",
    
    // Create room page
    "create_room_title": "Crear Nueva Sala Retrospectiva",
    "room_name": "Nombre de la Sala",
    "room_name_placeholder": "Ingresa el nombre de la retrospectiva",
    "participant_limit": "Límite de Participantes",
    "participant_limit_placeholder": "Número máximo de participantes (opcional)",
    "time_limit": "Límite de Tiempo",
    "time_limit_placeholder": "En minutos (opcional)",
    "create_room_button": "Crear Sala",
    "room_name_required": "Nombre de la Sala *",
    "participant_limit_optional": "Límite de Participantes (Opcional)",
    "time_limit_optional": "Límite de Tiempo (Minutos, Opcional)",
    "back_to_home": "← Volver al Inicio",
    "room_created": "¡Sala creada!",
    "invite_link": "Enlace de Invitación",
    "copy_link": "Copiar Enlace",
    "go_to_room": "Ir a la Sala",
    "room_code": "Código de Sala",
    
    // Join room page
    "join_room_title": "Unirse a Sala",
    "room_code_label": "Código de Sala",
    "room_code_placeholder": "Ingresa el código de 6 dígitos",
    "username": "Nombre de Usuario",
    "username_placeholder": "Ingresa tu nombre",
    "join_room_button": "Unirse a Sala",
    "invalid_room_code": "Código de sala inválido",
    "username_taken": "Este nombre de usuario ya está en uso",
    "room_full": "La sala está llena, no se puede unir",
    "room_not_found": "Sala no encontrada",
    
    // Room page
    "participants": "Participantes",
    "no_participants": "Aún no hay participantes",
    "room_owner": "Propietario",
    "extend_time": "Extender Tiempo",
    "reopen_room": "Reabrir Sala",
    "terminate_retro": "Terminar Retrospectiva",
    "download_excel": "Descargar Excel",
    "participants_count": "participantes",
    "time_remaining": "restante",
    "copied_to_clipboard": "¡Copiado al portapapeles!",
    "copy_failed": "Copia fallida",
    "copy_error": "Error al copiar",
    "unknown_error": "Error desconocido",
    "network_error": "Error de conexión. Por favor, verifique su conexión a internet.",
    "submit": "Enviar",
    "generic_error": "Ocurrió un error. Por favor, inténtelo de nuevo.",
    
    // Retro categories
    "mad": "Enfadado",
    "sad": "Triste",
    "glad": "Contento",
    "mad_placeholder": "¿Qué te enfadó?",
    "sad_placeholder": "¿Qué te entristeció?",
    "glad_placeholder": "¿Qué te alegró?",
    
    // Entry management
    "draft": "Borrador",
    "published": "Publicado",
    "publish": "Publicar",
    "unpublish": "Despublicar",
    "entry_published": "¡Entrada publicada!",
    "entry_unpublished": "¡Entrada movida a borrador!",
    "select_all": "Seleccionar Todo",
    "deselect_all": "Deseleccionar Todo",
    "add_button": "Añadir",
    "export_excel": "Descargar Excel",
    
    // Modals
    "time_expired_title": "⏰ ¡Tiempo Expirado!",
    "time_expired": "¡Tiempo Expirado!",
    "time_expired_message": "El tiempo establecido para la retrospectiva ha terminado. No se pueden hacer nuevas entradas.",
    "terminated_title": "🛑 Retrospectiva Terminada",
    "retro_terminated": "Retrospectiva Terminada",
    "retro_terminated_message": "El propietario de la sala ha terminado la retrospectiva. No se pueden hacer nuevas entradas.",
    "terminated_message": "El propietario de la sala ha terminado la retrospectiva. No se pueden hacer nuevas entradas.",
    
    // Actions and confirmations
    "extend_time_prompt": "¿Cuántos minutos te gustaría añadir?",
    "extend_time_invalid": "Ingresa un valor de minutos válido (1-60)",
    "reopen_room_confirm": "¿Estás seguro de que quieres reabrir la sala? Esto eliminará el límite de tiempo.",
    "terminate_room_confirm": "¿Estás seguro de que quieres terminar la retrospectiva? Esta acción no se puede deshacer y evitará que todos los participantes hagan nuevas entradas.",
    "time_extended": "¡Tiempo extendido!",
    "room_reopened": "¡Sala reabierta!",
    "room_terminated": "Retrospectiva terminada",
    "excel_downloaded": "¡Archivo Excel descargado!",
    "export_failed": "Exportación falló:",
    "no_selected_entries": "No hay entradas seleccionadas y publicadas",
    
    // Errors
    "invalid_room_link": "Enlace de sala inválido",
    "access_denied": "Necesitas unirte a la sala primero",
    "room_data_error": "Error al cargar los datos de la sala",
    "connection_error": "Error de conexión:",
    "retro_terminated": "Retrospectiva terminada, no se permiten nuevas entradas",
    "time_limit_expired": "Límite de tiempo expirado",
    "enter_text": "Por favor ingresa texto",
    "text_too_long": "El texto no puede ser más largo que 500 caracteres",
    "only_owner_can_extend": "Solo el propietario de la sala puede extender el tiempo",
    "only_owner_can_reopen": "Solo el propietario de la sala puede reabrir la sala",
    "only_owner_can_terminate": "Solo el propietario de la sala puede terminar la retrospectiva",
    "only_owner_can_export": "Solo el propietario de la sala puede exportar",
    "room_name_required": "El nombre de la sala es requerido",
    "room_code_username_required": "El código de sala y nombre de usuario son requeridos",
    "no_time_limit": "La sala no tiene límite de tiempo",
    "own_entries_only": "Solo puedes publicar tus propias entradas",
    "room_name_length_error": "El nombre de la sala debe tener entre 2-50 caracteres",
    "participant_limit_error": "El límite de participantes debe estar entre 1-50",
    "time_limit_error": "El límite de tiempo debe estar entre 1-300 minutos",
    "username_validation_error": "El nombre de usuario debe tener 2-20 caracteres y contener solo letras, números y espacios",
    "characters": "caracteres"
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = es;
} else {
    window.es = es;
} 