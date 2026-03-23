# Mapa Negocio → Técnica

> Archivo derivado de `docs/BUSINESS_MODEL.md`.
> **Fuente de verdad: BUSINESS_MODEL.md** — si hay conflicto, gana negocio.
> Los roles técnicos (`docs/roles/tech/`) consultan este archivo para conocer
> las restricciones de negocio que aplican a su dominio.
>
> **Este archivo se genera/actualiza automáticamente** corriendo `/project:descubrimiento`.
> No editarlo a mano salvo para correcciones urgentes (y después regenerar).

---

## Cómo funciona

```
BUSINESS_MODEL.md          (fuente de verdad — la escribe producto)
        │
        ▼
BUSINESS_TECHNICAL_MAP.md  (derivado — se genera con /project:descubrimiento)
        │
        ├──→ tech/code-reviewer.md        (lee sección "Código")
        ├──→ tech/qa-engineer.md          (lee sección "QA")
        ├──→ tech/security-auditor.md     (lee sección "Seguridad")
        ├──→ tech/performance-engineer.md (lee sección "Performance")
        ├──→ tech/devops-sre.md           (lee sección "Infraestructura")
        └──→ tech/ux-reviewer.md          (lee sección "UX")
```

## Regla de precedencia

> **Negocio manda.** Si una decisión técnica contradice una regla de negocio,
> la regla de negocio gana. El rol técnico debe reportar el conflicto como
> hallazgo, no resolverlo unilateralmente.

---

## Código

<!-- Implicaciones de negocio que afectan estructura, nombres, patrones -->

[Se genera con /project:descubrimiento]

## QA

<!-- Casos de prueba derivados de reglas de negocio: límites de plan, roles, estados -->

[Se genera con /project:descubrimiento]

## Seguridad

<!-- Restricciones de acceso, validaciones server-side, datos sensibles por rol -->

[Se genera con /project:descubrimiento]

## Performance

<!-- Jobs pesados, cálculos diferidos, cacheos requeridos por el negocio -->

[Se genera con /project:descubrimiento]

## Infraestructura

<!-- Invariantes de datos, backups, retención, webhooks críticos -->

[Se genera con /project:descubrimiento]

## UX

<!-- Flujos obligatorios, mensajes de error con CTA de negocio, onboarding -->

[Se genera con /project:descubrimiento]

---

## Historial de cambios

| Fecha | Qué cambió | Derivado de |
|-------|-----------|-------------|
| [se completa automáticamente] | [se completa automáticamente] | [sección de BUSINESS_MODEL.md] |
