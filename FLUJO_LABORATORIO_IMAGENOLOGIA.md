# Flujo de Órdenes: Laboratorio e Imagenología
## Análisis basado en estándares internacionales y buenas prácticas

---

## 1. FLUJO PARA ÓRDENES DE LABORATORIO

### 1.1 Etapa de Generación de Orden (en consulta médica)
- **Actor**: Médico especialista
- **Acción**: Genera orden de laboratorio en la atención médica
- **Datos capturados**:
  - Tipo de análisis solicitado (hemograma, bioquímica, etc.)
  - Motivo de solicitud
  - Indicaciones especiales (ayuno, evitar alcohol, etc.)

### 1.2 Etapa de Recepción y Validación (Recepción)
- **Actor**: Recepcionista
- **Acción**: 
  1. Paciente presenta orden de laboratorio
  2. Recepcionista valida orden (completa, legible, especialidad correcta)
  3. Sistema genera ID de orden

### 1.3 Etapa de Programación de Toma de Muestra (CORRECCIÓN A TU FLUJO)
**IMPORTANTE**: No es solo "mañana" sino que debe considerar:

- **Opción A - Laboratorio urgente (same day)**:
  - Paciente puede ir ese mismo día en horarios abiertos (7am-11am, 2pm-5pm)
  - Sin necesidad de reservar hora específica
  - Toma de muestra en ventanilla (procedimiento rápido)

- **Opción B - Laboratorio programado**:
  - Se reserva día y rango horario específico (ej: 21 de abril, 7am-11am)
  - Mejor para cuando hay alta demanda
  - El sistema debe validar disponibilidad

### 1.4 Fase Preanalítica (interna del laboratorio)
- Preparación del paciente (verificar ayuno, etc.)
- Toma de muestra por flebotomista
- Etiquetado y transporte seguro
- Registro en sistema LIMS (Lab Information Management System)

### 1.5 Fase Analítica
- Procesamiento de muestra
- Análisis instrumental
- Control de calidad
- Obtención de resultados

### 1.6 Fase Postanalítica
- Validación de resultados por tecnólogo
- Revisión técnica
- Interpretación médica (opcional según protocolo)
- Entrega de resultados

---

## 2. FLUJO PARA ÓRDENES DE IMAGENOLOGÍA

### 2.1 Etapa de Generación de Orden (en consulta médica)
- **Actor**: Médico especialista (o a veces médico general con referencia)
- **Acción**: Genera orden de imagenología/radiología
- **Datos capturados**:
  - Tipo de estudio (Rx, Ecografía, TC, RMN, etc.)
  - Región anatómica
  - Motivo/diagnóstico presuntivo
  - Indicaciones especiales

### 2.2 Etapa de Recepción y Validación (Recepción)
- **Actor**: Recepcionista
- **Acción**:
  1. Paciente presenta orden de imagenología
  2. Recepcionista valida orden (especialidad radiología/imagenología)
  3. Sistema verifica que orden sea de especialista (algunos estudios requieren esto)

### 2.3 Etapa de RESERVA DE CITA (DIFERENCIA CON LABORATORIO)
**IMPORTANTE**: Imagenología funciona como reserva de cita, NO como laboratorio abierto

- **Acción**: Recepcionista presenta opciones de disponibilidad
- **Datos**: 
  - Fecha disponible
  - Hora específica (no rango)
  - Modalidad/especialidad (Radiología, Ecografía, TC, etc.)
  - Duración estimada del procedimiento
  
- **Validaciones**:
  - Verificar disponibilidad de equipos
  - Verificar disponibilidad de técnicos/especialistas
  - Confirmar preparación especial del paciente (ej: no comer si es ecografía abdominal)

### 2.4 Etapa Preanalítica (preparación)
- Orientaciones de preparación (ayuno, retiro de objetos metálicos, etc.)
- Confirmación de cita (llamada/SMS 24h antes)
- Revisión de contraindicaciones (ej: embarazo, metal en cuerpo para RMN)

### 2.5 Etapa Analítica (adquisición de imagen)
- Posicionamiento del paciente
- Adquisición de imágenes con protocolos estandarizados
- Control de calidad de imagen (ver que sea diagnóstica)

### 2.6 Etapa Postanalítica
- Análisis de imágenes por radiólogo/imagenólogo
- Redacción de informe
- Entrega de imágenes (CD, PACS, digital)
- Comunicación de hallazgos relevantes

---

## 3. CORRECCIONES AL FLUJO QUE PROPUSISTE

### Cambio 1: Laboratorio no es solo "mañana"
❌ **Lo que dijiste**: "elige un día para que la persona vaya en la mañana por ejemplo el 21 de 7am a 11am"

✅ **Corrección**: 
- Laboratorio debe tener DOS opciones:
  - **Urgente**: Hoy, en horarios de atención abierta (walk-in, sin cita)
  - **Programado**: Seleccionar día y rango horario (si es necesario)

### Cambio 2: Imagenología requiere modelo de cita formal
✅ **Lo que dijiste correctamente**: "sería tipo como cualquier reserva de cita, un día a una hora especifica"

**Amplificación**:
- Imagenología SIEMPRE requiere cita con hora específica (no rangos)
- Debe considerar tipo de estudio (algunos toman más tiempo)
- Debe validar disponibilidad de equipos especializados

### Cambio 3: Especialidad en imagenología
❌ **"elige el dia, etc."** - Incompleto

✅ **Debe incluir**:
- Tipo de modalidad (Radiología simple, Ecografía, TC, RMN, etc.)
- Duración estimada (ecografía: 20min, TC: 30min, RMN: 45-60min)
- Especialista disponible (no todos los especialistas operan todos los equipos)

---

## 4. DIAGRAMA DEL FLUJO INTEGRADO

```
CONSULTA MÉDICA
      ↓
  RECEPCIÓN
   ↙     ↘
LABORATORIO    IMAGENOLOGÍA
  ↓              ↓
[Validar orden]  [Validar orden]
  ↓              ↓
[¿Urgente?]     [Reservar cita]
 ↙    ↘           ↓
HOY  PROGRAMAR   [Seleccionar:]
 ↓     ↓         - Fecha
 ↓     ↓         - Hora exacta
 ↓   [Guardar]   - Modalidad
 ↓     ↓         - Duración
[TOMA DE MUESTRA]
 ↓
[LABORATORIO]
 ↓
[RESULTADOS]
```

---

## 5. DATOS A CAPTURAR EN EL SISTEMA

### Orden de Laboratorio
```
- ID Orden
- ID Paciente
- Médico Solicitante
- Fecha de generación
- Análisis solicitados (array)
- Motivo clínico
- Indicaciones especiales
- Tipo: [URGENTE, PROGRAMADO]
- Si PROGRAMADO: {
    - Fecha
    - Rango horario
  }
- Estado: [GENERADA, VALIDADA, COMPLETADA]
```

### Orden de Imagenología
```
- ID Orden
- ID Paciente
- Médico Solicitante
- Fecha de generación
- Modalidad: [RX, ECOGRAFIA, TC, RMN, MAMOGRAFIA, etc.]
- Región anatómica
- Motivo clínico
- Preparación requerida
- Contraindicaciones validadas
- CITA RESERVADA: {
    - Fecha
    - Hora exacta
    - Duración estimada
    - Especialista/Técnico asignado
    - Equipo/Sala asignada
  }
- Estado: [GENERADA, VALIDADA, CITA_RESERVADA, COMPLETADA]
```

---

## 6. REGLAS DE NEGOCIO CLAVE

### Para Laboratorio:
1. Las órdenes pueden procesarse el mismo día sin necesidad de cita
2. Si es laboratorio urgente, no requiere seleccionar hora específica
3. Si hay sobrecarga, se puede forzar programación a día específico
4. Los resultados pueden entregarse ese mismo día o al siguiente según análisis

### Para Imagenología:
1. SIEMPRE requiere cita con hora específica
2. La duración del estudio depende de la modalidad
3. Requiere validación de disponibilidad de equipo
4. Algunos estudios tienen preparación previa obligatoria
5. El especialista (radiólogo) puede no ser el mismo que el que genera la orden

---

## 7. INTEGRACIONES NECESARIAS

- **Sistema LIMS** (para laboratorio): integración con procesos internos
- **Sistema de agenda/calendario**: para imagenología (validar disponibilidad)
- **Sistema de equipos**: estado de equipos disponibles por modalidad
- **Notificaciones**: SMS/Email para confirmaciones y resultados

---

## Fuentes consultadas:
- [Fase preanalítica, analítica y postanalítica en laboratorio](https://www.euroinnova.com/ciencias/articulos/fase-analitica-preanalitica-y-postanalitica)
- [Manual de Procedimientos Radiología e Imagen](https://hgm.salud.gob.mx/normateca/manuales_de_procedimientos/DCM/MAN_PROC_SERV_RAD_IMA_2024.pdf)
- [MINSA - Manual Procedimientos de Laboratorio](https://repositorio.minsa.gob.pe/handle/MINSA/77652)
- [Sistema RIS radiología: gestión médica](https://imexhs.com/blog/ris-radiologia)
