TAREA FABRIZIO — MÓDULO MÉDICO (FRONTEND)
Policlínico San José ·Iteración IV

CONTEXTO RÁPIDO DEL PROYECTO
Sistema de gestión para un policlínico. Stack: React 18 + TypeScript + Vite + CSS vanilla. Sin
Tailwind, sin Material UI. La autenticación es con Supabase, el backend en Node.js + Express +
MongoDB.
Diseño existente — respétalo al 100%:
Fuente: DM Sans (cuerpo)
Color primario: #10b981 / #059669 (verde)
Color secundario: #0ea5e9 / #0284c7 (azul)
Acento headers: #2563eb
Fondo suave: #f9fafb , bordes: #e5e7eb
Badges de estado: PENDIENTE → azul #0ea5e9 , ATENDIDA → verde #10b981 ,
CANCELADA → rojo #ef4444 , REPROGRAMADA → amarillo #f59e0b
El proyecto tiene ThemeContext con light/dark mode ya implementado — usa las variables
CSS existentes, no hardcodees colores.
No uses emojis, no uses inline comments, no uses section headers en el CSS.
Roles: El médico logueado tiene rol: "MEDICO" y medicoId en su user_metadata de
Supabase. El useAuth() ya expone eso.

TU TAREA: 2 MÓDULOS
MÓDULO 1 — Calendario del médico (reutilizar el existente)
El calendario de recepcionista ( /src/pages/Calendario/ ) ya está implementado y funciona
con vista Día, Semana y Mes, filtro de médicos, y fetch a GET /api/citas/calendario .
Lo que tienes que hacer: Reutilizar ese mismo calendario dentro del dashboard del médico, pero
filtrado únicamente al médico logueado. No debe mostrar columnas de otros médicos, no debe
mostrar el panel de filtro de doctores.
Comportamiento esperado:
El médico ve su propio calendario (Vista Día por defecto)
El fetch siempre envía medicoId del usuario logueado como parámetro

El panel lateral de "Doctores" no aparece — no tiene sentido aquí
Click en celda vacía → navega a /reservar-cita?fecha=YYYY-MM-DD&doctorId=
<suMedicoId>
Click en una cita → abre CitaModal (ver Módulo 2)
Archivos a modificar/crear:
src/pages/MedicoDashboard/MedicoDashboard.tsx — integrar el calendario aquí
src/pages/MedicoDashboard/MedicoDashboard.css — estilos del dashboard, no tocar
Calendario.css

MÓDULO 2 — Vista de cita + historial del paciente (CitaModal)
Cuando el médico hace click en una cita del calendario, se abre un modal con toda la
información.
El modal debe mostrar:
Sección 1 — Datos de la cita
Fecha y hora
Estado actual (badge con color correspondiente)
Especialidad del médico
Sección 2 — Datos del paciente
Nombres y apellidos
DNI
Edad (calculada)
Teléfono y correo (si existen)
Sección 3 — Notas clínicas
textarea editable
Botón "Guardar notas" → PUT /api/medico/citas/:id/estado o el endpoint que ya existe
para actualizar notas en la cita
Sección 4 — Historial de visitas del paciente
Lista de citas anteriores del mismo paciente con este médico
Columnas: Fecha, Estado
Máximo 5 entradas, ordenadas de más reciente a más antigua
Fetch: GET /api/medico/mis-citas filtrando por pacienteId

Acciones del modal:
Botón "Marcar como Atendida" → solo visible si estado es PENDIENTE → PUT
/api/medico/citas/:id/estado con { estado: "ATENDIDA" }
Botón "Cerrar"

Archivos a crear:
src/pages/MedicoDashboard/CitaModal.tsx
src/pages/MedicoDashboard/CitaModal.css

ENDPOINTS DISPONIBLES (backend ya listo)

ESTRUCTURA DE ARCHIVOS QUE DEBES TOCAR

No toques nada fuera de esta carpeta salvo que sea estrictamente necesario para conectar rutas.

CHECKLIST
El calendario se muestra dentro del dashboard filtrado al medicoId del usuario logueado
El panel de filtro de doctores no aparece en la vista médico
Click en cita del calendario abre CitaModal
CitaModal muestra datos de la cita, datos del paciente, notas clínicas y historial
GET /api/medico/perfil → datos del médico logueado
GET /api/medico/mis-citas → todas sus citas
GET /api/medico/citas-hoy → citas del día
GET /api/medico/citas/:id → detalle de una cita (populate paciente)
PUT /api/medico/citas/:id/estado → cambiar estado { estado: "ATENDIDA" }
GET /api/citas/calendario?fecha=YYYY-MM-DD&vista=dia&medicoId=XXX → para el
calendario

src/pages/MedicoDashboard/
├── MedicoDashboard.tsx ← contenedor principal (ya existe, completar)
├── MedicoDashboard.css ← estilos (ya existe, completar)
├── CitaModal.tsx ← CREAR
└── CitaModal.css ← CREAR

Las notas clínicas se pueden editar y guardar
Botón "Marcar como Atendida" funciona y actualiza el estado en pantalla
El historial del paciente muestra hasta 5 citas anteriores
Diseño consistente con el resto del proyecto (mismas fuentes, colores, bordes, badges)
Light mode y dark mode funcionan correctamente (usar variables CSS del ThemeContext)
Sin errores de TypeScript

PROMPT PARA TU IA
Copia esto exacto:

Estoy trabajando en el frontend de un sistema de gestión para un policlínico. Stack: React 18
+ TypeScript + Vite + CSS vanilla. Sin Tailwind, sin librerías de UI. Autenticación con
Supabase JWT.
Diseño del proyecto (no cambies nada de esto):
Fuente: DM Sans
Verde primario: #10b981 / #059669
Azul secundario: #0ea5e9
Fondo: #f9fafb , bordes: #e5e7eb
Badges de estado: PENDIENTE #0ea5e9 , ATENDIDA #10b981 , CANCELADA
#ef4444 , REPROGRAMADA #f59e0b
El proyecto tiene ThemeContext con light/dark — usar variables CSS existentes, no
hardcodear colores
Sin emojis, sin inline comments, sin section headers en CSS
Contexto: El hook useAuth() expone { user, session } donde user.user_metadata
contiene { nombres, apellidos, rol, medicoId } . El médico logueado tiene rol:
"MEDICO" y un medicoId que es el ObjectId del Doctor en MongoDB.
Ya existe un calendario funcional en src/pages/Calendario/ con componentes VistaDia ,
VistaSemana , VistaMes , MiniCalendario , CalendarioTopBar , DoctoresPanel . Ese

calendario hace fetch a GET /api/citas/calendario?fecha=YYYY-MM-
DD&vista=dia&medicoId=XXX .

Tarea 1 — MedicoDashboard: Completar
src/pages/MedicoDashboard/MedicoDashboard.tsx para que muestre el calendario
existente reutilizando sus componentes, pero siempre pasando el medicoId del usuario
logueado como filtro. El DoctoresPanel no debe mostrarse. Click en cita → abre CitaModal .
Tarea 2 — CitaModal: Crear src/pages/MedicoDashboard/CitaModal.tsx y su CSS. El
modal recibe el citaId y muestra:
1. Datos de la cita: fecha, hora, estado (badge), especialidad
2. Datos del paciente: nombres, apellidos, DNI, edad, teléfono, correo

3. Notas clínicas: textarea editable + botón "Guardar notas" que hace PUT
/api/medico/citas/:id/estado con las notas
4. Historial de visitas: últimas 5 citas del mismo paciente, columnas Fecha y Estado,
ordenadas de más reciente a más antigua. Fetch desde GET /api/medico/mis-citas
filtrando por pacienteId .
5. Botón "Marcar como Atendida" visible solo si estado es PENDIENTE → PUT
/api/medico/citas/:id/estado con { estado: "ATENDIDA" } . Al confirmar,
actualiza el estado en pantalla sin recargar.
6. Botón "Cerrar".
Endpoints disponibles:
GET /api/medico/citas/:id → detalle con paciente populado
PUT /api/medico/citas/:id/estado → body { estado, notas? }
GET /api/medico/mis-citas → todas las citas del médico
El diseño debe ser idéntico al resto del proyecto. Usar los mismos colores, bordes, sombras y
estructura de modal que ya existe en PacienteModal.tsx como referencia visual.

Policlínico San José · Marzo 2026