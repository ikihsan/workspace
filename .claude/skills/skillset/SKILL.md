---
name: skillset
description: Describe what this skill does and when to use it. Include keywords that help agents identify relevant tasks.
---

This skill creates scalable and maintainable NestJS modules.

INSTRUCTIONS:
- Follow clean architecture:
  controller → service → repository
- Use DTOs with class-validator
- Use dependency injection properly
- Keep modules isolated and testable

OUTPUT MUST INCLUDE:
- module file
- controller
- service
- repository (or prisma service wrapper)
- DTOs

RULES:
- No business logic in controller
- No direct DB access outside repository layer
- Use TypeScript strictly

EXAMPLE:
Input: "Create attendance module"
Output:
- attendance.module.ts
- attendance.controller.ts
- attendance.service.ts
- attendance.repository.ts
- DTOs for requests