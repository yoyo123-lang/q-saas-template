# ADR-0001: Sistema de documentación modular

> **Fecha**: 2025-02-18
> **Estado**: Aceptada

## Contexto

El proyecto necesita un sistema de documentación que Claude Code lea automáticamente. La documentación debe mantenerse útil a medida que el proyecto escale.

## Opciones consideradas

### Opción A: Un solo CLAUDE.md con todo
- **Pros**: Simple, todo en un lugar
- **Contras**: Se vuelve inmanejable. Los modelos pierden precisión con >150 instrucciones en un archivo

### Opción B: Sistema modular (CLAUDE.md corto + archivos especializados)
- **Pros**: Escalable, cada tema independiente, CLAUDE.md no se satura
- **Contras**: Más archivos que mantener

## Decisión

Elegimos **Opción B**. CLAUDE.md tiene ~20 instrucciones y apunta a archivos especializados. Cada concepto vive en un solo lugar.

## Consecuencias

### Lo que ganamos
- Instrucciones más precisas
- Cada tema se actualiza independientemente
- El modelo no se satura

### Lo que perdemos
- Hay que mantener varios archivos sincronizados

### A futuro
- Revisar periódicamente que CLAUDE.md apunte a los archivos correctos
- Si algún archivo crece demasiado, subdividirlo
