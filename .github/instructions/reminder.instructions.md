---
description: Describe when these instructions should be loaded
# applyTo: 'Describe when these instructions should be loaded' # when provided, instructions will automatically be added to the request context when the pattern matches an attached file
---
CONTEXT PERSISTENCE RULE:

You must persist important system knowledge into files inside the project so that future sessions can recover context.

Always maintain and update these files:

1. docs/architecture.md
   - system design
   - module responsibilities
   - data flow
   - integration boundaries

2. docs/decisions.md
   - key technical decisions
   - why choices were made
   - trade-offs

3. docs/modules/<module>.md
   - purpose of module
   - responsibilities
   - important logic notes

4. docs/runbooks.md
   - how to handle failures
   - retry strategies
   - operational notes

5. docs/integrations.md
   - Slack, Google, Microsoft integration contracts

RULES:
- Update these files whenever architecture or logic changes
- Do not overwrite blindly — append or refine
- Keep documentation concise but precise

This documentation is the system memory and must always stay in sync with the code.