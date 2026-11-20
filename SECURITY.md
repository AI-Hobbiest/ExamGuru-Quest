# Security policy

## Scope

ExamGuru Quest is currently a GitHub Pages-hosted, local-first learning portal. Static browser authentication, local role state and published JSON account files are prototype conveniences and must not be treated as production SaaS security controls.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting or a GitHub Security Advisory for this repository when that feature is available. Do not publish credentials, personal data, student records or exploit details in a public issue.

If private reporting is unavailable, open a minimal issue requesting a private contact channel without including exploit details or sensitive data.

## Supported release

Security fixes are developed against the default branch and released through reviewed pull requests and the repository's automated checks.

## Credential handling

Never commit passwords, API tokens, OAuth client secrets, private keys, session tokens, production account exports or real student/institution data. If a credential is exposed, revoke or rotate it immediately; removing it from a later commit is not sufficient.
