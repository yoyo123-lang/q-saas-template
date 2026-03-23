# Base de Datos: Modelo, Migraciones y Operación

## 1) Modelo de datos

## 1.1 Entidades principales

| Entidad | Descripción | Campos clave |
|---|---|---|
| users | Usuarios del sistema | id, email, role, created_at |
| sessions | Sesiones/tokens revocables | id, user_id, expires_at |
| audit_logs | Trazabilidad de acciones | id, actor_id, action, created_at |

> Reemplazar con entidades reales del proyecto.

## 1.2 Convenciones

- Tablas en `snake_case` plural.
- PK estándar: `id` (uuid o bigint definido por proyecto).
- FK: `<entidad>_id`.
- Timestamps obligatorios: `created_at`, `updated_at`.
- Soft delete recomendado: `deleted_at`.

## 2) Relaciones y reglas

- 1:N por FK explícita.
- N:M mediante tabla pivote (`a_b`).
- Evitar JSON arbitrario para datos core que requieren consulta frecuente.

## 3) Migraciones

## 3.1 Reglas

- Nunca editar migraciones ya aplicadas en prod.
- Cambios destructivos en 2 pasos (deprecación -> eliminación posterior).
- Toda migración debe incluir plan de rollback.

## 3.2 Runbook

1. Generar migración.
2. Ejecutar en local y correr tests.
3. Probar en staging con snapshot realista.
4. Validar tiempos de ejecución y lock.
5. Ejecutar en producción en ventana controlada.

## 4) Seeds y datos de prueba

- Seeds sólo con datos sintéticos.
- Versionar seeds por entorno (`seed:dev`, `seed:test`).
- Nunca reutilizar dumps de producción con PII.

## 5) Backups y restore

- Backup full diario + incremental según criticidad.
- Retención definida por compliance.
- Restore drill mensual como mínimo.

## 6) Performance de datos

- Índices explícitos por patrones de consulta.
- Verificar planes de ejecución para queries críticas.
- Paginación obligatoria en listados.
- Definir TTL para caches derivados de DB.
