# Security Policy

## Supported versions

KDT is in pre-1.0 development. Security fixes go into the latest published release only.

| Package | Supported |
|---|---|
| `@kurdish-dev-toolkit/core`, latest 0.x release | ✅ |
| Older 0.x releases | ❌ |

## Reporting a vulnerability

**Please do not open a public issue.** Report it privately through GitHub:
**Security → Report a vulnerability** on the repository page (GitHub private vulnerability
reporting).

Please include:

* the affected package and version
* a description of the problem and its impact
* a minimal reproduction (input strings, options, runtime)

What to expect:

* an acknowledgement within 7 days
* an assessment and, if confirmed, a fix plan within 30 days
* credit in the release notes, unless you would rather stay anonymous

## Scope

Examples of issues we want to hear about: inputs that make a function hang or use excessive memory
(for example, regular-expression backtracking), output that enables injection when it is used as
documented (for example, `htmlDirAttributes` values), and prototype pollution through translation
messages or options.

KDT does not execute user code, make network requests or read files at runtime.
