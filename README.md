# Test ENAIRE — Supervisor Instructor

App web para practicar el examen de Supervisor Instructor de ENAIRE.  
Funciona en Mac, iPad e iPhone. El progreso se sincroniza entre dispositivos vía Supabase.

---

## Setup (una sola vez)

### 1. Supabase — crear la base de datos

1. Crea cuenta gratuita en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta el contenido de `supabase-schema.sql`
4. Ve a **Settings → API** y copia:
   - **Project URL** (`https://xxxx.supabase.co`)
   - **anon public key**

### 2. Configurar credenciales

Edita `config.js`:

```js
const SUPABASE_URL = 'https://TU_PROYECTO.supabase.co';
const SUPABASE_ANON_KEY = 'tu-anon-key';
```

> La anon key es segura para poner en código público — Supabase protege los datos con Row Level Security.

### 3. GitHub Pages — activar el hosting

1. Ve a **Settings → Pages** en el repositorio
2. Source: `Deploy from a branch`
3. Branch: `main`, carpeta: `/ (root)`
4. La app queda en: `https://kiwi8891.github.io/test_enaire`

---

## Uso

| Pantalla | Qué hace |
|---|---|
| **Practicar Test** | 20 preguntas aleatorias del banco completo |
| **Repasar Falladas** | Solo preguntas con errores, ordenadas por nº de fallos |
| **Estadísticas** | Progreso global y top 5 preguntas más falladas |

El progreso se guarda tras cada respuesta y se sincroniza en todos los dispositivos con tu cuenta.

---

## Formato de questions.json

```json
[
  {
    "id": 1,
    "question": "Texto completo de la pregunta",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correct": 0,
    "topic": "Nombre del tema (opcional)",
    "explanation": "Explicación de la respuesta correcta (opcional)"
  }
]
```

`correct` es el índice (0–3) de la opción correcta dentro del array `options`.
