# Testing

> Para el PROCESO de escritura de tests (Red-Green-Refactor) → ver `docs/TDD.md`.
> Este archivo cubre la ESTRATEGIA (qué testear, cobertura, datos, anti-patrones).

> Si no hay verificación automática, no hay garantía de calidad.
> Para verificación funcional con datos reales (que lo que se implementó hace lo que se pidió) → ver `PRE_DEPLOY_AND_QA.md` (Parte 2).

## 1) Estrategia por capa

| Capa | Tipo | Objetivo | Cobertura mínima sugerida |
|---|---|---|---|
| Dominio | unit tests | reglas de negocio | 85% |
| Integración | integration tests | contratos entre módulos | 70% |
| API | contract/smoke | endpoints críticos | 100% endpoints críticos |
| UI (si aplica) | e2e | flujos de usuario clave | happy paths + errores |

## 2) Qué testear siempre

- Autenticación/autorización.
- Reglas de negocio críticas.
- Cálculos (precios, impuestos, fechas).
- Integraciones externas (con mocks/stubs controlados).
- Manejo de errores y casos borde.

## 3) Qué se puede omitir

- Getters/setters triviales.
- UI estática sin lógica.
- Código generado automáticamente (si está cubierto por integración).

## 4) Datos de prueba

- Usar factories/fixtures versionados.
- Test DB aislada por ambiente.
- Limpieza automática entre tests.
- Prohibido usar datos reales de producción.

## 5) Nomenclatura

`<módulo>.<función_o_caso>.spec|test`

Ejemplo: `auth.login.invalid_password.spec.ts`

## 6) Proceso mínimo en cada PR

1. Ejecutar unit + integración.
2. Ejecutar lint/format/typecheck.
3. Ejecutar smoke tests de endpoints críticos.
4. Adjuntar comandos en la descripción del PR.

## 7) Anti-patrones

- Tests frágiles dependientes de orden.
- Sleeps fijos en vez de sincronización.
- Mockear tanto que no se valida integración real.
- Pasar tests localmente pero no en CI.
